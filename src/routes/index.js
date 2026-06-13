const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
// router.use("/inventory", inventoryRoutes);

const authRoutes = require("./auth.routes");
//const tenantRoutes = require("./tenant.routes");
const tenantRoutes = require("../modules/tenant/tenant.routes");
//const productRoutes = require("./product.routes");
const productRoutes = require("../modules/products/products.routes");
//const inventoryRoutes = require("./inventory.routes");
const inventoryRoutes = require("../modules/inventory/inventory.routes");

router.use(authRoutes);
router.use("/tenant-config", tenantRoutes);

// Rutas protegidas (El middleware se ejecuta antes de llegar al inventario)
router.use("/inventory", authMiddleware, inventoryRoutes);
router.use("/products", authMiddleware, productRoutes);

module.exports = router;
