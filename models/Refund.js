const mongoose = require("mongoose");

const RefundSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
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
    enum: ["pending", "partial", "completed", "cancelled"],
    default: "pending",
  }, // Statut du remboursement
  remarks: { type: String }, // Remarques sur le remboursement
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Utilisateur ayant créé le remboursement
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant modifié le remboursement
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant complété le remboursement
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant annulé le remboursement
  logs: [
    {
      action: { type: String, required: true }, // Action effectuée (created, updated, etc.)
      timestamp: { type: Date, default: Date.now },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ], // Historique des actions sur le remboursement
});

module.exports = mongoose.model("Refund", RefundSchema);
