const express = require("express");
const Order = require("../models/Order");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter une commande
router.post("/add", authMiddleware, async (req, res) => {
  const { supplierId, products } = req.body;
  const userId = req.user.id;

  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ msg: "Supplier not found" });
    }

    let totalAmount = 0;
    const orderProducts = [];

    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      const { quantity, purchasePrice, salePrice } = item;

      orderProducts.push({
        product: product._id,
        quantity,
        purchasePrice,
        salePrice,
      });

      totalAmount += quantity * purchasePrice; // Calcul du total basé sur le prix d'achat
    }

    const order = new Order({
      supplier: supplier._id,
      products: orderProducts,
      totalAmount,
      createdBy: userId,
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/*router.post("/add", authMiddleware, async (req, res) => {
  const { supplierId, products } = req.body;
  const userId = req.user.id;
  //console.log("User: " + req.user.firstName + " created an order.");

  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ msg: "Supplier not found" });
    }

    let totalAmount = 0;
    const orderProducts = [];

    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      const price = item.price || product.priceUSD;
      const quantity = item.quantity;

      orderProducts.push({
        product: product._id,
        quantity,
        price,
      });

      totalAmount += price * quantity;
    }

    const order = new Order({
      supplier: supplier._id,
      products: orderProducts,
      totalAmount,
      createdBy: userId, // Ajout de l'utilisateur responsable
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error" + err);
  }
});*/

// Route pour modifier une commande (uniquement si elle est en statut "pending")
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { supplierId, products } = req.body;
  const userId = req.user.id;

  try {
    // Trouver la commande par ID
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    // Vérifier que la commande est en statut "pending"
    if (order.status !== "pending") {
      return res.status(400).json({ msg: "Only pending orders can be edited" });
    }

    // Mettre à jour le fournisseur si un nouvel ID est fourni
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ msg: "Supplier not found" });
      }
      order.supplier = supplier._id;
    }

    // Mettre à jour les produits de la commande
    if (products) {
      let totalAmount = 0;
      const orderProducts = [];

      for (let item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(404)
            .json({ msg: `Product ${item.productId} not found` });
        }

        // Récupérer les informations des produits
        const { quantity, purchasePrice, salePrice } = item;

        // Vérification des valeurs requises
        if (!purchasePrice || !salePrice) {
          return res
            .status(400)
            .json({ msg: "Both purchasePrice and salePrice are required." });
        }

        // Ajouter les informations du produit à la liste
        orderProducts.push({
          product: product._id,
          quantity,
          purchasePrice,
          salePrice,
        });

        // Calculer le total basé sur le prix d'achat
        totalAmount += quantity * purchasePrice;
      }

      // Mettre à jour les produits et le montant total dans la commande
      order.products = orderProducts;
      order.totalAmount = totalAmount;
    }

    // Mettre à jour les informations générales de la commande
    order.updatedAt = Date.now();
    order.updatedBy = userId; // Ajouter l'utilisateur responsable de la modification

    // Sauvegarder la commande mise à jour
    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/*router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { supplierId, products } = req.body;
  const userId = req.user.id;

  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ msg: "Only pending orders can be edited" });
    }

    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ msg: "Supplier not found" });
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
            .status(404)
            .json({ msg: `Product ${item.productId} not found` });
        }

        const price = item.price || product.priceUSD;
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

    order.updatedAt = Date.now();
    order.updatedBy = userId; // Ajout de l'utilisateur responsable
    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
*/
// Route pour annuler une commande
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    let order = await Order.findById(req.params.id).populate(
      "products.product",
    );
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.status === "canceled") {
      return res.status(400).json({ msg: "Order is already canceled" });
    }

    if (order.status === "completed") {
      // Si la commande est complétée, réduire le stock des produits
      for (let item of order.products) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stockQuantity -= item.quantity;
          await product.save();
        }
      }
    }

    order.status = "canceled";
    order.canceledBy = userId;
    order.updatedAt = Date.now();
    await order.save();

    res.json({ msg: "Order canceled successfully", order });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour compléter une commande
router.put("/complete/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;

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

    // Mise à jour des prix de vente et des stocks
    for (let item of order.products) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.priceUSD = item.salePrice; // Appliquer le prix de vente
        product.purchasePrice = item.purchasePrice;    // Mettre à jour le prix d'achat
        product.stockQuantity += item.quantity; // Ajouter au stock
        await product.save();
      }
    }

    order.status = "completed";
    order.completedBy = userId;
    order.updatedAt = Date.now();
    await order.save();

    res.json({ msg: "Order completed successfully", order });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/*router.put("/complete/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;

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

    // Mise à jour du stock des produits
    for (let item of order.products) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stockQuantity += item.quantity;
        await product.save();
      }
    }

    order.status = "completed";
    order.completedBy = userId;
    order.updatedAt = Date.now();
    await order.save();

    res.json({ msg: "Order completed successfully", order });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
*/

// Route pour obtenir toutes les commandes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 }) // Tri décroissant par date de création
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
      .populate("products.product")
      .populate("createdBy", "firstName lastName"); // Inclure les infos utilisateur
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
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Commande introuvable" });
    }

    // Vérifiez si la commande est déjà annulée ou terminée
    /*if (order.status === "completed") {
      return res.status(400).json({
        msg: "Les commandes terminées ne peuvent pas être supprimées",
      });
    }*/

    await Order.findByIdAndDelete(req.params.id);
    res.json({ msg: "Commande supprimée avec succès" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur serveur");
  }
});

module.exports = router;
