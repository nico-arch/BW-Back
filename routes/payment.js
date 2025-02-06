const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Client = require("../models/Client");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un nouveau paiement
/*
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, clientId, amount, currency, paymentType, remarks } = req.body;
  const userId = req.user.id;

  try {
    // Vérifier si la vente existe
    const sale = await Sale.findById(saleId).populate("products.product");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Vérifier si le client existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }

    // Vérifier si la devise correspond à celle de la vente
    if (sale.currency.toString() !== currency) {
      return res
        .status(400)
        .json({ msg: "Payment currency does not match sale currency" });
    }

    // Calculer le montant restant à payer
    const totalPaid = await Payment.aggregate([
      { $match: { sale: sale._id } },
      { $group: { _id: "$sale", totalPaid: { $sum: "$amount" } } },
    ]);

    const amountAlreadyPaid = totalPaid.length > 0 ? totalPaid[0].totalPaid : 0;
    const remainingAmount = sale.totalAmount - amountAlreadyPaid;

    if (amount > remainingAmount) {
      return res.status(400).json({ msg: "Payment exceeds remaining amount" });
    }

    // Créer le paiement
    const payment = new Payment({
      sale: sale._id,
      client: client._id,
      amount,
      currency,
      paymentType,
      remarks,
      createdBy: userId,
    });

    // Mettre à jour le statut de la vente si le paiement complète le montant
    if (amount === remainingAmount) {
      sale.saleStatus = "completed";
      sale.completedBy = userId;
      sale.updatedAt = Date.now();

      // Ajuster le stock si la vente n'est pas à crédit
      if (!sale.isCredit) {
        try {
          for (const item of sale.products) {
            const product = await Product.findById(item.product._id);

            if (!product) {
              return res.status(404).json({
                msg: `Product with ID ${item.product._id} not found. Stock adjustment failed.`,
              });
            }

            if (product.stockQuantity < item.quantity) {
              return res.status(400).json({
                msg: `Insufficient stock for product ${product.productName}. Required: ${item.quantity}, Available: ${product.stockQuantity}`,
              });
            }

            product.stockQuantity -= item.quantity;
            await product.save();
          }
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            msg: "An error occurred while adjusting stock. Please try again.",
          });
        }
      }

      await sale.save();
    }

    await payment.save();
    res.status(201).json({ msg: "Payment created successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

*/
// Créer un nouveau paiement
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, clientId, amount, currency, paymentType, remarks } = req.body;
  const userId = req.user.id;

  try {
    // Vérifier si la vente existe
    const sale = await Sale.findById(saleId)
      .populate("products.product")
      .populate("currency");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Vérifier que la vente n'est pas annulée
    if (sale.saleStatus === "cancelled") {
      return res
        .status(400)
        .json({ msg: "Cannot add payment to a cancelled sale" });
    }

    // Vérifier si le client existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }

    // Vérifier si la devise du paiement correspond à celle de la vente
    // On suppose ici que sale.currency est peuplé et possède la propriété currencyCode
    if (sale.currency.currencyCode !== currency) {
      return res
        .status(400)
        .json({ msg: "Payment currency does not match sale currency" });
    }

    // Calculer le montant restant à payer
    const totalPaidAgg = await Payment.aggregate([
      { $match: { sale: sale._id, paymentStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$sale", totalPaid: { $sum: "$amount" } } },
    ]);
    const amountAlreadyPaid =
      totalPaidAgg.length > 0 ? totalPaidAgg[0].totalPaid : 0;
    const remainingAmount = sale.totalAmount - amountAlreadyPaid;
    if (amount > remainingAmount) {
      return res.status(400).json({ msg: "Payment exceeds remaining amount" });
    }

    // Créer le paiement
    const payment = new Payment({
      sale: sale._id,
      client: client._id,
      amount,
      currency,
      paymentType,
      remarks,
      createdBy: userId,
    });

    // Si le paiement complète le montant dû, on marque la vente comme "completed"
    if (amount === remainingAmount) {
      sale.saleStatus = "completed";
      sale.completedBy = userId;
      sale.updatedAt = Date.now();

      // Pour une vente normale (non à crédit), ajuster le stock si nécessaire
      if (!sale.creditSale) {
        try {
          for (const item of sale.products) {
            const product = await Product.findById(item.product._id);
            if (!product) {
              return res.status(404).json({
                msg: `Product with ID ${item.product._id} not found. Stock adjustment failed.`,
              });
            }
            if (product.stockQuantity < item.quantity) {
              return res.status(400).json({
                msg: `Insufficient stock for product ${product.productName}. Required: ${item.quantity}, Available: ${product.stockQuantity}`,
              });
            }
            product.stockQuantity -= item.quantity;
            await product.save();
          }
        } catch (error) {
          console.error(error);
          return res.status(500).json({
            msg: "An error occurred while adjusting stock. Please try again.",
          });
        }
      }

      await sale.save();
    }

    await payment.save();
    res.status(201).json({ msg: "Payment created successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir tous les paiements
router.get("/", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("sale", "_id totalAmount")
      .populate("client", "firstName lastName");
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir les paiements d'une vente spécifique
router.get("/sale/:saleId", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ sale: req.params.saleId })
      .populate("sale", "_id totalAmount")
      .populate("client", "firstName lastName");
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Modifier un paiement
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { amount, paymentType, remarks } = req.body;
  const userId = req.user.id;

  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    if (amount) payment.amount = amount;
    if (paymentType) payment.paymentType = paymentType;
    if (remarks) payment.remarks = remarks;

    payment.updatedBy = userId;
    payment.updatedAt = Date.now();

    await payment.save();
    res.json({ msg: "Payment updated successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Annuler un paiement
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    const sale = await Sale.findById(payment.sale);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Annuler le paiement
    payment.paymentStatus = "cancelled";
    payment.updatedBy = userId;
    payment.updatedAt = Date.now();

    // Mettre à jour le statut de la vente si nécessaire
    const totalPaid = await Payment.aggregate([
      { $match: { sale: sale._id, paymentStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$sale", totalPaid: { $sum: "$amount" } } },
    ]);

    const amountAlreadyPaid = totalPaid.length > 0 ? totalPaid[0].totalPaid : 0;
    sale.saleStatus =
      amountAlreadyPaid < sale.totalAmount ? "pending" : "completed";
    sale.updatedBy = userId;
    sale.updatedAt = Date.now();

    await sale.save();
    await payment.save();

    res.json({ msg: "Payment cancelled successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
