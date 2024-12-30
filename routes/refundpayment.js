const express = require("express");
const router = express.Router();
const Refund = require("../models/Refund");
const RefundPayment = require("../models/RefundPayment");
const authMiddleware = require("../middlewares/authMiddleware");

// Ajouter un paiement de remboursement
router.post("/add", authMiddleware, async (req, res) => {
  const { refundId, paymentAmount, paymentMethod, remarks, processedBy } =
    req.body;

  try {
    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    if (refund.totalRefundAmount <= 0) {
      return res.status(400).json({ msg: "No amount left to refund" });
    }

    const payment = new RefundPayment({
      refund: refund._id,
      paymentAmount,
      paymentMethod,
      remarks,
      processedBy,
    });

    // Mise à jour du statut du remboursement
    refund.totalRefundAmount -= paymentAmount;
    if (refund.totalRefundAmount === 0) {
      refund.refundStatus = "completed";
    } else {
      refund.refundStatus = "partial";
    }

    await payment.save();
    await refund.save();

    res.status(201).json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir les paiements d'un remboursement
router.get("/:refundId", authMiddleware, async (req, res) => {
  try {
    const payments = await RefundPayment.find({ refund: req.params.refundId });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Annuler un paiement de remboursement
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const payment = await RefundPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    const refund = await Refund.findById(payment.refund);
    if (refund) {
      refund.totalRefundAmount += payment.paymentAmount;
      refund.refundStatus = "partial";
      await refund.save();
    }

    await payment.remove();
    res.json({ msg: "Refund payment cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
