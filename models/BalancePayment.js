const mongoose = require("mongoose");

const BalancePaymentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  balanceCurrency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  }, // Devise de la balance
  paymentAmount: { type: Number, required: true }, // Montant retiré de la balance
  paymentMethod: {
    type: String,
    enum: ["cash", "check", "bank_transfer"],
    required: true,
  }, // Méthode de paiement utilisée pour rembourser le client
  paymentStatus: {
    type: String,
    enum: ["pending", "canceled", "completed"],
    default: "pending",
  }, // Statut de la transaction
  paymentDate: { type: Date, default: Date.now }, // Date de la transaction
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Utilisateur ayant traité le remboursement
  canceled: { type: Boolean, default: false }, // Indicateur si la transaction a été annulée
});

module.exports = mongoose.model("BalancePayment", BalancePaymentSchema);
