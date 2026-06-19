const express = require("express");
const router = express.Router();
const inventoryController = require("./inventory.controller");
const { tenantResolver } = require("../../middleware/tenantResolver");
const {
  DayStatusQuerySchema,
  validateQuery,
  QuerySchema,
  QueryIdSchema,
  validateBody,
  SaveTemporaryCountSchema,
  FinalizeInventorySchema,
  ExportExcelQuerySchema,
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

/**
 * @openapi
 * /inventory/product-id:
 * get:
 * summary: Obtiene el detalle de un producto con sus lotes (batchLines)
 * parameters:
 * - in: query
 * name: tenantId
 * required: true
 * schema: { type: string }
 * - in: query
 * name: date
 * required: true
 * schema: { type: string }
 * - in: query
 * name: id
 * required: true
 * schema: { type: string }
 * responses:
 * 200:
 * description: Detalle del producto obtenido con éxito
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * tenantId: { type: string }
 * date: { type: string }
 * product:
 * type: object
 * properties:
 * id: { type: string }
 * alternativeDescription: { type: string }
 * unitsPerCrate: { type: number }
 * batchLines:
 * type: array
 * items:
 * type: object
 * properties:
 * batch: { type: string }
 * quantity: { type: number }
 * crates: { type: number }
 * looseUnits: { type: number }
 * packingDate: { type: string }
 * elapsedDays: { type: number }
 * 404:
 * description: Producto no encontrado
 * 500:
 * description: Error al obtener el detalle
 */
router.get(
  "/product-id",
  tenantResolver,
  validateQuery(QueryIdSchema),
  inventoryController.getProductDetail,
);

/**
 * @openapi
 * /inventory/temporary:
 * put:
 * summary: Guarda o actualiza un borrador de recuento temporal
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [tenantId, productId, countDate, batchLines]
 * properties:
 * tenantId: { type: string }
 * productId: { type: string }
 * countDate: { type: string, format: date, example: "2026-06-08" }
 * updatedAt: { type: string, format: date-time }
 * operator: { type: string, description: "Nombre del operario que realiza el recuento" }
 * batchLines:
 * type: array
 * items:
 * $ref: '#/components/schemas/BatchLine'
 * responses:
 * 200:
 * description: Borrador guardado con éxito
 * 400:
 * description: Datos inválidos
 */
router.put(
  "/temporary",
  tenantResolver,
  validateBody(SaveTemporaryCountSchema),
  inventoryController.saveTemporaryCount,
);

/**
 * @openapi
 * /inventory/finalize:
 * post:
 * summary: Consolida el recuento definitivo y cierra la jornada del inventario
 * description: Guarda el inventario final (snapshot) y marca la jornada como cerrada.
 * tags: [Inventory]
 * parameters:
 * - in: query
 * name: tenantId
 * required: true
 * schema: { type: string }
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [countDate, operatorName, products]
 * properties:
 * countDate: { type: string, format: date, example: "2026-06-15" }
 * operatorName: { type: string, example: "Nidia" }
 * products:
 * type: array
 * items:
 * type: object
 * properties:
 * productId: { type: string }
 * batchLines:
 * type: array
 * items:
 * type: object
 * properties:
 * batch: { type: string }
 * crates: { type: integer }
 * elapsedDays: { type: integer }
 * looseUnits: { type: integer }
 * packingDate: { type: string }
 * quantity: { type: integer }
 * responses:
 * 200:
 * description: Jornada consolidada y cerrada con éxito.
 * 400:
 * description: Datos inválidos o falta de parámetros.
 * 500:
 * description: Error interno al procesar la transacción.
 */
router.post(
  "/finalize",
  tenantResolver,
  validateBody(FinalizeInventorySchema),
  inventoryController.finalizeDay,
);

/**
 * @openapi
 * /inventory/export-excel:
 * get:
 * summary: Exporta el recuento consolidado a un archivo CSV
 * tags: [Inventory]
 * parameters:
 * - in: query
 * name: tenantId
 * required: true
 * schema: { type: string }
 * - in: query
 * name: date
 * required: true
 * schema: { type: string, format: date }
 * responses:
 * 200:
 * description: Archivo CSV generado con éxito.
 * content:
 * text/csv:
 * schema:
 * type: string
 * 400:
 * description: Parámetros faltantes o inválidos.
 * 500:
 * description: Error interno al procesar el volcado.
 */
router.get(
  "/export-excel",
  tenantResolver,
  validateQuery(ExportExcelQuerySchema),
  inventoryController.exportToExcelCsv,
);

module.exports = router;
