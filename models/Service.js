const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the service
  description: { type: String }, // Description of the service
  isCyclic: { type: Boolean, default: false }, // Indicates if the service is cyclic
  validityPeriod: {
    amount: { type: Number, required: true }, // Number of time units
    unit: {
      type: String,
      enum: ["hour", "day", "month", "year"], // Valid time units
      required: true,
    },
  }, // Validity period of the service
  createdAt: { type: Date, default: Date.now }, // Date of service creation
  updatedAt: { type: Date, default: Date.now }, // Date of last service update
});

module.exports = mongoose.model("Service", ServiceSchema);
