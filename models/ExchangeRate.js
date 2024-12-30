const mongoose = require("mongoose");

const ExchangeRateSchema = new mongoose.Schema({
  fromCurrency: { type: String, required: true, enum: ["USD"] },
  toCurrency: { type: String, required: true, enum: ["HTG"] },
  rate: { type: Number, required: true }, // Exemple : 1 USD = 132 HTG
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExchangeRate", ExchangeRateSchema);
