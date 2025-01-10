const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Récupérer l'en-tête Authorization
  const authHeader = req.header("Authorization");

  // Vérifier si l'en-tête Authorization est présent
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
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};
