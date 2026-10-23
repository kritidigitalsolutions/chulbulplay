const crypto = require("crypto");
const axios = require("axios");
const EasebuzzOrder = require("../models/easebuzzOrder.model");
const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const PaymentConfig = require("../models/paymentConfig.model");
const User = require("../models/user.model");
const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");

function isEasebuzzConfigured() {
  return Boolean(process.env.EASEBUZZ_KEY && process.env.EASEBUZZ_SALT);
}

function getBaseUrl(mode) {
  const resolvedMode = (mode || process.env.EASEBUZZ_MODE || "live").toLowerCase();
  return resolvedMode === "live"
    ? "https://pay.easebuzz.in/"
    : "https://testpay.easebuzz.in/";
}

function generateInitiateHash({ key, txnid, amount, productinfo, firstname, email, salt }) {
  const hashString = [
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    "", "", "", "", "", "", "", "", "", "", // udf1 to udf10
    salt,
  ].join("|");

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

function verifyResponseHash(data, salt) {
  const {
    status,
    udf10, udf9, udf8, udf7, udf6, udf5, udf4, udf3, udf2, udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    key,
    hash: receivedHash,
  } = data;

  const reverseHashString = [
    salt,
    status,
    udf10 || "",
    udf9 || "",
    udf8 || "",
    udf7 || "",
    udf6 || "",
    udf5 || "",
    udf4 || "",
    udf3 || "",
    udf2 || "",
    udf1 || "",
    email || "",
    firstname || "",
    productinfo || "",
    amount,
    txnid,
    key,
  ].join("|");

  const calculatedHash = crypto.createHash("sha512").update(reverseHashString).digest("hex");
  return calculatedHash.toLowerCase() === (receivedHash || "").toLowerCase();
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

async function fulfillEasebuzzOrder(order, transactionId, rawData = null) {
  // Check if subscription already fulfilled
  const existing = await Subscription.findOne({
    $or: [{ subscriptionId: order.txnid }, { paymentId: transactionId }],
  });
  if (existing) return existing;

  const plan = await Plan.findById(order.plan);
  if (!plan) throw new Error("Plan for Easebuzz order not found");

  if (order.promoCode) {
    await Promo.updateOne({ code: order.promoCode, isActive: true }, { $inc: { usedCount: 1 } });
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + plan.duration);

  const subscription = await Subscription.create({
    user: order.user,
    plan: plan._id,
    platform: order.platform || plan.platform || "app",
    status: "active",
    paymentGateway: "easebuzz",
    paymentId: transactionId || order.txnid,
    subscriptionId: order.txnid,
    amount: order.amount,
    currency: "INR",
    startDate,
    endDate,
  });

  await User.findByIdAndUpdate(order.user, {
    $push: { subscriptions: subscription._id },
  });

  order.status = "completed";
  order.easepayid = transactionId;
  if (rawData) order.rawResponse = rawData;
  await order.save();

  return subscription;
}

// =====================================================
// 1. INITIATE EASEBUZZ PAYMENT
// POST /api/payment/easebuzz/initiate
// =====================================================
exports.initiateEasebuzzPayment = async (req, res) => {
  try {
    const { planId, promoCode } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    const config = await PaymentConfig.getConfig();
    if (!config.easebuzzEnabled) {
      return res.status(403).json({ success: false, message: "Easebuzz gateway is currently disabled" });
    }

    if (!isEasebuzzConfigured()) {
      return res.status(503).json({ success: false, message: "Easebuzz credentials are not configured on server" });
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
    if (amount < 1) {
      return res.status(400).json({ success: false, message: "Easebuzz requires an amount of at least ₹1" });
    }

    // Customer details
    const customerName = (req.body.name || user.name || "Customer")
      .replace(/[^a-zA-Z ]/g, " ")
      .trim() || "Customer";
    const firstname = customerName.split(" ")[0].substring(0, 30);

    const customerEmail = (req.body.email || user.email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required for Easebuzz checkout",
      });
    }

    let rawPhone = String(req.body.phone || user.phone || "").replace(/\D/g, "");
    if (rawPhone.length === 12 && rawPhone.startsWith("91")) {
      rawPhone = rawPhone.slice(2);
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = rawPhone.slice(1);
    }

    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      return res.status(400).json({
        success: false,
        message: "A valid 10-digit Indian mobile number is required for Easebuzz checkout",
      });
    }
    const customerPhone = rawPhone;

    // Auto-save email if missing
    if (!user.email && customerEmail) {
      try {
        user.email = customerEmail;
        await user.save();
      } catch (saveErr) {
        console.warn("Could not save user email:", saveErr.message);
      }
    }

    const txnid = `EB_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const formattedAmount = Number(amount).toFixed(2);
    const productinfo = (plan.name || "ChulbulPlay Subscription").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50) || "Subscription";

    const key = process.env.EASEBUZZ_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    const baseUrl = getBaseUrl(config.easebuzzMode);
    const surl = process.env.EASEBUZZ_RETURN_URL || "https://api.chulbulplay.in/api/payment/easebuzz/return";
    const furl = process.env.EASEBUZZ_RETURN_URL || "https://api.chulbulplay.in/api/payment/easebuzz/return";

    const hash = generateInitiateHash({
      key,
      txnid,
      amount: formattedAmount,
      productinfo,
      firstname,
      email: customerEmail,
      salt,
    });

    const payload = new URLSearchParams({
      key,
      txnid,
      amount: formattedAmount,
      productinfo,
      firstname,
      email: customerEmail,
      phone: customerPhone,
      surl,
      furl,
      hash,
    });

    const easeResponse = await axios.post(`${baseUrl}payment/initiateLink`, payload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const resData = easeResponse.data;
    if (resData.status !== 1) {
      return res.status(400).json({
        success: false,
        message: resData.data || resData.error_desc || "Easebuzz payment initiation failed",
        error: resData,
      });
    }

    const accessKey = resData.data;
    const checkoutUrl = `${baseUrl}pay/${accessKey}`;

    // Store in DB
    await EasebuzzOrder.create({
      txnid,
      accessKey,
      user: userId,
      plan: plan._id,
      platform: resolvedPlatform,
      promoCode: appliedPromo,
      amount,
      currency: "INR",
      status: "initiated",
      customerEmail,
      customerPhone,
    });

    return res.status(200).json({
      success: true,
      message: "Easebuzz checkout initiated successfully",
      txnid,
      accessKey,
      checkoutUrl,
      amount,
      currency: "INR",
      key,
      planId: plan._id,
      planName: plan.name,
      platform: resolvedPlatform,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
    });
  } catch (err) {
    console.error("Initiate Easebuzz Payment Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.data || err.message || "Failed to initiate Easebuzz payment",
    });
  }
};

// =====================================================
// 2. HANDLE EASEBUZZ RETURN / CALLBACK
// GET & POST /api/payment/easebuzz/return
// =====================================================
exports.handleEasebuzzReturn = async (req, res) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;
    const { txnid, status, easepayid, amount } = data;

    if (!txnid) {
      return res.status(400).send("<h3>Missing Transaction ID</h3>");
    }

    const salt = process.env.EASEBUZZ_SALT;
    const isHashValid = verifyResponseHash(data, salt);

    const order = await EasebuzzOrder.findOne({ txnid });
    if (!order) {
      return res.status(404).send("<h3>Order Not Found</h3>");
    }

    let isSuccessful = (status || "").toLowerCase() === "success" && isHashValid;

    if (isSuccessful) {
      await fulfillEasebuzzOrder(order, easepayid || txnid, data);
    } else {
      order.status = "failed";
      order.rawResponse = data;
      await order.save();
    }

    // HTML response page for in-app browser or webview
    const title = isSuccessful ? "Payment Successful! 🎉" : "Payment Incomplete";
    const statusClass = isSuccessful ? "success" : "failed";
    const statusMsg = isSuccessful
      ? "Your subscription has been successfully activated. Enjoy unlimited streaming on ChulbulPlay!"
      : "The transaction was cancelled or unsuccessful. Please try again.";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
          .card { background: #131a29; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .icon { width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; }
          .icon.success { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 2px solid #22c55e; }
          .icon.failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 2px solid #ef4444; }
          h2 { margin: 0 0 10px; font-size: 24px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }
          .info { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 14px; margin-bottom: 24px; font-size: 13px; color: #cbd5e1; text-align: left; }
          .info div { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .info div:last-child { margin-bottom: 0; }
          .btn { display: block; width: 100%; background: #e50914; color: #fff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 16px; border: none; cursor: pointer; transition: 0.2s; box-sizing: border-box; }
          .btn:hover { background: #b20710; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon ${statusClass}">${isSuccessful ? "✓" : "✕"}</div>
          <h2>${title}</h2>
          <p>${statusMsg}</p>
          <div class="info">
            <div><span>Transaction ID:</span><strong>${txnid}</strong></div>
            <div><span>Amount:</span><strong>₹${amount || order.amount}</strong></div>
            <div><span>Status:</span><strong style="color: ${isSuccessful ? '#22c55e' : '#ef4444'}">${(status || "FAILED").toUpperCase()}</strong></div>
          </div>
          <button class="btn" onclick="finishAndReturn()">Return to ChulbulPlay App</button>
        </div>
        <script>
          function finishAndReturn() {
            // Post message for webview wrapper
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ status: "${statusClass}", txnid: "${txnid}" }));
            }
            // Flutter InAppWebView JavaScript handler
            if (window.flutter_inappwebview) {
              window.flutter_inappwebview.callHandler('paymentCompleted', { status: "${statusClass}", txnid: "${txnid}" });
            }
            // Try deep link fallback
            window.location.href = "chulbulplay://${isSuccessful ? 'payment-success' : 'payment-failed'}?txnid=${txnid}";
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;

    return res.status(200).send(html);
  } catch (err) {
    console.error("Handle Easebuzz Return Error:", err);
    return res.status(500).send("<h3>An error occurred processing the payment return.</h3>");
  }
};

// =====================================================
// 3. EASEBUZZ WEBHOOK
// POST /api/payment/easebuzz/webhook
// =====================================================
exports.handleEasebuzzWebhook = async (req, res) => {
  try {
    const data = req.body;
    const { txnid, status, easepayid } = data;

    if (!txnid) {
      return res.status(400).json({ success: false, message: "Missing txnid" });
    }

    const salt = process.env.EASEBUZZ_SALT;
    const isHashValid = verifyResponseHash(data, salt);

    if (!isHashValid) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const order = await EasebuzzOrder.findOne({ txnid });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if ((status || "").toLowerCase() === "success") {
      await fulfillEasebuzzOrder(order, easepayid || txnid, data);
    } else {
      order.status = "failed";
      order.rawResponse = data;
      await order.save();
    }

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("Easebuzz Webhook Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================================
// 4. CHECK EASEBUZZ PAYMENT STATUS
// GET /api/payment/easebuzz/status/:txnid
// =====================================================
exports.checkEasebuzzStatus = async (req, res) => {
  try {
    const { txnid } = req.params;
    if (!txnid) {
      return res.status(400).json({ success: false, message: "txnid parameter is required" });
    }

    const order = await EasebuzzOrder.findOne({ txnid }).populate("plan");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "completed") {
      const subscription = await Subscription.findOne({
        $or: [{ subscriptionId: order.txnid }, { paymentId: order.easepayid }],
      }).populate("plan");

      return res.status(200).json({
        success: true,
        status: "completed",
        message: "Payment already verified and subscription is active",
        subscription,
      });
    }

    // Attempt server inquiry with Easebuzz retrieve API if order is still initiated
    if (isEasebuzzConfigured()) {
      try {
        const config = await PaymentConfig.getConfig();
        const baseUrl = getBaseUrl(config.easebuzzMode);
        const key = process.env.EASEBUZZ_KEY;
        const salt = process.env.EASEBUZZ_SALT;

        const retrieveHashString = [
          key,
          order.txnid,
          Number(order.amount).toFixed(2),
          order.customerEmail || "",
          order.customerPhone || "",
          salt,
        ].join("|");

        const hash = crypto.createHash("sha512").update(retrieveHashString).digest("hex");

        const retrievePayload = new URLSearchParams({
          key,
          txnid: order.txnid,
          amount: Number(order.amount).toFixed(2),
          email: order.customerEmail || "",
          phone: order.customerPhone || "",
          hash,
        });

        const checkRes = await axios.post(`${baseUrl}transaction/v1/retrieve`, retrievePayload.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000,
        });

        const resData = checkRes.data;
        if (resData.status && resData.msg && (resData.msg.status || "").toLowerCase() === "success") {
          const subscription = await fulfillEasebuzzOrder(order, resData.msg.easepayid || order.txnid, resData);
          return res.status(200).json({
            success: true,
            status: "completed",
            message: "Payment successfully verified via Easebuzz enquiry",
            subscription,
          });
        }
      } catch (inquiryErr) {
        console.warn("Easebuzz status inquiry failed:", inquiryErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      status: order.status,
      message: `Payment status is ${order.status}`,
    });
  } catch (err) {
    console.error("Check Easebuzz Status Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to check Easebuzz payment status",
    });
  }
};
