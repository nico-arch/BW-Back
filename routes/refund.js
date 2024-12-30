const express = require("express");
const router = express.Router();
const Refund = require("../models/Refund");
const Return = require("../models/Return");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un remboursement
router.post("/add", authMiddleware, async (req, res) => {
  const { returnId, remarks, createdBy } = req.body;

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
        .json({ msg: "Refund already exists for this return" });
    }

    const refund = new Refund({
      return: returnData._id,
      client: returnData.client._id,
      currency: returnData.currency,
      totalRefundAmount: returnData.totalRefundAmount,
      remarks,
      createdBy,
    });

    await refund.save();
    res.status(201).json(refund);
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

// Modifier un remboursement
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { remarks } = req.body;

  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    if (remarks) refund.remarks = remarks;

    await refund.save();
    res.json(refund);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Annuler un remboursement
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ msg: "Refund not found" });
    }

    await refund.remove();
    res.json({ msg: "Refund cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
