const express = require("express");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Service = require("../models/Service");
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

// Route to assign a category to a product
router.put("/assign-category/:productId", authMiddleware, async (req, res) => {
  const { categoryId } = req.body;

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ msg: "Category not found" });
    }

    // Check if the category is already assigned
    if (product.categories.includes(categoryId)) {
      return res
        .status(400)
        .json({ msg: "Category already assigned to this product" });
    }

    // Assign the category to the product
    product.categories.push(categoryId);
    await product.save();

    res.json({ msg: "Category assigned to product successfully", product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to remove a category assignment from a product
router.put("/remove-category/:productId", authMiddleware, async (req, res) => {
  const { categoryId } = req.body;

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ msg: "Category not found" });
    }

    // Check if the category is assigned
    if (!product.categories.includes(categoryId)) {
      return res
        .status(400)
        .json({ msg: "Category not assigned to this product" });
    }

    // Remove the category from the product
    product.categories = product.categories.filter(
      (catId) => catId.toString() !== categoryId,
    );
    await product.save();

    res.json({ msg: "Category removed from product successfully", product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to assign a service to a product
router.put("/assign-service/:productId", authMiddleware, async (req, res) => {
  const { serviceId } = req.body;

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ msg: "Service not found" });
    }

    // Check if the service is already assigned
    if (product.services.includes(serviceId)) {
      return res
        .status(400)
        .json({ msg: "Service already assigned to this product" });
    }

    // Assign the service to the product
    product.services.push(serviceId);
    await product.save();

    res.json({ msg: "Service assigned to product successfully", product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to remove a service from a product
router.put("/remove-service/:productId", authMiddleware, async (req, res) => {
  const { serviceId } = req.body;

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ msg: "Service not found" });
    }

    // Check if the service is assigned
    if (!product.services.includes(serviceId)) {
      return res
        .status(400)
        .json({ msg: "Service not assigned to this product" });
    }

    // Remove the service from the product
    product.services = product.services.filter(
      (svcId) => svcId.toString() !== serviceId,
    );
    await product.save();

    res.json({ msg: "Service removed from product successfully", product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
