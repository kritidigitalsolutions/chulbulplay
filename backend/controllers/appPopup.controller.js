const mongoose = require("mongoose");
const AppPopup = require("../models/appPopup.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const { resolveLocalOrCdnUrl } = require("../utils/mediaUrl");

/**
 * Helper to build enriched content object
 */
const resolveContentDetails = async (contentType, contentId, cachedContent, req) => {
  if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
    if (cachedContent && (cachedContent.id || cachedContent.title)) {
      return {
        id: cachedContent.id || "",
        title: cachedContent.title || "",
        contentType: cachedContent.contentType || contentType || "",
        poster: resolveLocalOrCdnUrl(cachedContent.poster || "", req),
        banner: resolveLocalOrCdnUrl(cachedContent.banner || "", req),
      };
    }
    return null;
  }

  try {
    let contentDoc = null;
    const type = String(contentType || "").toLowerCase();

    if (type === "movie") {
      contentDoc = await Movie.findById(contentId).select("title poster banner").lean();
    } else if (type === "series") {
      contentDoc = await Series.findById(contentId).select("title poster banner").lean();
    } else {
      // Try movie first, then series
      contentDoc = await Movie.findById(contentId).select("title poster banner").lean();
      if (!contentDoc) {
        contentDoc = await Series.findById(contentId).select("title poster banner").lean();
      }
    }

    if (contentDoc) {
      return {
        id: contentDoc._id.toString(),
        title: contentDoc.title || "",
        contentType: type || (contentDoc.episodes ? "series" : "movie"),
        poster: resolveLocalOrCdnUrl(contentDoc.poster || "", req),
        banner: resolveLocalOrCdnUrl(contentDoc.banner || "", req),
      };
    }

    if (cachedContent && (cachedContent.id || cachedContent.title)) {
      return {
        id: cachedContent.id || String(contentId),
        title: cachedContent.title || "",
        contentType: cachedContent.contentType || contentType || "",
        poster: resolveLocalOrCdnUrl(cachedContent.poster || "", req),
        banner: resolveLocalOrCdnUrl(cachedContent.banner || "", req),
      };
    }

    return null;
  } catch (err) {
    console.error("Error resolving popup content:", err.message);
    return null;
  }
};

/**
 * Format popup document to client API contract
 */
const formatPopupResponse = async (doc, req) => {
  if (!doc) return null;

  const content = await resolveContentDetails(doc.contentType, doc.contentId, doc.content, req);

  return {
    id: doc._id.toString(),
    _id: doc._id.toString(),
    title: doc.title || "",
    description: doc.description || "",
    imageUrl: resolveLocalOrCdnUrl(doc.imageUrl || "", req),
    contentType: doc.contentType || "none",
    contentId: doc.contentId ? doc.contentId.toString() : null,
    content: content,
    actionButtonText: doc.actionButtonText || "Watch Now",
    actionUrl: doc.actionUrl || "",
    priority: typeof doc.priority === "number" ? doc.priority : 1,
    platform: doc.platform || "app",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  };
};

/**
 * GET /api/app-popup/active
 * Returns the single highest priority active popup for the app (or platform)
 */
exports.getActivePopup = async (req, res) => {
  try {
    const platform = req.query.platform || "app";

    const filter = { isActive: true };
    if (platform !== "all") {
      filter.platform = { $in: [platform, "all"] };
    }

    // Sort by priority ascending (1 = highest priority), then newest first
    const popupDoc = await AppPopup.findOne(filter).sort({ priority: 1, createdAt: -1 });

    if (!popupDoc) {
      return res.status(200).json({
        success: true,
        hasActivePopup: false,
        popup: null,
        popups: [],
      });
    }

    // Increment impressions silently in background
    AppPopup.findByIdAndUpdate(popupDoc._id, { $inc: { impressions: 1 } }).catch(() => {});

    const formatted = await formatPopupResponse(popupDoc, req);

    return res.status(200).json({
      success: true,
      hasActivePopup: true,
      popup: formatted,
    });
  } catch (error) {
    console.error("Error in getActivePopup:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve active popup",
    });
  }
};

/**
 * POST /api/app-popup/:id/action-completed
 * Record that user tapped the Action Button (Watch Now)
 */
exports.recordActionCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid popup ID",
      });
    }

    const updated = await AppPopup.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Popup not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Action button clicked. This popup should be dismissed permanently in the app.",
    });
  } catch (error) {
    console.error("Error in recordActionCompleted:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record action completed",
    });
  }
};

/**
 * POST /api/app-popup/:id/impression
 * Record popup view/impression
 */
exports.recordImpression = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid popup ID",
      });
    }

    await AppPopup.findByIdAndUpdate(id, { $inc: { impressions: 1 } });

    return res.status(200).json({
      success: true,
      message: "Impression recorded successfully",
    });
  } catch (error) {
    console.error("Error in recordImpression:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record impression",
    });
  }
};

/**
 * GET /api/app-popup/:id
 * Retrieve a single popup by ID
 */
exports.getPopupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid popup ID",
      });
    }

    const popupDoc = await AppPopup.findById(id);
    if (!popupDoc) {
      return res.status(404).json({
        success: false,
        message: "Popup not found",
      });
    }

    const formatted = await formatPopupResponse(popupDoc, req);

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Error in getPopupById:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch popup",
    });
  }
};

/**
 * GET /api/app-popup
 * Returns all active popups (for apps that support multiple popups / queue)
 */
exports.getAllActivePopups = async (req, res) => {
  try {
    const platform = req.query.platform || "app";

    const filter = { isActive: true };
    if (platform !== "all") {
      filter.platform = { $in: [platform, "all"] };
    }

    const list = await AppPopup.find(filter).sort({ priority: 1, createdAt: -1 });
    const formattedList = await Promise.all(list.map((doc) => formatPopupResponse(doc, req)));

    return res.status(200).json({
      success: true,
      hasActivePopup: formattedList.length > 0,
      total: formattedList.length,
      popups: formattedList,
      popup: formattedList[0] || null,
    });
  } catch (error) {
    console.error("Error in getAllActivePopups:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch active popups",
    });
  }
};
