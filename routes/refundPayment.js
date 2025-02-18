const express = require("express");
const router = express.Router();
const Refund = require("../models/Refund");
const RefundPayment = require("../models/RefundPayment");
const authMiddleware = require("../middlewares/authMiddleware");

// Ajouter un paiement de remboursement
router.post("/add", authMiddleware, async (req, res) => {
  const { refundId, paymentAmount, paymentMethod, remarks } = req.body;
  const userId = req.user.id;

  try {
    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    if (refund.refundStatus === "completed") {
      return res.status(400).json({
        msg: "Refund is already completed. No further payments allowed.",
      });
    }

    if (paymentAmount <= 0 || paymentAmount > refund.totalRefundAmount) {
      return res.status(400).json({
        msg: "Payment amount must be greater than zero and not exceed the refund amount.",
      });
    }

    const payment = new RefundPayment({
      refund: refund._id,
      paymentAmount,
      paymentMethod,
      remarks,
      processedBy: userId,
      logs: [
        {
          action: "created",
          timestamp: new Date(),
          user: userId,
        },
      ],
    });

    // Mise à jour du montant restant et du statut du refund
    refund.totalRefundAmount -= paymentAmount;
    refund.refundStatus =
      refund.totalRefundAmount === 0 ? "completed" : "partial";
    refund.updatedAt = Date.now();

    await payment.save();
    await refund.save();

    res.status(201).json({ msg: "Refund payment added successfully", payment });
  } catch (error) {
    console.error("Error adding refund payment:", error);
    res.status(500).json({ msg: "Server error: " + error.message });
  }
});

// Obtenir les paiements d'un remboursement
router.get("/:refundId", authMiddleware, async (req, res) => {
  try {
    // Vérifier l'existence du refund
    const refund = await Refund.findById(req.params.refundId);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    // Récupérer les paiements associés
    const payments = await RefundPayment.find({ refund: req.params.refundId })
      .populate("refund", "totalRefundAmount refundStatus")
      .populate("processedBy", "firstName lastName");

    if (!payments || payments.length === 0) {
      return res
        .status(404)
        .json({ msg: "No refund payments found for this refund" });
    }

    res.json(payments);
  } catch (error) {
    console.error("Error retrieving refund payments:", error);
    res.status(500).json({ msg: "Server error: " + error.message });
  }
});

// Annuler un paiement de remboursement
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const payment = await RefundPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Refund payment not found" });
    }

    if (payment.paymentStatus === "cancelled") {
      return res.status(400).json({ msg: "Payment is already cancelled." });
    }

    const refund = await Refund.findById(payment.refund);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    // Annuler le paiement
    payment.paymentStatus = "cancelled";
    payment.canceledBy = userId;
    payment.updatedAt = Date.now();
    payment.logs.push({
      action: "cancelled",
      timestamp: new Date(),
      user: userId,
    });

    // Ajuster le montant total du refund en réintégrant le montant annulé
    refund.totalRefundAmount += payment.paymentAmount;
    refund.refundStatus = "partial";
    refund.updatedAt = Date.now();

    await payment.save();
    await refund.save();

    res.json({
      msg: "Refund payment cancelled successfully",
      payment,
      refund,
    });
  } catch (error) {
    console.error("Error cancelling refund payment:", error);
    res.status(500).json({ msg: "Server error: " + error.message });
  }
});

// Supprimer un paiement de remboursement
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const payment = await RefundPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Refund payment not found" });
    }
    if (payment.paymentStatus !== "cancelled") {
      return res
        .status(400)
        .json({ msg: "Only cancelled refund payments can be deleted" });
    }
    await RefundPayment.findByIdAndDelete(req.params.id);
    res.json({ msg: "Refund payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting refund payment:", error);
    res.status(500).json({ msg: "Server error: " + error.message });
  }
});

module.exports = router;
