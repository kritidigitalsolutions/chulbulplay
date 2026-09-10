const Category = require("../../models/category.model");

// ─── SEED DEFAULT CATEGORIES ────────────────────────────
exports.seedDefaults = async () => {
  const defaults = [
    { name: "Trending",    slug: "trending",    color: "#f59e0b" },
    { name: "Top 10",      slug: "top10",       color: "#ef4444" },
    { name: "Recommended", slug: "recommended", color: "#10b981" },
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
    const { name, color, priority } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing)
      return res.status(400).json({ success: false, message: "Category already exists" });

    const inputPriority = priority !== undefined ? parseInt(priority) : 0;
    let targetPriority;

    if (inputPriority > 0) {
      // Insert at specific position: shift existing categories with priority >= target down
      await Category.updateMany(
        { priority: { $gte: inputPriority } },
        { $inc: { priority: 1 } }
      );
      targetPriority = inputPriority;
    } else {
      // Auto-assign: append at the end (max priority + 1)
      const maxCat = await Category.findOne().sort("-priority");
      targetPriority = maxCat && maxCat.priority ? maxCat.priority + 1 : 1;
    }

    const category = await Category.create({ name: name.trim(), color, priority: targetPriority });
    res.status(201).json({ success: true, message: "Category created", category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ALL ─────────────────────────────────────────────
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ priority: 1, name: 1 });
    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE ──────────────────────────────────────────────
exports.updateCategory = async (req, res) => {
  try {
    const oldCategory = await Category.findById(req.params.id);
    if (!oldCategory)
      return res.status(404).json({ success: false, message: "Category not found" });

    const { priority } = req.body;
    if (priority !== undefined) {
      const newPriority = parseInt(priority);
      const oldPriority = oldCategory.priority;

      if (newPriority !== oldPriority) {
        if (newPriority < oldPriority) {
          // moving up to a higher priority (smaller number): shift others down
          await Category.updateMany(
            { _id: { $ne: oldCategory._id }, priority: { $gte: newPriority, $lt: oldPriority } },
            { $inc: { priority: 1 } }
          );
        } else {
          // moving down to a lower priority (larger number): shift others up
          await Category.updateMany(
            { _id: { $ne: oldCategory._id }, priority: { $gt: oldPriority, $lte: newPriority } },
            { $inc: { priority: -1 } }
          );
        }
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true }
    );
    res.json({ success: true, message: "Category updated", category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE (also cleans up content) ─────────────────────
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    // Re-sequence: shift all categories with priority > deleted priority down by 1
    if (category.priority) {
      await Category.updateMany(
        { priority: { $gt: category.priority } },
        { $inc: { priority: -1 } }
      );
    }

    // Remove slug from all Movies & Series that used this category
    const Movie  = require("../../models/movie.model");
    const Series = require("../../models/series.model");
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

