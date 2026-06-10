const { getDbTenant } = require("../../config/db");

const getInventorySummary = async (tenantId, countDate) => {
  const db = getDbTenant(tenantId);

  // Agregación para obtener solo productId y totalQuantity
  const summary = await db
    .collection("mp_ch_temporary_counts")
    .aggregate([
      { $match: { countDate: countDate } },
      { $unwind: "$batchLines" },
      {
        $group: {
          _id: "$productId",
          totalQuantity: { $sum: "$batchLines.quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          totalQuantity: 1,
        },
      },
    ])
    .toArray();

  return summary;
};

/**
 * Comprueba si una jornada de inventario está cerrada para una planta específica
 */
const isDayFinalized = async (dbPrefix, date) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("La conexión a MongoDB Atlas no está activa.");
  }

  // 🎯 Conectamos dinámicamente a la BD del tenant (ej: mp_chamber_inventory o similar)
  // Usamos useCache: true para que Mongoose reutilice los hilos y vaya como un tiro
  const dbTenant = mongoose.connection.useDb(`${dbPrefix}_chamber_inventory`, {
    useCache: true,
  });

  // Apuntamos a la nueva colección unificada que vas a crear en Atlas
  const dayStatusCollection = dbTenant.collection("mp_ch_day_status");

  // Buscamos el registro de la fecha recibida
  const dayRecord = await dayStatusCollection.findOne({ date: date });

  // Si no hay documento creado todavía para ese día, la jornada está abierta por defecto
  if (!dayRecord) {
    return false;
  }

  // Devolvemos el estado booleano real guardado en la base de datos
  return dayRecord.finalized === true;
};

module.exports = { getInventorySummary, isDayFinalized };
