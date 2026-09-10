const Help = require("../../models/help.model");

// ➕ ADD Q&A
exports.addHelp = async (req, res) => {
  try {
    const { category, question, answer, supportNumber, supportEmail } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({ message: "All fields required" });
    }

    const help = await Help.create({
      category,
      question,
      answer,
      supportNumber,
      supportEmail,
    });

    res.status(201).json({
      success: true,
      message: "Help added",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📥 GET ALL (ADMIN)
exports.getAllHelp = async (req, res) => {
  try {
    const data = await Help.find({ category: { $ne: "contact-info" } }).sort("-createdAt");

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ UPDATE
exports.updateHelp = async (req, res) => {
  try {
    const help = await Help.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json({
      message: "Updated",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ DELETE
exports.deleteHelp = async (req, res) => {
  try {
    await Help.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔁 TOGGLE VISIBILITY
exports.toggleHelp = async (req, res) => {
  try {
    const help = await Help.findById(req.params.id);

    help.isPublished = !help.isPublished;
    await help.save();

    res.status(200).json({
      message: "Toggled",
      help
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📞 GET CONTACT INFO
exports.getContactInfo = async (req, res) => {
  try {
    let contactInfo = await Help.findOne({ category: "contact-info" });
    if (!contactInfo) {
      contactInfo = await Help.create({
        category: "contact-info",
        supportNumber: "",
        supportEmail: "",
        isHide: false
      });
    }
    res.status(200).json({ data: contactInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 💾 UPDATE CONTACT INFO
exports.updateContactInfo = async (req, res) => {
  try {
    const { supportNumber, supportEmail, isHide } = req.body;
    let contactInfo = await Help.findOne({ category: "contact-info" });
    
    if (!contactInfo) {
      contactInfo = await Help.create({ category: "contact-info" });
    }

    contactInfo.supportNumber = supportNumber !== undefined ? supportNumber : contactInfo.supportNumber;
    contactInfo.supportEmail = supportEmail !== undefined ? supportEmail : contactInfo.supportEmail;
    contactInfo.isHide = isHide !== undefined ? isHide : contactInfo.isHide;

    await contactInfo.save();

    res.status(200).json({ message: "Contact Info updated", data: contactInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
