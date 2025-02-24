const express = require("express");
const Supplier = require("../models/Supplier");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un fournisseur
router.post("/add", authMiddleware, async (req, res) => {
  const {
    companyName,
    contacts,
    emails,
	phone,
    addresses,
    cities,
    countries,
    website,
  } = req.body;

  try {
    let supplier = new Supplier({
      companyName,
      contacts, // Tableau de contacts avec noms, emails, et téléphones
      emails, // Tableau d'emails pour le fournisseur
	  phone,
      addresses, // Tableau d'adresses pour le fournisseur
      cities, // Tableau de villes pour le fournisseur
      countries, // Tableau de pays pour le fournisseur
      website,
    });

    await supplier.save();
    res.json(supplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier un fournisseur
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const {
    companyName,
    contacts,
    emails,
	phone,
    addresses,
    cities,
    countries,
    website,
  } = req.body;

  try {
    let supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ msg: "Supplier not found" });
    }

    supplier.companyName = companyName || supplier.companyName;
    supplier.contacts = contacts || supplier.contacts;
    supplier.emails = emails || supplier.emails;
	supplier.phone = phone || supplier.phone;
    supplier.addresses = addresses || supplier.addresses;
    supplier.cities = cities || supplier.cities;
    supplier.countries = countries || supplier.countries;
    supplier.website = website || supplier.website;
    supplier.updatedAt = Date.now();

    await supplier.save();
    res.json(supplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les fournisseurs
router.get("/", authMiddleware, async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir un fournisseur par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ msg: "Supplier not found" });
    }
    res.json(supplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des fournisseurs par nom de l'entreprise
router.get("/search", authMiddleware, async (req, res) => {
  const { companyName } = req.query;

  try {
    const suppliers = await Supplier.find({
      companyName: { $regex: companyName, $options: "i" },
    });
    res.json(suppliers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un fournisseur
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ msg: "Supplier not found" });
    }

    await supplier.deleteOne();
    res.json({ msg: "Supplier deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
