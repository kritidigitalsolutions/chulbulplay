const Voucher = require("../../models/voucher.model");

// CREATE VOUCHER
exports.createVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.create(req.body);

    res.json({
      success: true,
      voucher
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// GET ALL VOUCHERS
exports.getVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find().populate("plan");

    res.json({
      success: true,
      vouchers
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// UPDATE VOUCHER
exports.updateVoucher = async (req, res) => {
  try {
    const updatedVoucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: "after",
        runValidators: true
      }
    ).populate("plan"); // keep consistency with get API

    if (!updatedVoucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found"
      });
    }

    res.json({
      success: true,
      voucher: updatedVoucher
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// DELETE VOUCHER
exports.deleteVoucher = async (req, res) => {
  try {
    const deletedVoucher = await Voucher.findByIdAndDelete(req.params.id);

    if (!deletedVoucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found"
      });
    }

    res.json({
      success: true,
      message: "Voucher deleted"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};