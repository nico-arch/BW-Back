const express = require("express");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Product = require("../models/Product");
const ExchangeRate = require("../models/ExchangeRate");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour créer une nouvelle vente
/*router.post("/add", authMiddleware, async (req, res) => {
  const {
    clientId,
    saleStatus,
    products,
    initialCurrencyId,
    discountPercentage,
  } = req.body;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ msg: "Client not found" });
    }

    const initialCurrency = await Currency.findById(initialCurrencyId);
    if (!initialCurrency) {
      return res.status(400).json({ msg: "Currency not found" });
    }

    let totalAmountInitial = 0;
    let totalAmountConverted = 0;
    const saleProducts = [];

    for (let item of products) {
      const product = await Product.findById(item.productId).populate(
        "currency",
      );
      if (!product) {
        return res
          .status(400)
          .json({ msg: `Product ${item.productId} not found` });
      }

      const priceInitial = product.currentPrice * item.quantity;

      const exchangeRate = await ExchangeRate.findOne({
        fromCurrency: product.currency._id,
        toCurrency: initialCurrency._id,
      });

      if (!exchangeRate) {
        return res
          .status(400)
          .json({ msg: "Exchange rate not found for this currency pair" });
      }

      const priceConverted = priceInitial * exchangeRate.rate;
      const productDiscount = item.productDiscount || 0;
      const finalPrice =
        priceConverted - priceConverted * (productDiscount / 100);

      totalAmountInitial += priceInitial;
      totalAmountConverted += finalPrice;

      saleProducts.push({
        product: product._id,
        quantity: item.quantity,
        priceInitial: priceInitial,
        priceConverted: finalPrice,
        initialCurrency: initialCurrency._id,
        convertedCurrency: product.currency._id,
        productDiscount: productDiscount,
      });
    }

    const totalDiscount = discountPercentage || client.discountPercentage || 0;
    totalAmountConverted -= totalAmountConverted * (totalDiscount / 100);

    const sale = new Sale({
      client: client._id,
      saleStatus,
      products: saleProducts,
      totalDiscount,
      totalAmountInitial,
      totalAmountConverted,
      exchangeRateUsed: exchangeRate._id,
    });

    if (saleStatus === "credit") {
      const clientCreditLimit = client.creditLimits.find(
        (limit) => limit.currency.toString() === initialCurrencyId,
      );
      if (
        clientCreditLimit &&
        clientCreditLimit.currentCredit + totalAmountConverted >
          clientCreditLimit.creditLimit
      ) {
        return res.status(400).json({ msg: "Credit limit exceeded" });
      }
      clientCreditLimit.currentCredit += totalAmountConverted;
      await client.save();
    }

    await sale.save();
    res.json(sale);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
*/
router.post("/add", authMiddleware, async (req, res) => {
  const {
    clientId,
    saleStatus,
    products,
    initialCurrencyId,
    discountPercentage,
  } = req.body;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(400).json({ msg: "Client not found" });
    }

    const initialCurrency = await Currency.findById(initialCurrencyId);
    if (!initialCurrency) {
      return res.status(400).json({ msg: "Currency not found" });
    }

    let totalAmountInitial = 0;
    let totalAmountConverted = 0;
    const saleProducts = [];
    let exchangeRate = null;

    for (let item of products) {
      const product = await Product.findById(item.productId).populate(
        "currency",
      );
      if (!product) {
        return res
          .status(400)
          .json({ msg: `Product ${item.productId} not found` });
      }

      const priceInitial = product.currentPrice * item.quantity;

      exchangeRate = await ExchangeRate.findOne({
        fromCurrency: product.currency._id,
        toCurrency: initialCurrency._id,
      });

      if (!exchangeRate) {
        return res
          .status(400)
          .json({ msg: "Exchange rate not found for this currency pair" });
      }

      const priceConverted = priceInitial * exchangeRate.rate;
      const productDiscount = item.productDiscount || 0;
      const finalPrice =
        priceConverted - priceConverted * (productDiscount / 100);

      totalAmountInitial += priceInitial;
      totalAmountConverted += finalPrice;

      saleProducts.push({
        product: product._id,
        quantity: item.quantity,
        priceInitial: priceInitial,
        priceConverted: finalPrice,
        initialCurrency: initialCurrency._id,
        convertedCurrency: product.currency._id,
        productDiscount: productDiscount,
      });
    }

    const totalDiscount = discountPercentage || client.discountPercentage || 0;
    totalAmountConverted -= totalAmountConverted * (totalDiscount / 100);

    if (saleStatus === "credit") {
      const clientCreditLimit = client.creditLimits.find(
        (limit) => limit.currency.toString() === initialCurrencyId,
      );
      if (!clientCreditLimit) {
        return res
          .status(400)
          .json({ msg: "Credit limit not found for this currency" });
      }

      // Vérification si le crédit disponible suffit pour cette vente
      if (totalAmountConverted > clientCreditLimit.currentCredit) {
        return res.status(400).json({
          msg: `Insufficient credit. You have ${clientCreditLimit.currentCredit} ${initialCurrency.currencyCode} remaining.`,
        });
      }

      // Mise à jour du crédit disponible après la vente
      clientCreditLimit.currentCredit -= totalAmountConverted;
      await client.save();
    }

    const sale = new Sale({
      client: client._id,
      saleStatus,
      products: saleProducts,
      totalDiscount,
      totalAmountInitial,
      totalAmountConverted,
      exchangeRateUsed: exchangeRate._id,
    });

    await sale.save();
    res.json(sale);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier une vente
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { saleStatus, products, initialCurrencyId, discountPercentage } =
    req.body;

  try {
    let sale = await Sale.findById(req.params.id)
      .populate("products.product")
      .populate("client");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    if (products) {
      sale.products = [];
      let totalAmountInitial = 0;
      let totalAmountConverted = 0;

      for (let item of products) {
        const product = await Product.findById(item.productId).populate(
          "currency",
        );
        if (!product) {
          return res
            .status(400)
            .json({ msg: `Product ${item.productId} not found` });
        }

        const priceInitial = product.currentPrice * item.quantity;

        const exchangeRate = await ExchangeRate.findOne({
          fromCurrency: product.currency._id,
          toCurrency: initialCurrencyId,
        });

        if (!exchangeRate) {
          return res
            .status(400)
            .json({ msg: "Exchange rate not found for this currency pair" });
        }

        const priceConverted = priceInitial * exchangeRate.rate;
        const productDiscount = item.productDiscount || 0;
        const finalPrice =
          priceConverted - priceConverted * (productDiscount / 100);

        totalAmountInitial += priceInitial;
        totalAmountConverted += finalPrice;

        sale.products.push({
          product: product._id,
          quantity: item.quantity,
          priceInitial: priceInitial,
          priceConverted: finalPrice,
          initialCurrency: initialCurrencyId,
          convertedCurrency: product.currency._id,
          productDiscount: productDiscount,
        });
      }

      sale.totalDiscount =
        discountPercentage || sale.client.discountPercentage || 0;
      sale.totalAmountInitial = totalAmountInitial;
      sale.totalAmountConverted =
        totalAmountConverted -
        totalAmountConverted * (sale.totalDiscount / 100);
    }

    sale.saleStatus = saleStatus || sale.saleStatus;

    await sale.save();
    res.json(sale);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir toutes les ventes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("client")
      .populate("products.product");
    res.json(sales);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir une vente par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("client")
      .populate("products.product");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    res.json(sale);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des ventes
router.get("/search", authMiddleware, async (req, res) => {
  const { clientId, saleStatus, fromDate, toDate } = req.query;

  try {
    let query = {};

    if (clientId) query.client = clientId;
    if (saleStatus) query.saleStatus = saleStatus;
    if (fromDate || toDate) {
      query.saleDate = {};
      if (fromDate) query.saleDate.$gte = new Date(fromDate);
      if (toDate) query.saleDate.$lte = new Date(toDate);
    }

    const sales = await Sale.find(query)
      .populate("client")
      .populate("products.product");
    res.json(sales);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer une vente
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    await sale.remove();
    res.json({ msg: "Sale deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
