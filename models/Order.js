const mongoose = require("mongoose");

const OrderProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true },
  //price: { type: Number, required: true },
  purchasePrice: { type: Number, required: true }, // Nouveau champ
  salePrice: { type: Number, required: true }, // Nouveau champ
});

const OrderSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  products: [OrderProductSchema],
  totalAmount: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "completed", "canceled"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // L'utilisateur qui a créé la commande
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // L'utilisateur qui a modifié la commande
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // L'utilisateur qui a complété la commande
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }, // L'utilisateur qui a annulé la commande
});

module.exports = mongoose.model("Order", OrderSchema);
