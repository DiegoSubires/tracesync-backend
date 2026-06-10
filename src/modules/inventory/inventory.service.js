const mongoose = require("mongoose");
const { getDbTenant } = require("../../config/db");

/*const getInventorySummary = async (tenantId, countDate) => {
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
};*/

/**
 * Obtiene el resumen consolidado para el Home de la planta
 */
const getInventorySummary = async (dbPrefix, countDate) => {
  console.log(`\n📊 [AUDITORÍA SUMMARY] Inicio de getInventorySummary`);
  console.log(`   👉 dbPrefix deducido: "${dbPrefix}"`);
  console.log(`   👉 countDate recibido: "${countDate}"`);

  if (mongoose.connection.readyState !== 1) {
    throw new Error("La conexión a MongoDB Atlas no está activa.");
  }

  // Usamos el mismo punto de conexión exacto y fiable
  const dbTenant = mongoose.connection.useDb("tracesync_tenant", {
    useCache: true,
  });

  // Si tus colecciones de conteos también llevan el prefijo dinámico en "tracesync_tenant"
  const targetCollection = `${dbPrefix}_ch_temporary_counts`;
  console.log(
    `   📂 [AUDITORÍA SUMMARY] Apuntando a la colección: "${targetCollection}"`,
  );

  const collection = dbTenant.collection(targetCollection);

  console.log(
    `   ⏳ [AUDITORÍA SUMMARY] Ejecutando agregación en Atlas para la fecha: ${countDate}...`,
  );

  const summary = await collection
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

  console.log(
    `   ✅ [AUDITORÍA SUMMARY] Agregación completada. Items encontrados: ${summary.length}`,
  );
  return summary;
};

/**
 * Comprueba si una jornada de inventario está cerrada para una planta específica (Moreno Plaza)
 */
const isDayFinalized = async (dbPrefix, dateStr) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("La conexión a MongoDB Atlas no está activa.");
  }

  // 🎯 Apuntamos EXACTAMENTE a la base de datos de tu Compass
  const dbTenant = mongoose.connection.useDb("tracesync_tenant", {
    useCache: true,
  });

  // 🎯 Apuntamos EXACTAMENTE a la colección de tu Compass (ej: mp_ch_day_status)
  const dayStatusCollection = dbTenant.collection("mp_ch_day_status");

  // Al ser ambos Strings exactos ("2026-06-05"), el match es directo y limpio
  const dayRecord = await dayStatusCollection.findOne({ date: dateStr });

  // Si no hay documento creado todavía para ese día, la jornada está abierta por defecto
  if (!dayRecord) {
    console.log(
      `⚠️ [SERVICE] No se encontró registro para la fecha String: ${dateStr} en tracesync_tenant.mp_ch_day_status`,
    );
    return false;
  }

  console.log(
    `✅ [SERVICE] ¡Documento encontrado!:`,
    JSON.stringify(dayRecord),
  );

  // Retornamos el valor booleano real del documento
  return dayRecord.finalized === true || dayRecord.status === "finalized";
};

module.exports = { getInventorySummary, isDayFinalized };
