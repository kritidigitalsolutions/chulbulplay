const jwt = require("jsonwebtoken");

const OTP = require("../models/user.otp.model");
const User = require("../models/user.model");

const { admin } = require("../config/firebase");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const axios = require("axios");

const DUMMY_OTP_PHONE = "+919999999999";
const DUMMY_OTP_CODE = "123456";

const isDummyOtpPhone = (phone) =>
  phone === DUMMY_OTP_PHONE;

// ========================================
// FORMAT INDIAN PHONE
// ========================================
const formatIndianPhone = (phone) => {
  const cleaned = String(phone).replace(
    /\D/g,
    ""
  );

  if (cleaned.length === 10) {
    return "+91" + cleaned;
  }

  if (
    cleaned.length === 12 &&
    cleaned.startsWith("91")
  ) {
    return "+" + cleaned;
  }

  return phone;
};
// ========================================
// SEND SMS
// ========================================
const sendSMS = async (phone, otp) => {
  try {
    // 1. SMS Gateway Hub (Primary) — active when credentials are set in .env
    if (
      process.env.SMS_GH_API_KEY &&
      process.env.SMS_GH_SENDER_ID &&
      process.env.SMS_GH_OTP_TEXT
    ) {
      try {
        const message = process.env.SMS_GH_OTP_TEXT.replace("{{otp}}", otp);
        // Strip country code — SMS GH expects 10-digit Indian number
        const mobileNumber = phone.replace(/^\+91/, "").replace(/\D/g, "");

        const response = await axios.get(
          "https://www.smsgatewayhub.com/api/mt/SendSMS",
          {
            params: {
              APIKey:        process.env.SMS_GH_API_KEY,
              senderid:      process.env.SMS_GH_SENDER_ID,
              channel:       "2",
              DCS:           0,
              flashsms:      0,
              number:        mobileNumber,
              text:          message,
              route:         process.env.SMS_GH_ROUTE || "47",
              EntityId:      process.env.SMS_GH_ENTITY_ID,
              dlttemplateid: process.env.SMS_GH_DLT_TEMPLATE_ID,
            },
            timeout: 10000,
          }
        );

        console.log("📨 SMS Gateway Hub response:", JSON.stringify(response.data));

        // SMS GH returns ErrorCode 000 on success
        const errorCode = response.data?.ErrorCode || response.data?.Status;
        if (errorCode === "000" || errorCode === "Success" || response.status === 200) {
          console.log(`✅ OTP SMS sent to ${phone} via SMS Gateway Hub`);
          return true;
        } else {
          console.error("❌ SMS Gateway Hub returned error:", response.data);
          // fall through to console fallback
        }
      } catch (err) {
        console.error("❌ SMS Gateway Hub Error:", err.response?.data || err.message);
        // fall through to console fallback
      }
    }

    // 2. 2Factor.in (Secondary fallback — only if TWO_FACTOR_API_KEY is set)
    const twoFactorKey = process.env.TWO_FACTOR_API_KEY && process.env.TWO_FACTOR_API_KEY.trim();
    if (twoFactorKey && !twoFactorKey.startsWith("your_")) {
      try {
        const formattedPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
        const template = process.env.TWO_FACTOR_TEMPLATE_NAME ? `/${process.env.TWO_FACTOR_TEMPLATE_NAME}` : "";
        const url = `https://2factor.in/API/V1/${twoFactorKey}/SMS/${formattedPhone}/${otp}${template}`;
        const response = await axios.get(url, { timeout: 10000 });
        console.log("📨 2Factor SMS response:", response.data);
        return true;
      } catch (err) {
        console.error("❌ 2Factor SMS Error:", err.response?.data || err.message);
      }
    }

    // 3. Console fallback — when no SMS provider is configured
    console.log("========================================");
    console.log(`🔐 [OTP CONSOLE FALLBACK] Phone: ${phone} | OTP: ${otp}`);
    console.log("========================================");
    return true;
  } catch (error) {
    console.error("SMS Handler Error:", error.message);
    console.log(`🔐 [OTP CONSOLE FALLBACK] Phone: ${phone} | OTP: ${otp}`);
    return true;
  }
};


