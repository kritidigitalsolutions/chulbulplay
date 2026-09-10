const express = require("express");
const router = express.Router();


const {isAdmin }= require("../../middlewares/admin.middleware");

const {
  addHelp,
  getAllHelp,
  updateHelp,
  deleteHelp,
  toggleHelp,
  getContactInfo,
  updateContactInfo
} = require("../../controllers/admin/help.controller");

router.use(isAdmin);

router.get("/contact-info", getContactInfo);
router.put("/contact-info", updateContactInfo);

router.post("/", addHelp);
router.get("/", getAllHelp);
router.put("/:id", updateHelp);
router.delete("/:id", deleteHelp);
router.patch("/:id/toggle", toggleHelp);

module.exports = router;