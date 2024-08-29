const mongoose = require("mongoose");

const CreditPaymentSchema = new mongoose.Schema({
  creditSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  paymentAmount: { type: Number, required: true },
  paymentCurrency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "check", "bank_transfer", "credit/debit card"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "canceled", "completed"],
    default: "pending",
  },
  paymentDate: { type: Date, default: Date.now },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  canceled: { type: Boolean, default: false }, // Ajout d'un champ pour indiquer si le paiement est annulé
});

module.exports = mongoose.model("CreditPayment", CreditPaymentSchema);
