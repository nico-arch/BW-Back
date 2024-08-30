const express = require("express");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter une commande
router.post("/add", authMiddleware, async (req, res) => {
  const { supplierId, products } = req.body;

  try {
    // Vérifier si le fournisseur existe
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(400).json({ msg: "Supplier not found" });
    }

    // Calcul du montant total de la commande
    let totalAmount = 0;
    const orderProducts = [];

    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(400)
          .json({ msg: `Product ${item.productId} not found` });
      }
      const price = item.price || product.currentPrice;
      const quantity = item.quantity;

      orderProducts.push({
        product: product._id,
        quantity,
        price,
      });

      totalAmount += price * quantity;
    }

    // Créer la commande
    const order = new Order({
      supplier: supplier._id,
      products: orderProducts,
      totalAmount,
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier une commande
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { supplierId, products, status } = req.body;

  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(400).json({ msg: "Supplier not found" });
      }
      order.supplier = supplier._id;
    }

    if (products) {
      let totalAmount = 0;
      const orderProducts = [];

      for (let item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ msg: `Product ${item.productId} not found` });
        }
        const price = item.price || product.currentPrice;
        const quantity = item.quantity;

        orderProducts.push({
          product: product._id,
          quantity,
          price,
        });

        totalAmount += price * quantity;
      }

      order.products = orderProducts;
      order.totalAmount = totalAmount;
    }

    if (status) {
      order.status = status;
    }

    order.updatedAt = Date.now();
    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir toutes les commandes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("supplier")
      .populate("products.product");
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir une commande par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("supplier")
      .populate("products.product");
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des commandes par statut
router.get("/search", authMiddleware, async (req, res) => {
  const { status } = req.query;

  try {
    const orders = await Order.find({ status })
      .populate("supplier")
      .populate("products.product");
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer une commande
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    await order.remove();
    res.json({ msg: "Order deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour annuler une commande
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.status === "canceled") {
      return res.status(400).json({ msg: "Order is already canceled" });
    }

    // Mettre à jour le statut de la commande à 'canceled'
    order.status = "canceled";
    order.updatedAt = Date.now();

    await order.save();
    res.json({ msg: "Order canceled successfully", order });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour compléter une commande
//Example de updated price
/*
PUT /api/orders/complete/60c72b2f5f1b2c0015d28a49
Content-Type: application/json

{
  "updatePrices": {
    "60c72b2f5f1b2c0015d28a50": 100.0,
    "60c72b2f5f1b2c0015d28a51": 200.0
  }
}

*/
router.put("/complete/:id", authMiddleware, async (req, res) => {
  const { updatePrices } = req.body; // updatePrices est facultatif

  try {
    let order = await Order.findById(req.params.id).populate(
      "products.product",
    );
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.status === "completed") {
      return res.status(400).json({ msg: "Order is already completed" });
    }

    if (order.status === "canceled") {
      return res.status(400).json({ msg: "Cannot complete a canceled order" });
    }

    // Mettre à jour le stock pour chaque produit de la commande
    for (let item of order.products) {
      const product = await Product.findById(item.product._id);

      // Mise à jour de la quantité en stock
      product.stockQuantity += item.quantity;

      // Mise à jour du prix si le champ updatePrices est fourni et contient un nouveau prix
      if (updatePrices && updatePrices[item.product._id]) {
        product.currentPrice = updatePrices[item.product._id];
      }

      await product.save();
    }

    // Mettre à jour le statut de la commande à 'completed'
    order.status = "completed";
    order.updatedAt = Date.now();

    await order.save();
    res.json({ msg: "Order completed successfully", order });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
