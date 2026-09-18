const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const createDefaultAdmin = require("./utils/createDefaultAdmin");

require("dotenv").config();

const app = express();

// Connect Database and Create Admin (for Serverless/Vercel)
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  connectDB().then(() => {
    createDefaultAdmin();
  });
}

// ========================================
// MIDDLEWARES
// ========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
  : [];
const adminUrls = process.env.ADMIN_URL
  ? process.env.ADMIN_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
  : [];

const defaultAllowed = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://admin.chulbulplay.in",
  "https://chulbulplay.in",
  "https://www.chulbulplay.in",
  "https://api.chulbulplay.in",
  "https://chulbulplay-admin.vercel.app",
  "https://chulbulplay.vercel.app",
  "https://chulbulplay-lnew.vercel.app/"
];

const allowedOrigins = [...new Set([...frontendUrls, ...adminUrls, ...defaultAllowed].filter(Boolean))];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check exact matches or wildcard
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // Dynamic pattern matching for development / Vercel preview environments / Local Wi-Fi IPs
    const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
    const isLanIp = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin);
    const isChulbulPlayDomain =
      (origin.endsWith(".vercel.app") && origin.includes("chulbul")) ||
      origin.endsWith(".chulbulplay.in") ||
      origin === "https://chulbulplay.in";

    if (isLocalhost || isLanIp || isChulbulPlayDomain) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString("utf8");
  },
}));

app.use(
  express.urlencoded({
    extended: true,
  })
);

// Serve local uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));





// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
  res.send(
    "ChulbulPlay Backend Running 🚀"
  );
});


// ========================================
// ADMIN ROUTES
// ========================================
const adminAuthRoutes = require(
  "./routes/admin/auth.routes"
);

const adminUserRoutes = require(
  "./routes/admin/user.routes"
);

const movieRoutes = require(
  "./routes/admin/movie.routes"
);

const seriesRoutes = require(
  "./routes/admin/series.routes"
);

const episodeRoutes = require(
  "./routes/admin/episode.routes"
);


const movieUserRoutes = require("./routes/user/movie.routes");
const seriesUserRoutes = require("./routes/user/series.routes");
const contentAdminRoutes = require("./routes/admin/content.routes");
const contentUserRoutes = require("./routes/user/content.routes");

const updateUpcomingStatus = require("./middlewares/updateUpcomingStatus.middleware");

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

app.use(
  "/api/admin/users",
  adminUserRoutes
);

app.use(
  "/api/admin/user",
  adminUserRoutes
);

app.use(
  "/api/admin/movies",
  updateUpcomingStatus,
  movieRoutes
);

app.use(
  "/api/admin/series",
  updateUpcomingStatus,
  seriesRoutes
);

app.use(
  "/api/admin/episodes",
  episodeRoutes
);

app.use(
  "/api/admin/content",
  updateUpcomingStatus,
  contentAdminRoutes
);


// ========================================
// USER ROUTES
// ========================================
const authRoutes = require(
  "./routes/user/auth.routes"
);

const userRoutes = require(
  "./routes/user/user.routes"
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/user",
  userRoutes
);

app.use("/api/movies", updateUpcomingStatus, movieUserRoutes);

app.use("/api/series", updateUpcomingStatus, seriesUserRoutes);

app.use("/api/content", updateUpcomingStatus, contentUserRoutes);

//legal routes for admin
const adminLegal = require("./routes/admin/legal.routes");
app.use("/api/admin/legal", adminLegal);

//legal routes for user
const userLegal = require("./routes/user/legal.routes");
app.use("/api/legal", userLegal);


//help routes
const helpAdminRoutes = require("./routes/admin/help.routes");
const helpUserRoutes = require("./routes/user/help.routes");

app.use("/api/admin/help", helpAdminRoutes);
app.use("/api/help", helpUserRoutes);

//rating routes
const ratingRoutes = require("./routes/user/rating.routes");
app.use("/api/rating", ratingRoutes);

//plan routes
const adminPlanRoutes = require("./routes/admin/plan.routes");
const userPlanRoutes = require("./routes/user/plan.routes");

app.use("/api/admin/plan", adminPlanRoutes);
app.use("/api/plan", userPlanRoutes);

//category routes
const adminCategoryRoutes = require("./routes/admin/category.routes");
const userCategoryRoutes = require("./routes/user/category.routes");

const { seedDefaults: seedCategories } = require("./controllers/admin/category.controller");
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/categories", userCategoryRoutes);
// Seed default categories (trending, top10, recommended) on startup
seedCategories().catch(err => console.error("Category seed error:", err));

//promo routes
const adminPromoRoutes = require("./routes/admin/promo.routes");
app.use("/api/admin/promo", adminPromoRoutes);
const userPromoRoutes = require("./routes/user/promo.routes");
app.use("/api/promo", userPromoRoutes);

//voucher routes for admin
const adminVoucherRoutes = require("./routes/admin/voucher.routes");
app.use("/api/admin/voucher", adminVoucherRoutes);

//voucher routes for user
const userVoucherRoutes = require("./routes/user/voucher.routes");
app.use("/api/voucher", userVoucherRoutes);

//subscription routes
const adminSubscriptionRoutes = require("./routes/admin/subscription.routes");
const userSubscriptionRoutes = require("./routes/user/subscription.routes");

app.use("/api/admin/subscription", adminSubscriptionRoutes);
app.use("/api/subscription", userSubscriptionRoutes);

//watchlist routes
const watchlistRoutes = require("./routes/user/watchlist.routes");
app.use("/api/watchlist", watchlistRoutes);

//notification routes
const adminNotificationRoutes = require("./routes/admin/notification.routes");
const userNotificationRoutes = require("./routes/user/notification.routes");
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/notifications", userNotificationRoutes);

//company routes
const adminCompanyRoutes = require("./routes/admin/companyInfo.routes");
const userCompanyRoutes = require("./routes/user/companyInfo.routes");
app.use("/api/admin/companyInfo", adminCompanyRoutes);
app.use("/api/companyInfo", userCompanyRoutes);

//interactions routes
const interactionRoutes = require("./routes/user/interation.routes");
app.use("/api/interaction", interactionRoutes);

// ========= Payment Gateways ===============
const paymentRoutes = require("./routes/user/payment.routes");
const adminPaymentSettingsRoutes = require("./routes/admin/paymentSettings.routes");
app.use("/api/payment", paymentRoutes);
app.use("/api/admin/payment-settings", adminPaymentSettingsRoutes);

// ========= Google AdMob ===============
const adminAdmobRoutes = require("./routes/admin/admob.routes");
app.use("/api/admin/admob", adminAdmobRoutes);

// ========================================
// EXPORT
// ========================================
module.exports = app;
