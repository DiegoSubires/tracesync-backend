const express = require("express");
const router = express.Router();
const inventoryController = require("./inventory.controller");
const { tenantResolver } = require("../../middleware/tenantResolver");
const {
  DayStatusQuerySchema,
  validateQuery,
  QuerySchema,
  QueryIdSchema,
} = require("./schemas/inventory.schema");

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
//router.get("/summary", inventoryController.getDaySummary);
router.get(
  "/summary",
  tenantResolver,
  validateQuery(QuerySchema),
  inventoryController.getDaySummary,
);

/**
 * @openapi
 * /inventory/day-status:
 * get:
 * summary: Verifica si una jornada de inventario de frescos está cerrada/finalizada
 * description: Consulta la colección mp_ch_day_status de la planta correspondiente.
 * parameters:
 * - in: query
 * name: tenantId
 * required: true
 * description: Identificador de la planta (ej. moreno_plaza)
 * schema:
 * type: string
 * - in: query
 * name: date
 * required: true
 * description: Fecha a consultar en formato YYYY-MM-DD
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Estado del día recuperado con éxito
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * finalized:
 * type: boolean
 * example: true
 * 400:
 * description: Parámetros inválidos o faltantes
 * 500:
 * description: Error interno del servidor
 */
router.get(
  "/day-status",
  validateQuery(DayStatusQuerySchema), // 1º Validamos que los parámetros vengan limpios
  tenantResolver, // 2º Resolvemos el tenantId transformándolo a prefijo ("mp")
  inventoryController.getDayStatus, // 3º Ejecutamos la lógica del controlador
);

router.get(
  "/product-id",
  tenantResolver,
  validateQuery(QuerySchema),
  inventoryController.getProductDetail,
);

module.exports = router;
