const Subscription = require("../../models/subscription.model");
const User = require("../../models/user.model");
const Plan = require("../../models/plan.model");
const RazorpayOrder = require("../../models/razorpayOrder.model");
const EasebuzzOrder = require("../../models/easebuzzOrder.model");
const SabpaisaOrder = require("../../models/sabpaisaOrder.model");
const axios = require("axios");
const crypto = require("crypto");

// =====================================================
// AUTO EXPIRE OLD SUBSCRIPTIONS
// =====================================================
const expireOldSubscriptions = async () => {
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
exports.getRevenue = async (req, res) => {
  try {
    await expireOldSubscriptions();

    const subscriptions = await Subscription.find();
    const validSubs = subscriptions.filter((sub) => (sub.amount || 0) > 0);

    const totalRevenue = validSubs.reduce((sum, sub) => sum + (sub.amount || 0), 0);

    res.status(200).json({
      success: true,
      revenue: totalRevenue,
    });
  } catch (err) {
    console.error("Get Revenue Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// 📊 GET SUBSCRIPTION STATS
// =====================================================
exports.getSubscriptionStats = async (req, res) => {
  try {
    await expireOldSubscriptions();

    const now = new Date();

    const [
      totalUsers,
      activeSubscriptionUsers,
      activeSubscriptionCount,
      expiredSubscriptionCount,
      cancelledSubscriptionCount,
      allSubscriptions,
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.distinct("user", {
        status: "active",
        endDate: { $gte: now },
      }),
      Subscription.countDocuments({
        status: "active",
        endDate: { $gte: now },
      }),
      Subscription.countDocuments({
        status: "expired",
      }),
      Subscription.countDocuments({
        status: "cancelled",
      }),
      Subscription.find({ amount: { $gt: 0 } }).select("amount status"),
    ]);

    const totalSubscribedUsers = activeSubscriptionUsers.length;
    const totalNotSubscribedUsers = Math.max(totalUsers - totalSubscribedUsers, 0);
    const totalRevenue = allSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSubscribedUsers,
        totalNotSubscribedUsers,
        activeSubscriptionCount,
        expirySubscriptionCount: expiredSubscriptionCount,
        expiredSubscriptionCount,
        cancelledSubscriptionCount,
        totalRevenue,
      },
    });
  } catch (err) {
    console.error("Subscription Stats Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// 💵 GET INCOME STATS
// =====================================================
exports.getIncomeStats = async (req, res) => {
  try {
    await expireOldSubscriptions();

    const now = new Date();
    const gateway = (req.query.gateway || "all").toLowerCase();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfWeek = new Date(startOfToday);
    const dayOfWeek = startOfToday.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const baseMatch = {
      amount: { $gt: 0 },
    };

    if (gateway && gateway !== "all") {
      baseMatch.paymentGateway = gateway;
    }

    const sumAmount = async (match) => {
      const result = await Subscription.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: {
              $sum: { $ifNull: ["$amount", 0] },
            },
          },
        },
      ]);
      return result[0]?.total || 0;
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
          $gte: startOfYesterday,
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
    console.error("Income Stats Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// 📋 GET ALL SUBSCRIPTIONS
// =====================================================
exports.getAllSubscriptions = async (req, res) => {
  try {
    await expireOldSubscriptions();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim().toLowerCase();
    const platform = (req.query.platform || "").trim().toLowerCase();
    const gateway = (req.query.gateway || "").trim().toLowerCase();
    const plan = (req.query.plan || "").trim();
    const sort = (req.query.sort || "newest").trim().toLowerCase();

    let query = {};

    // 1. Status Filter
    if (status && status !== "all") {
      query.status = status;
    }

    // 2. Platform Filter
    if (platform && platform !== "all") {
      if (platform === "website") {
        query.platform = "website";
      } else if (platform === "app") {
        query.$or = [
          { platform: "app" },
          { platform: { $exists: false } },
          { platform: null },
        ];
      }
    }

    // 3. Gateway Filter
    if (gateway && gateway !== "all") {
      query.paymentGateway = gateway;
    }

    // 4. Plan Filter
    if (plan && plan !== "all") {
      query.plan = plan;
    }

    // 5. Search Filter (by User name, email, phone, or paymentId)
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((u) => u._id);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { user: { $in: userIds } },
          { paymentId: { $regex: search, $options: "i" } },
          { subscriptionId: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Sort order
    let sortObj = { createdAt: -1 };
    if (sort === "oldest") {
      sortObj = { createdAt: 1 };
    } else if (sort === "amount_high") {
      sortObj = { amount: -1 };
    } else if (sort === "amount_low") {
      sortObj = { amount: 1 };
    }

    const total = await Subscription.countDocuments(query);

    const subscriptions = await Subscription.find(query)
      .populate("user", "name email phone profileImage role")
      .populate("plan", "name price duration planType platform")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      subscriptions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Get All Subscriptions Error:", error);
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

    await User.findByIdAndUpdate(subscription.user, {
      $pull: { subscriptions: subscription._id },
    });

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
    const {
      user,
      plan,
      amount,
      currency,
      startDate,
      endDate,
      paymentId,
      subscriptionId,
      paymentGateway,
      platform,
    } = req.body;

    if (!user || !plan || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "user, plan, startDate, and endDate are required fields",
      });
    }

    const planDoc = await Plan.findById(plan);
    const subPlatform = platform || planDoc?.platform || "app";

    const subData = {
      user,
      plan,
      platform: subPlatform,
      amount: amount !== undefined ? Number(amount) : planDoc?.price || 0,
      currency: currency || "INR",
      paymentGateway: paymentGateway || "manual",
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
      $addToSet: { subscriptions: newSub._id },
    });

    const populatedSub = await Subscription.findById(newSub._id)
      .populate("user", "name email phone profileImage")
      .populate("plan", "name price duration planType platform");

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

// =====================================================
// 💳 GET GATEWAY TRANSACTIONS (RAZORPAY, EASEBUZZ, SABPAISA)
// =====================================================
exports.getGatewayTransactions = async (req, res) => {
  try {
    const gatewayFilter = (req.query.gateway || "all").toLowerCase();
    const limit = parseInt(req.query.limit) || 100;

    let allTransactions = [];

    // 1. Fetch live Razorpay payments if configured
    if (
      (gatewayFilter === "all" || gatewayFilter === "razorpay") &&
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET
    ) {
      try {
        const authHeader = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64");

        const rzpRes = await axios.get(
          `https://api.razorpay.com/v1/payments?count=${Math.min(limit, 50)}`,
          {
            headers: { Authorization: `Basic ${authHeader}` },
            timeout: 10000,
          }
        );

        const rzpItems = rzpRes.data?.items || [];

        // Match with razorpayOrders in DB to get user info if present
        const rzpOrderIds = rzpItems.map((p) => p.order_id).filter(Boolean);
        const dbRzpOrders = await RazorpayOrder.find({
          orderId: { $in: rzpOrderIds },
        })
          .populate("user", "name email phone")
          .populate("plan", "name price duration");

        const rzpOrdersMap = new Map();
        for (const o of dbRzpOrders) {
          rzpOrdersMap.set(o.orderId, o);
        }

        for (const p of rzpItems) {
          const dbOrder = rzpOrdersMap.get(p.order_id);
          allTransactions.push({
            id: p.id,
            gateway: "razorpay",
            orderId: p.order_id || "--",
            amount: p.amount ? p.amount / 100 : 0,
            currency: p.currency || "INR",
            status: p.status === "captured" ? "success" : p.status,
            rawStatus: p.status,
            method: p.method || "card",
            customerName: dbOrder?.user?.name || "Customer",
            customerEmail: p.email || dbOrder?.user?.email || "--",
            customerPhone: p.contact || dbOrder?.user?.phone || "--",
            userId: dbOrder?.user?._id || null,
            planName: dbOrder?.plan?.name || "Subscription Plan",
            planId: dbOrder?.plan?._id || null,
            createdAt: new Date(p.created_at * 1000),
            errorReason: p.error_description || null,
          });
        }
      } catch (rzpErr) {
        console.warn("Failed to fetch live Razorpay payments:", rzpErr.message);
      }
    }

    // 2. Fetch Easebuzz Orders from DB
    if (gatewayFilter === "all" || gatewayFilter === "easebuzz") {
      try {
        const ebOrders = await EasebuzzOrder.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("user", "name email phone")
          .populate("plan", "name price duration");

        for (const eb of ebOrders) {
          allTransactions.push({
            id: eb.easepayid || eb.txnid,
            gateway: "easebuzz",
            orderId: eb.txnid,
            amount: eb.amount || 0,
            currency: eb.currency || "INR",
            status: eb.status === "completed" ? "success" : eb.status,
            rawStatus: eb.status,
            method: "Online",
            customerName: eb.user?.name || "Customer",
            customerEmail: eb.customerEmail || eb.user?.email || "--",
            customerPhone: eb.customerPhone || eb.user?.phone || "--",
            userId: eb.user?._id || null,
            planName: eb.plan?.name || "Subscription Plan",
            planId: eb.plan?._id || null,
            createdAt: eb.createdAt,
            errorReason: null,
          });
        }
      } catch (ebErr) {
        console.warn("Failed to load Easebuzz orders:", ebErr.message);
      }
    }

    // 3. Fetch SabPaisa Orders from DB
    if (gatewayFilter === "all" || gatewayFilter === "sabpaisa") {
      try {
        const spOrders = await SabpaisaOrder.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("user", "name email phone")
          .populate("plan", "name price duration");

        for (const sp of spOrders) {
          const isSuccess = /success|completed/i.test(sp.status || "");
          allTransactions.push({
            id: sp.pgTxnNo || sp.clientTxnId,
            gateway: "sabpaisa",
            orderId: sp.clientTxnId,
            amount: sp.paidAmount || sp.amount || 0,
            currency: "INR",
            status: isSuccess ? "success" : (sp.status || "initiated").toLowerCase(),
            rawStatus: sp.status,
            method: sp.paymentMode || "Online",
            customerName: sp.user?.name || "Customer",
            customerEmail: sp.payerEmail || sp.user?.email || "--",
            customerPhone: sp.payerMobile || sp.user?.phone || "--",
            userId: sp.user?._id || null,
            planName: sp.plan?.name || "Subscription Plan",
            planId: sp.plan?._id || null,
            createdAt: sp.createdAt,
            errorReason: null,
          });
        }
      } catch (spErr) {
        console.warn("Failed to load SabPaisa orders:", spErr.message);
      }
    }

    // Sort by createdAt descending
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Check which transactions already have active / existing subscriptions
    const paymentIds = allTransactions.map((t) => t.id).filter(Boolean);
    const orderIds = allTransactions.map((t) => t.orderId).filter(Boolean);

    const existingSubs = await Subscription.find({
      $or: [
        { paymentId: { $in: paymentIds } },
        { subscriptionId: { $in: orderIds } },
      ],
    }).select("paymentId subscriptionId status user endDate");

    const subMap = new Map();
    for (const sub of existingSubs) {
      if (sub.paymentId) subMap.set(sub.paymentId, sub);
      if (sub.subscriptionId) subMap.set(sub.subscriptionId, sub);
    }

    const decoratedTransactions = allTransactions.map((t) => {
      const match = subMap.get(t.id) || subMap.get(t.orderId);
      return {
        ...t,
        status: match ? "success" : t.status,
        hasSubscription: Boolean(match),
        subscriptionStatus: match ? match.status : null,
        subscriptionId: match ? match._id : null,
      };
    });

    res.status(200).json({
      success: true,
      total: decoratedTransactions.length,
      transactions: decoratedTransactions,
    });
  } catch (error) {
    console.error("Get Gateway Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// ⚡ SYNC GATEWAY PAYMENTS INTO SUBSCRIPTIONS
// =====================================================
exports.syncGatewayPayments = async (req, res) => {
  try {
    let syncedCount = 0;
    const syncedItems = [];

    // 1. Sync Razorpay captured payments from live API
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64");

        const rzpRes = await axios.get(
          "https://api.razorpay.com/v1/payments?count=50",
          {
            headers: { Authorization: `Basic ${authHeader}` },
            timeout: 10000,
          }
        );

        const rzpPayments = rzpRes.data?.items || [];
        const capturedPayments = rzpPayments.filter((p) => p.status === "captured");

        // Find plans
        const defaultPlan = await Plan.findOne({ isActive: true }).sort({ sortOrder: 1 });

        for (const payment of capturedPayments) {
          // Check if subscription already exists
          const existing = await Subscription.findOne({
            $or: [{ paymentId: payment.id }, { subscriptionId: payment.order_id }],
          });

          if (!existing) {
            // Find order in DB if exists
            let order = null;
            if (payment.order_id) {
              order = await RazorpayOrder.findOne({ orderId: payment.order_id });
            }

            // Find user
            let userId = order?.user;
            if (!userId) {
              const cleanContact = (payment.contact || "").replace(/\D/g, "");
              const userByPhone = cleanContact
                ? await User.findOne({
                    phone: { $regex: cleanContact.slice(-10), $options: "i" },
                  })
                : null;
              const userByEmail = payment.email
                ? await User.findOne({ email: payment.email.trim().toLowerCase() })
                : null;
              userId = userByPhone?._id || userByEmail?._id;
            }

            if (userId) {
              const plan = (order && (await Plan.findById(order.plan))) || defaultPlan;
              const durationDays = plan?.duration || 30;
              const startDate = new Date(payment.created_at * 1000);
              const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

              const sub = await Subscription.create({
                user: userId,
                plan: plan?._id,
                platform: order?.platform || plan?.platform || "app",
                status: "active",
                paymentGateway: "razorpay",
                paymentId: payment.id,
                subscriptionId: payment.order_id || `RZP_${payment.id}`,
                amount: payment.amount ? payment.amount / 100 : plan?.price || 1,
                currency: payment.currency || "INR",
                startDate,
                endDate,
                createdAt: startDate,
                updatedAt: new Date(),
              });

              await User.findByIdAndUpdate(userId, {
                $addToSet: { subscriptions: sub._id },
              });

              if (order) {
                order.status = "completed";
                order.razorpayPaymentId = payment.id;
                await order.save();
              }

              syncedCount++;
              syncedItems.push({
                gateway: "razorpay",
                paymentId: payment.id,
                userId,
                subId: sub._id,
              });
            }
          }
        }
      } catch (rzpSyncErr) {
        console.warn("Razorpay sync error:", rzpSyncErr.message);
      }
    }

    // 2. Sync Easebuzz orders that have no subscription
    try {
      const ebOrders = await EasebuzzOrder.find()
        .sort({ createdAt: -1 })
        .limit(50);

      const ebKey = process.env.EASEBUZZ_KEY;
      const ebSalt = process.env.EASEBUZZ_SALT;
      const ebRetrieveUrl =
        (process.env.EASEBUZZ_MODE || "live").toLowerCase() === "live"
          ? "https://dashboard.easebuzz.in/transaction/v2/retrieve"
          : "https://testdashboard.easebuzz.in/transaction/v2/retrieve";

      for (const eb of ebOrders) {
        const existing = await Subscription.findOne({
          $or: [
            { paymentId: eb.easepayid },
            { paymentId: eb.txnid },
            { subscriptionId: eb.txnid },
          ],
        });

        if (existing) continue;

        let isSuccess = eb.status === "completed" || eb.status === "success";
        let easepayid = eb.easepayid;

        // If order is still 'initiated', verify directly with Easebuzz v2 retrieve API
        if (!isSuccess && ebKey && ebSalt && eb.txnid) {
          try {
            const retrieveHash = crypto
              .createHash("sha512")
              .update(`${ebKey}|${eb.txnid}|${ebSalt}`)
              .digest("hex");

            const payload = new URLSearchParams({
              key: ebKey,
              txnid: eb.txnid,
              hash: retrieveHash,
            });

            const checkRes = await axios.post(ebRetrieveUrl, payload.toString(), {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              timeout: 6000,
            });

            if (
              checkRes.data?.status &&
              (checkRes.data?.msg?.status || "").toLowerCase() === "success"
            ) {
              isSuccess = true;
              easepayid = checkRes.data.msg.easepayid || eb.txnid;
              eb.status = "completed";
              eb.easepayid = easepayid;
              await eb.save();
            }
          } catch (ebCheckErr) {
            // Silently continue to next order if retrieve fails
          }
        }

        if (isSuccess && eb.user) {
          const plan = eb.plan
            ? await Plan.findById(eb.plan)
            : await Plan.findOne({ isActive: true }).sort({ sortOrder: 1 });
          const durationDays = plan?.duration || 30;
          const startDate = eb.createdAt || new Date();
          const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

          const sub = await Subscription.create({
            user: eb.user,
            plan: plan?._id,
            platform: eb.platform || plan?.platform || "app",
            status: "active",
            paymentGateway: "easebuzz",
            paymentId: easepayid || eb.txnid,
            subscriptionId: eb.txnid,
            amount: eb.amount || plan?.price || 1,
            currency: eb.currency || "INR",
            startDate,
            endDate,
            createdAt: startDate,
            updatedAt: new Date(),
          });

          await User.findByIdAndUpdate(eb.user, {
            $addToSet: { subscriptions: sub._id },
          });

          syncedCount++;
          syncedItems.push({
            gateway: "easebuzz",
            paymentId: easepayid || eb.txnid,
            userId: eb.user,
            subId: sub._id,
          });
        }
      }
    } catch (ebSyncErr) {
      console.warn("Easebuzz sync error:", ebSyncErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Sync completed. ${syncedCount} payment(s) synchronized.`,
      syncedCount,
      syncedItems,
    });
  } catch (error) {
    console.error("Sync Gateway Payments Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// ⚡ SYNC SINGLE ORDER TO SUBSCRIPTION
// =====================================================
exports.syncSingleOrderToSubscription = async (req, res) => {
  try {
    const {
      transactionId,
      orderId,
      gateway,
      userId,
      phone,
      email,
      amount,
      planId,
      durationDays,
    } = req.body;

    const paymentId = transactionId || orderId;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "transactionId or orderId is required",
      });
    }

    // Check existing
    const existing = await Subscription.findOne({
      $or: [{ paymentId: paymentId }, { subscriptionId: orderId || paymentId }],
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Subscription already active for this transaction",
        subscription: existing,
      });
    }

    // Resolve User
    let resolvedUser = null;
    if (userId) {
      resolvedUser = await User.findById(userId);
    }
    if (!resolvedUser && phone) {
      const cleanPhone = phone.replace(/\D/g, "").slice(-10);
      resolvedUser = await User.findOne({
        phone: { $regex: cleanPhone, $options: "i" },
      });
    }
    if (!resolvedUser && email) {
      resolvedUser = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!resolvedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found for this transaction",
      });
    }

    // Resolve Plan
    let plan = null;
    if (planId) {
      plan = await Plan.findById(planId);
    }
    if (!plan) {
      plan = await Plan.findOne({ isActive: true }).sort({ sortOrder: 1 });
    }

    const duration = durationDays || plan?.duration || 30;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      user: resolvedUser._id,
      plan: plan?._id,
      platform: plan?.platform || "app",
      status: "active",
      paymentGateway: (gateway || "manual").toLowerCase(),
      paymentId: paymentId,
      subscriptionId: orderId || paymentId,
      amount: amount !== undefined ? Number(amount) : plan?.price || 1,
      currency: "INR",
      startDate,
      endDate,
    });

    await User.findByIdAndUpdate(resolvedUser._id, {
      $addToSet: { subscriptions: subscription._id },
    });

    // Mark order completed if exists
    if (gateway === "razorpay" && orderId) {
      await RazorpayOrder.updateOne(
        { orderId },
        { status: "completed", razorpayPaymentId: paymentId }
      );
    } else if (gateway === "easebuzz" && orderId) {
      await EasebuzzOrder.updateOne(
        { txnid: orderId },
        { status: "completed", easepayid: paymentId }
      );
    }

    const populated = await Subscription.findById(subscription._id)
      .populate("user", "name email phone profileImage")
      .populate("plan", "name price duration planType platform");

    res.status(200).json({
      success: true,
      message: "Payment successfully synchronized and subscription activated!",
      subscription: populated,
    });
  } catch (error) {
    console.error("Sync Single Order Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};