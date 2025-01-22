const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Role = require("./models/Role");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const roleRoutes = require("./routes/role");

const saleRoutes = require("./routes/sale");
const productRoutes = require("./routes/product");
const clientRoutes = require("./routes/client");
const balanceRoutes = require("./routes/balance");
const creditLimitRoutes = require("./routes/creditLimit");

const creditPaymentRoutes = require("./routes/creditPayment");

const currencyRoutes = require("./routes/currency");
const exchangeRateRoutes = require("./routes/exchangeRate");

const returnRoutes = require("./routes/return");
const balancePaymentRoutes = require("./routes/balancePayment");

//To do Add model Supplier and route
const supplierRoutes = require("./routes/supplier");
//To do Add model Order and route
const orderRoutes = require("./routes/order");

const categoryRoutes = require("./routes/category");

const serviceRoutes = require("./routes/service");

const deliveryRoutes = require("./routes/delivery");

const refundRoutes = require("./routes/refund");
const refundPaymentRoutes = require("./routes/refundPayment");

dotenv.config();

const app = express();

const cors = require("cors");
//app.use(cors());
app.use(
  cors({
    origin: "*", // Autorise toutes les origines
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Middleware pour parser les requêtes JSON
app.use(express.json());

//routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

app.use("/api/currencies", currencyRoutes);
app.use("/api/exchangeRates", exchangeRateRoutes);

app.use("/api/sales", saleRoutes);
app.use("/api/products", productRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/creditLimits", creditLimitRoutes);

app.use("/api/returns", returnRoutes);
app.use("/api/creditPayments", creditPaymentRoutes);

app.use("/api/balancePayments", balancePaymentRoutes);

app.use("/api/suppliers", supplierRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/services", serviceRoutes);

app.use("/api/deliveries", deliveryRoutes);

app.use("/api/refunds", refundRoutes);
app.use("api/refundPayments", refundPaymentRoutes);

//Utils
const initRolesAndAdmin = require("./utils/initRolesAndAdmin");
const initCurrencies = require("./utils/initCurrencies");

// Connexion à la base de données
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Route de test
app.get("/", (req, res) => {
  res.send("Bienvenue sur Business Way API");
});

// Appelez la fonction pour initialiser les rôles et l'admin par défaut
initRolesAndAdmin();
initCurrencies();

//const PORT = process.env["PORT"] || 5000;
const PORT = 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
