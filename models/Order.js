const mongoose = require("mongoose");

const OrderProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  }, // Référence au produit commandé
  quantity: { type: Number, required: true }, // Quantité commandée
  price: { type: Number, required: true }, // Prix unitaire au moment de la commande
});

const OrderSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  }, // Référence au fournisseur
  products: [OrderProductSchema], // Liste des produits commandés avec quantités
  totalAmount: { type: Number, required: true }, // Montant total de la commande
  orderDate: { type: Date, default: Date.now }, // Date de la commande
  status: {
    type: String,
    enum: ["pending", "completed", "canceled"],
    default: "pending",
  }, // Statut de la commande
  createdAt: { type: Date, default: Date.now }, // Date de création de la commande
  updatedAt: { type: Date, default: Date.now }, // Date de dernière mise à jour
});

module.exports = mongoose.model("Order", OrderSchema);
