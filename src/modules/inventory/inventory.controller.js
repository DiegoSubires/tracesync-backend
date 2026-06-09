const inventoryService = require("./inventory.service");
const { HomeSummarySchema } = require("./schemas/inventory.schema");

exports.getDaySummary = async (req, res) => {
  try {
    const { tenantId, date } = req.query; // Ajusta según cómo recibas los params

    const data = await inventoryService.getInventorySummary(tenantId, date);

    // Validación de contrato antes de responder
    const validatedData = HomeSummarySchema.parse(data);

    console.log("📤 [BACKEND] Respuesta Home:", validatedData);
    res.json(validatedData);
  } catch (error) {
    console.error("💥 Error en getDaySummary:", error);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
};
