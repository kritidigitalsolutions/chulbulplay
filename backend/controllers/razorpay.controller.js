const crypto = require("crypto");
const axios = require("axios");
const RazorpayOrder = require("../models/razorpayOrder.model");
const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");
const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

async function calculateDiscountedAmount(plan, promoCode) {
  let amount = plan.price;
  let appliedPromo = null;

  if (!promoCode) {
    return { amount, appliedPromo };
  }

  const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
  if (!promo) throw new Error("Invalid promo code");
  if (promo.expiryDate && promo.expiryDate < new Date()) throw new Error("Promo code has expired");
  if (promo.usedCount >= promo.maxUses) throw new Error("Promo code usage limit reached");
  if (promo.applicablePlans.length && !promo.applicablePlans.some((id) => id.toString() === plan.id)) {
    throw new Error("Promo not valid for this plan");
  }

  const discount = promo.discountType === "percentage"
    ? (plan.price * promo.discountValue) / 100
    : promo.discountValue;

  return { amount: Math.max(plan.price - discount, 0), appliedPromo: promo.code };
}

// =====================================================
// 1. CREATE RAZORPAY ORDER
// POST /api/payment/razorpay/create-order
// =====================================================
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { planId, promoCode } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    const config = await PaymentConfig.getConfig();
    if (!config.razorpayEnabled) {
      return res.status(403).json({ success: false, message: "Razorpay gateway is currently disabled" });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({ success: false, message: "Razorpay credentials are not configured on server" });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    }

    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const rawPlatform = ((req.body.platform || req.headers["x-platform"] || plan.platform || "app") + "").trim().toLowerCase();
    const resolvedPlatform = rawPlatform === "website" || rawPlatform === "web" || rawPlatform === "browser" ? "website" : "app";

    const platformFilter = [{ platform: resolvedPlatform }];
    if (resolvedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let activeSub = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    });
    activeSub = await expireSubscriptionIfNeeded(activeSub);

    if (activeSub && activeSub.status === "active") {
      return res.status(400).json({
        success: false,
        platform: resolvedPlatform,
        message: `You already have an active ${resolvedPlatform === "website" ? "website" : "mobile app"} subscription`,
      });
    }

    const { amount, appliedPromo } = await calculateDiscountedAmount(plan, promoCode);
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
      return res.status(400).json({ success: false, message: "Razorpay requires an amount of at least ₹1" });
    }

    const authHeader = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const receiptId = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const rzpResponse = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptId,
        notes: {
          userId: String(userId),
          planId: String(plan._id),
          platform: resolvedPlatform,
          promoCode: appliedPromo || "",
        },
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const rzpOrder = rzpResponse.data;

    // Save order in database
    await RazorpayOrder.create({
      orderId: rzpOrder.id,
      receipt: receiptId,
      user: userId,
      plan: plan._id,
      platform: resolvedPlatform,
      promoCode: appliedPromo,
      amount: amount,
      amountInPaise: amountInPaise,
      currency: "INR",
      status: "created",
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      orderId: rzpOrder.id,
      amount: amount,
      amountInPaise: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      planId: plan._id,
      planName: plan.name,
      platform: resolvedPlatform,
      customer: {
        name: user.name || "Customer",
        email: user.email || "",
        phone: user.phone || "",
      },
    });
  } catch (err) {
    console.error("Create Razorpay Order Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.error?.description || err.message || "Failed to create Razorpay order",
    });
  }
};

// =====================================================
// 2. VERIFY RAZORPAY PAYMENT
// POST /api/payment/razorpay/verify
// =====================================================
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Razorpay credentials are not configured on server",
      });
    }

    // Verify HMAC-SHA256 signature
    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid Razorpay signature",
      });
    }

    // Check if subscription already exists for this payment (idempotency)
    const existingSubscription = await Subscription.findOne({
      $or: [{ subscriptionId: razorpay_order_id }, { paymentId: razorpay_payment_id }],
    }).populate("plan");

    if (existingSubscription) {
      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        subscription: existingSubscription,
      });
    }

    // Retrieve order record
    let order = await RazorpayOrder.findOne({ orderId: razorpay_order_id });
    let resolvedPlanId = order ? order.plan : planId;
    let userId = req.user?.id || req.user?._id || (order ? order.user : null);

    if (!resolvedPlanId) {
      return res.status(400).json({
        success: false,
        message: "Plan information could not be determined for this order",
      });
    }

    const plan = await Plan.findById(resolvedPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const resolvedPlatform = order?.platform || plan.platform || "app";

    // Increment promo usage if applied
    if (order?.promoCode) {
      await Promo.updateOne({ code: order.promoCode, isActive: true }, { $inc: { usedCount: 1 } });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + plan.duration);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      platform: resolvedPlatform,
      status: "active",
      paymentGateway: "razorpay",
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_order_id,
      amount: order ? order.amount : plan.price,
      currency: "INR",
      startDate,
      endDate,
    });

    await User.findByIdAndUpdate(userId, {
      $push: { subscriptions: subscription._id },
    });

    if (order) {
      order.status = "completed";
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated successfully! 🎉",
      subscription,
    });
  } catch (err) {
    console.error("Verify Razorpay Payment Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify Razorpay payment",
    });
  }
};
