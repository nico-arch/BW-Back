const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Nom unique de la catégorie
  description: { type: String }, // Description facultative de la catégorie
  createdAt: { type: Date, default: Date.now }, // Date de création de la catégorie
});

module.exports = mongoose.model("Category", CategorySchema);
