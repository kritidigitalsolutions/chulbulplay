const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");

const protectSubscription = async (
  req,
  res,
  next
) => {
  try {
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const requestedPlatform = (req.query.platform || req.headers["x-platform"] || "app").toLowerCase();

    const platformFilter = [
      { platform: requestedPlatform },
    ];
    if (requestedPlatform === "app") {
      platformFilter.push({ platform: { $exists: false } });
      platformFilter.push({ platform: null });
    }

    // Find active subscription for user and platform
    let subscription = await Subscription.findOne({
      user: userId,
      status: "active",
      $or: platformFilter,
    }).populate("plan").sort({ createdAt: -1 });

    // Fallback if platform field wasn't set on document directly
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

    // no subscription found
    if (!subscription) {
      return res.status(403).json({
        success: false,
        platform: requestedPlatform,
        message: `Active ${requestedPlatform} subscription required`,
      });
    }

    // auto expire if needed
    subscription = await expireSubscriptionIfNeeded(subscription);

    // after expiry check
    if (subscription.status !== "active") {
      return res.status(403).json({
        success: false,
        platform: requestedPlatform,
        message: `Your ${requestedPlatform} subscription has expired`,
      });
    }

    req.subscription = subscription;
    next();

  } catch (error) {
    console.error("Subscription Protection Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = protectSubscription;