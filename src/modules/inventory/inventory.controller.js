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
