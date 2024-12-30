const mongoose = require("mongoose");

const RefundPaymentSchema = new mongoose.Schema({
  refund: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Refund",
    required: true,
  }, // Référence au remboursement associé
  paymentAmount: { type: Number, required: true }, // Montant du paiement
  paymentMethod: {
    type: String,
    enum: ["cash", "check", "bank_transfer"],
    required: true,
  }, // Méthode de paiement
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  }, // Statut du paiement
  remarks: { type: String }, // Remarques sur le paiement
  createdAt: { type: Date, default: Date.now },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Utilisateur ayant traité le paiement
});

module.exports = mongoose.model("RefundPayment", RefundPaymentSchema);
