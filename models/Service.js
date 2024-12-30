const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  isCyclic: { type: Boolean, default: false }, // Indique si le service est cyclique
  validityPeriod: {
    amount: { type: Number, required: true },
    unit: {
      type: String,
      enum: ["hour", "day", "month", "year"], // Unité de période de validité
      required: true,
    },
  },
  dateOfProcessService: { type: Date }, // Date de traitement spécifique (ex: réservation future)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Service", ServiceSchema);
