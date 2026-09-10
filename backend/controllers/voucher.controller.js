const Voucher = require("../models/voucher.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");


// =====================================================
// REDEEM VOUCHER
// =====================================================
exports.redeemVoucher = async (
  req,
  res
) => {
  try {

    const userId = req.user?.id || req.user?._id;

    const { code } = req.body;

    // ========================================
    // GET VOUCHER
    // ========================================

    const voucher =
      await Voucher.findOne({
        code: code.toUpperCase(),
      }).populate("plan");

    if (!voucher) {
      return res.status(400).json({
        success: false,
        message: "Invalid voucher",
      });
    }

    if (!voucher.plan) {
      return res.status(404).json({
        success: false,
        message: "Plan associated with voucher not found",
      });
    }

    // already used
    if (voucher.isUsed) {
      return res.status(400).json({
        success: false,
        message: "Already used",
      });
    }

    // voucher expired
    if (
      voucher.expiryDate &&
      voucher.expiryDate < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Voucher expired",
      });
    }

    const planPlatform = voucher.plan.platform || "app";

    // ========================================
    // CHECK EXISTING SUBSCRIPTION FOR THIS PLATFORM
    // ========================================

    const platformFilter = [{ platform: planPlatform }];
    if (planPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    let existing =
      await Subscription.findOne({
        user: userId,
        status: "active",
        $or: platformFilter,
      }).sort({ createdAt: -1 });

    if (existing) {
      existing =
        await expireSubscriptionIfNeeded(
          existing
        );

      if (
        existing &&
        existing.status === "active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `You already have an active ${planPlatform} subscription`,
        });
      }
    }

    // ========================================
    // CREATE SUBSCRIPTION
    // ========================================

    const startDate =
      new Date();

    const endDate =
      new Date();

    endDate.setUTCDate(
      endDate.getUTCDate() +
        (voucher.validityDays || voucher.plan.duration || 30)
    );

    const subscription =
      await Subscription.create({
        user: userId,
        plan: voucher.plan._id,
        platform: planPlatform,
        paymentGateway: "voucher",
        amount: 0,
        currency: "INR",
        startDate,
        endDate,
        status: "active",
      });

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: { subscriptions: subscription._id },
      });
    }

    // ========================================
    // UPDATE VOUCHER
    // ========================================

    voucher.isUsed = true;

    voucher.usedBy = userId;

    await voucher.save();

    res.status(200).json({
      success: true,
      message:
        "Voucher applied successfully",
      subscription,
    });

  } catch (err) {

    console.error(
      "Redeem Voucher Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};