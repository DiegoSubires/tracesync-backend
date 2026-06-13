const mongoose = require("mongoose");
//const { getDbTenant } = require("../../config/db");

/**
 * Obtiene el resumen consolidado para el Home de la planta
 */
const getInventorySummary = async (dbPrefix, countDate) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("La conexión a MongoDB Atlas no está activa.");
  }

  const dbTenant = mongoose.connection.useDb("tracesync_tenant", {
    useCache: true,
  });
  const targetCollection = `${dbPrefix}_ch_temporary_counts`;
  const collection = dbTenant.collection(targetCollection);

  /*console.log(
    `\n📊 [Inventory.service.getInventorySummary]:  Inicio de getInventorySummary`,
  );
  console.log(`dbPrefix deducido: "${dbPrefix}"`);
  console.log(`countDate recibido: "${countDate}"`);
  console.log("[DEBUG DB] Detalles de la conexión:");
  console.log("- Nombre de la BD:", dbTenant.name);
  console.log("- Estado (1=conectado):", dbTenant.readyState);
  console.log("- Host:", dbTenant.host);
  console.log("- Puerto:", dbTenant.port);
  console.log(
    `   📂 [AUDITORÍA SUMMARY] Apuntando a la colección: "${targetCollection}"`,
  );
  console.log(
    `   ⏳ [AUDITORÍA SUMMARY] Ejecutando agregación en Atlas para la fecha: ${countDate}...`,
  );
  console.log("🔍 [DEBUG COLLECTION] Detalles de la colección:");
  console.log("- Nombre:", collection.collectionName);
  console.log("- Namespace:", collection.namespace);
  
  //SUMMARY
  console.log(
    `   ✅ [AUDITORÍA SUMMARY] Agregación completada. Items encontrados: ${summary.length}`,
  );
  console.log(
    `🔍 [DEBUG - DATA] - Resultado de la consulta:`,
    JSON.stringify(summary, null, 2),
  );
  console.table(summary);
  console.dir(summary, { depth: null, colors: true });
  
  // Modelo getProductModelByTenant 
  
  console.log(
    `Nombre del modelo: "${getProductModelByTenant(dbPrefix).modelName}"`,
  );
  console.log(
    `Colección vinculada: "${getProductModelByTenant(dbPrefix).collectionName}"`,
  );

  console.log(
    `Nombre de la bd con dbName: "${getProductModelByTenant(dbPrefix).dbName}"`,
  );
  console.log(
    `Nombre de la bd con db.name: "${getProductModelByTenant(dbPrefix).db.name}"`,
  );
  console.log(
    "✅ [DEBUG] ¿Está el modelo listo?:",
    typeof getProductModelByTenant(dbPrefix).find === "function",
  );

  console.log(`[PRODUCTS]: ${JSON.stringify(products, null, 2)}`);

  //console.log(finalInventory);
  console.log(`[PRODUCTS]: ${JSON.stringify(finalInventory, null, 2)}`);
  */

  const prevSummary = await collection
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

  const summaryMap = new Map(
    prevSummary.map((item) => [item.productId, item.totalQuantity]),
  );

  const { getProductModelByTenant } = require("../products/products.model");

  const products = await getProductModelByTenant(dbPrefix)
    .find({
      visible: true,
      category: { $in: ["Frescos Granel", "Frescos Pequeña"] },
    })
    .select(
      "id code description alternativeDescription category subcategory visible sortOrder",
    )
    .sort({ sortOrder: 1 })
    .lean();

  const summary = products.map((product) => {
    const total = summaryMap.get(product.id) || 0;

    return {
      id: product.id?.toString() || "id-desconocido",
      alternativeDescription: product.alternativeDescription,
      category: product.category,
      subcategory: product.subcategory,
      totalQuantity: total,
    };
  });

  return summary;
};

/**
 * Obtiene el detalle de lotes para un producto
 */
const getProductCountById = async (dbPrefix, countDate, id) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("La conexión a MongoDB Atlas no está activa.");
  }

  const dbTenant = mongoose.connection.useDb("tracesync_tenant", {
    useCache: true,
  });
  const collection = dbTenant.collection(`${dbPrefix}_ch_temporary_counts`);

  // 1. Buscamos el documento completo de recuento (para obtener batchLines)
  const productDoc = await collection.findOne({
    countDate: countDate,
    productId: id,
  });

  if (!productDoc) return null;

  // 2. Buscamos la descripción en la colección de productos
  const { getProductModelByTenant } = require("../products/products.model");
  const ProductModel = getProductModelByTenant(dbPrefix);

  const productInfo = await ProductModel.findOne({ id: id })
    .select("alternativeDescription unitsPerCrate")
    .lean();

  // 3. Consolidamos los datos
  const consolidateProduct = {
    id: productDoc.productId,
    alternativeDescription: productInfo?.alternativeDescription || "Sin nombre",
    unitsPerCrate: Number(productInfo?.unitsPerCrate ?? 0),
    batchLines: productDoc.batchLines || [],
  };

  //console.log(`[PRODUCT]: ${JSON.stringify(consolidateProduct, null, 2)}`);

  return consolidateProduct;
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
  const dayStatusCollection = dbTenant.collection(`${dbPrefix}_ch_day_status`);

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

/**
 * Guarda el recuento temporal por artículo
 */
const saveTemporaryCount = async (dbPrefix, data) => {
  const { productId, countDate, batchLines } = data;

  if (mongoose.connection.readyState !== 1) {
    throw new Error("La conexión a MongoDB Atlas no está activa.");
  }

  const dbTenant = mongoose.connection.useDb("tracesync_tenant", {
    useCache: true,
  });
  const collection = dbTenant.collection(`${dbPrefix}_ch_temporary_counts`);

  const sanitizedBatches = batchLines.map((line) => ({
    ...line,
    // Si batch es null, undefined o "", guardamos "Sin Lote"
    batch:
      line.batch && line.batch.trim() !== "" ? line.batch.trim() : "Sin Lote",
  }));

  // Definimos la estructura exacta que queremos persistir
  const updatePayload = {
    productId,
    countDate,
    batchLines: sanitizedBatches,
    updatedAt: new Date().toISOString(),
    lastUpdatedBy: operator || "Sistema",
  };

  // Ejecutamos una única operación atómica
  return await collection.findOneAndUpdate(
    { productId, countDate },
    { $set: updatePayload },
    { upsert: true, returnDocument: "after" },
  );
};

module.exports = {
  getInventorySummary,
  isDayFinalized,
  getProductCountById,
  saveTemporaryCount,
};