// ========================================
// GENERATE USER TOKEN
// ========================================
const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "365d",
      issuer: process.env.JWT_ISSUER || "chulbulplay",
      audience: process.env.JWT_AUDIENCE || "chulbulplay-app",
    }
  );
};

// ========================================
// SEND OTP
// ========================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    // indian mobile validation
    const phoneRegex =
      /^\+91[6-9]\d{9}$/;

    if (
      !phoneRegex.test(normalizedPhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid Indian mobile number",
      });
    }

    const isDummyPhone =
      isDummyOtpPhone(normalizedPhone);

    // rate limit
    if (!isDummyPhone) {
      const recentOtp =
        await OTP.findOne({
          phone: normalizedPhone,
          createdAt: {
            $gt: new Date(
              Date.now() - 60 * 1000
            ),
          },
        });

      if (recentOtp) {
        return res.status(429).json({
          success: false,
          message:
            "Please wait before requesting another OTP",
        });
      }
    }

    const otp = isDummyPhone
      ? DUMMY_OTP_CODE
      : Math.floor(
          100000 + Math.random() * 900000
        ).toString();

    if (isDummyPhone) {
      await User.updateOne(
        { phone: normalizedPhone },
        {
          $setOnInsert: {
            phone: normalizedPhone,
            role: "USER",
          },
        },
        { upsert: true }
      );
    } else {
      // remove old otp
      await OTP.deleteMany({
        phone: normalizedPhone,
      });

      // save new otp
      await OTP.create({
        phone: normalizedPhone,
        otp,
        expiresAt: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      });
    }

    // check if user exists
    const user = await User.findOne({
      phone: normalizedPhone,
    });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    const isNewUser =
      !user || !user.profileComplete;

    // console otp
 const smsSent =
  isDummyPhone ||
  (await sendSMS(
    normalizedPhone,
    otp
  ));

if (!smsSent) {
  return res.status(500).json({
    success: false,
    message:
      "Failed to send OTP",
  });
}

console.log(
  `📱 OTP for ${normalizedPhone}: ${otp}`
);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      isNewUser,
      ...((process.env.NODE_ENV !== "production" || isDummyPhone) && { otp }),
    });

  } catch (error) {
    console.error(
      "SEND OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
    });
  }
};


// ========================================
// VERIFY OTP
// ========================================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Phone and OTP are required",
      });
    }

    const normalizedPhone =
      formatIndianPhone(phone);

    const normalizedOtp = String(
      otp
    ).trim();

    const isDummyOtp =
      isDummyOtpPhone(normalizedPhone) &&
      normalizedOtp === DUMMY_OTP_CODE;

    const otpRecord = isDummyOtp
      ? null
      : await OTP.findOne({
        phone: normalizedPhone,
        otp: normalizedOtp,
        expiresAt: {
          $gt: new Date(),
        },
      }).sort({
        createdAt: -1,
      });

    // wrong otp
    if (!isDummyOtp && !otpRecord) {
      const existing =
        await OTP.findOne({
          phone: normalizedPhone,
          expiresAt: {
            $gt: new Date(),
          },
        });

      if (existing) {
        existing.attempts =
          (existing.attempts || 0) + 1;

        await existing.save();

        if (existing.attempts >= 5) {
          await OTP.deleteOne({
            _id: existing._id,
          });

          return res.status(429).json({
            success: false,
            message:
              "Too many wrong attempts. Request new OTP.",
          });
        }
      }

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    // delete otp after success
    if (otpRecord) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });
    }

    // check user
    let user = await User.findOne({
      phone: normalizedPhone,
    });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    // create user automatically
    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        role: "USER",
      });
    }

    const rawFcmToken =
      req.body.fcmToken || req.body.token;

    const normalizedFcmToken =
      typeof rawFcmToken === "string"
        ? rawFcmToken.trim()
        : "";

    if (normalizedFcmToken) {
      await User.updateMany(
        {
          _id: { $ne: user._id },
          fcmToken: normalizedFcmToken,
        },
        {
          $unset: {
            fcmToken: "",
            fcmTokenUpdatedAt: "",
          },
        }
      );

      user.fcmToken = normalizedFcmToken;
      user.fcmTokenUpdatedAt = new Date();

      await user.save();
    }

    // generate token
    const token =
      generateUserToken(user);

    const isNewUser = !user.profileComplete;

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",

      token,
      isNewUser,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage:
          user.profileImage,
        profileComplete:
          user.profileComplete,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Verification failed",
    });
  }
};

