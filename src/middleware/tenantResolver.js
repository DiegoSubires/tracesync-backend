const tenantService = require("../services/tenant.service");

const tenantResolver = async (req, res, next) => {
  const tenantId = req.query.tenantId || req.headers["x-tenant-id"];

  if (!tenantId) {
    return res
      .status(400)
      .json({ error: "Falta el identificador de planta (tenantId)" });
  }

  try {
    // Llamada al servicio en lugar de lógica directa de Mongoose
    const dbPrefix = await tenantService.getTenantByPrefix(tenantId);

    req.dbPrefix = dbPrefix;
    req.tenantId = tenantId;
    next();
  } catch (error) {
    // Manejo de errores centralizado
    console.error("🚨 Error resolviendo el prefijo del tenant:", error.message);
    res
      .status(404)
      .json({ error: error.message || "Error al procesar el multi-tenancy" });
  }
};

module.exports = { tenantResolver };
