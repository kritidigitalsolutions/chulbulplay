const Subscription = require("../models/subscription.model");

// ========================================
// AUTO EXPIRE SUBSCRIPTION
// ========================================
const expireSubscriptionIfNeeded = async (
  subscription
) => {
  try {

    if (!subscription) {
      return null;
    }

    const now = new Date();

    // expire subscription automatically
    if (
      subscription.status === "active" &&
      subscription.endDate &&
      now > subscription.endDate
    ) {

      subscription.status = "expired";

      await subscription.save();
    }

    return subscription;

  } catch (error) {

    console.error(
      "Expire Subscription Error:",
      error
    );

    return subscription;
  }
};

module.exports = {
  expireSubscriptionIfNeeded,
};