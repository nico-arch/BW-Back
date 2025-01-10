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

// Rechercher un utilisateur par email
router.get("/email/:email", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).populate(
      "roles",
    );
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Route pour ajouter un nouvel utilisateur (admin seulement)
router.post("/add", authMiddleware, async (req, res) => {
  const { firstName, lastName, email, password, roles } = req.body;

  // Vérification des champs requis
  if (!firstName || !lastName || !email || !password) {
    console.log(req.body);
    return res.status(400).json({ msg: "All fields are required" });
  }

  // Vérification que le champ roles est un tableau et contient au moins un rôle
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ msg: "At least one role is required" });
  }

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
    res.status(500).json({ msg: "Server Error: " + `${err}` });

    //console.log(err);
  }
});

// Route pour modifier un utilisateur (admin seulement)
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { firstName, lastName, email, roles, password } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Mettre à jour les champs de l'utilisateur
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.roles = roles || user.roles;

    // Si un nouveau mot de passe est renseigné, le hacher avant de le sauvegarder
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ msg: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server Error: " + `${err}` });
    console.log(err);
  }
});

// Route pour supprimer un utilisateur (admin seulement)
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await user.deleteOne();
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    //res.status(500).send("Server Error");
    res.status(500).json({ msg: "Server Error: " + `${err}` });
    console.log(err);
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
