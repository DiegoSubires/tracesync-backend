const inventoryService = require("./inventory.service");
const { HomeSummarySchema } = require("./schemas/inventory.schema");

exports.getDaySummary = async (req, res) => {
  try {
    const { tenantId, date } = req.query;

    const data = await inventoryService.getInventorySummary(tenantId, date);

    // Envolvemos el array en el objeto que espera tu HomeSummarySchema
    const payloadParaValidar = {
      tenantId,
      date,
      summary: data,
    };

    // Ahora la validación pasará sin problemas
    const validatedData = HomeSummarySchema.parse(payloadParaValidar);

    console.log("📤 [BACKEND] Respuesta Home:", validatedData);
    res.json(validatedData);
  } catch (error) {
    console.error("💥 Error en getDaySummary:", error);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
};

exports.getDayStatus = async (req, res) => {
  console.log(`\n📢 [PETICIÓN ENTRANTE] GET a /api/inventory/day-status`);
  try {
    const { date } = req.query;
    const dbPrefix = req.dbPrefix; // Inyectado automáticamente por tenantResolver al procesar tenantId

    if (!date) {
      return res
        .status(400)
        .json({ error: "El parámetro 'date' (AAAA-MM-DD) es obligatorio." });
    }

    // Consultamos al servicio con el prefijo ("mp") y la fecha
    const finalized = await inventoryService.isDayFinalized(dbPrefix, date);

    console.log(
      `📊 [DAY STATUS] Estado del día ${date} para tenant [${dbPrefix}]: ${finalized ? "CERRADO 🔒" : "ABIERTO 🔓"}`,
    );

    return res.json({ finalized });
  } catch (err) {
    console.error("💥 Error en getDayStatus:", err);
    return res
      .status(500)
      .json({ error: "Error al verificar el estado de cierre de la planta." });
  }
};
