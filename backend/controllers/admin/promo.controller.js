const Promo = require("../../models/promocode.model");

// CREATE PROMO
exports.createPromo = async (req, res) => {
  try {
    const promo = await Promo.create(req.body);

    res.json({
      success: true,
      promo
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET ALL PROMOS
exports.getPromos = async (req, res) => {
  try {
    const promos = await Promo.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      promos
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// DELETE PROMO
exports.deletePromo = async (req, res) => {
  try {
    await Promo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Promo deleted"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// UPDATE PROMO
exports.updatePromo = async (req, res) => {
  try {
    const updatedPromo = await Promo.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: "after",        // return updated data
        runValidators: true // validate schema
      }
    );

    if (!updatedPromo) {
      return res.status(404).json({
        success: false,
        message: "Promo not found"
      });
    }

    res.json({
      success: true,
      promo: updatedPromo
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};