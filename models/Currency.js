const mongoose = require("mongoose");

const CurrencySchema = new mongoose.Schema({
  currencyCode: { type: String, required: true, unique: true }, // Exemple : "HTG", "USD"
  currencyName: { type: String, required: true }, // Exemple : "Gourde", "Dollar américain"
  currentExchangeRate: { type: Number, required: false }, // Taux actif pour USD -> HTG
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Currency", CurrencySchema);
