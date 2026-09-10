const express = require("express");
const router = express.Router();

const {
  createPlan,
  updatePlan,
  deletePlan,
  getAllPlans,
  togglePlanStatus,
} = require("../../controllers/admin/plan.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

// ================= ADMIN PLAN ROUTES =================

router.post("/", isAdmin, createPlan);
router.get("/", isAdmin, getAllPlans);
router.patch("/:id/toggle-status", isAdmin, togglePlanStatus);
router.patch("/:id", isAdmin, updatePlan);
router.delete("/:id", isAdmin, deletePlan);

module.exports = router;