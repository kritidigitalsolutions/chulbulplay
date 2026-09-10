const express = require("express");
const router = express.Router();

const {
  createVoucher,
  getVouchers,
  updateVoucher,
  deleteVoucher
} = require("../../controllers/admin/voucher.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

router.post("/", isAdmin, createVoucher);
router.get("/", isAdmin, getVouchers);
router.put("/:id", isAdmin, updateVoucher);
router.delete("/:id", isAdmin, deleteVoucher);

module.exports = router;