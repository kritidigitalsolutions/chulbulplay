const Subscription = require(
  "../../models/subscription.model"
);

const User = require(
  "../../models/user.model"
);

const Plan = require(
  "../../models/plan.model"
);


// =====================================================
// AUTO EXPIRE OLD SUBSCRIPTIONS
// =====================================================
const expireOldSubscriptions =
  async () => {

    await Subscription.updateMany(
      {
        status: "active",
        endDate: {
          $lt: new Date(),
        },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );
  };


// =====================================================
// 💰 GET TOTAL REVENUE
// =====================================================
exports.getRevenue = async (
  req,
  res
) => {
  try {

    // auto cleanup
    await expireOldSubscriptions();

    const subscriptions =
      await Subscription.find();

    // count paid subscriptions only
    const validSubs =
      subscriptions.filter(
        (sub) =>
          (sub.amount || 0) > 0
      );

    const totalRevenue =
      validSubs.reduce(
        (sum, sub) => {
          return (
            sum +
            (sub.amount || 0)
          );
        },
        0
      );

    res.status(200).json({
      success: true,
      revenue: totalRevenue,
    });

  } catch (err) {

    console.error(
      "Get Revenue Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// 📊 GET SUBSCRIPTION STATS
// =====================================================
exports.getSubscriptionStats =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const now = new Date();

      const [
        totalUsers,
        activeSubscriptionUsers,
        expiredSubscriptionCount,
      ] = await Promise.all([
        User.countDocuments(),

        Subscription.distinct(
          "user",
          {
            status: "active",
            endDate: {
              $gte: now,
            },
          }
        ),

        Subscription.countDocuments({
          status: "expired",
        }),
      ]);

      const totalSubscribedUsers =
        activeSubscriptionUsers.length;

      const totalNotSubscribedUsers =
        Math.max(
          totalUsers -
            totalSubscribedUsers,
          0
        );

      res.status(200).json({
        success: true,

        data: {
          totalSubscribedUsers,

          totalNotSubscribedUsers,

          expirySubscriptionCount:
            expiredSubscriptionCount,
        },
      });

    } catch (err) {

      console.error(
        "Subscription Stats Error:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// =====================================================
// 💵 GET INCOME STATS
// =====================================================
exports.getIncomeStats =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const now = new Date();

      const startOfToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      const startOfTomorrow =
        new Date(startOfToday);

      startOfTomorrow.setDate(
        startOfTomorrow.getDate() + 1
      );

      const startOfYesterday =
        new Date(startOfToday);

      startOfYesterday.setDate(
        startOfYesterday.getDate() -
          1
      );

      const startOfWeek =
        new Date(startOfToday);

      const dayOfWeek =
        startOfToday.getDay();

      startOfWeek.setDate(
        startOfWeek.getDate() -
          dayOfWeek
      );

      const startOfMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      const startOfYear =
        new Date(
          now.getFullYear(),
          0,
          1
        );

      const sumAmount =
        async (match) => {

          const result =
            await Subscription.aggregate([
              {
                $match: match,
              },

              {
                $group: {
                  _id: null,

                  total: {
                    $sum: {
                      $ifNull: [
                        "$amount",
                        0,
                      ],
                    },
                  },
                },
              },
            ]);

          return (
            result[0]?.total || 0
          );
        };

      const baseMatch = {
        amount: { $gt: 0 },
      };

      const [
        todayIncome,
        yesterdayIncome,
        weeklyIncome,
        monthlyIncome,
        yearlyIncome,
        totalIncome,
      ] = await Promise.all([
        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfToday,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte:
              startOfYesterday,
            $lt: startOfToday,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfWeek,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfMonth,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount({
          ...baseMatch,

          createdAt: {
            $gte: startOfYear,
            $lt: startOfTomorrow,
          },
        }),

        sumAmount(baseMatch),
      ]);

      res.status(200).json({
        success: true,

        data: {
          todayIncome,
          yesterdayIncome,
          weeklyIncome,
          monthlyIncome,
          yearlyIncome,
          totalIncome,
        },
      });

    } catch (err) {

      console.error(
        "Income Stats Error:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// =====================================================
// 📋 GET ALL SUBSCRIPTIONS
// =====================================================
exports.getAllSubscriptions =
  async (req, res) => {
    try {

      // auto cleanup
      await expireOldSubscriptions();

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";
      const status = req.query.status || "";

      let query = {};

      // 1. Status Filter
      if (status && status !== "all") {
        query.status = status;
      }

      // 2. Platform Filter
      const platform = (req.query.platform || "").toLowerCase();
      if (platform === "website") {
        query.platform = "website";
      } else if (platform === "app") {
        query.$or = [
          { platform: "app" },
          { platform: { $exists: false } },
          { platform: null },
        ];
      }

      // 3. Search Filter (by User name or email)
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

      const total = await Subscription.countDocuments(query);

      const subscriptions =
        await Subscription.find(query)
          .populate(
            "user",
            "name email phone profileImage"
          )
          .populate("plan")
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit);

      res.status(200).json({
        success: true,
        subscriptions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        }
      });

    } catch (error) {

      console.error(
        "Get All Subscriptions Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

// =====================================================
// 🗑️ DELETE SUBSCRIPTION
// =====================================================
exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    await Subscription.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });

  } catch (error) {
    console.error("Delete Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 🔁 CANCEL SUBSCRIPTION (ADMIN)
// =====================================================
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription,
    });

  } catch (error) {
    console.error("Cancel Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// ➕ CREATE SUBSCRIPTION (ADMIN)
// =====================================================
exports.createSubscription = async (req, res) => {
  try {
    const { user, plan, amount, currency, startDate, endDate, paymentId, subscriptionId } = req.body;

    if (!user || !plan || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "user, plan, startDate, and endDate are required fields",
      });
    }

    const planDoc = await Plan.findById(plan);
    const subPlatform = req.body.platform || planDoc?.platform || "app";

    const subData = {
      user,
      plan,
      platform: subPlatform,
      amount: amount || 0,
      currency: currency || "INR",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "active",
    };

    if (paymentId && paymentId.trim()) {
      subData.paymentId = paymentId.trim();
    }
    if (subscriptionId && subscriptionId.trim()) {
      subData.subscriptionId = subscriptionId.trim();
    }

    const newSub = await Subscription.create(subData);

    await User.findByIdAndUpdate(user, {
      $push: { subscriptions: newSub._id }
    });

    const populatedSub = await Subscription.findById(newSub._id)
      .populate("user", "name email phone profileImage")
      .populate("plan");

    res.status(201).json({
      success: true,
      message: "Subscription assigned successfully",
      subscription: populatedSub,
    });

  } catch (error) {
    console.error("Create Subscription Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};