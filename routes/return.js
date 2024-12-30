const express = require("express");
const router = express.Router();
const Return = require("../models/Return");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un retour
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, products, remarks, createdBy } = req.body;

  try {
    const sale = await Sale.findById(saleId)
      .populate("products.product")
      .populate("client");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Valider que la devise du retour correspond à la vente
    const currency = sale.currency.toString();

    let totalRefundAmount = 0;
    const returnProducts = [];

    for (const item of products) {
      const saleProduct = sale.products.find(
        (p) => p.product.toString() === item.productId,
      );
      if (!saleProduct) {
        return res
          .status(400)
          .json({ msg: `Product ${item.productId} not found in sale` });
      }

      // Vérifier la quantité
      if (item.quantity > saleProduct.quantity) {
        return res.status(400).json({
          msg: `Returned quantity exceeds sold quantity for product ${saleProduct.product.productName}`,
        });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      // Calculer le montant du remboursement
      const price =
        sale.currency === "HTG" ? product.priceHTG : product.priceUSD;
      totalRefundAmount += price * item.quantity;

      returnProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: price,
      });

      // Mettre à jour le stock (les produits retournés reviennent en stock)
      product.stockQuantity += item.quantity;
      await product.save();
    }

    const returnData = new Return({
      sale: sale._id,
      client: sale.client._id,
      products: returnProducts,
      currency: currency,
      totalRefundAmount,
      remarks,
      createdBy,
    });

    await returnData.save();
    res.status(201).json(returnData);
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
    const returnData = await Return.findById(req.params.id)
      .populate("sale")
      .populate("client")
      .populate("products.product");
    if (!returnData) {
      return res.status(404).json({ msg: "Return not found" });
    }
    res.json(returnData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Modifier un retour
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { products, remarks } = req.body;

  try {
    const returnData = await Return.findById(req.params.id).populate(
      "products.product",
    );
    if (!returnData) {
      return res.status(404).json({ msg: "Return not found" });
    }

    if (products) {
      let totalRefundAmount = 0;
      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(404)
            .json({ msg: `Product ${item.productId} not found` });
        }

        const price =
          returnData.currency === "HTG" ? product.priceHTG : product.priceUSD;
        totalRefundAmount += price * item.quantity;

        // Mettre à jour le stock si la quantité est modifiée
        const originalItem = returnData.products.find(
          (p) => p.product.toString() === product._id.toString(),
        );
        const originalQuantity = originalItem ? originalItem.quantity : 0;
        const difference = item.quantity - originalQuantity;

        product.stockQuantity += difference;
        await product.save();
      }

      returnData.products = products;
      returnData.totalRefundAmount = totalRefundAmount;
    }

    if (remarks) returnData.remarks = remarks;

    await returnData.save();
    res.json(returnData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Annuler un retour
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const returnData = await Return.findById(req.params.id);
    if (!returnData) {
      return res.status(404).json({ msg: "Return not found" });
    }

    // Revenir au stock initial
    for (const item of returnData.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity -= item.quantity;
        await product.save();
      }
    }

    await returnData.remove();
    res.json({ msg: "Return cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
