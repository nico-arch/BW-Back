const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: { type: String },
  barcode: { type: String },
  priceUSD: { type: Number, required: true }, // Prix en dollars
  priceHTG: { type: Number, required: false }, // Prix en gourdes (calculé dynamiquement)
  currency: { type: String, enum: ["USD", "HTG"], default: "USD" }, // Devise principale
  stockQuantity: { type: Number, required: true },
  expirationDate: { type: Date }, // Optionnel
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }], // Catégories optionnelles
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Mise à jour dynamique du prix en HTG selon le taux
ProductSchema.pre("save", async function (next) {
  const currentExchangeRate = await mongoose
    .model("ExchangeRate")
    .findOne({ fromCurrency: "USD", toCurrency: "HTG" })
    .sort({ createdAt: -1 });
  if (currentExchangeRate) {
    this.priceHTG = this.priceUSD * currentExchangeRate.rate;
  }
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
