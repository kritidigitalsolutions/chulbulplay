const express = require("express");
const router = express.Router();

const {
  createPromo,
  getPromos,
  deletePromo,
  updatePromo
} = require("../../controllers/admin/promo.controller");


const { isAdmin } = require("../../middlewares/admin.middleware");

// 🔐 ADMIN ONLY
router.post("/", isAdmin, createPromo);
router.get("/", isAdmin, getPromos);
router.delete("/:id", isAdmin, deletePromo);
router.put("/:id", isAdmin, updatePromo);

module.exports = router;