const express = require("express");
const Client = require("../models/Client");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour obtenir les balances d'un client
router.get("/:clientId", authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId).populate(
      "balances.currency",
    );
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }
    res.json(client.balances);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour mettre à jour la balance d'un client pour une devise spécifique
router.put(
  "/:clientId/update/:currencyId",
  authMiddleware,
  async (req, res) => {
    const { amount, type } = req.body;

    try {
      const client = await Client.findById(req.params.clientId);
      if (!client) {
        return res.status(404).json({ msg: "Client not found" });
      }

      const balance = client.balances.find(
        (b) => b.currency.toString() === req.params.currencyId,
      );
      if (!balance) {
        return res
          .status(404)
          .json({ msg: "Balance for this currency not found" });
      }

      if (type === "credit") {
        balance.balanceAmount += amount;
      } else if (type === "debit") {
        balance.balanceAmount -= amount;
      } else {
        return res
          .status(400)
          .json({ msg: 'Invalid type specified. Use "credit" or "debit".' });
      }

      await client.save();
      res.json(balance);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },
);

module.exports = router;
