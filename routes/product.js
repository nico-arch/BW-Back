const express = require("express");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Créer un produit
router.post("/create", authMiddleware, async (req, res) => {
  const { productName, description, priceUSD, stockQuantity, categories } =
    req.body;

  try {
    const newProduct = new Product({
      productName,
      description,
      priceUSD,
      stockQuantity,
      categories,
      createdBy: req.user.id,
    });

    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Lire tous les produits
router.get("/", authMiddleware, async (req, res) => {
  try {
    const products = await Product.find().populate("categories");
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Mettre à jour un produit
router.put("/update/:id", authMiddleware, async (req, res) => {
  const { productName, description, priceUSD, stockQuantity, categories } =
    req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    product.productName = productName || product.productName;
    product.description = description || product.description;
    product.priceUSD = priceUSD || product.priceUSD;
    product.stockQuantity = stockQuantity || product.stockQuantity;
    product.categories = categories || product.categories;
    product.updatedBy = req.user.id;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Supprimer un produit
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    await product.remove();
    res.json({ msg: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Route pour mettre à jour les prix des produits
router.put("/update-price/:id", authMiddleware, async (req, res) => {
  const { newPriceUSD } = req.body;

  try {
    // Vérifier si le produit existe
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // Vérifier que le nouveau prix est valide
    if (newPriceUSD <= 0) {
      return res.status(400).json({ msg: "Invalid price value" });
    }

    // Mettre à jour le prix en USD
    product.priceUSD = newPriceUSD;

    // Récupérer le taux de change actuel
    const exchangeRate = await ExchangeRate.findOne({
      fromCurrency: "USD",
      toCurrency: "HTG",
    }).sort({ createdAt: -1 });

    if (!exchangeRate) {
      return res.status(500).json({ msg: "Exchange rate not found" });
    }

    // Calculer le nouveau prix en HTG
    product.priceHTG = newPriceUSD * exchangeRate.rate;

    // Sauvegarder les modifications
    product.updatedAt = new Date();
    product.updatedBy = req.user.id;

    await product.save();

    res.json({
      msg: "Product prices updated successfully",
      product,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
