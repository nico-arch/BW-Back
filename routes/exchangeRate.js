const express = require("express");
const ExchangeRate = require("../models/ExchangeRate");
const Currency = require("../models/Currency");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un nouveau taux de change
router.post("/add", authMiddleware, async (req, res) => {
  const { fromCurrencyId, toCurrencyId, rate } = req.body;

  try {
    const fromCurrency = await Currency.findById(fromCurrencyId);
    const toCurrency = await Currency.findById(toCurrencyId);

    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ msg: "One or both currencies not found" });
    }

    const exchangeRate = new ExchangeRate({
      fromCurrency: fromCurrency._id,
      toCurrency: toCurrency._id,
      rate,
    });

    await exchangeRate.save();

    // Ajouter le taux de change à la liste des taux de change de la devise d'origine
    fromCurrency.exchangeRates.push(exchangeRate._id);
    await fromCurrency.save();

    res.json(exchangeRate);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les taux de change
router.get("/", authMiddleware, async (req, res) => {
  try {
    const exchangeRates = await ExchangeRate.find()
      .populate("fromCurrency")
      .populate("toCurrency");
    res.json(exchangeRates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier un taux de change
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { rate } = req.body;

  try {
    let exchangeRate = await ExchangeRate.findById(req.params.id);
    if (!exchangeRate) {
      return res.status(404).json({ msg: "Exchange rate not found" });
    }

    exchangeRate.rate = rate || exchangeRate.rate;
    exchangeRate.date = Date.now(); // Mettre à jour la date du taux de change

    await exchangeRate.save();
    res.json(exchangeRate);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un taux de change
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let exchangeRate = await ExchangeRate.findById(req.params.id);
    if (!exchangeRate) {
      return res.status(404).json({ msg: "Exchange rate not found" });
    }

    // Supprimer le taux de change de la liste des taux de change de la devise d'origine
    await Currency.updateOne(
      { _id: exchangeRate.fromCurrency },
      { $pull: { exchangeRates: exchangeRate._id } },
    );

    await exchangeRate.remove();
    res.json({ msg: "Exchange rate deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
