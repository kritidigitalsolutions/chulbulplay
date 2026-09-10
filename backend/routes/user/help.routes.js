const express = require("express");

const router = express.Router();

const {getPublishedHelp,getHelpByCategory, getAllHelp, getSupportNumber, getSupportEmail} = require("../../controllers/help.controller");


// ========================================
// GET ALL PUBLISHED HELP DATA
// ========================================
router.get("/",getPublishedHelp);


// ========================================
// GET SUPPORT CONTACT NUMBER
// ========================================
router.get("/support/number",getSupportNumber);


// ========================================
// GET SUPPORT EMAIL
// ========================================
router.get("/support/email",getSupportEmail);


// ========================================
// GET HELP BY CATEGORY
// ========================================
router.get("/:category",getHelpByCategory);


module.exports = router;