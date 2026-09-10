const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");

const {
  getProfile,
  completeProfile,
  updateProfile,
  saveFcmToken,
} = require("../../controllers/user.controller");

// ========================================
// GET USER PROFILE
// ========================================
router.get(
  "/",
  isAuth,
  getProfile
);

router.get(
  "/profile",
  isAuth,
  getProfile
);

// ========================================
// COMPLETE PROFILE
// ========================================
router.post(
  "/complete-profile",
  isAuth,
  upload.single("profileImage"),
  completeProfile
);

// Fallback alias path for client profile info
router.post(
  "/profile-info",
  isAuth,
  upload.single("profileImage"),
  completeProfile
);

// ========================================
// UPDATE PROFILE
// ========================================
router.patch(
  "/update-profile",
  isAuth,
  upload.single("profileImage"),
  updateProfile
);

// ========================================
// CONNECT FCM TOKEN TO USER
// ========================================
router.patch(
  "/fcm-token",
  isAuth,
  saveFcmToken
);

router.post(
  "/fcm-token",
  isAuth,
  saveFcmToken
);

module.exports = router;
