const Help = require("../models/help.model");

//get all 
exports.getAllHelp = async (req, res) => {
  try {
    const data = await Help.find({ category: { $ne: "contact-info" } }).sort("-createdAt");
    res.status(200).json({ data });
    } catch (error) {
    res.status(500).json({ message: error.message });
    }
};

// 👀 GET BY CATEGORY (ONLY PUBLISHED)
exports.getHelpByCategory = async (req, res) => {
  try {
    const data = await Help.find({
      category: req.params.category,
      isPublished: true
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET PUBLISHED SUPPORT CONTACT NUMBER
exports.getSupportNumber = async (req, res) => {
  try {
    const help = await Help.findOne({
      category: "contact-info",
      supportNumber: { $exists: true, $ne: "" },
    })
      .select("supportNumber isHide -_id")
      .lean();

    if (!help) {
      return res.status(404).json({
        success: false,
        message: "Support contact number is not available",
      });
    }

    return res.status(200).json({
      success: true,
      contactNumber: help.supportNumber,
      supportNumber: help.supportNumber,
      isHide: help.isHide || false,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET PUBLISHED SUPPORT EMAIL
exports.getSupportEmail = async (req, res) => {
  try {
    const help = await Help.findOne({
      category: "contact-info",
      supportEmail: { $exists: true, $ne: "" },
    })
      .select("supportEmail isHide -_id")
      .lean();

    if (!help) {
      return res.status(404).json({
        success: false,
        message: "Support email is not available",
      });
    }

    return res.status(200).json({
      success: true,
      email: help.supportEmail,
      supportEmail: help.supportEmail,
      isHide: help.isHide || false,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// ========================================
// GET ALL PUBLISHED HELP DATA
// ========================================
exports.getPublishedHelp =
  async (req, res) => {
    try {
      const helpData =
        await Help.find({
          isPublished: true,
          category: { $ne: "contact-info" }
        }).sort("-createdAt");

      res.status(200).json({
        success: true,
        count: helpData.length,
        helpData,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
