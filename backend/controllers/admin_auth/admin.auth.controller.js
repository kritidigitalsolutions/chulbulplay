const Admin = require("../../models/admin.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminOtp = require("../../models/admin.otp.model");
const nodemailer = require("nodemailer");

const emailUser = process.env.EMAIL_USER || process.env.EMAIL;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account disabled",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* FORGOT PASSWORD - SEND OTP */
exports.sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    const otp = generateOtp();

    await AdminOtp.deleteMany({
      email: email.toLowerCase(),
      purpose: "forgot-password",
    });

    await AdminOtp.create({
      email: email.toLowerCase(),
      otp,
      purpose: "forgot-password",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (emailUser && emailPass) {
      try {
        await transporter.sendMail({
          from: emailUser,
          to: email.toLowerCase(),
          subject: "Forgot Password OTP",
          html: `<h3>Your OTP is ${otp}</h3><p>Valid for 5 minutes.</p>`,
        });
      } catch (mailErr) {
        console.error("Admin OTP email error:", mailErr.message);
        console.log(`🔑 [ADMIN FORGOT-PASSWORD OTP]: Email: ${email} | OTP: ${otp}`);
      }
    } else {
      console.log(`🔑 [ADMIN FORGOT-PASSWORD OTP]: Email: ${email} | OTP: ${otp}`);
    }

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* FORGOT PASSWORD - VERIFY OTP */
exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const record = await AdminOtp.findOne({
      email: email.toLowerCase(),
      otp,
      purpose: "forgot-password",
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* FORGOT PASSWORD - RESET */
exports.resetForgotPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const record = await AdminOtp.findOne({
      email: email.toLowerCase(),
      otp,
      purpose: "forgot-password",
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    await AdminOtp.deleteMany({
      email: email.toLowerCase(),
      purpose: "forgot-password",
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password -__v");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    res.json({
      success: true,
      admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
