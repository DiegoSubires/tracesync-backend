// src/routes/product.routes.js
const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");

// 🟢 Solo operaciones del catálogo maestro
router.get("/products", productController.getAllProducts);
//router.get("/products/:id", productController.getProductById);
router.get("/:id", productController.getProductById);
//router.get("/debug-alignment", productController.debugProductsAlignment);

module.exports = router;
