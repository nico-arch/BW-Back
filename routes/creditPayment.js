const express = require("express");
const CreditPayment = require("../models/CreditPayment");
const Client = require("../models/Client");
const Sale = require("../models/Sale");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un paiement de crédit
router.post("/add", authMiddleware, async (req, res) => {
  const {
    creditSaleId,
    clientId,
    paymentAmount,
    paymentCurrencyId,
    paymentMethod,
    processedBy,
  } = req.body;

  try {
    const sale = await Sale.findById(creditSaleId);
    if (!sale) {
      return res.status(400).json({ msg: "Credit sale not found" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ msg: "Client not found" });
    }

    const paymentCurrency = await Currency.findById(paymentCurrencyId);
    if (!paymentCurrency) {
      return res.status(400).json({ msg: "Currency not found" });
    }

    // Enregistrement du paiement
    const payment = new CreditPayment({
      creditSale: sale._id,
      client: client._id,
      paymentAmount,
      paymentCurrency: paymentCurrency._id,
      paymentMethod,
      processedBy,
    });

    // Mise à jour du crédit disponible du client
    const clientCreditLimit = client.creditLimits.find(
      (limit) => limit.currency.toString() === paymentCurrencyId,
    );

    if (!clientCreditLimit) {
      return res
        .status(400)
        .json({ msg: "Credit limit not found for this currency" });
    }

    clientCreditLimit.currentCredit += paymentAmount;
    await client.save();

    await payment.save();
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier un paiement de crédit
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const {
    paymentAmount,
    paymentCurrencyId,
    paymentMethod,
    paymentStatus,
    processedBy,
  } = req.body;

  try {
    let payment = await CreditPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Credit payment not found" });
    }

    // Mettre à jour les informations du paiement
    if (paymentAmount !== undefined) payment.paymentAmount = paymentAmount;
    if (paymentCurrencyId) payment.paymentCurrency = paymentCurrencyId;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (paymentStatus) payment.paymentStatus = paymentStatus;
    payment.processedBy = processedBy || payment.processedBy;

    // Mettre à jour le crédit disponible du client si le montant change
    if (
      paymentStatus === "completed" &&
      payment.paymentAmount !== paymentAmount
    ) {
      const client = await Client.findById(payment.client);
      const clientCreditLimit = client.creditLimits.find(
        (limit) =>
          limit.currency.toString() === payment.paymentCurrency.toString(),
      );
      if (clientCreditLimit) {
        const amountDifference = paymentAmount - payment.paymentAmount;
        clientCreditLimit.currentCredit += amountDifference;
        await client.save();
      }
    }

    await payment.save();
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les paiements de crédits
router.get("/", authMiddleware, async (req, res) => {
  try {
    const payments = await CreditPayment.find().populate(
      "creditSale client paymentCurrency processedBy",
    );
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir un paiement de crédit par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const payment = await CreditPayment.findById(req.params.id).populate(
      "creditSale client paymentCurrency processedBy",
    );
    if (!payment) {
      return res.status(404).json({ msg: "Credit payment not found" });
    }
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des paiements de crédits
router.get("/search", authMiddleware, async (req, res) => {
  const { creditSaleId, clientId, paymentStatus } = req.query;

  try {
    let query = {};

    if (creditSaleId) query.creditSale = creditSaleId;
    if (clientId) query.client = clientId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const payments = await CreditPayment.find(query).populate(
      "creditSale client paymentCurrency processedBy",
    );
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un paiement de crédit
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let payment = await CreditPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Credit payment not found" });
    }

    // Mise à jour du crédit disponible du client avant la suppression
    const client = await Client.findById(payment.client);
    const clientCreditLimit = client.creditLimits.find(
      (limit) =>
        limit.currency.toString() === payment.paymentCurrency.toString(),
    );
    if (clientCreditLimit) {
      clientCreditLimit.currentCredit -= payment.paymentAmount;
      await client.save();
    }

    await payment.remove();
    res.json({ msg: "Credit payment deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour annuler un paiement de crédit
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    let payment = await CreditPayment.findById(req.params.id).populate(
      "client paymentCurrency",
    );
    if (!payment) {
      return res.status(404).json({ msg: "Credit payment not found" });
    }

    if (payment.canceled) {
      return res.status(400).json({ msg: "Payment is already canceled" });
    }

    // Mise à jour du crédit disponible du client
    const client = await Client.findById(payment.client._id);
    const clientCreditLimit = client.creditLimits.find(
      (limit) =>
        limit.currency.toString() === payment.paymentCurrency._id.toString(),
    );

    if (!clientCreditLimit) {
      return res
        .status(400)
        .json({ msg: "Credit limit not found for this currency" });
    }

    // Rétablir le crédit disponible du client
    clientCreditLimit.currentCredit -= payment.paymentAmount;
    await client.save();

    // Marquer le paiement comme annulé
    payment.paymentStatus = "canceled";
    payment.canceled = true;
    await payment.save();

    res.json({ msg: "Credit payment canceled successfully", payment });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
