const express = require("express");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  loginAdmin,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  getAdminProfile,
} = require("../../controllers/admin_auth/admin.auth.controller");

const {
  sendPasswordOtp,
  changePassword,
  sendEmailOtp,
  changeEmail,
} = require("../../controllers/admin_auth/admin.settings.controller");


// Admin Login
router.post(
  "/login",
  loginAdmin
);

// Get own profile
router.get(
  "/profile",
  isAdmin,
  getAdminProfile
);

// Bunny CDN routes are disabled while uploads are stored locally. Movie and
// other content upload endpoints use the shared local upload middleware.

//OTP
router.post(
  "/send-otp",
  sendForgotPasswordOtp
);

router.post(
  "/verify-otp",
  verifyForgotPasswordOtp
);

router.post(
  "/reset-password",
  resetForgotPassword
);

// --- CHANGE PASSWORD FLOW (Authenticated) ---
router.post(
  "/change-password/send-otp",
  isAdmin,
  sendPasswordOtp
);

router.post(
  "/change-password",
  isAdmin,
  changePassword
);

// --- CHANGE EMAIL FLOW (Authenticated) ---
router.post(
  "/change-email/send-otp",
  isAdmin,
  sendEmailOtp
);

router.post(
  "/change-email",
  isAdmin,
  changeEmail
);



module.exports = router;
