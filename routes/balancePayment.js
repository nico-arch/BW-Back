const express = require("express");
const BalancePayment = require("../models/BalancePayment");
const Client = require("../models/Client");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un paiement de balance
router.post("/add", authMiddleware, async (req, res) => {
  const {
    clientId,
    balanceCurrencyId,
    paymentAmount,
    paymentMethod,
    processedBy,
  } = req.body;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ msg: "Client not found" });
    }

    const clientBalance = client.balances.find(
      (balance) => balance.currency.toString() === balanceCurrencyId,
    );

    if (!clientBalance || clientBalance.balanceAmount < paymentAmount) {
      return res
        .status(400)
        .json({ msg: "Insufficient balance for this transaction" });
    }

    // Enregistrement du paiement
    const balancePayment = new BalancePayment({
      client: client._id,
      balanceCurrency: balanceCurrencyId,
      paymentAmount,
      paymentMethod,
      processedBy,
    });

    // Débiter la balance du client
    clientBalance.balanceAmount -= paymentAmount;
    await client.save();

    await balancePayment.save();
    res.json(balancePayment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour annuler un paiement de balance
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    let balancePayment = await BalancePayment.findById(req.params.id).populate(
      "client balanceCurrency",
    );
    if (!balancePayment) {
      return res.status(404).json({ msg: "Balance payment not found" });
    }

    if (balancePayment.canceled) {
      return res.status(400).json({ msg: "Payment is already canceled" });
    }

    // Recréditer la balance du client
    const client = balancePayment.client;
    const clientBalance = client.balances.find(
      (balance) =>
        balance.currency.toString() ===
        balancePayment.balanceCurrency._id.toString(),
    );

    if (!clientBalance) {
      return res
        .status(400)
        .json({ msg: "Client balance not found for this currency" });
    }

    clientBalance.balanceAmount += balancePayment.paymentAmount;
    await client.save();

    // Marquer le paiement comme annulé
    balancePayment.paymentStatus = "canceled";
    balancePayment.canceled = true;
    await balancePayment.save();

    res.json({ msg: "Balance payment canceled successfully", balancePayment });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les paiements de balance
router.get("/", authMiddleware, async (req, res) => {
  try {
    const balancePayments = await BalancePayment.find().populate(
      "client balanceCurrency processedBy",
    );
    res.json(balancePayments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir un paiement de balance par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const balancePayment = await BalancePayment.findById(
      req.params.id,
    ).populate("client balanceCurrency processedBy");
    if (!balancePayment) {
      return res.status(404).json({ msg: "Balance payment not found" });
    }
    res.json(balancePayment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des paiements de balance
router.get("/search", authMiddleware, async (req, res) => {
  const { clientId, paymentStatus } = req.query;

  try {
    let query = {};

    if (clientId) query.client = clientId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const balancePayments = await BalancePayment.find(query).populate(
      "client balanceCurrency processedBy",
    );
    res.json(balancePayments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un paiement de balance
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let balancePayment = await BalancePayment.findById(req.params.id);
    if (!balancePayment) {
      return res.status(404).json({ msg: "Balance payment not found" });
    }

    // Recréditer la balance du client avant la suppression
    const client = await Client.findById(balancePayment.client);
    const clientBalance = client.balances.find(
      (balance) =>
        balance.currency.toString() ===
        balancePayment.balanceCurrency.toString(),
    );
    if (clientBalance) {
      clientBalance.balanceAmount += balancePayment.paymentAmount;
      await client.save();
    }

    await balancePayment.remove();
    res.json({ msg: "Balance payment deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
