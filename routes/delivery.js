const express = require("express");
const Delivery = require("../models/Delivery");
const Sale = require("../models/Sale");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour créer une livraison
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, clientId, deliveryAddress, addressDetails } = req.body;

  try {
    // Vérifier si la vente existe
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Créer la livraison
    const delivery = new Delivery({
      sale: saleId,
      client: clientId,
      deliveryAddress,
      addressDetails:
        deliveryAddress === "clientAddress" ? addressDetails : null,
    });

    await delivery.save();
    res.json({ msg: "Delivery created successfully", delivery });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour mettre à jour le statut d'une livraison
router.put("/update-status/:id", authMiddleware, async (req, res) => {
  const { deliveryStatus } = req.body;

  try {
    let delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ msg: "Delivery not found" });
    }

    // Mettre à jour le statut de livraison
    delivery.deliveryStatus = deliveryStatus;
    if (deliveryStatus === "completed") {
      delivery.deliveryDate = new Date();
    }

    await delivery.save();
    res.json({ msg: "Delivery status updated successfully", delivery });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour afficher toutes les livraisons
router.get("/", authMiddleware, async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("sale")
      .populate("client");
    res.json(deliveries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour afficher une livraison spécifique
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("sale")
      .populate("client");
    if (!delivery) {
      return res.status(404).json({ msg: "Delivery not found" });
    }
    res.json(delivery);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour annuler une livraison
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    let delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ msg: "Delivery not found" });
    }

    // Annuler la livraison
    delivery.deliveryStatus = "canceled";
    await delivery.save();

    res.json({ msg: "Delivery canceled successfully", delivery });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
