const legalModel = require("../../models/legal.model");

// ========================================
// GET ALL LEGAL DOCUMENTS
// ========================================

exports.getLegalDocuments = async (req, res) => {
  try {

    const documents = await legalModel
      .find()
      .sort("type")
      .lean();

    res.status(200).json({
      success: true,
      documents
    });

  } catch (error) {

    console.error(
      "GET LEGAL DOCS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ========================================
// GET LEGAL DOCUMENT BY TYPE
// ========================================

exports.getLegalByType = async (req, res) => {
  try {

    const document =
      await legalModel.findOne({
        type: req.params.type
      }).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    res.status(200).json({
      success: true,
      document
    });

  } catch (error) {

    console.error(
      "GET LEGAL BY TYPE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ========================================
// CREATE OR UPDATE LEGAL DOCUMENT
// ========================================

exports.addOrUpdateLegalDocument = async (req, res) => {
  try {

    const {
      type,
      title,
      content
    } = req.body;

    if (
      !type ||
      !title ||
      !content
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type, title and content required"
      });
    }

    let document =
      await legalModel.findOne({
        type
      });

    // UPDATE
    if (document) {

      document.title = title;

      document.content = content;

      document.lastUpdatedBy =
        req.user?.id || "Admin";

      await document.save();

      return res.status(200).json({
        success: true,
        message: "Document updated",
        document
      });
    }

    // CREATE
    document = await legalModel.create({
      type,
      title,
      content,
      lastUpdatedBy:
        req.user?.id || "Admin"
    });

    return res.status(201).json({
      success: true,
      message: "Document created",
      document
    });

  } catch (error) {

    console.error(
      "ADD/UPDATE LEGAL ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ========================================
// TOGGLE PUBLISH STATUS
// ========================================

exports.togglePublish = async (req, res) => {
  try {

    const page =
      await legalModel.findOne({
        type: req.params.type
      });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Legal page not found"
      });
    }

    page.isPublished =
      !page.isPublished;

    await page.save();

    res.status(200).json({
      success: true,
      message:
        `Legal page ${
          page.isPublished
            ? "published"
            : "unpublished"
        }`,
      page
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};