const express = require("express");
const router = express.Router();
const Return = require("../models/Return");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Refund = require("../models/Refund");
const Payment = require("../models/Payment"); // Pour vérifier les paiements effectués
const authMiddleware = require("../middlewares/authMiddleware");

// Créer un retour
// Créer un retour et, si des paiements existent, créer ou mettre à jour le Refund associé
router.post("/add", authMiddleware, async (req, res) => {
  const { saleId, clientId, products, remarks } = req.body;
  const userId = req.user.id;

  try {
    // Récupérer la vente avec ses produits et sa devise
    const sale = await Sale.findById(saleId)
      .populate("products.product")
      .populate("currency");
    if (!sale) {
      return res.status(404).json({ msg: "Sale not found" });
    }

    // Vérifier que le client correspond à la vente
    if (sale.client.toString() !== clientId) {
      return res.status(400).json({ msg: "Client does not match sale" });
    }

    let totalRefundAmount = 0;
    const returnProducts = [];

    // Pour chaque produit envoyé dans le payload
    for (const item of products) {
      if (!item.productId) {
        return res
          .status(400)
          .json({ msg: "Missing productId in return request item" });
      }
      const itemProductId = item.productId.toString();

      // Recherche de l'élément dans la vente, en s'assurant que p.product et p.product._id existent
      const saleProduct = sale.products.find(
        (p) =>
          p.product &&
          p.product._id &&
          p.product._id.toString() === itemProductId,
      );

      if (!saleProduct) {
        console.error("Liste des produits de la vente :", sale.products);
        console.error("Produit recherché :", itemProductId);
        return res
          .status(404)
          .json({ msg: `Product ${itemProductId} not found in sale` });
      }

      if (item.quantity > saleProduct.quantity) {
        return res.status(400).json({
          msg: `Return quantity exceeds sold quantity for product ${saleProduct.product.productName}`,
        });
      }

      // Calcul du montant à rembourser pour ce produit
      totalRefundAmount += item.quantity * saleProduct.price;

      // Préparation de l'objet pour le retour
      returnProducts.push({
        product: saleProduct.product._id,
        quantity: item.quantity,
        price: saleProduct.price,
      });

      // Mise à jour de la quantité vendue dans la vente
      saleProduct.quantity -= item.quantity;

      // Si la quantité restante est 0, retirer cet élément de la vente
      if (saleProduct.quantity === 0) {
        sale.products = sale.products.filter(
          (p) =>
            p.product &&
            p.product._id &&
            p.product._id.toString() !== itemProductId,
        );
      }
    }

    // Mettre à jour le total de la vente en soustrayant le montant remboursé
    sale.totalAmount = sale.totalAmount - totalRefundAmount;
    // (Vous pouvez recalculer totalTax et totalDiscount si nécessaire)
    await sale.save();

    // Créer le document Return
    const returnEntry = new Return({
      sale: sale._id,
      client: clientId,
      products: returnProducts,
      // On utilise le code de la devise de la vente
      currency: sale.currency.currencyCode,
      totalRefundAmount,
      remarks,
      createdBy: userId,
    });

    // Mettre à jour le stock pour chaque produit retourné (incrémenter le stock)
    //for (const item of returnProducts) {
    // const product = await Product.findById(item.product);
    // if (product) {
    //  product.stockQuantity += item.quantity;
    //  await product.save();
    // }
    //}

    // Mettre à jour le stock pour chaque produit retourné uniquement
    // si la vente est à crédit ou si la vente est complète.
    if (sale.creditSale || sale.saleStatus === "completed") {
      for (const item of returnProducts) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stockQuantity += item.quantity;
          await product.save();
        }
      }
    }

    await returnEntry.save();

    // Vérifier s'il y a au moins un paiement effectif pour la vente (excluant les paiements annulés)
    const totalPaidAgg = await Payment.aggregate([
      { $match: { sale: sale._id, paymentStatus: { $ne: "cancelled" } } },
      { $group: { _id: "$sale", totalPaid: { $sum: "$amount" } } },
    ]);
    const amountAlreadyPaid =
      totalPaidAgg.length > 0 ? totalPaidAgg[0].totalPaid : 0;

    // Si des paiements existent, calculer le montant de remboursement à créer
    // Par exemple, refundAmount = min(totalRefundAmount, amountAlreadyPaid)
    const refundAmount =
      amountAlreadyPaid > 0
        ? Math.min(totalRefundAmount, amountAlreadyPaid)
        : 0;

    let refund = null;
    if (refundAmount > 0) {
      refund = await Refund.findOne({ sale: sale._id });
      if (refund) {
        refund.totalRefundAmount += refundAmount;
        refund.updatedAt = Date.now();
        await refund.save();
      } else {
        refund = new Refund({
          sale: sale._id, // Association avec la vente
          return: returnEntry._id,
          client: clientId,
          currency: sale.currency.currencyCode,
          totalRefundAmount: refundAmount,
          createdBy: userId,
        });
        await refund.save();
      }
    }
    // Si aucun paiement n'a été effectué, aucun remboursement n'est créé (refund reste null)

    res.status(201).json({
      msg:
        "Return created successfully" +
        (refund ? " with refund" : " (no refund created, no payment made)"),
      returnEntry,
      refund,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error, error: " + error });
  }
});

