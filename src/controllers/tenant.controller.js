const { getDbGlobal, getDbOperation } = require("../config/db");

exports.getTenantConfig = async (req, res) => {
  /*console.log("\n=========================================================");
  console.log("📥 [BACKEND - getTenantConfig] Nueva petición detectada.");*/
  try {
    const { tenantId } = req.params;
    /*console.log(
      `🔍 [BACKEND] Parámetro 'tenantId' recibido de la URL: "${tenantId}"`,
    );*/

    const dbGlobal = getDbGlobal();
    if (!dbGlobal) {
      console.error(
        "❌ [BACKEND] Error crítico: El objeto dbGlobal es undefined/null.",
      );
      return res
        .status(500)
        .json({ error: "Fallo de conexión en base de datos global" });
    }

    /*console.log(
      `🗄️ [BACKEND] Consultando colección 'tenant_list' para: { tenantId: "${tenantId}" }`,
    );*/
    const tenantConfig = await dbGlobal
      .collection("tenant_list")
      .findOne({ tenantId });

    if (!tenantConfig) {
      console.error(
        `❌ [BACKEND] Error 404: No existe ningún documento con tenantId: "${tenantId}" en la BD.`,
      );
      console.log(
        "=========================================================\n",
      );
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    /*console.log(
      "✅ [BACKEND] Documento recuperado de Mongo de forma íntegra:",
      JSON.stringify(tenantConfig, null, 2),
    );*/

    // Estructuramos la respuesta asegurando compatibilidad total con el front
    const responseData = {
      tenantId: tenantConfig.tenantId,
      businessName:
        tenantConfig.businessName || "Nombre de Empresa no definido",
      companyAddress: tenantConfig.companyAddress || "Dirección no disponible",
      logoUrl: tenantConfig.logoBase64 || tenantConfig.logoUrl || "",

      // Inyecciones de respaldo por si el mapper busca propiedades en snake_case
      nombre_empresa:
        tenantConfig.businessName || "Nombre de Empresa no definido",
      direccion: tenantConfig.companyAddress || "Dirección no disponible",
      logo_url: tenantConfig.logoBase64 || tenantConfig.logoUrl || "",
    };

    /*console.log(
      "📤 [BACKEND] Enviando JSON de éxito al cliente:",
      JSON.stringify(responseData, null, 2),
    );
    console.log("=========================================================\n");*/

    return res.json(responseData);
  } catch (err) {
    console.error("💥 [BACKEND] Excepción atrapada en getTenantConfig:", err);
    return res
      .status(500)
      .json({ error: "Error al obtener la configuración del tenant" });
  }
};

exports.getOperatorByName = async (req, res) => {
  /*console.log("\n=========================================================");
  console.log(
    "📥 [BACKEND - getOperatorByName] Petición entrante de operario.",
  );*/
  try {
    const { operatorId } = req.params;
    /*console.log(
      `🔍 [BACKEND] Buscando operario por identificador: "${operatorId}"`,
    );*/

    const dbOperation = getDbOperation();
    if (!dbOperation) {
      console.error(
        "❌ [BACKEND] Error crítico: El objeto dbOperation no está conectado.",
      );
      return res.status(500).json({ error: "Fallo de conexión en planta" });
    }

    const operator = await dbOperation.collection("operators").findOne({
      $or: [
        { name: operatorId },
        { fullName: operatorId },
        { firstname: operatorId },
      ],
    });

    if (!operator) {
      /*console.warn(
        `⚠️ [BACKEND] No se encontró operario en la colección con el nombre: "${operatorId}"`,
      );
      console.log(
        "=========================================================\n",
      );*/
      return res.status(404).json({ error: "Operario no localizado" });
    }

    /*console.log(
      `✅ [BACKEND] Operario encontrado: ${operator.fullName || operator.name}`,
    );
    console.log("=========================================================\n");*/
    return res.json(operator);
  } catch (err) {
    console.error("💥 [BACKEND] Error en getOperatorByName:", err);
    return res.status(500).json({ error: "Error interno al buscar operario" });
  }
};
