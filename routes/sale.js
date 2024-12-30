const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Client = require("../models/Client");
const Currency = require("../models/Currency");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer une nouvelle vente
router.post("/add", authMiddleware, async (req, res) => {
  const { clientId, currencyId, products, remarks, createdBy } = req.body;

  try {
    // Vérifier si le client existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }

    // Vérifier si la devise existe
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return res.status(404).json({ msg: "Currency not found" });
    }

    // Vérifier le taux de change
    const exchangeRate = currency.exchangeRates?.find(
      (rate) => rate.toCurrency === "HTG",
    );
    if (!exchangeRate) {
      return res.status(400).json({ msg: "Exchange rate for HTG not found" });
    }

    let totalAmount = 0;
    const saleProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      // Vérifier le stock disponible
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          msg: `Insufficient stock for product ${product.productName}`,
        });
      }

      // Calculer le prix dans la devise de la vente
      const price =
        currencyId === "HTG"
          ? product.currentPrice * exchangeRate.rate
          : product.currentPrice;

      totalAmount += price * item.quantity;

      saleProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: price,
      });

      // Réduire le stock
      product.stockQuantity -= item.quantity;
      await product.save();
    }

    const sale = new Sale({
      client: client._id,
      currency: currency._id,
      exchangeRate: exchangeRate.rate,
      products: saleProducts,
      totalAmount,
      remarks,
      createdBy,
    });

    await sale.save();
    res.status(201).json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir toutes les ventes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("client")
      .populate("products.product")
      .populate("currency");
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir une vente par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("client")
      .populate("products.product")
      .populate("currency");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Modifier une vente
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { products, remarks } = req.body;

  try {
    const sale = await Sale.findById(req.params.id).populate(
      "products.product",
    );
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Vérifier les stocks pour les modifications
    if (products) {
      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(404)
            .json({ msg: `Product ${item.productId} not found` });
        }

        // Vérifier le stock disponible pour la quantité supplémentaire
        const originalItem = sale.products.find(
          (p) => p.product.toString() === product._id.toString(),
        );
        const originalQuantity = originalItem ? originalItem.quantity : 0;

        const difference = item.quantity - originalQuantity;
        if (difference > 0 && product.stockQuantity < difference) {
          return res.status(400).json({
            msg: `Insufficient stock for product ${product.productName}`,
          });
        }

        // Mettre à jour le stock
        product.stockQuantity -= difference;
        await product.save();
      }

      sale.products = products;
    }

    if (remarks) sale.remarks = remarks;

    await sale.save();
    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Supprimer une vente (annulation incluse)
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    if (sale.saleStatus === "cancelled") {
      return res.status(400).json({ msg: "Sale is already cancelled" });
    }

    // Retourner les produits au stock
    for (const item of sale.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity += item.quantity;
        await product.save();
      }
    }

    sale.saleStatus = "cancelled";
    await sale.save();
    res.json({ msg: "Sale cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
