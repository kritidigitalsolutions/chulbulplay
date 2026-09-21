const Banner = require("../models/banner.model");
const { formatMediaUrl, getMediaUrl, deleteMedia } = require("../utils/mediaUrl");

// ========================================
// GET PUBLIC BANNERS (For Landing Page & App)
// ========================================
const getPublicBanners = async (req, res) => {
  try {
    const filter = { isActive: { $ne: false } };

    if (req.query.category) {
      filter.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, "i") };
    }

    const banners = await Banner.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: banners.length,
      banners: banners.map((b) => ({
        id: b._id,
        _id: b._id,
        title: b.title,
        image: formatMediaUrl(b.imageUrl),
        imageUrl: formatMediaUrl(b.imageUrl),
        linkUrl: b.linkUrl || "",
        category: b.category || "",
        description: b.description || "",
        priority: b.priority || 0,
        contentType: b.contentType || "custom",
        contentId: b.contentId || null,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get Public Banners Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
      error: error.message,
    });
  }
};

// ========================================
// GET ALL BANNERS (Admin)
// ========================================
const getAllBanners = async (req, res) => {
  try {
    const filter = {};

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true" || req.query.isActive === true;
    }

    if (req.query.category) {
      filter.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, "i") };
    }

    const banners = await Banner.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: banners.length,
      banners: banners.map((b) => ({
        id: b._id,
        _id: b._id,
        title: b.title,
        image: formatMediaUrl(b.imageUrl),
        imageUrl: formatMediaUrl(b.imageUrl),
        linkUrl: b.linkUrl || "",
        category: b.category || "",
        description: b.description || "",
        isActive: b.isActive,
        priority: b.priority || 0,
        contentType: b.contentType || "custom",
        contentId: b.contentId || null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get All Banners Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
      error: error.message,
    });
  }
};

// ========================================
// GET BANNER BY ID
// ========================================
const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id).lean();

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    return res.json({
      success: true,
      banner: {
        id: banner._id,
        _id: banner._id,
        title: banner.title,
        image: formatMediaUrl(banner.imageUrl),
        imageUrl: formatMediaUrl(banner.imageUrl),
        linkUrl: banner.linkUrl || "",
        category: banner.category || "",
        description: banner.description || "",
        isActive: banner.isActive,
        priority: banner.priority || 0,
        contentType: banner.contentType || "custom",
        contentId: banner.contentId || null,
        createdAt: banner.createdAt,
        updatedAt: banner.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get Banner By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch banner",
      error: error.message,
    });
  }
};

// ========================================
// CREATE BANNER (Admin)
// ========================================
const createBanner = async (req, res) => {
  try {
    const { title, linkUrl, category, description, isActive, contentType, contentId } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner title is required",
      });
    }

    const uploadedFile = req.file || req.files?.image?.[0] || req.files?.banner?.[0];
    const rawImageUrl = req.body.imageUrl || req.body.image || req.body.banner;
    const finalImageUrl = getMediaUrl(uploadedFile, rawImageUrl);

    if (!finalImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required (upload file or provide imageUrl)",
      });
    }

    // Priority Handling
    const inputPriority = req.body.priority !== undefined ? Number(req.body.priority) : 0;
    let priority = 0;

    if (inputPriority > 0) {
      await Banner.updateMany({ priority: { $gte: inputPriority } }, { $inc: { priority: 1 } });
      priority = inputPriority;
    } else {
      const maxBanner = await Banner.findOne().sort("-priority");
      priority = maxBanner && maxBanner.priority ? maxBanner.priority + 1 : 1;
    }

    const banner = await Banner.create({
      title: String(title).trim(),
      imageUrl: finalImageUrl,
      linkUrl: linkUrl ? String(linkUrl).trim() : "",
      category: category ? String(category).trim() : "",
      description: description ? String(description).trim() : "",
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      priority,
      contentType: contentType || "custom",
      contentId: contentId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
    console.error("Create Banner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create banner",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE BANNER (Admin)
// ========================================
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    const uploadedFile = req.file || req.files?.image?.[0] || req.files?.banner?.[0];
    if (uploadedFile) {
      await deleteMedia(banner.imageUrl);
      banner.imageUrl = getMediaUrl(uploadedFile);
    } else if (req.body.imageUrl !== undefined || req.body.image !== undefined) {
      banner.imageUrl = req.body.imageUrl || req.body.image;
    }

    if (req.body.title !== undefined) banner.title = String(req.body.title).trim();
    if (req.body.linkUrl !== undefined) banner.linkUrl = String(req.body.linkUrl).trim();
    if (req.body.category !== undefined) banner.category = String(req.body.category).trim();
    if (req.body.description !== undefined) banner.description = String(req.body.description).trim();
    if (req.body.contentType !== undefined) banner.contentType = req.body.contentType;
    if (req.body.contentId !== undefined) banner.contentId = req.body.contentId || null;

    if (req.body.isActive !== undefined) {
      banner.isActive = req.body.isActive === "true" || req.body.isActive === true;
    }

    if (req.body.priority !== undefined) {
      banner.priority = Number(req.body.priority);
    }

    await banner.save();

    return res.json({
      success: true,
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    console.error("Update Banner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update banner",
      error: error.message,
    });
  }
};

// ========================================
// DELETE BANNER (Admin)
// ========================================
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    if (banner.imageUrl) {
      await deleteMedia(banner.imageUrl);
    }

    return res.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete Banner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete banner",
      error: error.message,
    });
  }
};

module.exports = {
  getPublicBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
