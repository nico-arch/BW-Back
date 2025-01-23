const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true,
  }, // Référence à la vente
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  amount: {
    type: Number,
    required: true,
  }, // Montant payé
  currency: {
    type: String,
    enum: ["USD", "HTG"],
    required: true,
  }, // Devise utilisée pour le paiement
  paymentType: {
    type: String,
    enum: ["cash", "check", "bank_transfer", "card"],
    required: true,
  }, // Type de paiement
  paymentStatus: {
    type: String,
    enum: ["pending", "partial", "completed", "cancelled"],
    default: "pending",
  }, // Statut du paiement
  remarks: {
    type: String,
  }, // Remarques pour le paiement (e.g., numéro de chèque ou référence bancaire)
  createdAt: {
    type: Date,
    default: Date.now,
  }, // Date de création
  updatedAt: {
    type: Date,
    default: Date.now,
  }, // Date de dernière modification
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Utilisateur ayant créé le paiement
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant modifié le paiement
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant complété le paiement
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant annulé le paiement
  logs: [
    {
      action: {
        type: String,
        required: true,
      }, // Action effectuée (e.g., "created", "updated", "completed", "cancelled")
      timestamp: {
        type: Date,
        default: Date.now,
      }, // Date de l'action
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }, // Utilisateur ayant effectué l'action
    },
  ], // Historique des actions sur le paiement
});

module.exports = mongoose.model("Payment", PaymentSchema);
