const mongoose = require("mongoose");

//const tenantService = require("./tenant.service");
/*const {
  HomeSummarySchema,
  BatchDetailSchema,
} = require("./schemas/inventory.schema");*/

exports.getTenantConfig = async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (mongoose.connection.readyState !== 1) {
      return res
        .status(500)
        .json({ error: "La conexión a MongoDB no está activa." });
    }

    const dbGlobal = mongoose.connection.useDb("tracesync_global", {
      useCache: true,
    });

    const tenantConfig = await dbGlobal
      .collection("tenant_list")
      .findOne({ tenantId });

    if (!tenantConfig) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    // 4. Respuesta estructurada
    return res.json({
      tenantId: tenantConfig.tenantId,
      businessName: tenantConfig.businessName || "Nombre no definido",
      companyAddress: tenantConfig.companyAddress || "Dirección no disponible",
      logoUrl: tenantConfig.logoBase64 || tenantConfig.logoUrl || "",
      nombre_empresa: tenantConfig.businessName,
      direccion: tenantConfig.companyAddress,
      logo_url: tenantConfig.logoBase64 || tenantConfig.logoUrl || "",
    });
  } catch (err) {
    console.error("💥 Error en getTenantConfig:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
