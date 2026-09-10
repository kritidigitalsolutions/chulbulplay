const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");


// =====================================================
// 🔐 CREATE / VERIFY SUBSCRIPTION
// =====================================================
exports.verifySubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      planId,
      promoCode,
    } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const rawPlatform = ((req.body.platform || req.headers["x-platform"] || plan.platform || "app") + "").trim().toLowerCase();
    const resolvedPlatform = rawPlatform === "website" || rawPlatform === "web" || rawPlatform === "browser" ? "website" : "app";

    // ========================================
    // CHECK EXISTING SUBSCRIPTION FOR THIS PLATFORM
    // ========================================
    const platformFilter = [
      { platform: resolvedPlatform },
    ];
    if (resolvedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let existing = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    }).sort({ createdAt: -1 });

    if (existing) {
      existing = await expireSubscriptionIfNeeded(existing);

      if (existing && existing.status === "active") {
        return res.status(400).json({
          success: false,
          platform: resolvedPlatform,
          message: `Already have an active ${resolvedPlatform === "website" ? "website" : "mobile app"} subscription`,
        });
      }
    }

    // ========================================
    // FINAL AMOUNT
    // ========================================
    let finalAmount = plan.price;

    // ========================================
    // APPLY PROMO
    // ========================================
    if (promoCode) {
      const promo = await Promo.findOne({
        code: promoCode.toUpperCase(),
      });

      if (!promo || !promo.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid promo code",
        });
      }

      // promo expiry
      if (promo.expiryDate && promo.expiryDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Promo expired",
        });
      }

      // promo usage limit
      if (promo.usedCount >= promo.maxUses) {
        return res.status(400).json({
          success: false,
          message: "Promo usage limit reached",
        });
      }

      // percentage discount
      if (promo.discountType === "percentage") {
        finalAmount -= (finalAmount * promo.discountValue) / 100;
      } else {
        // flat discount
        finalAmount -= promo.discountValue;
      }

      // avoid negative amount
      if (finalAmount < 0) {
        finalAmount = 0;
      }

      promo.usedCount += 1;
      await promo.save();
    }

    // ========================================
    // CREATE SUBSCRIPTION
    // ========================================
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      platform: resolvedPlatform,
      amount: finalAmount,
      startDate,
      endDate,
      status: "active",
    });

    await User.findByIdAndUpdate(userId, {
      $push: { subscriptions: subscription._id },
    });

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (err) {
    console.error("Verify Subscription Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// 🔁 CANCEL SUBSCRIPTION
// =====================================================
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.body;

    if (!subscriptionId || !userId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId and userId required",
      });
    }

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled",
    });
  } catch (error) {
    console.error("Cancel Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// 🧠 CHECK SUBSCRIPTION STATUS (BY PLATFORM: app / website)
// =====================================================
exports.checkSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const requestedPlatform = (req.query.platform || req.headers["x-platform"] || "app").toLowerCase();

    const platformFilter = [
      { platform: requestedPlatform },
    ];
    if (requestedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let subscription = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    }).populate("plan").sort({ createdAt: -1 });

    // If not found with platform field, fallback to checking populated plan platform
    if (!subscription) {
      const allActive = await Subscription.find({
        user: userId,
        status: "active",
      }).populate("plan").sort({ createdAt: -1 });

      for (const sub of allActive) {
        const subPlatform = sub.platform || (sub.plan && sub.plan.platform) || "app";
        if (subPlatform === requestedPlatform) {
          subscription = sub;
          break;
        }
      }
    }

    // auto expire
    if (subscription) {
      subscription = await expireSubscriptionIfNeeded(subscription);
    }

    // invalid subscription
    if (!subscription || subscription.status !== "active") {
      return res.status(403).json({
        success: false,
        platform: requestedPlatform,
        message: `No active subscription for ${requestedPlatform}`,
      });
    }

    // remaining days
    let remainingDays = 0;
    if (subscription.endDate) {
      remainingDays = Math.max(
        0,
        Math.ceil(
          (new Date(subscription.endDate) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      );
    }

    res.status(200).json({
      success: true,
      platform: requestedPlatform,
      subscription,
      remainingDays,
    });
  } catch (error) {
    console.error("Check Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};