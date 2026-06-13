const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/tenant.controller");

//router.get("/tenant-config/:tenantId", tenantController.getTenantConfig);
router.get("/operator/:operatorId", tenantController.getOperatorByName);

module.exports = router;
