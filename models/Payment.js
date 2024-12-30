const PaymentSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  amount: { type: Number, required: true }, // Montant payé
  currency: { type: String, enum: ["USD", "HTG"], required: true }, // Devise utilisée
  paymentType: {
    type: String,
    enum: ["cash", "check", "bank_transfer"],
    required: true,
  }, // Type de paiement
  paymentStatus: {
    type: String,
    enum: ["pending", "partial", "completed"],
    required: true,
  },
  remarks: { type: String }, // Remarques pour le paiement
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema);
