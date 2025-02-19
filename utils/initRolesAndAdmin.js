const bcrypt = require("bcryptjs");
const Role = require("../models/Role"); // Chemin relatif vers le modèle de rôle
const User = require("../models/User"); // Chemin relatif vers le modèle d'utilisateur

const initRolesAndAdmin = async () => {
  try {
    // Vérifier et créer les rôles
    const roles = [
      "Admin",
      "User",
      "Vendor",
      "Manager",
      "Sales Manager",
      "Inventory Manager",
      "Supplier Manager",
      "Staff Manager",
      "Cashier",
      "Client",
      "Accountant",
      "Delivery",
    ];
    const roleIds = []; // Tableau pour stocker les IDs des rôles

    for (let roleName of roles) {
      let role = await Role.findOne({ name: roleName });
      if (!role) {
        role = await Role.create({ name: roleName });
      }
      roleIds.push(role._id); // Ajouter l'ID du rôle au tableau
    }

    // Vérifier s'il existe un administrateur
    let adminRole = await Role.findOne({ name: "Admin" }); // Cherche le rôle "Admin" directement
    let admin = await User.findOne({ roles: adminRole._id });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD,
        salt,
      );

      // Créer un utilisateur administrateur par défaut
      await User.create({
        firstName: "Default",
        lastName: "Admin",
        email: process.env.ADMIN_EMAIL, // Utiliser l'email de l'administrateur provenant des variables d'environnement
        password: hashedPassword,
        roles: [adminRole._id], // Assigner uniquement le rôle "Admin" par défaut
      });
      console.log("Admin user created");
    } else {
      console.log("Admin user already exists");
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = initRolesAndAdmin;

//Last Code
/* const initRolesAndAdmin = async () => {
  try {
    // Vérifier et créer les rôles
    const roles = [
      "Admin",
      "User",
      "Vendor",
      "Manager",
      "Sales Manager",
      "Inventory Manager",
      "Supplier Manager",
      "Staff Manager",
      "Cashier",
      "Client",
      "Accountant",
    ];
    for (let roleName of roles) {
      let role = await Role.findOne({ name: roleName });
      if (!role) {
        await Role.create({ name: roleName });
      }
    }

    // Vérifier s'il existe un administrateur
    let adminRole = await Role.findOne({ name: process.env["ADMIN_USERNAME"] });
    let admin = await User.findOne({ roles: adminRole._id });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        process.env["ADMIN_PASSWORD"],
        salt,
      );

      // Créer un utilisateur administrateur par défaut
      await User.create({
        firstName: "Default",
        lastName: "Admin",
        email: "xxxxxx@xxxxx.xxxx",
        password: hashedPassword,
        roles: [adminRole._id],
      });
      console.log("Admin user created");
    }
  } catch (err) {
    console.error(err);
  }
};
 */
