const mongoose = require("mongoose");

// Un mapa simple en memoria para actuar como caché y no saturar Atlas a peticiones
const prefixCache = new Map();

// 1. Cambiado a una función clásica (sin 'export' delante)
const tenantResolver = async (req, res, next) => {
  const tenantId = req.query.tenantId || req.headers["x-tenant-id"];

  if (!tenantId) {
    return res
      .status(400)
      .json({ error: "Falta el identificador de planta (tenantId)" });
  }

  try {
    if (prefixCache.has(tenantId)) {
      req.dbPrefix = prefixCache.get(tenantId);
      req.tenantId = tenantId;
      return next();
    }

    const GlobalTenant = mongoose.connection
      .useDb("tracesync_global")
      .collection("tenant_list");
    const tenantInfo = await GlobalTenant.findOne({ tenantId, isActive: true });

    if (!tenantInfo || !tenantInfo.dbPrefix) {
      return res
        .status(404)
        .json({ error: "Tenant no configurado o inactivo" });
    }

    prefixCache.set(tenantId, tenantInfo.dbPrefix);
    req.dbPrefix = tenantInfo.dbPrefix;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error("🚨 Error resolviendo el prefijo del tenant:", error);
    res
      .status(500)
      .json({ error: "Error interno al procesar el multi-tenancy" });
  }
};

// 2. Exportación estándar usando CommonJS para que funcione con tus 'require'
module.exports = {
  tenantResolver,
};
