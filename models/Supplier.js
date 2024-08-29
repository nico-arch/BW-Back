const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Nom du contact
  emails: [{ type: String }], // Tableau d'emails pour chaque contact
  phones: [{ type: String }], // Tableau de numéros de téléphone pour chaque contact
});

const SupplierSchema = new mongoose.Schema({
  companyName: { type: String, required: true }, // Nom de l'entreprise du fournisseur
  contacts: [ContactSchema], // Tableau de contacts, chaque contact ayant des emails et plusieurs téléphones
  emails: [{ type: String }], // Tableau d'emails pour le fournisseur
  addresses: [{ type: String }], // Tableau d'adresses pour le fournisseur
  cities: [{ type: String }], // Tableau de villes pour le fournisseur
  countries: [{ type: String }], // Tableau de pays pour le fournisseur
  website: { type: String }, // Site web du fournisseur
  createdAt: { type: Date, default: Date.now }, // Date de création de l'enregistrement
  updatedAt: { type: Date, default: Date.now }, // Date de dernière mise à jour
});

module.exports = mongoose.model("Supplier", SupplierSchema);
