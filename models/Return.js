const mongoose = require("mongoose");

const ReturnSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  returnQuantity: { type: Number, required: true },
  returnAmount: { type: Number, required: true },
  returnCurrency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  },
  returnDate: { type: Date, default: Date.now },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  creditedToBalance: { type: Boolean, default: false },
  canceled: { type: Boolean, default: false }, // Champ pour indiquer si le retour est annulé
});

module.exports = mongoose.model("Return", ReturnSchema);
