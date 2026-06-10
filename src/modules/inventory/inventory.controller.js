const mongoose = require("mongoose");
const inventoryService = require("./inventory.service");
const { HomeSummarySchema } = require("./schemas/inventory.schema");

exports.getDaySummary = async (req, res) => {
  console.log(`\n📢 [PETICIÓN ENTRANTE] GET a la ruta: /api/inventory/summary`);

  try {
    const { date } = req.query;
    const dbPrefix = req.dbPrefix; // 🎯 Usamos el prefijo resuelto ("mp") en vez del tenantId crudo

    console.log(
      `   📥 [CONTROLADOR SUMMARY] Query recibida -> Fecha: "${date}" | dbPrefix: "${dbPrefix}"`,
    );

    // Invocamos pasándole el prefijo unificado
    const data = await inventoryService.getInventorySummary(dbPrefix, date);

    const payloadParaValidar = {
      tenantId: req.query.tenantId || dbPrefix, // Mantenemos el ID que espera Zod para validar
      date,
      summary: data,
    };

    const validatedData = HomeSummarySchema.parse(payloadParaValidar);

    console.log("📤 [BACKEND] Respuesta Home enviada correctamente.");
    return res.json(validatedData);
  } catch (error) {
    console.error(
      "💥 [ERROR] Fallo crítico en getDaySummary:",
      error.stack || error.message,
    );
    return res.status(500).json({ error: "Error al obtener resumen" });
  }
};

/**
 * Obtiene el estado de cierre (finalizado) de una jornada específica
 */
exports.getDayStatus = async (req, res) => {
  console.log(
    `\n📢 [PETICIÓN ENTRANTE] GET a la ruta: /api/inventory/day-status`,
  );

  try {
    // 🎯 Capturamos los datos que ya han sido limpiados y validados por Zod en la ruta
    const validatedData = req.query;

    const { date } = validatedData;
    const dbPrefix = req.dbPrefix; // Extraído de forma segura por el tenantResolver posterior

    // Aunque Zod ya asegura que existan, una doble comprobación nunca viene mal en planta
    if (!date || !dbPrefix) {
      return res.status(400).json({
        error:
          "Parámetros insuficientes para procesar la consulta de la planta.",
      });
    }

    // Consultamos al servicio pasándole el prefijo de la BD y la fecha formateada
    const finalized = await inventoryService.isDayFinalized(dbPrefix, date);

    console.log(
      `📊 [DAY STATUS] Planta: [${dbPrefix}] | Fecha: ${date} | Estado: ${finalized ? "🔒 CERRADO" : "🔓 ABIERTO"}`,
    );

    // Retornamos la respuesta estructurada que espera el Front
    return res.json({ finalized });
  } catch (err) {
    console.error("💥 [ERROR] Fallo crítico en getDayStatus:", err.message);
    return res.status(500).json({
      error: "Error interno en el servidor al verificar el cierre de jornada.",
    });
  }
};
