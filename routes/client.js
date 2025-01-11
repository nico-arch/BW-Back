const express = require("express");
const Client = require("../models/Client");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour ajouter un client
router.post("/add", authMiddleware, async (req, res) => {
  const {
    clientType,
    firstName,
    lastName,
    companyName,
    address,
    email,
    website,
    governmentId,
  } = req.body;

  try {
    const client = new Client({
      clientType,
      firstName,
      lastName,
      companyName,
      address,
      email,
      website,
      governmentId,
    });

    await client.save();
    res.json(client);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour modifier un client
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const {
    firstName,
    lastName,
    companyName,
    address,
    email,
    website,
    governmentId,
  } = req.body;

  try {
    let client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }

    client.firstName = firstName || client.firstName;
    client.lastName = lastName || client.lastName;
    client.companyName = companyName || client.companyName;
    client.address = address || client.address;
    client.email = email || client.email;
    client.website = website || client.website;
    client.governmentId = governmentId || client.governmentId;

    await client.save();
    res.json(client);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir tous les clients
router.get("/", authMiddleware, async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour obtenir un client par ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }
    res.json(client);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour rechercher des clients
router.get("/search", authMiddleware, async (req, res) => {
  const { firstName, lastName, companyName } = req.query;

  try {
    let query = {};

    if (firstName) query.firstName = new RegExp(firstName, "i");
    if (lastName) query.lastName = new RegExp(lastName, "i");
    if (companyName) query.companyName = new RegExp(companyName, "i");

    const clients = await Client.find(query);
    res.json(clients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour supprimer un client
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ msg: "Client not found" });
    }

    await client.deleteOne();
    res.json({ msg: "Client deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
