const mongoose = require("mongoose");

const ReturnProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true }, // Quantité retournée
  price: { type: Number, required: true }, // Prix unitaire dans la devise de la vente
});

const ReturnSchema = new mongoose.Schema({
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true,
  }, // Référence à la vente liée
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  products: [ReturnProductSchema], // Liste des produits retournés
  currency: { type: String, enum: ["USD", "HTG"], required: true }, // Devise du retour (doit correspondre à la vente)
  totalRefundAmount: { type: Number, required: true }, // Montant total à rembourser pour ce retour
  refundStatus: {
    type: String,
    enum: ["pending", "partial", "completed"],
    default: "pending",
  }, // Statut du remboursement
  remarks: { type: String }, // Remarques sur le retour
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Utilisateur ayant créé le retour
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant modifié le retour
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant complété le remboursement lié au retour
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant annulé le retour
  logs: [
    {
      action: { type: String, required: true }, // Action effectuée (created, updated, etc.)
      timestamp: { type: Date, default: Date.now },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ], // Historique des actions sur le retour
});

module.exports = mongoose.model("Return", ReturnSchema);
