const Plan = require("../models/plan.model");

// GET ACTIVE PLANS (Supports ?platform=app or ?platform=website)
exports.getPlans = async (req, res) => {
  try {
    const platform = (req.query.platform || req.headers["x-platform"] || "").toLowerCase();

    const query = { isActive: true };

    if (platform === "website") {
      query.platform = "website";
    } else if (platform === "app") {
      query.$or = [
        { platform: "app" },
        { platform: { $exists: false } },
        { platform: null },
      ];
    }

    const plans = await Plan.find(query).sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      platform: platform || "all",
      count: plans.length,
      plans,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};