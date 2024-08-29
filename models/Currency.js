const mongoose = require("mongoose");

const CurrencySchema = new mongoose.Schema({
  currencyCode: { type: String, required: true, unique: true }, // Exemple : "HTG", "USD"
  currencyName: { type: String, required: true }, // Exemple : "Gourde", "Dollar américain"
  exchangeRates: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ExchangeRate" },
  ], // Liste des taux de change associés
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Currency", CurrencySchema);
