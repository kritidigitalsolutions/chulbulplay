const CompanyInfo = require("../models/companyInfo.model");

const getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await CompanyInfo.findOne({
      status: "published",
    }).select("-createdBy -updatedBy");

    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    console.error("Get Company Info Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company information.",
    });
  }
};

module.exports = {
  getCompanyInfo,
};