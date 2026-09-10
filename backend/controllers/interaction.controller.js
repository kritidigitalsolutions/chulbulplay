const Interaction = require("../models/interaction.model");

// ✅ LIKE / DISLIKE TOGGLE
exports.toggleInteraction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId, contentType, type } = req.body;

    if (!contentId || !contentType || !type) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    // 🔍 check existing
    const existing = await Interaction.findOne({
      user: userId,
      contentId
    });

    // ❌ if same type → REMOVE (toggle off)
    if (existing && existing.type === type) {
      await Interaction.deleteOne({ _id: existing._id });

      return res.json({
        message: `${type} removed`
      });
    }

    // 🔁 if different type → UPDATE
    if (existing) {
      existing.type = type;
      await existing.save();

      return res.json({
        message: `Changed to ${type}`
      });
    }

    // ✅ new interaction
    await Interaction.create({
      user: userId,
      contentId,
      contentType,
      type
    });

    res.json({
      message: `${type} added`
    });

  } catch (error) {
  console.error("ERROR:", error);
  res.status(500).json({
    message: "Server error",
    error: error.message
  });
}
};

exports.getUserInteraction = async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = req.params.contentId || req.query.contentId;

    if (!contentId) {
      return res.status(400).json({ message: "contentId is required" });
    }

    const interaction = await Interaction.findOne({
      user: userId,
      contentId
    });

    res.json({
      type: interaction ? interaction.type : null
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getInteractionStats = async (req, res) => {
  try {
    const contentId = req.params.contentId || req.query.contentId;

    if (!contentId) {
      return res.status(400).json({ message: "contentId is required" });
    }

    const likes = await Interaction.countDocuments({
      contentId,
      type: "like"
    });

    const dislikes = await Interaction.countDocuments({
      contentId,
      type: "dislike"
    });

    res.json({
      likes,
      dislikes
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};