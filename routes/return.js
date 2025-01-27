const express = require("express");
const router = express.Router();
const Return = require("../models/Return");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Refund = require("../models/Refund");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un retour
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, clientId, products, remarks } = req.body;
  const userId = req.user.id;

  try {
    // Vérifier la vente
    const sale = await Sale.findById(saleId).populate("products.product");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Vérifier le client
    if (sale.client.toString() !== clientId) {
      return res.status(400).json({ msg: "Client does not match sale" });
    }

    // Calculer le montant total à rembourser et vérifier les quantités retournées
    let totalRefundAmount = 0;
    const returnProducts = [];

    for (const item of products) {
      const saleProduct = sale.products.find(
        (p) => p.product._id.toString() === item.productId,
      );

      if (!saleProduct) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found in sale` });
      }

      if (item.quantity > saleProduct.quantity) {
        return res.status(400).json({
          msg: `Return quantity exceeds sold quantity for product ${saleProduct.product.productName}`,
        });
      }

      totalRefundAmount += item.quantity * saleProduct.price;

      returnProducts.push({
        product: saleProduct.product._id,
        quantity: item.quantity,
        price: saleProduct.price,
      });
    }

    // Créer le retour
    const returnEntry = new Return({
      sale: sale._id,
      client: clientId,
      products: returnProducts,
      currency: sale.currency,
      totalRefundAmount,
      remarks,
      createdBy: userId,
    });

    // Mettre à jour le stock
    for (const item of returnProducts) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity += item.quantity;
        await product.save();
      }
    }

    // Créer un remboursement lié au retour
    const refund = new Refund({
      return: returnEntry._id,
      client: clientId,
      currency: sale.currency,
      totalRefundAmount,
      createdBy: userId,
    });

    await returnEntry.save();
    await refund.save();

    res.status(201).json({ msg: "Return created successfully", returnEntry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir tous les retours
router.get("/", authMiddleware, async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("sale")
      .populate("client")
      .populate("products.product");
    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir un retour par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const returnEntry = await Return.findById(req.params.id)
      .populate("sale")
      .populate("client")
      .populate("products.product");
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }
    res.json(returnEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Modifier un retour
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { products, remarks } = req.body;
  const userId = req.user.id;

  try {
    const returnEntry = await Return.findById(req.params.id).populate(
      "products.product",
    );
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }

    if (returnEntry.refundStatus !== "pending") {
      return res
        .status(400)
        .json({ msg: "Only pending returns can be edited" });
    }

    let totalRefundAmount = 0;
    const updatedProducts = [];

    for (const item of products) {
      const originalProduct = returnEntry.products.find(
        (p) => p.product._id.toString() === item.productId,
      );

      if (!originalProduct) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found in return` });
      }

      totalRefundAmount += item.quantity * originalProduct.price;

      updatedProducts.push({
        product: originalProduct.product._id,
        quantity: item.quantity,
        price: originalProduct.price,
      });
    }

    returnEntry.products = updatedProducts;
    returnEntry.totalRefundAmount = totalRefundAmount;
    if (remarks) returnEntry.remarks = remarks;
    returnEntry.updatedBy = userId;
    returnEntry.updatedAt = Date.now();

    await returnEntry.save();
    res.json({ msg: "Return updated successfully", returnEntry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Supprimer un retour
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const returnEntry = await Return.findById(req.params.id);
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }

    if (returnEntry.refundStatus !== "pending") {
      return res
        .status(400)
        .json({ msg: "Only pending returns can be canceled" });
    }

    // Réajuster le stock
    for (const item of returnEntry.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity -= item.quantity;
        await product.save();
      }
    }

    returnEntry.canceledBy = userId;
    await returnEntry.remove();

    res.json({ msg: "Return canceled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
