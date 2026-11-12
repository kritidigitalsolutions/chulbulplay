const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const UserLoginLog = require("../models/userLoginLog.model");

// In-memory throttle map to avoid excessive DB writes on rapid parallel API calls
const activityThrottleMap = new Map();
const ACTIVITY_THROTTLE_MS = 45 * 1000;

/**
 * Detect whether a request originated from WEB or mobile APP without requiring client changes.
 */
const detectPlatform = (req) => {
  if (!req) return "APP";

  const explicit = String(
    req.headers?.["x-platform"] || req.body?.platform || req.query?.platform || ""
  )
    .trim()
    .toLowerCase();

  if (explicit === "web" || explicit === "website") return "WEB";
  if (explicit === "app" || explicit === "android" || explicit === "ios") return "APP";

  const ua = String(req.headers?.["user-agent"] || "").toLowerCase();
  const origin = String(req.headers?.origin || req.headers?.referer || "").toLowerCase();

  // Explicit native app / mobile HTTP clients
  if (
    ua.includes("dart/") ||
    ua.includes("flutter") ||
    ua.includes("okhttp") ||
    ua.includes("dalvik") ||
    ua.includes("cfnetwork") ||
    ua.includes("alamofire") ||
    ua.includes("reactnative") ||
    ua.includes("expo")
  ) {
    return "APP";
  }

  // Browser Origin or Referer strongly indicates Website
  if (origin.startsWith("http://") || origin.startsWith("https://")) {
    return "WEB";
  }

  // Standard desktop/mobile web browser User-Agent
  if (
    ua.includes("mozilla/") &&
    (ua.includes("chrome/") ||
      ua.includes("safari/") ||
      ua.includes("firefox/") ||
      ua.includes("edg/"))
  ) {
    return "WEB";
  }

  return "APP";
};

const getClientIp = (req) => {
  if (!req) return "";
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
};

/**
 * Record a fresh user login event + update User's lastLoginAt / lastActiveAt.
 */
const recordUserLogin = async ({ user, method = "OTP", req }) => {
  try {
    if (!user || !user._id) return;

    const now = new Date();
    const platform = detectPlatform(req);
    const ipAddress = getClientIp(req);
    const userAgent = String(req?.headers?.["user-agent"] || "").slice(0, 300);

    await Promise.all([
      User.updateOne(
        { _id: user._id },
        {
          $set: {
            lastLoginAt: now,
            lastActiveAt: now,
            lastLoginMethod: method,
            lastPlatform: platform,
          },
        }
      ),
      UserLoginLog.create({
        user: user._id,
        method,
        platform,
        loginAt: now,
        lastActiveAt: now,
        ipAddress,
        userAgent,
      }),
    ]);

    activityThrottleMap.set(user._id.toString(), now.getTime());
  } catch (err) {
    console.error("Login monitor record error:", err.message);
  }
};

/**
 * Update user's lastActiveAt & latest session log (throttled per user).
 */
const touchUserActivity = ({ userId, req }) => {
  try {
    if (!userId) return;
    const idStr = userId.toString();
    const nowMs = Date.now();
    const prevMs = activityThrottleMap.get(idStr) || 0;

    if (nowMs - prevMs < ACTIVITY_THROTTLE_MS) {
      return;
    }

    // Periodically prune stale map entries if map grows large
    if (activityThrottleMap.size > 5000) {
      const cutoff = nowMs - 10 * 60 * 1000;
      for (const [key, ts] of activityThrottleMap.entries()) {
        if (ts < cutoff) activityThrottleMap.delete(key);
      }
    }

    activityThrottleMap.set(idStr, nowMs);

    const now = new Date(nowMs);
    const platform = detectPlatform(req);

    // Fire-and-forget DB updates
    User.updateOne(
      { _id: userId },
      {
        $set: {
          lastActiveAt: now,
          lastPlatform: platform,
        },
      }
    ).catch((err) => console.error("Activity user update error:", err.message));

    UserLoginLog.findOneAndUpdate(
      { user: userId },
      { $set: { lastActiveAt: now } },
      { sort: { loginAt: -1 } }
    ).catch((err) => console.error("Activity log update error:", err.message));
  } catch (err) {
    console.error("Touch user activity error:", err.message);
  }
};

/**
 * Non-blocking global middleware for /api/* routes (excluding /api/admin) to passively track
 * authenticated user activity even on public endpoints if they send a Bearer token.
 */
const silentActivityTracker = (req, res, next) => {
  try {
    if (req.originalUrl && req.originalUrl.startsWith("/api/admin")) {
      return next();
    }

    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id && decoded.role === "USER") {
            touchUserActivity({ userId: decoded.id, req });
          }
        } catch {
          // Ignore invalid/expired token here; route's own isAuth will handle auth enforcement
        }
      }
    }
  } catch {
    // Never block any request
  }
  next();
};

module.exports = {
  detectPlatform,
  recordUserLogin,
  touchUserActivity,
  silentActivityTracker,
};

