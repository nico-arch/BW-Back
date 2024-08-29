const express = require("express");
const Role = require("../models/Role");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour obtenir tous les rôles
router.get("/", authMiddleware, async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour ajouter un nouveau rôle (admin seulement)
router.post("/add", authMiddleware, async (req, res) => {
  const { name } = req.body;

  try {
    let role = await Role.findOne({ name });
    if (role) {
      return res.status(400).json({ msg: "Role already exists" });
    }

    role = new Role({ name });
    await role.save();
    res.json({ msg: "Role added successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour modifier un rôle (admin seulement)
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { name } = req.body;

  try {
    let role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ msg: "Role not found" });
    }

    role.name = name || role.name;
    await role.save();
    res.json({ msg: "Role updated successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour supprimer un rôle (admin seulement)
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ msg: "Role not found" });
    }

    await role.remove();
    res.json({ msg: "Role deleted successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;
