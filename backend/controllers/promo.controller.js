const Promo = require("../models/promocode.model");
const Plan = require("../models/plan.model");

// APPLY PROMO
exports.applyPromo = async (req, res) => {
  try {
    const { code, planId } = req.body;

    const promo = await Promo.findOne({ code: code.toUpperCase() });

    if (!promo || !promo.isActive) {
      return res.status(400).json({ message: "Invalid promo code" });
    }

    if (promo.expiryDate && promo.expiryDate < new Date()) {
      return res.status(400).json({ message: "Promo expired" });
    }

    if (promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ message: "Promo limit reached" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // check applicable plans
 if (
  promo.applicablePlans.length &&
  !promo.applicablePlans.some(
    id => id.toString() === plan._id.toString()
  )
) {
  return res.status(400).json({
    message: "Promo not valid for this plan"
  });
}

    let discount = 0;

    if (promo.discountType === "percentage") {
      discount = (plan.price * promo.discountValue) / 100;
    } else {
      discount = promo.discountValue;
    }

    const finalAmount = Math.max(plan.price - discount, 0);

    res.json({
      success: true,
      originalPrice: plan.price,
      discount,
      finalAmount
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};