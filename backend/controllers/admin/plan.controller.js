const Plan = require("../../models/plan.model");

// CREATE PLAN
exports.createPlan = async (req, res) => {
  try {
    const {
      name,
      price,
      duration,
      features,
      isActive,
      planType,
      sortOrder,
      isRecommended,
      platform,
    } = req.body;

    const plan = await Plan.create({
      name,
      price,
      duration,
      features,
      isActive: isActive !== undefined ? isActive : true,
      planType: planType || "monthly",
      sortOrder: sortOrder || 0,
      isRecommended: Boolean(isRecommended),
      platform: platform === "website" ? "website" : "app",
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      plan,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// UPDATE PLAN
exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      message: "Plan updated successfully",
      plan,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE PLAN
exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET ALL PLANS (ADMIN)
exports.getAllPlans = async (req, res) => {
  try {
    const platform = (req.query.platform || "").toLowerCase();
    const query = {};

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
      count: plans.length,
      platform: platform || "all",
      plans,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// TOGGLE PLAN STATUS
exports.togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({
      success: true,
      message: `Plan ${plan.isActive ? "activated" : "deactivated"} successfully`,
      isActive: plan.isActive,
      plan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};