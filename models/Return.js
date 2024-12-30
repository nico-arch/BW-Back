const mongoose = require("mongoose");

const ReturnSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true }, // Référence à la vente liée
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true }, // Quantité retournée
      price: { type: Number, required: true }, // Prix unitaire dans la devise de la vente
    },
  ],
  currency: { type: String, enum: ["USD", "HTG"], required: true }, // Devise du retour (doit correspondre à la vente)
  totalRefundAmount: { type: Number, required: true }, // Montant total à rembourser
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
  },
});

module.exports = mongoose.model("Return", ReturnSchema);
