const express = require("express");
const router = express.Router();
const { getHomeContent, searchContent } = require("../../controllers/content.controller");

router.get("/", getHomeContent);
router.get("/search", searchContent);

module.exports = router;
