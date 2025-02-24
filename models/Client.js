const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema({
  clientType: { type: String, enum: ["individual", "company"], required: true },
  firstName: { type: String },
  lastName: { type: String },
  companyName: { type: String },
  address: { type: String },
  email: { type: String },
  phone: { type: String },
  website: { type: String },
  governmentId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  balances: [
    {
      currency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
        required: false,
      }, // Référence à la devise
      balanceAmount: { type: Number, default: 0 },
    },
  ],
  creditLimits: [
    {
      currency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Currency",
        required: false,
      }, // Référence à la devise
      creditLimit: { type: Number, default: 0 },
      currentCredit: { type: Number, default: 0 },
    },
  ],
  discountPercentage: { type: Number, default: 0 },
});

module.exports = mongoose.model("Client", ClientSchema);
