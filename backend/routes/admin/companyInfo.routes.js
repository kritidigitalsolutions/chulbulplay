const express = require("express");

const router = express.Router();

const {
  getCompanyInfo,
  saveCompanyInfo,
  updateCompanyInfoStatus,
} = require("../../controllers/admin/companyInfo.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

// Get Company Info
router.get("/", isAdmin, getCompanyInfo);

// Create / Update Company Info
router.patch("/", isAdmin, saveCompanyInfo);

// Update Status
router.patch("/status", isAdmin, updateCompanyInfoStatus);

module.exports = router;