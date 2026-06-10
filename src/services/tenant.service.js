const mongoose = require("mongoose");

// El caché vive aquí, encapsulado en el servicio
const prefixCache = new Map();

const getTenantByPrefix = async (tenantId) => {
  // 1. Verificación en caché
  if (prefixCache.has(tenantId)) {
    return prefixCache.get(tenantId);
  }

  // 2. Consulta a BD (reutilizando tu lógica de conexión)
  const GlobalTenant = mongoose.connection
    .useDb("tracesync_global")
    .collection("tenant_list");

  const tenantInfo = await GlobalTenant.findOne({ tenantId, isActive: true });

  if (!tenantInfo || !tenantInfo.dbPrefix) {
    throw new Error("Tenant no configurado o inactivo");
  }

  // 3. Guardar en caché y retornar
  prefixCache.set(tenantId, tenantInfo.dbPrefix);
  return tenantInfo.dbPrefix;
};

module.exports = { getTenantByPrefix };
