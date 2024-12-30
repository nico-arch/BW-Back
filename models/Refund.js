const mongoose = require("mongoose");

const RefundSchema = new mongoose.Schema({
  return: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Return",
    required: true,
  }, // Référence au retour associé
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  currency: { type: String, enum: ["USD", "HTG"], required: true }, // Devise de remboursement
  totalRefundAmount: { type: Number, required: true }, // Montant total à rembourser
  refundStatus: {
    type: String,
    enum: ["pending", "partial", "completed"],
    default: "pending",
  }, // Statut du remboursement
  remarks: { type: String }, // Remarques sur le remboursement
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Refund", RefundSchema);