// Obtenir tous les retours
router.get("/", authMiddleware, async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("sale")
      .populate("client")
      .populate("products.product");
    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Obtenir un retour par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const returnEntry = await Return.findById(req.params.id)
      .populate("sale")
      .populate("client")
      .populate("products.product");
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }
    res.json(returnEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Modifier un retour
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { products, remarks } = req.body;
  const userId = req.user.id;

  try {
    const returnEntry = await Return.findById(req.params.id).populate(
      "products.product",
    );
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }

    if (returnEntry.refundStatus !== "pending") {
      return res
        .status(400)
        .json({ msg: "Only pending returns can be edited" });
    }

    let totalRefundAmount = 0;
    const updatedProducts = [];

    for (const item of products) {
      const originalProduct = returnEntry.products.find(
        (p) => p.product._id.toString() === item.productId,
      );

      if (!originalProduct) {
        return res
          .status(404)
          .json({ msg: `Product ${item.productId} not found in return` });
      }

      totalRefundAmount += item.quantity * originalProduct.price;

      updatedProducts.push({
        product: originalProduct.product._id,
        quantity: item.quantity,
        price: originalProduct.price,
      });
    }

    returnEntry.products = updatedProducts;
    returnEntry.totalRefundAmount = totalRefundAmount;
    if (remarks) returnEntry.remarks = remarks;
    returnEntry.updatedBy = userId;
    returnEntry.updatedAt = Date.now();

    await returnEntry.save();
    res.json({ msg: "Return updated successfully", returnEntry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Annuler un retour (mettre à jour le retour en "cancelled" et réintégrer les quantités dans la vente)
// Annuler un retour (mettre à jour son statut et réintégrer les quantités dans la vente)
router.put("/cancel/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    // Récupérer le retour avec ses produits et la vente associée
    const returnEntry = await Return.findById(req.params.id)
      .populate("products.product")
      .populate("sale")
      .populate("createdBy", "firstName lastName");
    if (!returnEntry) {
      return res.status(404).json({ msg: "Return not found" });
    }
    // On ne peut annuler qu'un retour en statut "pending"
    if (returnEntry.refundStatus !== "pending") {
      return res
        .status(400)
        .json({ msg: "Only pending returns can be canceled" });
    }

    // Récupérer la vente associée avec ses produits
    const sale = await Sale.findById(returnEntry.sale).populate(
      "products.product",
    );
    if (!sale) {
      return res.status(404).json({ msg: "Associated sale not found" });
    }

    // Pour chaque produit du retour, réintégrer la quantité dans la vente :
    for (const item of returnEntry.products) {
      const itemId = item.product.toString();
      const existingProduct = sale.products.find(
        (p) =>
          p.product && p.product._id && p.product._id.toString() === itemId,
      );
      if (existingProduct) {
        existingProduct.quantity += item.quantity;
        existingProduct.total =
          existingProduct.price * existingProduct.quantity;
      } else {
        sale.products.push({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          tax: 0,
          discount: 0,
          total: item.price * item.quantity,
        });
      }
      // Réduire le stock (le retour avait ajouté des quantités, on les retire)
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity -= item.quantity;
        await product.save();
      }
    }

    // Réajuster le total de la vente en réintégrant le montant du retour
    sale.totalAmount = sale.totalAmount + returnEntry.totalRefundAmount;
    await sale.save();

    // Mettre à jour le Refund associé, s'il existe
    let refund = await Refund.findOne({ sale: sale._id });
    if (refund) {
      refund.totalRefundAmount -= returnEntry.totalRefundAmount;
      if (refund.totalRefundAmount <= 0) {
        refund.totalRefundAmount = 0;
        refund.refundStatus = "pending";
      }
      refund.updatedAt = Date.now();
      await refund.save();
    }

    // Marquer le retour comme annulé
    returnEntry.refundStatus = "cancelled";
    returnEntry.canceledBy = userId;
    returnEntry.updatedAt = Date.now();
    await returnEntry.save();

    res.json({ msg: "Return cancelled successfully", returnEntry, sale });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error", error: error.toString() });
  }
});
// Obtenir les retours pour une vente spécifique
router.get("/sale/:saleId", authMiddleware, async (req, res) => {
  try {
    const returns = await Return.find({ sale: req.params.saleId })
      .populate("sale")
      .populate("client")
      .populate("products.product")
      .populate("createdBy", "firstName lastName");
    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
