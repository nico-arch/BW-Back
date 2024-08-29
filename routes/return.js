const express = require("express");
const Return = require("../models/Return");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Product = require("../models/Product");
const Currency = require("../models/Currency");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un retour
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, productId, returnQuantity, returnCurrencyId, processedBy } =
    req.body;

  try {
    const sale = await Sale.findById(saleId).populate("client");
    if (!sale) {
      return res.status(400).json({ msg: "Sale not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({ msg: "Product not found" });
    }

    const returnCurrency = await Currency.findById(returnCurrencyId);
    if (!returnCurrency) {
      return res.status(400).json({ msg: "Currency not found" });
    }

    const saleProduct = sale.products.find(
      (p) => p.product.toString() === productId,
    );
    if (!saleProduct) {
      return res
        .status(400)
        .json({ msg: "Product not part of the original sale" });
    }

    if (returnQuantity > saleProduct.quantity) {
      return res
        .status(400)
        .json({ msg: "Return quantity exceeds the quantity sold" });
    }

    const returnAmount =
      (saleProduct.priceConverted / saleProduct.quantity) * returnQuantity;

    const returnEntry = new Return({
      sale: sale._id,
      product: product._id,
      returnQuantity,
      returnAmount,
      returnCurrency: returnCurrency._id,
      processedBy,
      creditedToBalance: false, // Initialement, non crédité à la balance
    });

    // Mise à jour du stock de produits
    product.stockQuantity += returnQuantity;
    await product.save();

    // Créditer la balance du client
    const client = sale.client;
    const clientBalance = client.balances.find(
      (b) => b.currency.toString() === returnCurrencyId,
    );
    if (clientBalance) {
      clientBalance.balanceAmount += returnAmount;
      returnEntry.creditedToBalance = true;
    }

    await client.save();
    await returnEntry.save();

    res.json(returnEntry);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier un retour
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { returnQuantity, returnCurrencyId, processedBy } = req.body;

  try {
    let returnEntry = await Return.findById(req.params.id);
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }

    if (returnQuantity !== undefined) {
      const sale = await Sale.findById(returnEntry.sale);
      const saleProduct = sale.products.find(
        (p) => p.product.toString() === returnEntry.product.toString(),
      );

      if (returnQuantity > saleProduct.quantity) {
        return res
          .status(400)
          .json({ msg: "Return quantity exceeds the quantity sold" });
      }

      returnEntry.returnQuantity = returnQuantity;
      returnEntry.returnAmount =
        (saleProduct.priceConverted / saleProduct.quantity) * returnQuantity;
    }

    if (returnCurrencyId) {
      const returnCurrency = await Currency.findById(returnCurrencyId);
      if (!returnCurrency) {
        return res.status(400).json({ msg: "Currency not found" });
      }
      returnEntry.returnCurrency = returnCurrency._id;
    }

    returnEntry.processedBy = processedBy || returnEntry.processedBy;

    await returnEntry.save();
    res.json(returnEntry);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les retours
router.get("/", authMiddleware, async (req, res) => {
  try {
    const returns = await Return.find().populate(
      "sale product returnCurrency processedBy",
    );
    res.json(returns);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir un retour par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const returnEntry = await Return.findById(req.params.id).populate(
      "sale product returnCurrency processedBy",
    );
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }
    res.json(returnEntry);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des retours
router.get("/search", authMiddleware, async (req, res) => {
  const { saleId, productId, processedBy } = req.query;

  try {
    let query = {};

    if (saleId) query.sale = saleId;
    if (productId) query.product = productId;
    if (processedBy) query.processedBy = processedBy;

    const returns = await Return.find(query).populate(
      "sale product returnCurrency processedBy",
    );
    res.json(returns);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un retour
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let returnEntry = await Return.findById(req.params.id);
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }

    await returnEntry.remove();
    res.json({ msg: "Return deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour annuler un retour
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    let returnEntry = await Return.findById(req.params.id)
      .populate("sale")
      .populate("product")
      .populate("returnCurrency");
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }

    if (returnEntry.canceled) {
      return res.status(400).json({ msg: "Return is already canceled" });
    }

    // Restauration du stock du produit
    returnEntry.product.stockQuantity -= returnEntry.returnQuantity;
    if (returnEntry.product.stockQuantity < 0) {
      return res
        .status(400)
        .json({ msg: "Cannot cancel return as it results in negative stock" });
    }
    await returnEntry.product.save();

    // Débiter la balance du client
    const client = await Client.findById(returnEntry.sale.client);
    const clientBalance = client.balances.find(
      (b) =>
        b.currency.toString() === returnEntry.returnCurrency._id.toString(),
    );
    if (clientBalance && returnEntry.creditedToBalance) {
      clientBalance.balanceAmount -= returnEntry.returnAmount;
      await client.save();
    }

    // Marquer le retour comme annulé
    returnEntry.canceled = true;
    await returnEntry.save();

    res.json({ msg: "Return canceled successfully", returnEntry });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
