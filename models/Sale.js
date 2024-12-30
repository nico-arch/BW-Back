const mongoose = require("mongoose");

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
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  }, // Devise utilisée pour la vente
  exchangeRate: { type: Number, required: true }, // Taux utilisé pour la vente
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }, // Prix dans la devise de la vente
    },
  ],
  totalAmount: { type: Number, required: true }, // Montant total de la vente
  remarks: { type: String }, // Remarques sur la vente
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Sale", SaleSchema);
