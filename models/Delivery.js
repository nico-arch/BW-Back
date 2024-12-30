const mongoose = require("mongoose");

const DeliverySchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true }, // Référence à la vente
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  }, // Référence au client
  deliveryAddress: {
    type: String,
    required: true,
    enum: ["store", "clientAddress"], // Livraison en magasin ou à l'adresse du client
  },
  addressDetails: { type: String }, // Détails d'adresse si l'option clientAddress est choisie
  deliveryStatus: {
    type: String,
    enum: ["pending", "completed", "canceled"], // Statut de livraison
    default: "pending",
  },
  deliveryDate: { type: Date }, // Date de livraison si elle est complétée
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Delivery", DeliverySchema);
