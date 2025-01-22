const mongoose = require("mongoose");

const SaleProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // Prix unitaire dans la devise de la vente
  tax: { type: Number, required: true, default: 0 }, // Taxe appliquée (en pourcentage ou valeur)
  discount: { type: Number, required: true, default: 0 }, // Remise appliquée (en pourcentage ou valeur)
  total: { type: Number, required: true }, // Total après application de la taxe et de la remise
});

const SaleSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  saleStatus: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  }, // Statut de la vente
  creditSale: { type: Boolean, default: false }, // Indique si la vente est à crédit
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  }, // Devise utilisée pour la vente
  exchangeRate: { type: Number, required: true }, // Taux de change utilisé
  products: [SaleProductSchema], // Liste des produits de la vente
  totalAmount: { type: Number, required: true }, // Montant total de la vente
  totalTax: { type: Number, required: true, default: 0 }, // Total des taxes appliquées
  totalDiscount: { type: Number, required: true, default: 0 }, // Total des remises appliquées
  remarks: { type: String }, // Remarques générales sur la vente
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Utilisateur ayant créé la vente
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant modifié la vente
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant complété la vente
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // Utilisateur ayant annulé la vente
  logs: [
    {
      action: { type: String, required: true }, // Action effectuée (created, updated, etc.)
      timestamp: { type: Date, default: Date.now },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ], // Historique des actions sur la vente
});

module.exports = mongoose.model("Sale", SaleSchema);
