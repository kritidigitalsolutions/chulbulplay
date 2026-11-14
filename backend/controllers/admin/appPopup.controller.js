const mongoose = require("mongoose");
const AppPopup = require("../../models/appPopup.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const { resolveLocalOrCdnUrl } = require("../../utils/mediaUrl");

/**
 * Helper to fetch content details snapshot
 */
const getContentSnapshot = async (contentType, contentId, req) => {
  if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
    return { id: "", title: "", contentType: "", poster: "", banner: "" };
  }

  try {
    const type = String(contentType || "").toLowerCase();
    let doc = null;

    if (type === "movie") {
      doc = await Movie.findById(contentId).select("title poster banner").lean();
    } else if (type === "series") {
      doc = await Series.findById(contentId).select("title poster banner").lean();
    } else {
      doc = await Movie.findById(contentId).select("title poster banner").lean();
      if (!doc) doc = await Series.findById(contentId).select("title poster banner").lean();
    }

    if (!doc) {
      return { id: String(contentId), title: "", contentType: type || "", poster: "", banner: "" };
    }

    return {
      id: doc._id.toString(),
      title: doc.title || "",
      contentType: type || (doc.episodes ? "series" : "movie"),
      poster: resolveLocalOrCdnUrl(doc.poster || "", req),
      banner: resolveLocalOrCdnUrl(doc.banner || "", req),
    };
  } catch (e) {
    console.error("Error getting content snapshot:", e.message);
    return { id: String(contentId), title: "", contentType: "", poster: "", banner: "" };
  }
};

/**
 * GET /api/admin/app-popup
 * Returns all popups with aggregate stats
 */
exports.getAllPopups = async (req, res) => {
  try {
    const popups = await AppPopup.find().sort({ priority: 1, createdAt: -1 }).lean();

    const total = popups.length;
    let active = 0;
    let inactive = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    const formatted = popups.map((p) => {
      if (p.isActive) active += 1;
      else inactive += 1;

      totalImpressions += Number(p.impressions) || 0;
      totalClicks += Number(p.clicks) || 0;

      return {
        ...p,
        id: p._id.toString(),
        imageUrl: resolveLocalOrCdnUrl(p.imageUrl, req),
        content: p.content
          ? {
              ...p.content,
              poster: resolveLocalOrCdnUrl(p.content.poster, req),
              banner: resolveLocalOrCdnUrl(p.content.banner, req),
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
      stats: {
        total,
        active,
        inactive,
        totalImpressions,
        totalClicks,
      },
    });
  } catch (error) {
    console.error("Error in getAllPopups:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch popups",
    });
  }
};

/**
 * GET /api/admin/app-popup/stats
 */
exports.getPopupStats = async (req, res) => {
  try {
    const total = await AppPopup.countDocuments();
    const active = await AppPopup.countDocuments({ isActive: true });
    const inactive = total - active;

    const aggregate = await AppPopup.aggregate([
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: "$impressions" },
          totalClicks: { $sum: "$clicks" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        totalImpressions: aggregate[0]?.totalImpressions || 0,
        totalClicks: aggregate[0]?.totalClicks || 0,
      },
    });
  } catch (error) {
    console.error("Error in getPopupStats:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch popup stats",
    });
  }
};

/**
 * POST /api/admin/app-popup
 * Create / Publish a new in-app popup
 */
