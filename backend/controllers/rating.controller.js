const Rating = require("../models/rating.model");
const User = require("../models/user.model");

// ⭐ ADD / UPDATE RATING (USER)
exports.addOrUpdateRating = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, review } = req.body;

        // validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        let existing = await Rating.findOne({ user: userId });

        // 🔁 Update
        if (existing) {
            existing.rating = rating;
            existing.review = review || existing.review;
            await existing.save();

            return res.json({
                success: true,
                message: "Rating updated",
                rating: existing
            });
        }

        // ➕ Create
        const newRating = await Rating.create({
            user: userId,
            rating,
            review
        });

        res.json({
            success: true,
            message: "Rating added",
            rating: newRating
        });

    } catch (error) {
        console.error("Rating Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// ⭐ GET ALL RATINGS (ADMIN)
exports.getAllRatings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";

        let query = {};

        // Search Filter (by User name or email)
        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ]
            }).select("_id");

            const userIds = users.map((u) => u._id);
            query.user = { $in: userIds };
        }

        // Calculate overall average rating and total count
        const stats = await Rating.aggregate([
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        const overallRating = stats.length > 0 ? parseFloat(stats[0].averageRating.toFixed(1)) : 0;

        // Count matching search documents
        const matchCount = await Rating.countDocuments(query);

        const ratings = await Rating.find(query)
            .populate("user", "name email phone profileImage")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            ratings,
            overallRating,
            pagination: {
                total: matchCount,
                page,
                limit,
                pages: Math.ceil(matchCount / limit),
            }
        });

    } catch (error) {
        console.error("Fetch Ratings Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ⭐ DELETE RATING (ADMIN)
exports.deleteRating = async (req, res) => {
    try {
        const { id } = req.params;

        const rating = await Rating.findById(id);
        if (!rating) {
            return res.status(404).json({
                success: false,
                message: "Rating not found",
            });
        }

        await Rating.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Rating deleted successfully",
        });

    } catch (error) {
        console.error("Delete Rating Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};