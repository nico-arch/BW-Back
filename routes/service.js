const express = require("express");
const Service = require("../models/Service");
const Product = require("../models/Product");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route to create a new service
router.post("/add", authMiddleware, async (req, res) => {
  const { name, description, isCyclic, validityPeriod } = req.body;

  try {
    const service = new Service({
      name,
      description,
      isCyclic,
      validityPeriod,
    });

    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to update a service
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { name, description, isCyclic, validityPeriod } = req.body;

  try {
    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: "Service not found" });
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.isCyclic = isCyclic !== undefined ? isCyclic : service.isCyclic;
    service.validityPeriod = validityPeriod || service.validityPeriod;

    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to get all services
router.get("/", authMiddleware, async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to get a specific service by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: "Service not found" });
    }
    res.json(service);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to delete a service
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: "Service not found" });
    }

    await service.remove();
    res.json({ msg: "Service deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to assign a service to a product
router.put(
  "/assign-to-product/:productId",
  authMiddleware,
  async (req, res) => {
    const { serviceId } = req.body;

    try {
      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({ msg: "Product not found" });
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ msg: "Service not found" });
      }

      // Check if the service is already assigned
      if (product.services.includes(serviceId)) {
        return res
          .status(400)
          .json({ msg: "Service already assigned to this product" });
      }

      // Assign the service to the product
      product.services.push(serviceId);
      await product.save();

      res.json({ msg: "Service assigned to product successfully", product });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },
);

// Route to remove a service from a product
router.put(
  "/remove-from-product/:productId",
  authMiddleware,
  async (req, res) => {
    const { serviceId } = req.body;

    try {
      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({ msg: "Product not found" });
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ msg: "Service not found" });
      }

      // Check if the service is assigned
      if (!product.services.includes(serviceId)) {
        return res
          .status(400)
          .json({ msg: "Service not assigned to this product" });
      }

      // Remove the service from the product
      product.services = product.services.filter(
        (svcId) => svcId.toString() !== serviceId,
      );
      await product.save();

      res.json({ msg: "Service removed from product successfully", product });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  },
);

module.exports = router;
