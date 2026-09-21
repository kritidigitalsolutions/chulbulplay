const Poster = require("../models/poster.model");
const Category = require("../models/category.model");
const { getMediaUrl, deleteMedia } = require("../utils/mediaUrl");

// ========================================
// GET POSTER CATEGORIES
// ========================================
const getPosterCategories = async (req, res) => {
  try {
    // Fetch unique categories directly used in active posters
    const activePosterCategories = await Poster.distinct("category", {
      isActive: { $ne: false },
      category: { $exists: true, $ne: "" },
    });

    // Also fetch names from the Category collection if any exist
    const systemCategories = await Category.find({}).sort({ priority: 1, name: 1 }).lean();
    const systemCategoryNames = systemCategories.map((c) => c.name);

    // Default standard categories if none exist yet
    const defaultCategories = [
      "Trending",
      "Movies",
      "Web Series",
      "TV Shows",
      "New Releases",
      "Kids",
      "Comedy",
      "Action",
      "Drama",
    ];

    // Merge and deduplicate while maintaining meaningful ordering
    const merged = [
      ...new Set([
        ...activePosterCategories.filter(Boolean),
        ...systemCategoryNames.filter(Boolean),
        ...(activePosterCategories.length === 0 ? defaultCategories : []),
      ]),
    ];

    return res.json({
      success: true,
      count: merged.length,
      categories: merged,
    });
  } catch (error) {
    console.error("Get Poster Categories Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch poster categories",
      error: error.message,
    });
  }
};

// ========================================
// GET PUBLIC POSTERS (For Landing Page & App)
// ========================================
const getPublicPosters = async (req, res) => {
  try {
    const filter = { isActive: { $ne: false } };

    if (req.query.category && req.query.category.trim()) {
      filter.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, "i") };
    }

    const posters = await Poster.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: posters.length,
      posters: posters.map((p) => ({
        id: p._id,
        _id: p._id,
        title: p.title,
        image: p.imageUrl,
        imageUrl: p.imageUrl,
        category: p.category,
        description: p.description || "",
        linkUrl: p.linkUrl || "",
        rating: p.rating || 0,
        releaseYear: p.releaseYear || null,
        priority: p.priority || 0,
        contentType: p.contentType || "custom",
        contentId: p.contentId || null,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get Public Posters Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch posters",
      error: error.message,
    });
  }
};

// ========================================
// GET ALL POSTERS (Admin)
// ========================================
const getAllPosters = async (req, res) => {
  try {
    const filter = {};

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true" || req.query.isActive === true;
    }

    if (req.query.category && req.query.category.trim()) {
      filter.category = { $regex: new RegExp(`^${req.query.category.trim()}$`, "i") };
    }

    if (req.query.search && req.query.search.trim()) {
      filter.title = { $regex: new RegExp(req.query.search.trim(), "i") };
    }

    const posters = await Poster.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: posters.length,
      posters: posters.map((p) => ({
        id: p._id,
        _id: p._id,
        title: p.title,
        image: p.imageUrl,
        imageUrl: p.imageUrl,
        category: p.category,
        description: p.description || "",
        linkUrl: p.linkUrl || "",
        rating: p.rating || 0,
        releaseYear: p.releaseYear || null,
        isActive: p.isActive,
        priority: p.priority || 0,
        contentType: p.contentType || "custom",
        contentId: p.contentId || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get All Posters Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch posters",
      error: error.message,
    });
  }
};

// ========================================
// GET POSTER BY ID
// ========================================
const getPosterById = async (req, res) => {
  try {
    const poster = await Poster.findById(req.params.id).lean();

    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found",
      });
    }

    return res.json({
      success: true,
      poster: {
        id: poster._id,
        _id: poster._id,
        title: poster.title,
        image: poster.imageUrl,
        imageUrl: poster.imageUrl,
        category: poster.category,
        description: poster.description || "",
        linkUrl: poster.linkUrl || "",
        rating: poster.rating || 0,
        releaseYear: poster.releaseYear || null,
        isActive: poster.isActive,
        priority: poster.priority || 0,
        contentType: poster.contentType || "custom",
        contentId: poster.contentId || null,
        createdAt: poster.createdAt,
        updatedAt: poster.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get Poster By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch poster",
      error: error.message,
    });
  }
};

