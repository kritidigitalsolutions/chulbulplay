const User = require("../../models/user.model");
const Subscription = require("../../models/subscription.model");
const Watchlist = require("../../models/watchlist.model");
const Rating = require("../../models/rating.model");
const Interaction = require("../../models/interaction.model");
const Notification = require("../../models/notification.model");
const Voucher = require("../../models/voucher.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");


// ========================================
// GET ALL USERS
// ========================================
exports.getAllUsers = async (
    req,
    res
) => {
    try {
        const users = await User.aggregate([
            {
                $lookup: {
                    from: "subscriptions",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$user", "$$userId"] },
                                        { $eq: ["$status", "active"] },
                                        { $gte: ["$endDate", new Date()] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "activeSubs"
                }
            },
            {
                $addFields: {
                    isSubscriber: { $gt: [{ $size: "$activeSubs" }, 0] }
                }
            },
            {
                $project: {
                    activeSubs: 0,
                    __v: 0
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });

    } catch (error) {
        console.error(
            "Get Users Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ========================================
// GET SINGLE USER
// ========================================
exports.getSingleUser = async (
    req,
    res
) => {
    try {
        const user = await User.findById(
            req.params.id
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
            "Get Single User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ========================================
// DELETE USER
// ========================================
exports.deleteUser = async (
    req,
    res
) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Cascade delete user data from other collections
        await Promise.all([
            Subscription.deleteMany({ user: userId }),
            Watchlist.deleteMany({ user: userId }),
            Rating.deleteMany({ user: userId }),
            Interaction.deleteMany({ user: userId }),
            Notification.deleteMany({ targetUser: userId }),
            Notification.updateMany({}, { $pull: { readBy: { user: userId }, deletedBy: { user: userId } } }),
            Voucher.updateMany({ usedBy: userId }, { $set: { isUsed: false, usedBy: null } }),
            Movie.updateMany({}, { $pull: { likes: userId, dislikes: userId } }),
            Series.updateMany({}, { $pull: { likes: userId, dislikes: userId } }),
        ]);

        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error) {
        console.error(
            "Delete User Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getRegistrationStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const [todayCount, yesterdayCount, totalCount] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
            User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
            User.countDocuments({}),
        ]);

        res.status(200).json({
            success: true,
            data: {
                todayRegistration: todayCount,
                yesterdayRegistration: yesterdayCount,
                totalRegistration: totalCount,
            },
        });
    } catch (error) {
        console.error("Get Registration Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getUserGrowth = async (req, res) => {
    try {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const growthData = [];

        // Loop for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const count = await User.countDocuments({
                createdAt: { $gte: d, $lt: nextD },
            });

            growthData.push({
                day: daysOfWeek[d.getDay()],
                users: count,
            });
        }

        res.status(200).json({
            success: true,
            data: growthData,
        });
    } catch (error) {
        console.error("Get User Growth Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Helper: Format phone number
const formatIndianPhone = (phone) => {
    const cleaned = String(phone).replace(/\D/g, "");
    if (cleaned.length === 10) {
        return "+91" + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
        return "+" + cleaned;
    }
    return phone;
};

// ========================================
// CREATE USER
// ========================================
exports.createUser = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        const formattedPhone = formatIndianPhone(phone);

        // Check unique phone
        const existingPhone = await User.findOne({ phone: formattedPhone });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: "Phone number already in use",
            });
        }

        // Check unique email if provided
        if (email) {
            const trimmedEmail = email.trim().toLowerCase();
            const existingEmail = await User.findOne({ email: trimmedEmail });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email already in use",
                });
            }
        }

        // Handle profile image upload
        let profileImage = "";
        if (req.file) {
            profileImage = req.file.path.replace(/\\/g, "/");
        } else if (req.files && req.files.length > 0) {
            const file = req.files.find(f => f.fieldname === "profileImage") || req.files[0];
            profileImage = file.path.replace(/\\/g, "/");
        }

        const newUser = await User.create({
            name: name || "User",
            email: email ? email.trim().toLowerCase() : undefined,
            phone: formattedPhone,
            role: role || "USER",
            profileImage,
            profileComplete: true,
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser,
        });
    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ========================================
// UPDATE USER
// ========================================
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, role, profileComplete } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (phone) {
            const formattedPhone = formatIndianPhone(phone);
            const existingPhone = await User.findOne({ phone: formattedPhone, _id: { $ne: id } });
            if (existingPhone) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number already in use",
                });
            }
            user.phone = formattedPhone;
        }

        if (email !== undefined) {
            if (email === "") {
                user.email = undefined;
            } else {
                const trimmedEmail = email.trim().toLowerCase();
                const existingEmail = await User.findOne({ email: trimmedEmail, _id: { $ne: id } });
                if (existingEmail) {
                    return res.status(400).json({
                        success: false,
                        message: "Email already in use",
                    });
                }
                user.email = trimmedEmail;
            }
        }

        if (name !== undefined) user.name = name;
        if (role !== undefined) user.role = role;

        if (profileComplete !== undefined) {
            user.profileComplete = profileComplete === "true" || profileComplete === true;
        }

        // Handle profile image upload
        if (req.file) {
            user.profileImage = req.file.path.replace(/\\/g, "/");
        } else if (req.files && req.files.length > 0) {
            const file = req.files.find(f => f.fieldname === "profileImage") || req.files[0];
            user.profileImage = file.path.replace(/\\/g, "/");
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user,
        });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ========================================
// TOGGLE BLOCK USER
// ========================================
exports.toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
            isBlocked: user.isBlocked,
            user,
        });
    } catch (error) {
        console.error("Toggle Block User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};