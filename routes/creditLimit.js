const express = require("express");
const Client = require("../models/Client");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour obtenir les limites de crédit d'un client
router.get("/:clientId", authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId).populate(
      "creditLimits.currency",
    );
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }
    res.json(client.creditLimits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour mettre à jour la limite de crédit d'un client pour une devise spécifique
router.put(
  "/:clientId/update/:currencyId",
  authMiddleware,
  async (req, res) => {
    const { creditLimit, currentCredit } = req.body;

    try {
      const client = await Client.findById(req.params.clientId);
      if (!client) {
        return res.status(404).json({ msg: "Client not found" });
      }

      const creditLimitEntry = client.creditLimits.find(
        (c) => c.currency.toString() === req.params.currencyId,
      );
      if (!creditLimitEntry) {
        return res
          .status(404)
          .json({ msg: "Credit limit for this currency not found" });
      }

      if (creditLimit !== undefined) creditLimitEntry.creditLimit = creditLimit;
      if (currentCredit !== undefined)
        creditLimitEntry.currentCredit = currentCredit;

      await client.save();
      res.json(creditLimitEntry);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },
);

module.exports = router;
