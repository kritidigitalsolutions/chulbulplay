const express = require("express");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");
const { getClientUploadConfig } = require("../../cdn/bunnyCDN");
const upload = require("../../middlewares/upload.middleware");

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

// Bunny CDN Config Route (For frontend direct upload)
router.get("/bunny-config", isAdmin, async (req, res) => {
  try {
    const config = await getClientUploadConfig();
    res.json(config);
  } catch (error) {
    res.status(503).json({ success: false, message: error.message });
  }
});

// Fallback upload route when direct Bunny CDN upload fails
router.post("/bunny-upload", isAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  res.json({ success: true, url: req.file.cdnUrl || req.file.path });
});

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
