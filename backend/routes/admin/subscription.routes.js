const express = require("express");
const router = express.Router();

const {
  getRevenue,
  getSubscriptionStats,
  getIncomeStats,
  getAllSubscriptions,
  deleteSubscription,
  cancelSubscription,
  createSubscription,
  getGatewayTransactions,
  syncGatewayPayments,
  syncSingleOrderToSubscription,
} = require("../../controllers/admin/subscription.controller");
const { isAdmin } = require("../../middlewares/admin.middleware");

router.get("/revenue", isAdmin, getRevenue);
router.get("/stats", isAdmin, getSubscriptionStats);
router.get("/income-stats", isAdmin, getIncomeStats);
router.get("/all", isAdmin, getAllSubscriptions);
router.get("/gateway-transactions", isAdmin, getGatewayTransactions);
router.post("/sync-gateway-payments", isAdmin, syncGatewayPayments);
router.post("/sync-single-order", isAdmin, syncSingleOrderToSubscription);
router.post("/", isAdmin, createSubscription);
router.delete("/:id", isAdmin, deleteSubscription);
router.patch("/:id/cancel", isAdmin, cancelSubscription);

module.exports = router;
