const axios = require("axios");
const crypto = require("crypto");
const { SABPAISA_CONFIG, createChecksum, verifyReturnSignature, verifyWebhookSignature } = require("../config/sabpaisa");
const SabpaisaOrder = require("../models/sabpaisaOrder.model");
const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");
const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

function configured() {
  return Boolean(SABPAISA_CONFIG.apiKey && SABPAISA_CONFIG.secretKey && SABPAISA_CONFIG.merchantId && SABPAISA_CONFIG.returnUrl);
}

async function calculateAmount(plan, promoCode) {
  let amount = plan.price;
  let appliedPromo = null;
  if (!promoCode) return { amount, appliedPromo };
  const promo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
  if (!promo) throw new Error("Invalid promo code");
  if (promo.expiryDate && promo.expiryDate < new Date()) throw new Error("Promo code has expired");
  if (promo.usedCount >= promo.maxUses) throw new Error("Promo code usage limit reached");
  if (promo.applicablePlans.length && !promo.applicablePlans.some((id) => id.toString() === plan.id)) throw new Error("Promo not valid for this plan");
  const discount = promo.discountType === "percentage" ? (plan.price * promo.discountValue) / 100 : promo.discountValue;
  return { amount: Math.max(plan.price - discount, 0), appliedPromo: promo.code };
}

