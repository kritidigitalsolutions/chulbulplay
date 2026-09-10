const User = require("../models/user.model");


// ========================================
// GET PROFILE
// ========================================
exports.getProfile = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.user.id
    ).select("-__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error(
      "Get Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// COMPLETE PROFILE
// ========================================
exports.completeProfile = async (
  req,
  res
) => {
  try {
   const {
    name,
    email,
    age,
} = req.body;
    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ================================
    // BLOCK SECOND TIME COMPLETION
    // ================================
    if (user.profileComplete) {
      return res.status(400).json({
        success: false,
        message:
          "Profile already completed. Use update-profile API.",
      });
    }

    // prevent duplicate email
    if (email) {
      const existingEmail =
        await User.findOne({
          email,
        });

      if (
        existingEmail &&
        existingEmail._id.toString() !==
          user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email already in use",
        });
      }
    }

    // update fields
    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email
        .trim()
        .toLowerCase();
    }

    // handle profile image
    if (req.file) {
      user.profileImage =
        req.file.path.replace(/\\/g, "/");
    }
    if (age !== undefined) {
    if (age < 1 || age > 120) {
        return res.status(400).json({
            success: false,
            message: "Age must be between 1 and 120",
        });
    }

    user.age = Number(age);
}

    user.profileComplete = true;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Profile completed successfully",
      user,
    });

  } catch (error) {
    console.error(
      "Complete Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// UPDATE PROFILE
// ========================================
exports.updateProfile = async (
  req,
  res
) => {
  try {
    const {
    name,
    email,
    age,
} = req.body;

    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // duplicate email check
    if (email) {
      const existingEmail =
        await User.findOne({
          email,
        });

      if (
        existingEmail &&
        existingEmail._id.toString() !==
          user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email already in use",
        });
      }
    }

    // update fields
    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email
        .trim()
        .toLowerCase();
    }

    // handle profile image
    if (req.file) {
      user.profileImage = req.file.path.replace(/\\/g, "/");
    }
    if (age !== undefined) {
    if (age < 1 || age > 120) {
        return res.status(400).json({
            success: false,
            message: "Age must be between 1 and 120",
        });
    }

    user.age = Number(age);
}

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user,
    });

  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// SAVE FCM TOKEN
// ========================================
exports.saveFcmToken = async (req, res) => {
  try {
    console.log("FCM TOKEN SAVE REQUEST - Body:", req.body, "User ID from JWT:", req.user?.id || req.user?._id);
    
    const rawToken = req.body.fcmToken || req.body.token || req.body.fcm_token;
    const fcmToken =
      typeof rawToken === "string"
        ? rawToken.trim()
        : "";

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required in request body (fcmToken, fcm_token, or token)",
      });
    }

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found in token",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Unset this token from any other users to prevent multiple deliveries
    await User.updateMany(
      {
        _id: { $ne: user._id },
        fcmToken,
      },
      {
        $unset: {
          fcmToken: "",
          fcmTokenUpdatedAt: "",
        },
      }
    );

    user.fcmToken = fcmToken;
    user.fcmTokenUpdatedAt = new Date();

    await user.save();

    console.log(`✅ FCM token saved successfully for user ${user._id} (${user.phone})`);

    res.status(200).json({
      success: true,
      message: "FCM token connected to user successfully",
      userId: user._id,
      hasFcmToken: true,
    });
  } catch (error) {
    console.error("Save FCM Token Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

