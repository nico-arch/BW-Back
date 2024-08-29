const express = require("express");
const Currency = require("../models/Currency");
const ExchangeRate = require("../models/ExchangeRate");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter une nouvelle devise
router.post("/add", authMiddleware, async (req, res) => {
  const { currencyCode, currencyName } = req.body;

  try {
    const currency = new Currency({
      currencyCode,
      currencyName,
    });

    await currency.save();
    res.json(currency);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier une devise
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { currencyCode, currencyName } = req.body;

  try {
    let currency = await Currency.findById(req.params.id);
    if (!currency) {
      return res.status(404).json({ msg: "Currency not found" });
    }

    currency.currencyCode = currencyCode || currency.currencyCode;
    currency.currencyName = currencyName || currency.currencyName;

    await currency.save();
    res.json(currency);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir toutes les devises
router.get("/", authMiddleware, async (req, res) => {
  try {
    const currencies = await Currency.find().populate("exchangeRates");
    res.json(currencies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir une devise par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id).populate(
      "exchangeRates",
    );
    if (!currency) {
      return res.status(404).json({ msg: "Currency not found" });
    }
    res.json(currency);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des devises
router.get("/search", authMiddleware, async (req, res) => {
  const { currencyCode, currencyName } = req.query;

  try {
    let query = {};

    if (currencyCode) query.currencyCode = new RegExp(currencyCode, "i");
    if (currencyName) query.currencyName = new RegExp(currencyName, "i");

    const currencies = await Currency.find(query);
    res.json(currencies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer une devise
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let currency = await Currency.findById(req.params.id);
    if (!currency) {
      return res.status(404).json({ msg: "Currency not found" });
    }

    // Supprimer les taux de change associés
    await ExchangeRate.deleteMany({ fromCurrency: currency._id });
    await ExchangeRate.deleteMany({ toCurrency: currency._id });

    await currency.remove();
    res.json({ msg: "Currency deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
