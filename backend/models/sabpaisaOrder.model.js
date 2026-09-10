const mongoose = require("mongoose");

const sabpaisaOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    platform: { type: String, enum: ["app", "website"], default: "app", index: true },
    promoCode: { type: String, default: null },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["initiated", "completed", "failed"], default: "initiated" },
    sabpaisaTransactionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SabpaisaOrder", sabpaisaOrderSchema);
