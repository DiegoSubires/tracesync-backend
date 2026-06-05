// src/routes/inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");

// 🟢 Centralización operativa del inventario diario
router.get("/products-with-counts", inventoryController.getProductsWithCounts);
router.put("/temporary", inventoryController.saveTemporaryCount);
router.post("/finalize", inventoryController.finalizeCount);
router.get("/day-status", inventoryController.getDayStatus);
router.get("/export-excel", inventoryController.exportToExcelCsv);
// Ruta temporal de diagnóstico de ordenación de productos
router.get("/debug-alignment", inventoryController.debugProductsAlignment);

// 🕵️‍♂️ LOG 2: Este bloque auto-ejecutable listará en tu terminal todas las rutas reales registradas aquí
setTimeout(() => {
  console.log("\n=======================================================");
  console.log("📌 RUTAS ACTIVAS REGISTRADAS EN INVENTORY.ROUTES:");
  router.stack.forEach((layer) => {
    if (layer.route) {
      const metodos = Object.keys(layer.route.methods).join(", ").toUpperCase();
      console.log(`   -> [${metodos}] ${layer.route.path}`);
    }
  });
  console.log("=======================================================\n");
}, 1000); // Espera 1 segundo a que Express monte el servidor para imprimirlo limpio

module.exports = router;
