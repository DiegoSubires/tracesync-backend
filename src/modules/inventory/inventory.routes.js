const express = require("express");
const router = express.Router();
const inventoryController = require("./inventory.controller");

/**
 * @openapi
 * /inventory/summary:
 * get:
 * summary: Obtiene el resumen consolidado para el Home
 * parameters:
 * - in: query
 * name: tenantId
 * required: true
 * schema: { type: string }
 * - in: query
 * name: date
 * required: true
 * schema: { type: string }
 * responses:
 * 200:
 * description: Resumen obtenido correctamente
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
 * properties:
 * productId: { type: string }
 * totalQuantity: { type: number }
 */
router.get("/summary", inventoryController.getDaySummary);

module.exports = router;
