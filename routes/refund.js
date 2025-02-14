const express = require("express");
const router = express.Router();
const Refund = require("../models/Refund");
const Return = require("../models/Return");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un remboursement
router.post("/add", authMiddleware, async (req, res) => {
  const { returnId, remarks } = req.body;
  const userId = req.user.id;

  try {
    const returnData = await Return.findById(returnId).populate("client");
    if (!returnData) {
      return res.status(404).json({ msg: "Return not found" });
    }

    // Vérifier si un remboursement pour ce retour existe déjà
    const existingRefund = await Refund.findOne({ return: returnId });
    if (existingRefund) {
      return res
        .status(400)
        .json({ msg: "A refund already exists for this return" });
    }

    const refund = new Refund({
      return: returnData._id,
      client: returnData.client._id,
      currency: returnData.currency,
      totalRefundAmount: returnData.totalRefundAmount,
      remarks,
      createdBy: userId,
      logs: [
        {
          action: "created",
          timestamp: new Date(),
          user: userId,
        },
      ],
    });

    await refund.save();
    res.status(201).json({ msg: "Refund created successfully", refund });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir tous les remboursements
router.get("/", authMiddleware, async (req, res) => {
  try {
    const refunds = await Refund.find().populate("return").populate("client");
    res.json(refunds);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir un remboursement par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id)
      .populate("return")
      .populate("client");
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }
    res.json(refund);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Modifier un remboursement (ajout des logs et des vérifications)
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { remarks } = req.body;
  const userId = req.user.id;

  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    if (refund.refundStatus === "completed") {
      return res
        .status(400)
        .json({ msg: "Completed refunds cannot be edited" });
    }

    if (remarks) refund.remarks = remarks;

    refund.updatedBy = userId;
    refund.updatedAt = Date.now();
    refund.logs.push({
      action: "updated",
      timestamp: new Date(),
      user: userId,
    });

    await refund.save();
    res.json({ msg: "Refund updated successfully", refund });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Annuler un remboursement (ajout des logs et statut "cancelled")
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    if (refund.refundStatus === "completed") {
      return res
        .status(400)
        .json({ msg: "Completed refunds cannot be cancelled" });
    }

    refund.refundStatus = "cancelled";
    refund.canceledBy = userId;
    refund.updatedAt = Date.now();
    refund.logs.push({
      action: "cancelled",
      timestamp: new Date(),
      user: userId,
    });

    await refund.save();
    res.json({ msg: "Refund cancelled successfully", refund });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir le refund associé à une vente
router.get("/sale/:saleId", authMiddleware, async (req, res) => {
  try {
    // Rechercher un refund dont le champ "sale" correspond à l'ID fourni
    const refund = await Refund.findOne({ sale: req.params.saleId })
      .populate("return")
      .populate("client");
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found for this sale" });
    }
    res.json(refund);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
