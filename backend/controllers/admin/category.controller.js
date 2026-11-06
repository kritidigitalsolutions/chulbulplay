const Category = require("../../models/category.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");

// ─── SEED DEFAULT CATEGORIES ────────────────────────────
exports.seedDefaults = async () => {
  const defaults = [
    { name: "Trending", slug: "trending", color: "#f59e0b", priority: 1, isActive: true },
    { name: "Top 10", slug: "top10", color: "#ef4444", priority: 2, isActive: true },
    { name: "Recommended", slug: "recommended", color: "#10b981", priority: 3, isActive: true },
  ];
  for (const cat of defaults) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: { ...cat } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
};

// ─── CREATE ─────────────────────────────────────────────
exports.createCategory = async (req, res) => {
  try {
    const { name, color, priority, isActive, slug } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const inputPriority = priority !== undefined ? parseInt(priority) : 0;
    let targetPriority;

    if (inputPriority > 0) {
      await Category.updateMany(
        { priority: { $gte: inputPriority } },
        { $inc: { priority: 1 } }
      );
      targetPriority = inputPriority;
    } else {
      const maxCat = await Category.findOne().sort("-priority");
      targetPriority = maxCat && maxCat.priority ? maxCat.priority + 1 : 1;
    }

    const customSlug = slug && slug.trim()
      ? slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")
      : name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

    const category = await Category.create({
      name: name.trim(),
      slug: customSlug,
      color: color || "#6366f1",
      priority: targetPriority,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({ success: true, message: "Category created successfully", category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ALL ─────────────────────────────────────────────
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ priority: 1, name: 1 }).lean();

    // Enrich categories with item counts
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        let count = 0;
        if (cat.curatedItems && Array.isArray(cat.curatedItems) && cat.curatedItems.length > 0) {
          count = cat.curatedItems.length;
        } else {
          const [mCount, sCount] = await Promise.all([
            Movie.countDocuments({ category: cat.slug }),
            Series.countDocuments({ category: cat.slug }),
          ]);
          count = mCount + sCount;
        }

        return {
          ...cat,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          itemCount: count,
        };
      })
    );

    res.json({ success: true, count: enriched.length, categories: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE ──────────────────────────────────────────────
exports.updateCategory = async (req, res) => {
  try {
    const oldCategory = await Category.findById(req.params.id);
    if (!oldCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const { priority, name, color, isActive, slug } = req.body;

    if (priority !== undefined) {
      const newPriority = parseInt(priority);
      const oldPriority = oldCategory.priority;

      if (newPriority !== oldPriority) {
        if (newPriority < oldPriority) {
          await Category.updateMany(
            { _id: { $ne: oldCategory._id }, priority: { $gte: newPriority, $lt: oldPriority } },
            { $inc: { priority: 1 } }
          );
        } else {
          await Category.updateMany(
            { _id: { $ne: oldCategory._id }, priority: { $gt: oldPriority, $lte: newPriority } },
            { $inc: { priority: -1 } }
          );
        }
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (slug !== undefined && slug.trim()) {
      updateData.slug = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: "after", runValidators: true }
    );

    res.json({ success: true, message: "Category updated successfully", category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TOGGLE STATUS ───────────────────────────────────────
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const nextState = category.isActive !== undefined ? !category.isActive : false;
    category.isActive = nextState;
    await category.save();

    res.json({
      success: true,
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
      category,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET CURATED CONTENT FOR A CATEGORY ──────────────────
exports.getCategoryCuratedContent = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Fetch all active movies and series
    const [allMovies, allSeries] = await Promise.all([
      Movie.find().select("_id title slug poster banner category isPublished createdAt").lean(),
      Series.find().select("_id title slug poster banner category isPublished createdAt").lean(),
    ]);

    const formattedMovies = allMovies.map((m) => ({
      _id: m._id.toString(),
      title: m.title,
      slug: m.slug,
      poster: m.poster || m.banner || "",
      banner: m.banner || "",
      category: m.category || [],
      contentType: "movie",
      createdAt: m.createdAt,
    }));

    const formattedSeries = allSeries.map((s) => ({
      _id: s._id.toString(),
      title: s.title,
      slug: s.slug,
      poster: s.poster || s.banner || "",
      banner: s.banner || "",
      category: s.category || [],
      contentType: "series",
      createdAt: s.createdAt,
    }));

    const allContent = [...formattedSeries, ...formattedMovies];
    const contentMap = new Map();
    allContent.forEach((item) => contentMap.set(item._id, item));

    let curated = [];
    const usedIds = new Set();

    if (category.curatedItems && Array.isArray(category.curatedItems) && category.curatedItems.length > 0) {
      // Use existing curated items - sort by position and assign strictly unique sequential positions
      const sortedCurated = [...category.curatedItems].sort(
        (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)
      );

      sortedCurated.forEach((cItem, index) => {
        const idStr = cItem.contentId ? cItem.contentId.toString() : null;
        if (idStr && contentMap.has(idStr)) {
          const item = contentMap.get(idStr);
          usedIds.add(idStr);
          curated.push({
            ...item,
            position: index + 1,
          });
        }
      });
    } else {
      // Fallback: Items that currently include this category's slug
      const catSlug = category.slug;
      const initialMatches = allContent.filter(
        (c) => Array.isArray(c.category) && c.category.includes(catSlug)
      );

      initialMatches.forEach((item, index) => {
        usedIds.add(item._id);
        curated.push({
          ...item,
          position: index + 1,
        });
      });
    }

    // Available content is all content NOT in curated list
    const available = allContent.filter((c) => !usedIds.has(c._id));

    res.json({
      success: true,
      category,
      curated,
      available,
      totalCount: allContent.length,
      selectedCount: curated.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SAVE CURATED ORDER ──────────────────────────────────
exports.saveCuratedOrder = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const { curatedItems } = req.body;
    if (!Array.isArray(curatedItems)) {
      return res.status(400).json({ success: false, message: "curatedItems must be an array" });
    }

    // Clean & normalize items so positions are strictly unique and sequential: 1, 2, 3...
    const normalizedItems = curatedItems
      .filter((item) => item && item.contentId)
      .map((item, idx) => ({
        contentId: item.contentId,
        contentType: item.contentType === "movie" ? "movie" : "series",
        position: item.position !== undefined && !isNaN(item.position) ? Number(item.position) : idx + 1,
      }))
      .sort((a, b) => a.position - b.position)
      .map((item, idx) => ({
        ...item,
        position: idx + 1, // Enforce unique contiguous 1-based index
      }));

    category.curatedItems = normalizedItems;
    await category.save();

    const catSlug = category.slug;
    const selectedSeriesIds = normalizedItems
      .filter((i) => i.contentType === "series")
      .map((i) => i.contentId);
    const selectedMovieIds = normalizedItems
      .filter((i) => i.contentType === "movie")
      .map((i) => i.contentId);

    // Sync categories in Series & Movie collections
    // 1. Add slug to selected items
    if (selectedSeriesIds.length > 0) {
      await Series.updateMany(
        { _id: { $in: selectedSeriesIds } },
        { $addToSet: { category: catSlug } }
      );
    }
    if (selectedMovieIds.length > 0) {
      await Movie.updateMany(
        { _id: { $in: selectedMovieIds } },
        { $addToSet: { category: catSlug } }
      );
    }

    // 2. Remove slug from previously attached items that are not in curatedItems
    await Series.updateMany(
      { category: catSlug, _id: { $nin: selectedSeriesIds } },
      { $pull: { category: catSlug } }
    );
    await Movie.updateMany(
      { category: catSlug, _id: { $nin: selectedMovieIds } },
      { $pull: { category: catSlug } }
    );

    res.json({
      success: true,
      message: "Curated display order saved successfully",
      curatedCount: normalizedItems.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET CURATED ITEMS FOR PUBLIC / USER APP ─────────────
exports.getCategoryCuratedItemsUser = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: { $ne: false } }).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found or inactive" });
    }

    let items = [];

    if (category.curatedItems && category.curatedItems.length > 0) {
      const sortedCurated = [...category.curatedItems].sort((a, b) => (a.position || 0) - (b.position || 0));
      const seriesIds = sortedCurated.filter((i) => i.contentType === "series").map((i) => i.contentId);
      const movieIds = sortedCurated.filter((i) => i.contentType === "movie").map((i) => i.contentId);

      const [seriesList, moviesList] = await Promise.all([
        Series.find({ _id: { $in: seriesIds }, isPublished: { $ne: false } }).lean(),
        Movie.find({ _id: { $in: movieIds }, isPublished: { $ne: false } }).lean(),
      ]);

      const map = new Map();
      seriesList.forEach((s) => map.set(s._id.toString(), { ...s, type: "series" }));
      moviesList.forEach((m) => map.set(m._id.toString(), { ...m, type: "movie" }));

      sortedCurated.forEach((cItem, idx) => {
        const idStr = cItem.contentId.toString();
        if (map.has(idStr)) {
          items.push({
            ...map.get(idStr),
            curatedPosition: idx + 1,
          });
        }
      });
    } else {
      const [seriesList, moviesList] = await Promise.all([
        Series.find({ category: slug, isPublished: { $ne: false } }).sort({ priority: -1, createdAt: -1 }).lean(),
        Movie.find({ category: slug, isPublished: { $ne: false } }).sort({ priority: -1, createdAt: -1 }).lean(),
      ]);

      items = [
        ...seriesList.map((s) => ({ ...s, type: "series" })),
        ...moviesList.map((m) => ({ ...m, type: "movie" })),
      ];
    }

    res.json({
      success: true,
      category: {
        name: category.name,
        slug: category.slug,
        color: category.color,
        priority: category.priority,
      },
      count: items.length,
      items,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE (also cleans up content) ─────────────────────
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Re-sequence: shift all categories with priority > deleted priority down by 1
    if (category.priority) {
      await Category.updateMany(
        { priority: { $gt: category.priority } },
        { $inc: { priority: -1 } }
      );
    }

    // Remove slug from all Movies & Series that used this category
    await Movie.updateMany(
      { category: category.slug },
      { $pull: { category: category.slug } }
    );
    await Series.updateMany(
      { category: category.slug },
      { $pull: { category: category.slug } }
    );

    res.json({ success: true, message: "Category deleted and removed from all content" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
