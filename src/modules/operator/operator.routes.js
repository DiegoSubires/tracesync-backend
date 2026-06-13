const express = require("express");
const router = express.Router();
const tenantController = require("./tenant.controller");
const {
  TenantParamsSchema,
  validateParams,
} = require("./schemas/tenant.schema");

/**
 * @openapi
 * /tenant-config/{tenantId}:
 * get:
 * summary: Obtiene la configuración pública de un tenant
 * parameters:
 * - in: path
 * name: tenantId
 * required: true
 * schema: { type: string }
 * responses:
 * 200:
 * description: Configuración recuperada
 */
router.get(
  "/:tenantId",
  validateParams(TenantParamsSchema),
  tenantController.getTenantConfig,
);

module.exports = router;
