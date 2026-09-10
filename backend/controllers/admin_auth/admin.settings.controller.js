const Admin = require("../../models/admin.model");
const AdminOtp = require("../../models/admin.otp.model");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* SEND PASSWORD OTP */
exports.sendPasswordOtp = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required"
      });
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      admin.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect"
      });
    }

    const otp = generateOtp();

    await AdminOtp.deleteMany({
      email: admin.email
    });

    await AdminOtp.create({
      email: admin.email,
      otp,
      purpose: "change-password",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: "Password Change OTP",
      html: `<h3>Your OTP is ${otp}</h3><p>Valid for 5 minutes.</p>`
    });

    res.json({
      success: true,
      message: "OTP sent to your email"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* CHANGE PASSWORD */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, otp, newPassword } = req.body;

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (!oldPassword || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password, OTP, and new password are required"
      });
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      admin.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect"
      });
    }

    const record = await AdminOtp.findOne({
      email: admin.email,
      otp,
      purpose: "change-password",
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    await AdminOtp.findByIdAndDelete(record._id);

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* SEND EMAIL OTP */
exports.sendEmailOtp = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.email !== oldEmail.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Old email does not match"
      });
    }

    const exists = await Admin.findOne({
      email: newEmail.toLowerCase()
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "New email already in use"
      });
    }

    const otp = generateOtp();

    await AdminOtp.deleteMany({
      email: oldEmail.toLowerCase()
    });

    await AdminOtp.create({
      email: oldEmail.toLowerCase(),
      newEmail: newEmail.toLowerCase(),
      otp,
      purpose: "change-email",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: oldEmail.toLowerCase(),
      subject: "Email Change OTP",
      html: `<h3>Your OTP is ${otp}</h3><p>Valid for 5 minutes.</p>`
    });

    res.json({
      success: true,
      message: "OTP sent to old email"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* CHANGE EMAIL */
exports.changeEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail, otp } = req.body;

    const record = await AdminOtp.findOne({
      email: oldEmail.toLowerCase(),
      newEmail: newEmail.toLowerCase(),
      otp,
      purpose: "change-email",
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.email !== oldEmail.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Old email mismatch"
      });
    }

    admin.email = newEmail.toLowerCase();
    await admin.save();

    await AdminOtp.findByIdAndDelete(record._id);

    res.json({
      success: true,
      message: "Email changed successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};