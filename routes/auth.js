const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const router = express.Router();

// Route d'inscription
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Créer une nouvelle instance d'utilisateur
    user = new User({
      firstName,
      lastName,
      email,
      password,
    });

    // Hacher le mot de passe avant de le sauvegarder
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Assigner le rôle d'utilisateur par défaut
    const role = await Role.findOne({ name: "User" });
    user.roles = [role._id];

    await user.save();

    // Créer un payload pour le JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    // Signer le jeton JWT
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid email" });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    // Créer le payload JWT
    const payload = {
      user: {
        id: user.id, // ou user._id pour MongoDB
      },
    };

    // Signer et retourner le token JWT
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }, // Expiration du token
      (err, token) => {
        if (err) throw err;
        //console.log("Generated token:", token); // Debug
        res.json({ token });
      },
    );
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).send("Server error");
  }
});

/*router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid Credentials email" });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials pass" });
    }

    // Créer un payload pour le JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    // Signer le jeton JWT
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});*/

const authMiddleware = require("../middlewares/authMiddleware");

router.get("/test-token", authMiddleware, (req, res) => {
  res.json({ user: req.user }); // Afficher les informations de l'utilisateur connecté
});

// Exemple de route protégée
router.get("/protected", authMiddleware, (req, res) => {
  res.send("This is a protected route");
});

module.exports = router;
