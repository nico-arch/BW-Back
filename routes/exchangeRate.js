const express = require("express");
const Currency = require("../models/Currency");
const ExchangeRate = require("../models/ExchangeRate");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Mettre à jour le taux de change
router.post("/update-rate", authMiddleware, async (req, res) => {
  const { rate } = req.body;

  try {
    // Ajouter l'historique des taux
    const exchangeRate = new ExchangeRate({
      fromCurrency: "USD",
      toCurrency: "HTG",
      rate,
    });

    await exchangeRate.save();

    // Mettre à jour le taux actif
    const currency = await Currency.findOne({ currencyCode: "HTG" });
    if (currency) {
      currency.currentExchangeRate = rate;
      await currency.save();
    }

    res.json({ msg: "Exchange rate updated successfully", exchangeRate });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Lire le taux actuel ou créer un taux par défaut s'il n'existe pas
router.get("/current-rate", authMiddleware, async (req, res) => {
  try {
    let currency = await Currency.findOne({ currencyCode: "HTG" });

    // Si la devise HTG n'existe pas, la créer avec un taux par défaut
    if (!currency) {
      currency = new Currency({
        currencyCode: "HTG",
        currencyName: "Gourde",
        currentExchangeRate: 0, // Taux par défaut
      });
      await currency.save();
    }

    res.json({ currentRate: currency.currentExchangeRate });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
// Lire le taux actuel
/*router.get("/current-rate", authMiddleware, async (req, res) => {
  try {
    const currency = await Currency.findOne({ currencyCode: "HTG" });
    if (!currency) return res.status(404).json({ msg: "Currency not found" });

    res.json({ currentRate: currency.currentExchangeRate });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});*/

module.exports = router;
