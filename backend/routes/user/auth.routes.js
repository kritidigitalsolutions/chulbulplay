const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  googleLogin,
  firebasePhoneLogin,
} = require("../../controllers/auth.controller");


// ========================================
// SEND OTP
// ========================================
router.post(
  "/send-otp",
  sendOTP
);


// ========================================
// VERIFY OTP
// ========================================
router.post(
  "/verify-otp",
  verifyOtp
);

// ========================================
// GOOGLE LOGIN
// ========================================
router.post(
  "/google-login",
  googleLogin
);

// ========================================
// FIREBASE PHONE LOGIN
// Mobile app verifies OTP via Firebase SDK, sends the
// resulting Firebase ID token here to get our app JWT.
// ========================================
router.post(
  "/firebase-phone-login",
  firebasePhoneLogin
);


module.exports = router;