// src/routes/inventory.routes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");

// 🟢 Centralización operativa del inventario diario
router.get("/products-with-counts", inventoryController.getProductsWithCounts);
router.get(
  "/products-with-counts/:productId",
  inventoryController.getProductWithCountsById,
);
router.put("/temporary", inventoryController.saveTemporaryCount);
router.post("/finalize", inventoryController.finalizeCount);
router.get("/day-status", inventoryController.getDayStatus);
router.get("/export-excel", inventoryController.exportToExcelCsv);
// Ruta temporal de diagnóstico de ordenación de productos
router.get("/debug-alignment", inventoryController.debugProductsAlignment);

// Consulta de url
router.get("/debug-data", async (req, res) => {
  const { tenant, date } = req.query;
  const dbTenant = getDbTenant();

  const data = await dbTenant
    .collection("mp_ch_temporary_counts")
    .findOne({ countDate: date });
  // /api/inventory/debug-data?tenant=moreno_plaza&date=2026-06-05
  res.json(data);
});

module.exports = router;