exports.createPopup = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      image,
      contentType,
      contentId,
      actionButtonText,
      actionUrl,
      isActive,
      priority,
      platform,
    } = req.body;

    // Check description
    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        message: "Short Paragraph / Description is required",
      });
    }

    // Resolve uploaded file or image URL
    let storedImagePath = "";
    if (req.file && req.file.path) {
      storedImagePath = req.file.path;
    } else {
      storedImagePath = String(image || imageUrl || "").trim();
    }

    if (!storedImagePath) {
      return res.status(400).json({
        success: false,
        message: "Popup image is required (upload from system or enter Image URL)",
      });
    }

    // Auto-resolve content snapshot if linked
    let contentSnapshot = null;
    let validContentId = null;
    if (contentId && mongoose.Types.ObjectId.isValid(contentId)) {
      validContentId = contentId;
      contentSnapshot = await getContentSnapshot(contentType, contentId, req);
    }

    const newPopup = new AppPopup({
      title: title ? String(title).trim() : "",
      description: String(description).trim(),
      imageUrl: storedImagePath,
      contentType: contentType ? String(contentType).toLowerCase() : "none",
      contentId: validContentId,
      content: contentSnapshot,
      actionButtonText: actionButtonText ? String(actionButtonText).trim() : "Watch Now",
      actionUrl: actionUrl ? String(actionUrl).trim() : "",
      isActive: isActive === undefined ? true : isActive === true || isActive === "true" || isActive === 1 || isActive === "1",
      priority: priority !== undefined && !isNaN(Number(priority)) ? Number(priority) : 1,
      platform: platform ? String(platform).toLowerCase() : "app",
    });

    await newPopup.save();

    const formatted = {
      ...newPopup.toObject(),
      id: newPopup._id.toString(),
      imageUrl: resolveLocalOrCdnUrl(newPopup.imageUrl, req),
    };

    return res.status(201).json({
      success: true,
      message: "In-App Popup published successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Error in createPopup:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create popup",
    });
  }
};

/**
 * PUT /api/admin/app-popup/:id
 * Update an existing popup
 */
exports.updatePopup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid popup ID",
      });
    }

    const popup = await AppPopup.findById(id);
    if (!popup) {
      return res.status(404).json({
        success: false,
        message: "Popup not found",
      });
    }

    const {
      title,
      description,
      imageUrl,
      image,
      contentType,
      contentId,
      actionButtonText,
      actionUrl,
      isActive,
      priority,
      platform,
    } = req.body;

    if (description !== undefined) popup.description = String(description).trim();
    if (title !== undefined) popup.title = String(title).trim();
    if (actionButtonText !== undefined) popup.actionButtonText = String(actionButtonText).trim();
    if (actionUrl !== undefined) popup.actionUrl = String(actionUrl).trim();
    if (platform !== undefined) popup.platform = String(platform).toLowerCase();
    if (priority !== undefined && !isNaN(Number(priority))) popup.priority = Number(priority);

    if (isActive !== undefined) {
      popup.isActive = isActive === true || isActive === "true" || isActive === 1 || isActive === "1";
    }

    if (req.file && req.file.path) {
      popup.imageUrl = req.file.path;
    } else if (imageUrl !== undefined && String(imageUrl).trim()) {
      popup.imageUrl = String(imageUrl).trim();
    } else if (image !== undefined && String(image).trim()) {
      popup.imageUrl = String(image).trim();
    }

    if (contentType !== undefined) {
      popup.contentType = String(contentType).toLowerCase();
    }

    if (contentId !== undefined) {
      if (contentId && mongoose.Types.ObjectId.isValid(contentId)) {
        popup.contentId = contentId;
        popup.content = await getContentSnapshot(popup.contentType, contentId, req);
      } else {
        popup.contentId = null;
        popup.content = { id: "", title: "", contentType: "", poster: "", banner: "" };
      }
    }

    await popup.save();

    const formatted = {
      ...popup.toObject(),
      id: popup._id.toString(),
      imageUrl: resolveLocalOrCdnUrl(popup.imageUrl, req),
    };

    return res.status(200).json({
      success: true,
      message: "Popup updated successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Error in updatePopup:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update popup",
    });
  }
};

/**
 * PATCH /api/admin/app-popup/:id/toggle
 * Toggle active / inactive state
 */
exports.togglePopupStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid popup ID",
      });
    }

    const popup = await AppPopup.findById(id);
    if (!popup) {
      return res.status(404).json({
        success: false,
        message: "Popup not found",
      });
    }

    popup.isActive = !popup.isActive;
    await popup.save();

    return res.status(200).json({
      success: true,
      message: `Popup is now ${popup.isActive ? "active" : "inactive"}`,
      data: {
        id: popup._id.toString(),
        isActive: popup.isActive,
      },
    });
  } catch (error) {
    console.error("Error in togglePopupStatus:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle status",
    });
  }
};

/**
 * DELETE /api/admin/app-popup/:id
 */
exports.deletePopup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid popup ID",
      });
    }

    const popup = await AppPopup.findByIdAndDelete(id);
    if (!popup) {
      return res.status(404).json({
        success: false,
        message: "Popup not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Popup deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePopup:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete popup",
    });
  }
};
