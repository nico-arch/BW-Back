const mongoose = require("mongoose");

const ExchangeRateSchema = new mongoose.Schema({
  fromCurrency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  }, // Devise d'origine
  toCurrency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Currency",
    required: true,
  }, // Devise de destination
  rate: { type: Number, required: true }, // Taux de change
  date: { type: Date, default: Date.now }, // Date du taux de change
});

module.exports = mongoose.model("ExchangeRate", ExchangeRateSchema);
