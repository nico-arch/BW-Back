const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  saleDate: { type: Date, default: Date.now },
  saleStatus: {
    type: String,
    enum: ["quote", "invoice", "credit"],
    required: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true },
      priceInitial: { type: Number, required: true }, // Prix initial avant remise
      priceConverted: { type: Number, required: true }, // Prix après conversion et remise
      initialCurrency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
        required: true,
      }, // Référence à la devise initiale
      convertedCurrency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
        required: true,
      }, // Référence à la devise après conversion
      productDiscount: { type: Number, default: 0 }, // Remise spécifique au produit (%)
    },
  ],
  totalDiscount: { type: Number, default: 0 }, // Remise globale sur la vente (%)
  totalAmountInitial: { type: Number, required: true }, // Montant total initial (avant conversion et remise)
  totalAmountConverted: { type: Number, required: true }, // Montant total après conversion et remise
  exchangeRateUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExchangeRate",
    required: true,
  }, // Taux de change utilisé pour la conversion
  paymentStatus: {
    type: String,
    enum: ["paid", "unpaid", "partial"],
    default: "unpaid",
  }, // Statut de paiement
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Sale", SaleSchema);
