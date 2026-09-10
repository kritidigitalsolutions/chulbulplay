const express = require("express");

const router = express.Router();

const {
  getCompanyInfo,
} = require("../../controllers/companyInfo.controller");

// Public API
router.get("/", getCompanyInfo);

module.exports = router;