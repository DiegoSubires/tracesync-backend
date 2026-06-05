/*const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const tenantRoutes = require("./tenant.routes");
const productRoutes = require("./product.routes");
const inventoryRoutes = require("./inventory.routes");

// Vinculamos submódulos bajo el prefijo común /api
router.use(authRoutes);
router.use(tenantRoutes);
router.use(productRoutes);
router.use("/inventory", inventoryRoutes);

module.exports = router;*/

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

const authRoutes = require("./auth.routes");
const tenantRoutes = require("./tenant.routes");
const productRoutes = require("./product.routes");
const inventoryRoutes = require("./inventory.routes");

// Rutas públicas (Login)
router.use(authRoutes);
router.use(tenantRoutes);

// Rutas protegidas (El middleware se ejecuta antes de llegar al inventario)
router.use("/inventory", authMiddleware, inventoryRoutes);
router.use("/products", authMiddleware, productRoutes);

module.exports = router;
