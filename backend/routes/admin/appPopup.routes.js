const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const upload = require("../../middlewares/upload.middleware");
const controller = require("../../controllers/admin/appPopup.controller");

router.use(isAdmin);

router.get("/stats", controller.getPopupStats);
router.get("/", controller.getAllPopups);
router.post("/", upload.single("image"), controller.createPopup);
router.put("/:id", upload.single("image"), controller.updatePopup);
router.patch("/:id/toggle", controller.togglePopupStatus);
router.put("/:id/toggle-status", controller.togglePopupStatus);
router.delete("/:id", controller.deletePopup);

module.exports = router;

