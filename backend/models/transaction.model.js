const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true, match: /^[A-Za-z0-9]{1,20}$/ },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    platform: { type: String, enum: ["app", "website"], default: "app", index: true },
    promoCode: { type: String, default: null },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    transactionId: { type: String, default: null },
    vpa: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