// ========================================
// CREATE POSTER (Admin)
// ========================================
const createPoster = async (req, res) => {
  try {
    const { title, category, description, linkUrl, rating, releaseYear, isActive, contentType, contentId } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Poster title is required",
      });
    }

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        success: false,
        message: "Poster category is required",
      });
    }

    const uploadedFile = req.file || req.files?.image?.[0] || req.files?.poster?.[0];
    const rawImageUrl = req.body.imageUrl || req.body.image || req.body.poster;
    const finalImageUrl = getMediaUrl(uploadedFile, rawImageUrl);

    if (!finalImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Poster image is required (upload file or provide imageUrl)",
      });
    }

    // Priority Handling
    const inputPriority = req.body.priority !== undefined ? Number(req.body.priority) : 0;
    let priority = 0;

    if (inputPriority > 0) {
      await Poster.updateMany({ priority: { $gte: inputPriority } }, { $inc: { priority: 1 } });
      priority = inputPriority;
    } else {
      const maxPoster = await Poster.findOne().sort("-priority");
      priority = maxPoster && maxPoster.priority ? maxPoster.priority + 1 : 1;
    }

    const poster = await Poster.create({
      title: String(title).trim(),
      imageUrl: finalImageUrl,
      category: String(category).trim(),
      description: description ? String(description).trim() : "",
      linkUrl: linkUrl ? String(linkUrl).trim() : "",
      rating: rating !== undefined ? Number(rating) : 0,
      releaseYear: releaseYear !== undefined && releaseYear !== "" ? Number(releaseYear) : null,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      priority,
      contentType: contentType || "custom",
      contentId: contentId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Poster created successfully",
      poster,
    });
  } catch (error) {
    console.error("Create Poster Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create poster",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE POSTER (Admin)
// ========================================
const updatePoster = async (req, res) => {
  try {
    const poster = await Poster.findById(req.params.id);

    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found",
      });
    }

    const uploadedFile = req.file || req.files?.image?.[0] || req.files?.poster?.[0];
    if (uploadedFile) {
      await deleteMedia(poster.imageUrl);
      poster.imageUrl = getMediaUrl(uploadedFile);
    } else if (req.body.imageUrl !== undefined || req.body.image !== undefined) {
      poster.imageUrl = req.body.imageUrl || req.body.image;
    }

    if (req.body.title !== undefined) poster.title = String(req.body.title).trim();
    if (req.body.category !== undefined) {
      if (!String(req.body.category).trim()) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be empty",
        });
      }
      poster.category = String(req.body.category).trim();
    }
    if (req.body.description !== undefined) poster.description = String(req.body.description).trim();
    if (req.body.linkUrl !== undefined) poster.linkUrl = String(req.body.linkUrl).trim();
    if (req.body.rating !== undefined) poster.rating = Number(req.body.rating);
    if (req.body.releaseYear !== undefined) poster.releaseYear = req.body.releaseYear ? Number(req.body.releaseYear) : null;
    if (req.body.contentType !== undefined) poster.contentType = req.body.contentType;
    if (req.body.contentId !== undefined) poster.contentId = req.body.contentId || null;

    if (req.body.isActive !== undefined) {
      poster.isActive = req.body.isActive === "true" || req.body.isActive === true;
    }

    if (req.body.priority !== undefined) {
      poster.priority = Number(req.body.priority);
    }

    await poster.save();

    return res.json({
      success: true,
      message: "Poster updated successfully",
      poster,
    });
  } catch (error) {
    console.error("Update Poster Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update poster",
      error: error.message,
    });
  }
};

// ========================================
// DELETE POSTER (Admin)
// ========================================
const deletePoster = async (req, res) => {
  try {
    const poster = await Poster.findByIdAndDelete(req.params.id);

    if (!poster) {
      return res.status(404).json({
        success: false,
        message: "Poster not found",
      });
    }

    if (poster.imageUrl) {
      await deleteMedia(poster.imageUrl);
    }

    return res.json({
      success: true,
      message: "Poster deleted successfully",
    });
  } catch (error) {
    console.error("Delete Poster Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete poster",
      error: error.message,
    });
  }
};

module.exports = {
  getPosterCategories,
  getPublicPosters,
  getAllPosters,
  getPosterById,
  createPoster,
  updatePoster,
  deletePoster,
};
