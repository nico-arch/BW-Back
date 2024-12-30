const express = require("express");
const Service = require("../models/Service");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Route pour créer un service
router.post("/add", authMiddleware, async (req, res) => {
  const { name, description, isCyclic, validityPeriod, dateOfProcessService } =
    req.body;

  try {
    const service = new Service({
      name,
      description,
      isCyclic,
      validityPeriod,
      dateOfProcessService,
    });

    await service.save();
    res.json({ msg: "Service created successfully", service });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour mettre à jour un service
router.put("/edit/:id", authMiddleware, async (req, res) => {
  const { name, description, isCyclic, validityPeriod, dateOfProcessService } =
    req.body;

  try {
    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: "Service not found" });
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.isCyclic = isCyclic !== undefined ? isCyclic : service.isCyclic;
    service.validityPeriod = validityPeriod || service.validityPeriod;
    service.dateOfProcessService =
      dateOfProcessService || service.dateOfProcessService;

    await service.save();
    res.json({ msg: "Service updated successfully", service });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour afficher tous les services
router.get("/", authMiddleware, async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route pour afficher un service spécifique
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

// Route pour supprimer un service
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

module.exports = router;
