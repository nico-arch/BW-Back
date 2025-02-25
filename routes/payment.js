const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Client = require("../models/Client");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un nouveau paiement (route déjà mise à jour précédemment)
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, clientId, amount, currency, paymentType, remarks } = req.body;
  const userId = req.user.id;

  try {
    const sale = await Sale.findById(saleId)
      .populate("products.product")
      .populate("currency");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    if (sale.saleStatus === "cancelled") {
      return res
        .status(400)
        .json({ msg: "Cannot add payment to a cancelled sale" });
    }
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }
    if (sale.currency.currencyCode !== currency) {
      return res
        .status(400)
        .json({ msg: "Payment currency does not match sale currency" });
    }
    const totalPaidAgg = await Payment.aggregate([
      { $match: { sale: sale._id, paymentStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$sale", totalPaid: { $sum: "$amount" } } },
    ]);
    const amountAlreadyPaid =
      totalPaidAgg.length > 0 ? totalPaidAgg[0].totalPaid : 0;

    const remainingAmountDecimal = +sale.totalAmount.toFixed(2) - +amountAlreadyPaid.toFixed(2);
	const remainingAmount = +remainingAmountDecimal.toFixed(2);
	//console.log("remainingAmount : "+remainingAmount);

    if (amount > remainingAmount) {
      return res.status(400).json({ msg: "Payment exceeds remaining amount" });
    }

	const amountFixed = +amount.toFixed(2);

    const payment = new Payment({
      sale: sale._id,
      client: client._id,
	  amount: amountFixed,
      currency,
      paymentType,
      remarks,
      createdBy: userId,
    });

    if (amountFixed === remainingAmount) {
      sale.saleStatus = "completed";
      sale.completedBy = userId;
      sale.updatedAt = Date.now();
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
	  //console.log("remainingAmount : "+remainingAmount);
	  //console.log("sale :"+sale);
      await sale.save();
    }

    await payment.save();
    res.status(201).json({ msg: "Payment created successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir tous les paiements avec population du champ createdBy
router.get("/", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find()
      .sort({ createdAt: -1 }) // Tri décroissant par date de création
      .populate("sale", "_id totalAmount")
      .populate("client", "firstName lastName")
      .populate("createdBy", "firstName lastName");
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir les paiements d'une vente spécifique avec population du champ createdBy
router.get("/sale/:saleId", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ sale: req.params.saleId })
      .sort({ createdAt: -1 }) // Tri décroissant par date de création
      .populate("sale", "_id totalAmount")
      .populate("client", "firstName lastName")
      .populate("createdBy", "firstName lastName");
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

    // Sauvegarder le paiement annulé pour que l'agrégation le prenne en compte
    await payment.save();

    // Calculer le montant total déjà payé (excluant les paiements annulés)
    const totalPaidAgg = await Payment.aggregate([
      { $match: { sale: sale._id, paymentStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$sale", totalPaid: { $sum: "$amount" } } },
    ]);
    const amountAlreadyPaid =
      totalPaidAgg.length > 0 ? totalPaidAgg[0].totalPaid : 0;

	  const amountAlreadyPaidFixed = +amountAlreadyPaid.toFixed(2)
    // Mettre à jour le statut de la vente en fonction du montant payé
    sale.saleStatus =
      amountAlreadyPaidFixed < sale.totalAmount ? "pending" : "completed";
    sale.updatedBy = userId;
    sale.updatedAt = Date.now();
    await sale.save();

    res.json({ msg: "Payment cancelled successfully", payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Supprimer un paiement annulé
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }
    if (payment.paymentStatus !== "cancelled") {
      return res
        .status(400)
        .json({ msg: "Only cancelled payments can be deleted" });
    }
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ msg: "Payment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

module.exports = router;
