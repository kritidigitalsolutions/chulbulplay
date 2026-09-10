const legalModel = require("../models/legal.model");

// ========================================
// GET ALL PUBLISHED LEGAL DOCS
// ========================================

exports.getLegalForUser = async (
  req,
  res
) => {
  try {

    const documents =
      await legalModel.find({
        isPublished: true
      })
      .sort("type")
      .lean();

    res.status(200).json({
      success: true,
      documents
    });

  } catch (error) {

    console.error(
      "GET USER LEGAL DOCS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ========================================
// GET SINGLE PUBLISHED LEGAL DOC
// ========================================

exports.getLegalByTypeForUser = async (
  req,
  res
) => {
  try {

    const document =
      await legalModel.findOne({
        type: req.params.type,
        isPublished: true
      }).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not available"
      });
    }

    res.status(200).json({
      success: true,
      document
    });

  } catch (error) {

    console.error(
      "GET USER LEGAL BY TYPE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};