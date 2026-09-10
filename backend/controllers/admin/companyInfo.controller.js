const CompanyInfo = require("../../models/companyInfo.model");

const getCompanyInfo = async (req, res) => {
  try {
    const companyInfo = await CompanyInfo.findOne();

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

const saveCompanyInfo = async (req, res) => {
  try {
    const {
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      googleMapUrl,
      status,
    } = req.body;

    let companyInfo = await CompanyInfo.findOne();

    if (!companyInfo) {
      companyInfo = await CompanyInfo.create({
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        postalCode,
        googleMapUrl,
        status: status || "draft",
        createdBy: req.admin?._id,
        updatedBy: req.admin?._id,
      });

      return res.status(201).json({
        success: true,
        message: "Company information created successfully.",
        data: companyInfo,
      });
    }

    companyInfo.addressLine1 = addressLine1;
    companyInfo.addressLine2 = addressLine2;
    companyInfo.city = city;
    companyInfo.state = state;
    companyInfo.country = country;
    companyInfo.postalCode = postalCode;
    companyInfo.googleMapUrl = googleMapUrl;

    if (status) {
      companyInfo.status = status;
    }

    companyInfo.updatedBy = req.admin?._id;

    await companyInfo.save();

    return res.status(200).json({
      success: true,
      message: "Company information updated successfully.",
      data: companyInfo,
    });
  } catch (error) {
    console.error("Save Company Info Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save company information.",
    });
  }
};

const updateCompanyInfoStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const companyInfo = await CompanyInfo.findOne();

    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
    }

    companyInfo.status = status;
    companyInfo.updatedBy = req.admin?._id;

    await companyInfo.save();

    return res.status(200).json({
      success: true,
      message: `Company information moved to ${status}.`,
      data: companyInfo,
    });
  } catch (error) {
    console.error("Update Company Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company status.",
    });
  }
};

module.exports = {
  getCompanyInfo,
  saveCompanyInfo,
  updateCompanyInfoStatus,
};