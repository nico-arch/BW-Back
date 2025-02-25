const express = require("express");
const Category = require("../models/Category");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour créer une catégorie
router.post("/add", authMiddleware, async (req, res) => {
  const {name, description} = req.body;

  try {
    let category = await Category.findOne({name});
    if (category) {
      return res.status(400).json({msg: "Category already exists"});
    }

    category = new Category({name, description});

    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier une catégorie
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const {name, description} = req.body;

  try {
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({msg: "Category not found"});
    }

    category.name = name || category.name;
    category.description = description || category.description;

    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir toutes les catégories
router.get("/", authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir une catégorie par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({msg: "Category not found"});
    }
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer une catégorie
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({msg: "Category not found"});
    }

    await category.deleteOne();
    res.json({msg: "Category deleted successfully"});
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour assigner une catégorie à un produit
router.put("/assign-to-product/:productId", authMiddleware, async (req, res) => {
  const {categoryId} = req.body;

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({msg: "Product not found"});
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({msg: "Category not found"});
    }

    // Assigner la catégorie au produit en utilisant une référence
    if (!product.categories) {
      product.categories = [];
    }

    if (!product.categories.includes(categoryId)) {
      product.categories.push(categoryId);
    } else {
      return res.status(400).json({msg: "Category already assigned to this product"});
    }

    await product.save();
    res.json({msg: "Category assigned to product successfully", product});
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
},);

/**
 * Récupérer tous les produits pour une catégorie donnée
 */
router.get("/:id/products", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({msg: "Category not found"});
    }

    // Récupérer les produits qui ont cette catégorie dans leur tableau categories
    const products = await Product.find({categories: category._id});
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
