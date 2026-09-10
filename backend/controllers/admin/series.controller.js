const Series = require("../../models/series.model");
const Episode = require("../../models/episode.model");
const { getMediaUrl, deleteMedia, deleteMediaFiles } = require("../../utils/mediaUrl");

// ========================================
// HELPERS
// ========================================

const parseJSON = (value, defaultValue = []) => {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const sanitizeCast = (cast = []) => {
  if (!Array.isArray(cast)) {
    return [];
  }

  return cast
    .map((member) => ({
      name: String(member?.name || "").trim(),
      image: String(member?.image || "").trim(),
    }))
    .filter((member) => member.name || member.image)
    .map((member) => ({
      ...member,
      name: member.name || "Unknown",
    }));
};

const normalizeDateInput = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return null;
  }

  return value;
};




// ========================================
// ADD SERIES
// ========================================
const addSeries = async (req, res) => {

  try {
    const genre = parseJSON(req.body.genre);
    const category = parseJSON(req.body.category);
    const cast = parseJSON(req.body.cast);

    if (!req.body.title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const poster = req.files?.poster?.[0];
    const banner = req.files?.banner?.[0];
    const trailer = req.files?.trailer?.[0];

    const castFiles = Object.keys(req.files || {})
      .filter((key) => key.startsWith("castImage_"));

    for (const key of castFiles) {
      const index = key.split("_")[1];
      const file = req.files[key][0];

      if (cast[index]) {
        cast[index].image = getMediaUrl(file);
      }
    }

    // ========================================
    // PRIORITY ALGORITHM
    // ========================================
    const inputPriority = req.body.priority !== undefined ? Number(req.body.priority) : 0;
    let priority = 0;

    if (inputPriority > 0) {
      // Shift up all existing series with priority >= inputPriority
      await Series.updateMany({ priority: { $gte: inputPriority } }, { $inc: { priority: 1 } });
      priority = inputPriority;
    } else {
      // Auto-assign: maxPriority + 1
      const maxSeries = await Series.findOne().sort("-priority");
      priority = maxSeries && maxSeries.priority ? maxSeries.priority + 1 : 1;
    }

    const series = await Series.create({
      title: req.body.title,
      description: req.body.description || "",
      genre,
      releaseYear: req.body.releaseYear || null,
      duration: req.body.duration || "",
      language: req.body.language || "",
      poster: getMediaUrl(poster, req.body.poster),
      banner: getMediaUrl(banner, req.body.banner),
      trailerUrl: getMediaUrl(trailer, req.body.trailerUrl),
      isComingSoon: req.body.isComingSoon === "true",
      releaseDate: normalizeDateInput(req.body.releaseDate),
      isPremium: req.body.isPremium === "true",
      isPublished: req.body.isPublished !== "false",
      rating: req.body.rating || 0,
      cast: sanitizeCast(cast),
      category,
      priority,
    });

    return res.status(201).json({
      success: true,
      message: "Series added successfully",
      series,
    });
  } catch (error) {
    console.error("ADD SERIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to add series", error: error.message });
  }
};


// ========================================
// GET ALL SERIES
// ========================================
const getAllSeries = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const series = await Series.find()
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Series.countDocuments();

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      series,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch series" });
  }
};


// ========================================
// SEARCH SERIES
// ========================================
const searchSeries = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Query is required" });

    const series = await Series.find({
      title: { $regex: q, $options: "i" }
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      results: series
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};



// ========================================
// GET SERIES BY ID
// ========================================
const getSeriesById = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }
    return res.json({ success: true, series });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch series" });
  }
};

