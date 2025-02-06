const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Client = require("../models/Client");
const Currency = require("../models/Currency");
const Payment = require("../models/Payment"); // Pour vérifier l'existence de paiements lors de l'annulation
const authMiddleware = require("../middlewares/authMiddleware");

// **************************
// Création d'une nouvelle vente
// **************************
router.post("/add", authMiddleware, async (req, res) => {
  const { clientId, currencyId, products, remarks, creditSale } = req.body;

  try {
    // Vérifier l'existence du client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }

    // Vérifier l'existence de la devise
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return res
        .status(404)
        .json({ msg: "Currency not found, currency id: " + currencyId });
    }

    // Récupérer le taux de change depuis la devise
    const exchangeRate = currency.currentExchangeRate;
    if (!exchangeRate) {
      return res.status(400).json({ msg: "Exchange rate not available" });
    }

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const saleProducts = [];

    // Pour chaque produit dans la vente
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      // Vérifier le stock disponible pour tous les types de vente
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          msg: `Insufficient stock for product ${product.productName}`,
        });
      }

      // Pour la création, si la vente est à crédit, on réduit le stock
      if (creditSale) {
        product.stockQuantity -= item.quantity;
        await product.save();
      }
      // Sinon, pour une vente normale, le stock n'est pas modifié lors de la création

      // Calcul du prix en fonction de la devise utilisée
      // Ici, nous considérons que si la devise est "HTG", le prix en USD est multiplié par le taux
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
        tax: item.tax, // On conserve le pourcentage de taxe
        discount: item.discount, // Idem pour la remise
        total: total,
      });
    }

    const sale = new Sale({
      client: client._id,
      currency: currency._id,
      exchangeRate, // Taux de change utilisé pour cette vente
      products: saleProducts,
      totalAmount,
      totalTax,
      totalDiscount,
      remarks,
      saleStatus: "pending", // Statut initial de la vente
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

// **************************
// Récupérer toutes les ventes (GET /)
// On ajoute un champ calculé "saleType" dans la réponse
// **************************
router.get("/", authMiddleware, async (req, res) => {
  try {
    let sales = await Sale.find()
      .populate("client")
      .populate("products.product")
      .populate("currency")
      .lean();

    // Calculer et ajouter le champ saleType à chaque vente
    sales = sales.map((sale) => {
      const type = sale.creditSale ? "Credit" : "Normal";
      sale.saleType = `${type} ${sale.saleStatus}`;
      return sale;
    });

    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// **************************
// Récupérer une vente par ID
// **************************
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("client")
      .populate("products.product")
      .populate("currency");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    // Ajout du champ saleType
    const type = sale.creditSale ? "Credit" : "Normal";
    const saleObj = sale.toObject();
    saleObj.saleType = `${type} ${sale.saleStatus}`;
    res.json(saleObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// **************************
// Modifier une vente (PUT /edit/:id)
// La devise et le taux ne sont pas modifiables en édition
// On reconstruit la liste des produits et ajuste le stock en fonction des différences
// **************************
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { clientId, products, remarks } = req.body;
  try {
    // Ajouter .populate("currency") pour que sale.currency soit un objet et non un ObjectId
    let sale = await Sale.findById(req.params.id)
      .populate("products.product")
      .populate("currency");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    if (sale.saleStatus !== "pending") {
      return res.status(400).json({ msg: "Only pending sales can be edited" });
    }

    // Mise à jour du client si nécessaire
    if (clientId && clientId !== sale.client.toString()) {
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ msg: "Client not found" });
      }
      sale.client = client._id;
    }

    // Préparer une map des anciens produits (clé = product._id.toString())
    const oldProductsMap = new Map();
    sale.products.forEach((p) => {
      // p.product est un objet (populé) ; on utilise son _id
      oldProductsMap.set(p.product._id.toString(), p);
    });

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const updatedProducts = [];

    // Pour chaque produit dans la nouvelle liste (envoyée par le client)
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found` });
      }

      // Chercher l'élément existant dans la vente
      const oldItem = oldProductsMap.get(product._id.toString());
      const oldQuantity = oldItem ? oldItem.quantity : 0;
      const quantityDiff = item.quantity - oldQuantity;

      // Vérifier et ajuster le stock
      if (quantityDiff !== 0) {
        if (product.stockQuantity < quantityDiff) {
          return res.status(400).json({
            msg: `Insufficient stock for product ${product.productName}`,
          });
        }
        product.stockQuantity -= quantityDiff;
        await product.save();
      }

      // Calculer le prix en utilisant le taux déjà enregistré dans la vente
      // On utilise sale.currency.currencyCode qui est maintenant défini grâce à populate("currency")
      const isHTG = sale.currency && sale.currency.currencyCode === "HTG";
      const price = isHTG
        ? product.priceUSD * sale.exchangeRate
        : product.priceUSD;
      const tax = (price * item.tax) / 100;
      const discount = (price * item.discount) / 100;
      const total = (price + tax - discount) * item.quantity;

      totalAmount += total;
      totalTax += tax * item.quantity;
      totalDiscount += discount * item.quantity;

      if (oldItem) {
        // Mettre à jour l'élément existant
        oldItem.quantity = item.quantity;
        oldItem.price = price;
        oldItem.tax = item.tax;
        oldItem.discount = item.discount;
        oldItem.total = total;
        updatedProducts.push(oldItem);
        oldProductsMap.delete(product._id.toString());
      } else {
        // Nouvel élément, l'ajouter avec product: product._id
        updatedProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: price,
          tax: item.tax,
          discount: item.discount,
          total: total,
        });
      }
    }

    // Pour les produits qui étaient dans la vente mais non présents dans la nouvelle liste,
    // remettre leur quantité au stock.
    for (const [prodId, oldItem] of oldProductsMap) {
      const product = await Product.findById(prodId);
      if (product) {
        product.stockQuantity += oldItem.quantity;
        await product.save();
      }
    }

    sale.products = updatedProducts;
    sale.totalAmount = totalAmount;
    sale.totalTax = totalTax;
    sale.totalDiscount = totalDiscount;

    if (remarks !== undefined) sale.remarks = remarks;
    sale.updatedBy = req.user.id;
    sale.updatedAt = Date.now();

    await sale.save();
    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// **************************
// Annuler une vente (DELETE /cancel/:id)
// Conditions d'annulation :
// - Si la vente est normale (non à crédit) sans aucun paiement, le stock n'est pas ajusté.
// - Si la vente est à crédit, le stock des produits est réintégré.
// - Si la vente normale a au moins un paiement associé, l'annulation est interdite.
// **************************
router.delete("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    if (sale.saleStatus === "cancelled") {
      return res.status(400).json({ msg: "Sale is already cancelled" });
    }

    // Pour une vente normale, vérifier s'il existe au moins un paiement non annulé
    if (!sale.creditSale) {
      const payments = await Payment.find({
        sale: sale._id,
        paymentStatus: { $ne: "cancelled" },
      });
      if (payments.length > 0) {
        return res.status(400).json({
          msg: "Cannot cancel a normal sale with payments associated",
        });
      }
      // Pour une vente normale sans paiement, ne pas ajuster le stock
    } else {
      // Pour une vente à crédit, réintégrer le stock de tous les produits
      for (const item of sale.products) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stockQuantity += item.quantity;
          await product.save();
        }
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

// **************************
// Supprimer une vente (DELETE /delete/:id)
// Seules les ventes annulées peuvent être supprimées
// **************************
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }
    if (sale.saleStatus !== "cancelled") {
      return res
        .status(400)
        .json({ msg: "Only cancelled sales can be deleted" });
    }
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ msg: "Cancelled sale deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

module.exports = router;
