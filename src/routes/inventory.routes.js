// src/routes/inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const { getDbTenant } = require("../config/db");

// 🟢 Centralización operativa del inventario diario
router.get("/products-with-counts", inventoryController.getProductsWithCounts);
/*router.get(
  "/products-with-counts/:productId",
  inventoryController.getProductWithCountsById,
);*/
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
}, 1000);

// Consulta de url
router.get("/debug-data", async (req, res) => {
  try {
    console.log("🔍 [DEBUG] Entrando a ruta debug-data...");
    const { tenant, date } = req.query;
    console.log("🔍 [DEBUG] Params:", { tenant, date });

    const dbTenant = getDbTenant();
    console.log("🔍 [DEBUG] DbTenant obtenido");

    const data = await dbTenant
      .collection("mp_ch_temporary_counts")
      .findOne({ countDate: date });

    console.log("🔍 [DEBUG] Datos encontrados:", data ? "Sí" : "No");

    res.json({ message: "Éxito", data });
  } catch (error) {
    console.error("❌ [DEBUG ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