// ========================================
// UPDATE SERIES
// ========================================
const updateSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const series = await Series.findById(id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    const genre = parseJSON(req.body.genre, series.genre);
    const category = parseJSON(req.body.category, series.category);
    const cast = parseJSON(req.body.cast, series.cast);

    if (req.body.title) series.title = req.body.title;
    if (req.body.description) series.description = req.body.description;
    series.genre = genre;
    if (req.body.releaseYear) series.releaseYear = req.body.releaseYear;
    if (req.body.duration) series.duration = req.body.duration;
    if (req.body.language) series.language = req.body.language;
    if (req.body.releaseDate !== undefined) {
      series.releaseDate = normalizeDateInput(req.body.releaseDate);
    }
    if (req.body.rating) series.rating = req.body.rating;
    series.isComingSoon = req.body.isComingSoon === "true";
    if (!series.isComingSoon && req.body.releaseDate === undefined) {
      series.releaseDate = null;
    }
    series.isPremium = req.body.isPremium === "true";
    if (req.body.isPublished !== undefined) {
      series.isPublished = req.body.isPublished === "true";
    }
    series.category = category;

    if (req.files?.poster?.[0]) {
      await deleteMedia(series.poster);
      series.poster = getMediaUrl(req.files.poster[0]);
    } else if (req.body.posterUrl !== undefined) {
      series.poster = req.body.posterUrl;
    } else if (req.body.poster !== undefined) {
      series.poster = req.body.poster;
    }

    if (req.files?.banner?.[0]) {
      await deleteMedia(series.banner);
      series.banner = getMediaUrl(req.files.banner[0]);
    } else if (req.body.bannerUrl !== undefined) {
      series.banner = req.body.bannerUrl;
    } else if (req.body.banner !== undefined) {
      series.banner = req.body.banner;
    }

    if (req.files?.trailer?.[0]) {
      await deleteMedia(series.trailerUrl);
      series.trailerUrl = getMediaUrl(req.files.trailer[0]);
    } else if (req.body.trailerUrl !== undefined) {
      series.trailerUrl = req.body.trailerUrl;
    }


    const castFiles = Object.keys(req.files || {})
      .filter((key) => key.startsWith("castImage_"));

    for (const key of castFiles) {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {

        if (
          cast[index].image &&
          cast[index].image !== getMediaUrl(file)
        ) {
          await deleteMedia(
            cast[index].image
          );
        }

        cast[index].image = getMediaUrl(file);
      }
    }
    series.cast = sanitizeCast(cast);

    // ========================================
    // PRIORITY ALGORITHM FOR UPDATE
    // ========================================
    if (req.body.priority !== undefined) {
      const newPriority = Number(req.body.priority) || 0;
      const oldPriority = series.priority || 0;

      if (newPriority !== oldPriority) {
        // Step 1: Remove series from its old slot by shifting down priorities above oldPriority
        if (oldPriority > 0) {
          await Series.updateMany(
            { _id: { $ne: series._id }, priority: { $gt: oldPriority } },
            { $inc: { priority: -1 } }
          );
        }

        // Step 2: Insert series into its new slot
        if (newPriority > 0) {
          // Shift up all priorities >= newPriority
          await Series.updateMany(
            { _id: { $ne: series._id }, priority: { $gte: newPriority } },
            { $inc: { priority: 1 } }
          );
          series.priority = newPriority;
        } else {
          series.priority = 0;
        }
      }
    }

    await series.save();

    return res.json({ success: true, message: "Series updated successfully", series });
  } catch (error) {
    console.error("UPDATE SERIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update series", error: error.message });
  }
};


// ========================================
// DELETE SERIES
// ========================================
const deleteSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const series = await Series.findById(id);
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    // Capture priority before deletion to shift other priorities
    const targetPriority = series.priority || 0;

    // Delete series files from local /uploads storage.
    await deleteMediaFiles(series.poster, series.banner, series.trailerUrl, ...(series.cast || []).map(c => c.image));
    // Cascading delete episodes and their files
    const episodes = await Episode.find({ seriesId: id });
    await Promise.all(
      episodes.map(async (ep) => {
        await deleteMedia(ep.videoUrl);
        await deleteMedia(ep.thumbnail);
      })
    );
    await Episode.deleteMany({ seriesId: id });

    await Series.findByIdAndDelete(id);

    // Shift down priorities of all series with priority > targetPriority
    if (targetPriority > 0) {
      await Series.updateMany({ priority: { $gt: targetPriority } }, { $inc: { priority: -1 } });
    }

    return res.json({ success: true, message: "Series and all its episodes deleted successfully" });
  } catch (error) {
    console.error("DELETE SERIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete series" });
  }
};

// ========================================
// TOGGLE PUBLISH SERIES
// ========================================
const togglePublishSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const series = await Series.findById(id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    series.isPublished = series.isPublished === undefined ? false : !series.isPublished;
    await series.save();

    return res.json({
      success: true,
      message: `Series ${series.isPublished ? "published" : "unpublished"} successfully`,
      isPublished: series.isPublished,
      series
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  addSeries,
  getAllSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  searchSeries,
  togglePublishSeries,
};
