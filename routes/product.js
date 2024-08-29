const express = require("express");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un produit
router.post("/add", authMiddleware, async (req, res) => {
  const {
    productName,
    description,
    barcode,
    currentPrice,
    currencyId,
    stockQuantity,
    expirationDate,
  } = req.body;

  try {
    const product = new Product({
      productName,
      description,
      barcode,
      currentPrice,
      currency: currencyId,
      stockQuantity,
      expirationDate,
    });

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier un produit
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const {
    productName,
    description,
    barcode,
    currentPrice,
    currencyId,
    stockQuantity,
    expirationDate,
  } = req.body;

  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    product.productName = productName || product.productName;
    product.description = description || product.description;
    product.barcode = barcode || product.barcode;
    product.currentPrice = currentPrice || product.currentPrice;
    product.currency = currencyId || product.currency;
    product.stockQuantity = stockQuantity || product.stockQuantity;
    product.expirationDate = expirationDate || product.expirationDate;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les produits
router.get("/", authMiddleware, async (req, res) => {
  try {
    const products = await Product.find().populate("currency");
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir un produit par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("currency");
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des produits
router.get("/search", authMiddleware, async (req, res) => {
  const { productName, barcode } = req.query;

  try {
    let query = {};

    if (productName) query.productName = new RegExp(productName, "i");
    if (barcode) query.barcode = barcode;

    const products = await Product.find(query).populate("currency");
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un produit
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    await product.remove();
    res.json({ msg: "Product deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
