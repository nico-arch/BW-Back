const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: { type: String },
  barcode: { type: String },
  currentPrice: { type: Number, required: true },
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  }, // Référence à la devise
  pricesWithDiscounts: [
    {
      discountPercentage: { type: Number, default: 0 },
      priceAfterDiscount: { type: Number, required: true },
    },
  ],
  stockQuantity: { type: Number, required: true },
  expirationDate: { type: Date }, // Optionnel
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Product", ProductSchema);
