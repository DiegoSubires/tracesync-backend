const express = require("express");
const router = express.Router();
const productController = require("./products.controller");
const { tenantResolver } = require("../../middleware/tenantResolver");

/**
 * @openapi
 * /api/products/home-catalog:
 * get:
 * summary: Obtiene el catálogo maestro de productos filtrado para la Home
 * description: Retorna un listado plano y optimizado de los productos activos e indexados por planta (tenant).
 * tags:
 * - Products
 * parameters:
 * - in: query
 * name: tenantId
 * schema:
 * type: string
 * required: true
 * description: ID de la empresa o planta (ej. moreno_plaza)
 * example: moreno_plaza
 * responses:
 * 200:
 * description: Catálogo maestro recuperado y validado con éxito.
 * content:
 * application:
 * schema:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: string
 * example: "07y4hnRKxx2egQWB1223"
 * code:
 * type: string
 * example: "1002"
 * description:
 * type: string
 * example: "PINCHITOS CERDO BANDEJAS 500 GR"
 * alternativeDescription:
 * type: string
 * example: "PINCHITOS ROJO CERDO"
 * category:
 * type: string
 * example: "Frescos Pequeña"
 * subcategory:
 * type: string
 * example: "Adobados"
 * visible:
 * type: boolean
 * example: true
 * sortOrder:
 * type: integer
 * example: 112
 * 400:
 * description: Error en la petición por falta de parámetros obligatorios.
 * 500:
 * description: Error interno del servidor al interactuar con la base de datos.
 */
router.get("/home-catalog", tenantResolver, productController.getHomeCatalog);

module.exports = router;