// ========================================
// GOOGLE LOGIN
// ========================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken, token, fcmToken } = req.body;

    if (!idToken && !token) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    let uid;
    let email;
    let name;
    let picture;

    if (idToken) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({
          success: false,
          message: "Google client ID is not configured",
        });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      uid = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      // Backward compatibility for Firebase Auth clients.
      const decodedToken = await admin.auth().verifyIdToken(token);

      uid = decodedToken.uid;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account email not found",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find existing user by Google UID or by Email
    let user = await User.findOne({
      $or: [
        { googleId: uid },
        { email: normalizedEmail }
      ]
    });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    let isNewUser = false;

    // Create new user if not exists
    if (!user) {
      isNewUser = true;

      // We generate a highly unique temporary/placeholder phone string using UID and random characters
      // to guarantee uniqueness and avoid duplicate key errors on the unique phone index.
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const tempPhone = `google_${uid.substring(0, 10)}_${uniqueSuffix}`;

      user = await User.create({
        name: name || "User",
        email: normalizedEmail,
        profileImage: picture || "",
        googleId: uid,
        authProvider: "GOOGLE",
        profileComplete: true,
        phone: tempPhone,
      });
    } else {
      // If the user exists but hasn't linked Google credentials yet, link them!
      let updated = false;
      if (!user.googleId) {
        user.googleId = uid;
        updated = true;
      }
      if (user.authProvider !== "GOOGLE") {
        user.authProvider = "GOOGLE";
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Save FCM Token & disassociate it from any other users to prevent duplicate alerts
    if (fcmToken && typeof fcmToken === "string") {
      const normalizedFcmToken = fcmToken.trim();
      if (normalizedFcmToken) {
        await User.updateMany(
          {
            _id: { $ne: user._id },
            fcmToken: normalizedFcmToken,
          },
          {
            $unset: {
              fcmToken: "",
              fcmTokenUpdatedAt: "",
            },
          }
        );

        user.fcmToken = normalizedFcmToken;
        user.fcmTokenUpdatedAt = new Date();
        await user.save();
      }
    }

    // Generate JWT
    const appToken = generateUserToken(user);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: appToken,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
};

// ========================================
// FIREBASE PHONE LOGIN
// Mobile app uses Firebase Phone Auth SDK to send & verify OTP.
// After verification, Firebase gives the app an ID token.
// App sends that token here → we verify it → return our own JWT.
// ========================================
exports.firebasePhoneLogin = async (req, res) => {
  try {
    const { firebaseToken, fcmToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    // Verify the Firebase ID token with Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    } catch (err) {
      console.error("Firebase token verification failed:", err.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token",
      });
    }

    // Firebase Phone Auth always has phone_number in the token
    const firebasePhone = decodedToken.phone_number;

    if (!firebasePhone) {
      return res.status(400).json({
        success: false,
        message: "No phone number found in Firebase token",
      });
    }

    // Normalize to +91 format
    const normalizedPhone = formatIndianPhone(firebasePhone);

    // Check if user is blocked
    let user = await User.findOne({ phone: normalizedPhone });

    if (user && user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    // Create user if not exists
    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        role: "USER",
      });
    }

    // Handle FCM token
    const normalizedFcmToken =
      typeof fcmToken === "string" ? fcmToken.trim() : "";

    if (normalizedFcmToken) {
      // Remove this FCM token from any other user
      await User.updateMany(
        { _id: { $ne: user._id }, fcmToken: normalizedFcmToken },
        { $unset: { fcmToken: "", fcmTokenUpdatedAt: "" } }
      );

      user.fcmToken = normalizedFcmToken;
      user.fcmTokenUpdatedAt = new Date();
      await user.save();
    }

    // Generate JWT
    const token = generateUserToken(user);
    const isNewUser = !user.profileComplete;

    return res.status(200).json({
      success: true,
      message: "Phone login successful",
      token,
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("FIREBASE PHONE LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Phone login failed",
    });
  }
};
