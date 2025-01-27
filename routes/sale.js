const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Client = require("../models/Client");
const Currency = require("../models/Currency");
const authMiddleware = require("../middlewares/authMiddleware");

// Créer une nouvelle vente
router.post("/add", authMiddleware, async (req, res) => {
  const { clientId, currencyId, products, remarks, creditSale } = req.body;

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
    const exchangeRate = currency.currentExchangeRate;
    if (!exchangeRate) {
      return res.status(400).json({ msg: "Exchange rate not available" });
    }

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const saleProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      // Vérifier le stock disponible
      if (!creditSale && product.stockQuantity < item.quantity) {
        return res.status(400).json({
          msg: `Insufficient stock for product ${product.productName}`,
        });
      }

      // Calculer le prix, taxe, remise et total pour chaque produit
      const price =
        currencyId === "HTG"
          ? product.priceUSD * exchangeRate
          : product.priceUSD;
      const tax = (price * item.tax) / 100;
      const discount = (price * item.discount) / 100;
      const total = (price + tax - discount) * item.quantity;

      totalAmount += total;
      totalTax += tax * item.quantity;
      totalDiscount += discount * item.quantity;

      saleProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: price,
        tax: tax,
        discount: discount,
        total: total,
      });

      // Réduire le stock si ce n'est pas une vente à crédit
      if (!creditSale) {
        product.stockQuantity -= item.quantity;
        await product.save();
      }
    }

    const sale = new Sale({
      client: client._id,
      currency: currency._id,
      exchangeRate,
      products: saleProducts,
      totalAmount,
      totalTax,
      totalDiscount,
      remarks,
      saleStatus: creditSale ? "completed" : "pending",
      creditSale,
      createdBy: req.user.id,
    });

    await sale.save();
    res.status(201).json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
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
    res.status(500).json({ msg: "Server error, error: " + error });
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
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// Modifier une vente
/*router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { products, remarks } = req.body;

  try {
    const sale = await Sale.findById(req.params.id).populate(
      "products.product",
    );
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    if (sale.saleStatus !== "pending") {
      return res.status(400).json({ msg: "Only pending sales can be edited" });
    }

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    if (products) {
      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(404)
            .json({ msg: `Product ${item.productId} not found` });
        }

        // Vérifier les stocks
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

        if (difference !== 0) {
          product.stockQuantity -= difference;
          await product.save();
        }

        const price =
          sale.currency.toString() === "HTG"
            ? product.priceUSD * sale.exchangeRate
            : product.priceUSD;
        const tax = (price * item.tax) / 100;
        const discount = (price * item.discount) / 100;
        const total = (price + tax - discount) * item.quantity;

        totalAmount += total;
        totalTax += tax * item.quantity;
        totalDiscount += discount * item.quantity;

        originalItem.quantity = item.quantity;
        originalItem.price = price;
        originalItem.tax = tax;
        originalItem.discount = discount;
        originalItem.total = total;
      }

      sale.products = products;
    }

    if (remarks) sale.remarks = remarks;

    sale.totalAmount = totalAmount;
    sale.totalTax = totalTax;
    sale.totalDiscount = totalDiscount;
    sale.updatedBy = req.user.id;

    await sale.save();
    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});
*/
// Modifier une vente
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { clientId, currencyId, products, remarks } = req.body;

  try {
    const sale = await Sale.findById(req.params.id).populate(
      "products.product",
    );
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    if (sale.saleStatus !== "pending") {
      return res.status(400).json({ msg: "Only pending sales can be edited" });
    }

    // Vérifier et mettre à jour le client si un nouvel ID est fourni
    if (clientId && clientId !== sale.client.toString()) {
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ msg: "Client not found" });
      }
      sale.client = client._id;
    }

    // Vérifier et mettre à jour la devise si un nouvel ID est fourni
    if (currencyId && currencyId !== sale.currency.toString()) {
      const currency = await Currency.findById(currencyId);
      if (!currency) {
        return res.status(404).json({ msg: "Currency not found" });
      }

      const exchangeRate = currency.currentExchangeRate;
      if (!exchangeRate) {
        return res.status(400).json({ msg: "Exchange rate not available" });
      }

      sale.currency = currency._id;
      sale.exchangeRate = exchangeRate;

      // Recalculer les prix en fonction de la nouvelle devise
      for (const item of sale.products) {
        const product = await Product.findById(item.product);
        const price =
          currencyId === "HTG"
            ? product.priceUSD * exchangeRate
            : product.priceUSD;

        item.price = price;
        item.tax = (price * item.tax) / 100;
        item.discount = (price * item.discount) / 100;
        item.total = (price + item.tax - item.discount) * item.quantity;
      }
    }

    // Mise à jour des produits
    if (products) {
      let totalAmount = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res
            .status(404)
            .json({ msg: `Product ${item.productId} not found` });
        }

        // Vérification du stock
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

        if (difference !== 0) {
          product.stockQuantity -= difference;
          await product.save();
        }

        const price =
          sale.currency.toString() === "HTG"
            ? product.priceUSD * sale.exchangeRate
            : product.priceUSD;
        const tax = (price * item.tax) / 100;
        const discount = (price * item.discount) / 100;
        const total = (price + tax - discount) * item.quantity;

        totalAmount += total;
        totalTax += tax * item.quantity;
        totalDiscount += discount * item.quantity;

        originalItem.quantity = item.quantity;
        originalItem.price = price;
        originalItem.tax = tax;
        originalItem.discount = discount;
        originalItem.total = total;
      }

      sale.totalAmount = totalAmount;
      sale.totalTax = totalTax;
      sale.totalDiscount = totalDiscount;
    }

    // Mise à jour des remarques
    if (remarks) sale.remarks = remarks;

    // Enregistrer les modifications
    sale.updatedBy = req.user.id;
    sale.updatedAt = Date.now();
    await sale.save();

    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// Annuler une vente
//To do: Test supplementaire lors du retour des produits en stock (pour les vente pending qui n'ont pas de paiement)
//Creation d'un remboursement en pending dans l'attente de paiement
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    if (sale.saleStatus === "cancelled") {
      return res.status(400).json({ msg: "Sale is already cancelled" });
    }

    for (const item of sale.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity += item.quantity;
        await product.save();
      }
    }

    sale.saleStatus = "cancelled";
    sale.canceledBy = req.user.id;
    await sale.save();

    res.json({ msg: "Sale cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// Supprimer une vente uniquement si elle est annulée
// Et aussi si le remboursement est complete
// On doit supprimer les paiements de cette vente, le remboursement et les paiement de remboursement.
//On doit supprimer les retours aussi
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    // Rechercher la vente par ID
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Vérifier si le statut de la vente est "cancelled"
    if (sale.saleStatus !== "cancelled") {
      return res.status(400).json({
        msg: "Only cancelled sales can be deleted",
      });
    }

    // Supprimer la vente
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ msg: "Cancelled sale deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

module.exports = router;

/*
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
*/