async function enquiry(orderId) {
  const response = await axios.post(
    `${SABPAISA_CONFIG.baseUrl}/api/v2/payments/enquiry`,
    { clientCode: SABPAISA_CONFIG.merchantId, merchantTxnId: orderId },
    {
      headers: {
        "X-Api-Key": SABPAISA_CONFIG.apiKey,
        "X-Merchant-Id": SABPAISA_CONFIG.merchantId,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
  return response.data?.data || response.data;
}

function enquirySucceeded(result, order) {
  if (String(result?.status || "").toUpperCase() !== "SUCCESS") return false;
  const amountPaise = result?.amountPaise ?? result?.amount_paise ?? result?.paidAmountPaise;
  if (amountPaise !== undefined && Number(amountPaise) !== Math.round(order.amount * 100)) return false;
  const amountRupees = result?.paidAmount ?? result?.paid_amount;
  return amountRupees === undefined || Number(amountRupees) === Number(order.amount);
}

async function fulfil(order, transactionId) {
  const existing = await Subscription.findOne({ $or: [{ subscriptionId: order.orderId }, { paymentId: transactionId }] });
  if (existing) return existing;
  const plan = await Plan.findById(order.plan);
  if (!plan) throw new Error("Plan for payment was not found");
  if (order.promoCode) await Promo.updateOne({ code: order.promoCode, isActive: true }, { $inc: { usedCount: 1 } });
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + plan.duration);
  const subscription = await Subscription.create({
    user: order.user,
    plan: plan._id,
    platform: order.platform || plan.platform || "app",
    status: "active",
    paymentGateway: "sabpaisa",
    paymentId: transactionId,
    subscriptionId: order.orderId,
    amount: order.amount,
    currency: "INR",
    startDate,
    endDate,
  });
  await User.findByIdAndUpdate(order.user, {
    $push: { subscriptions: subscription._id },
  });
  order.status = "completed";
  order.sabpaisaTransactionId = transactionId;
  await order.save();
  return subscription;
}

async function reconcile(order) {
  const result = await enquiry(order.orderId);
  const transactionId = result?.transactionId || result?.txnId || result?.spTxnId || result?.id;
  if (enquirySucceeded(result, order) && transactionId) return fulfil(order, String(transactionId));
  if (["FAILED", "CANCELLED", "EXPIRED", "TIMEOUT"].includes(String(result?.status || "").toUpperCase())) {
    order.status = "failed";
    await order.save();
  }
  return null;
}

exports.initiatePayment = async (req, res) => {
  try {
    if (!req.body.planId) return res.status(400).json({ success: false, message: "planId is required" });
    const config = await PaymentConfig.getConfig();
    if (!config.sabpaisaEnabled) return res.status(403).json({ success: false, message: "SabPaisa is disabled by the administrator" });
    if (!configured()) return res.status(503).json({ success: false, message: "SabPaisa credentials or return URL are not configured" });
    const plan = await Plan.findById(req.body.planId);
    if (!plan?.isActive) return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    const userId = req.user.id || req.user._id;

    const rawPlatform = ((req.body.platform || req.headers["x-platform"] || plan.platform || "app") + "").trim().toLowerCase();
    const resolvedPlatform = rawPlatform === "website" || rawPlatform === "web" || rawPlatform === "browser" ? "website" : "app";

    const platformFilter = [{ platform: resolvedPlatform }];
    if (resolvedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let active = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    });
    active = await expireSubscriptionIfNeeded(active);
    if (active?.status === "active") {
      return res.status(400).json({
        success: false,
        platform: resolvedPlatform,
        message: `You already have an active ${resolvedPlatform === "website" ? "website" : "mobile app"} subscription`,
      });
    }
    const { amount, appliedPromo } = await calculateAmount(plan, req.body.promoCode);
    const amountPaise = Math.round(amount * 100);
    if (amountPaise < 100) return res.status(400).json({ success: false, message: "SabPaisa requires an amount of at least ₹1" });
    const user = await User.findById(userId);

    // Customer Name (from body or user profile)
    const customerName = (req.body.name || user?.name || "Customer")
      .replace(/[^a-zA-Z ]/g, " ")
      .trim() || "Customer";

    // Customer Email (from body or user profile)
    const customerEmail = (req.body.email || user?.email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required for SabPaisa payment",
      });
    }

    // Customer Phone (from body or user profile)
    let rawPhone = String(req.body.phone || user?.phone || "").replace(/\D/g, "");
    if (rawPhone.length === 12 && rawPhone.startsWith("91")) {
      rawPhone = rawPhone.slice(2);
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = rawPhone.slice(1);
    }

    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      return res.status(400).json({
        success: false,
        message: "A valid 10-digit Indian mobile number (starting with 6-9) is required for SabPaisa",
      });
    }
    const customerPhone = rawPhone;

    // Auto-save email to user profile if user doesn't have one
    if (user && !user.email && customerEmail) {
      try {
        user.email = customerEmail;
        await user.save();
      } catch (saveErr) {
        console.warn("Could not auto-save email to user profile:", saveErr.message);
      }
    }

    const orderId = `SP_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      merchantId: SABPAISA_CONFIG.merchantId,
      merchantTxnId: orderId,
      amount: amountPaise,
      currency: "INR",
      customerName,
      customerEmail,
      customerPhone,
      returnUrl: SABPAISA_CONFIG.returnUrl,
      timestamp,
    };
    payload.checksum = createChecksum(payload);
    const response = await axios.post(`${SABPAISA_CONFIG.baseUrl}/api/v2/payments`, payload, {
      headers: {
        "X-Api-Key": SABPAISA_CONFIG.apiKey,
        "X-Merchant-Id": SABPAISA_CONFIG.merchantId,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    const session = response.data?.data || response.data;
    if (!session?.checkoutUrl) throw new Error("SabPaisa did not return a checkout URL");
    await SabpaisaOrder.create({ orderId, user: userId, plan: plan._id, platform: resolvedPlatform, promoCode: appliedPromo, amount });
    const checkoutUrl = new URL(session.checkoutUrl);
    if (session.clientSecret) checkoutUrl.searchParams.set("clientSecret", session.clientSecret);
    return res.status(200).json({ success: true, orderId, finalAmount: amount, platform: resolvedPlatform, checkoutUrl: checkoutUrl.toString() });
  } catch (error) {
    console.error("SabPaisa initiate error:", error.response?.data || error.message);
    const sabpaisaErrorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "Unable to initiate SabPaisa payment";
    return res.status(error.response?.status || 500).json({
      success: false,
      message: sabpaisaErrorMessage,
      details: error.response?.data?.error || null,
    });
  }
};

exports.handleReturn = async (req, res) => {
  const params = { ...req.query };
  const orderId = params.merchant_txn_id;
  try {
    if (!verifyReturnSignature(params)) return res.status(400).send(statusPage(false, "Invalid payment signature", orderId));
    const order = await SabpaisaOrder.findOne({ orderId });
    if (!order) return res.status(404).send(statusPage(false, "Payment order not found", orderId));
    const subscription = await reconcile(order);
    return res.status(200).send(statusPage(Boolean(subscription), subscription ? "Payment successful. Your subscription is active." : "Payment is not confirmed yet.", orderId));
  } catch (error) {
    console.error("SabPaisa return error:", error.response?.data || error.message);
    return res.status(200).send(statusPage(false, "We could not confirm your payment yet. Please check your subscription shortly.", orderId));
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    if (!verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), req.get("X-SabPaisa-Signature"))) return res.status(401).json({ success: false, message: "Invalid webhook signature" });
    const payload = req.body || {};
    const orderId = payload.merchant_txn_id || payload.merchantTxnId;
    const order = await SabpaisaOrder.findOne({ orderId });
    if (order) await reconcile(order);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("SabPaisa webhook error:", error.response?.data || error.message);
    return res.status(500).json({ success: false });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const order = await SabpaisaOrder.findOne({ orderId: req.params.orderId, user: req.user.id || req.user._id });
    if (!order) return res.status(404).json({ success: false, message: "Payment order not found" });
    const subscription = order.status === "completed" ? await Subscription.findOne({ subscriptionId: order.orderId }) : await reconcile(order);
    if (!subscription) return res.status(200).json({ success: true, status: order.status });
    return res.status(200).json({ success: true, status: subscription.status, subscription });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to check payment status" });
  }
};

function statusPage(success, message, orderId) {
  const safeOrderId = String(orderId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment ${success ? "successful" : "pending"}</title></head><body><main><h1>${success ? "Payment successful" : "Payment pending"}</h1><p>${message}</p>${safeOrderId ? `<p>Order: ${safeOrderId}</p>` : ""}</main></body></html>`;
}
