const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Récupérer l'en-tête Authorization
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    // Extraire le token du format 'Bearer <token>'
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Decoded payload:", decoded); // Debug : Afficher les données du token
    req.user = decoded.user; // Associer l'utilisateur décodé à la requête
    next(); // Passer au prochain middleware
  } catch (err) {
    console.error("Token validation failed:", err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};
