const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour obtenir tous les utilisateurs (admin seulement)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().populate("roles");
    res.json(users);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour ajouter un nouvel utilisateur (admin seulement)
router.post("/add", authMiddleware, async (req, res) => {
  const { firstName, lastName, email, password, roles } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    user = new User({
      firstName,
      lastName,
      email,
      password,
      roles,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    res.json({ msg: "User added successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour modifier un utilisateur (admin seulement)
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { firstName, lastName, email, roles } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.roles = roles || user.roles;

    await user.save();
    res.json({ msg: "User updated successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour supprimer un utilisateur (admin seulement)
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await user.remove();
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Route pour assigner un ou plusieurs rôles à un utilisateur
router.put("/assign-roles/:userId", authMiddleware, async (req, res) => {
  const { roles } = req.body; // Un tableau d'IDs de rôles à assigner

  try {
    let user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Vérification que tous les rôles existent
    const validRoles = await Role.find({ _id: { $in: roles } });
    if (validRoles.length !== roles.length) {
      return res.status(400).json({ msg: "One or more roles are invalid" });
    }

    // Ajouter les nouveaux rôles sans dupliquer les rôles existants
    roles.forEach((role) => {
      if (!user.roles.includes(role)) {
        user.roles.push(role);
      }
    });

    await user.save();
    res.json({ msg: "Roles assigned successfully", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour retirer un ou plusieurs rôles d'un utilisateur
router.put("/remove-roles/:userId", authMiddleware, async (req, res) => {
  const { roles } = req.body; // Un tableau d'IDs de rôles à retirer

  try {
    let user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Retirer les rôles spécifiés
    user.roles = user.roles.filter((role) => !roles.includes(role.toString()));

    await user.save();
    res.json({ msg: "Roles removed successfully", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
