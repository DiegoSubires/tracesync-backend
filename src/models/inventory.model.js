// backend/models/inventory.model.js
const { getDbGlobal, getDbTenant } = require("../config/db");

/**
 * Resuelve dinámicamente los nombres de las colecciones según el Tenant e ID de aplicación
 */
async function getDynamicCollectionNames(
  tenantId,
  appId = "chamber_inventory",
) {
  const dbGlobal = getDbGlobal();

  const tenantConfig = await dbGlobal
    .collection("tenant_list")
    .findOne({ tenantId });
  if (!tenantConfig) throw new Error(`Tenant '${tenantId}' no localizado.`);

  const appConfig = await dbGlobal
    .collection("app_registry")
    .findOne({ appId });

  const appPrefix =
    appConfig && appConfig.dbPrefix ? appConfig.dbPrefix.toLowerCase() : "ch";
  const tenantPrefix = tenantConfig.dbPrefix.toLowerCase();

  const basePrefix = `${tenantPrefix}_${appPrefix}`;

  return {
    temporaryCollection: `${basePrefix}_temporary_counts`,
    finalCollection: `${basePrefix}_final_inventory_records`,
    productsCollection: `${tenantPrefix}_chamber_products`,
  };
}

/**
 * Ejecuta la agregación para cruzar el catálogo maestro con los borradores del día
 */
async function getProductsWithActiveCounts(tenantId, date) {
  const dbTenant = getDbTenant();
  const collections = await getDynamicCollectionNames(tenantId);

  return await dbTenant
    .collection(collections.productsCollection)
    .aggregate([
      {
        $match: {
          visible: { $nin: [false, "false"] },
        },
      },
      {
        $lookup: {
          from: collections.temporaryCollection,
          let: { productIdInCatalog: "$id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productIdInCatalog"] },
                    { $eq: ["$countDate", date] },
                  ],
                },
              },
            },
          ],
          as: "temporaryDocs",
        },
      },
      {
        $project: {
          id: 1,
          code: 1,
          description: 1,
          alternativeDescription: 1,
          category: 1,
          subcategory: 1,
          unitsPerCrate: 1,
          visible: 1,
          sortOrder: 1,
          batches: {
            $cond: {
              if: { $gt: [{ $size: "$temporaryDocs" }, 0] },
              then: {
                $let: {
                  vars: { firstDoc: { $arrayElemAt: ["$temporaryDocs", 0] } },
                  in: "$$firstDoc.batchLines",
                },
              },
              else: [],
            },
          },
        },
      },
      { $sort: { sortOrder: 1 } },
    ])
    .toArray();
}

/**
 * Ejecuta la agregación para cruzar el catálogo maestro con los borradores del día.
 * Si productId es proporcionado, filtra únicamente ese producto.
 * Si no, aplica el filtro de visibilidad estándar.
 */
async function getProductsWithActiveCounts(tenantId, date, productId = null) {
  const dbTenant = getDbTenant();
  const collections = await getDynamicCollectionNames(tenantId);

  const pipeline = [];

  // 1. FILTRO DINÁMICO (Lo ponemos primero para máxima eficiencia)
  if (productId) {
    // Si nos piden un producto específico, filtramos por él (usando id string o ObjectId)
    const matchQuery = {
      $or: [
        { id: productId },
        { _id: ObjectId.isValid(productId) ? new ObjectId(productId) : null },
      ].filter((item) => item !== null), // Limpiamos nulos si el ID no es ObjectId válido
    };
    pipeline.push({ $match: matchQuery });
  } else {
    // Si no es un producto específico, filtramos por visibilidad (comportamiento original)
    pipeline.push({
      $match: {
        visible: { $nin: [false, "false"] },
      },
    });
  }

  // 2. RESTO DEL PIPELINE ORIGINAL (Lookup, Project, Sort)
  pipeline.push(
    {
      $lookup: {
        from: collections.temporaryCollection,
        let: { productIdInCatalog: "$id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$productId", "$$productIdInCatalog"] },
                  { $eq: ["$countDate", date] },
                ],
              },
            },
          },
        ],
        as: "temporaryDocs",
      },
    },
    {
      $project: {
        id: 1,
        code: 1,
        description: 1,
        alternativeDescription: 1,
        category: 1,
        subcategory: 1,
        unitsPerCrate: 1,
        visible: 1,
        sortOrder: 1,
        batches: {
          $cond: {
            if: { $gt: [{ $size: "$temporaryDocs" }, 0] },
            then: {
              $let: {
                vars: { firstDoc: { $arrayElemAt: ["$temporaryDocs", 0] } },
                in: "$$firstDoc.batchLines",
              },
            },
            else: [],
          },
        },
      },
    },
    { $sort: { sortOrder: 1 } },
  );

  // 3. EJECUCIÓN
  return await dbTenant
    .collection(collections.productsCollection)
    .aggregate(pipeline)
    .toArray();
}

/**
 * Guarda o actualiza el borrador de recuento de un producto específico
 */
async function saveTemporaryCount(
  tenantId,
  productId,
  countDate,
  sanitizedBatches,
) {
  const dbTenant = getDbTenant();
  const { temporaryCollection } = await getDynamicCollectionNames(tenantId);

  return await dbTenant.collection(temporaryCollection).updateOne(
    { productId, countDate },
    {
      $set: {
        tenantId,
        productId,
        countDate,
        batchLines: sanitizedBatches,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

/**
 * Obtiene todos los borradores activos de una fecha para un tenant determinado
 */
async function getTemporaryCountsByDate(tenantId, countDate) {
  const dbTenant = getDbTenant();
  const { temporaryCollection } = await getDynamicCollectionNames(tenantId);

  return await dbTenant
    .collection(temporaryCollection)
    .find({ countDate })
    .toArray();
}

/**
 * Consolida el Snapshot final en el histórico inmutable y vacía la colección temporal
 */
async function consolidateFinalRecord(
  tenantId,
  countDate,
  operatorName,
  activeDayCounts,
) {
  const dbTenant = getDbTenant();
  const { temporaryCollection, finalCollection } =
    await getDynamicCollectionNames(tenantId);

  const finalRecordDoc = {
    tenantId,
    countDate,
    closedAt: new Date(),
    operatorName,
    inventorySnapshot: activeDayCounts.map((item) => ({
      productId: item.productId,
      batchLines: item.batchLines,
    })),
  };

  // Operación atómica elemental
  await dbTenant.collection(finalCollection).insertOne(finalRecordDoc);
  await dbTenant.collection(temporaryCollection).deleteMany({ countDate });

  return true;
}

/**
 * Comprueba si ya existe un cierre definitivo para una fecha específica
 */
async function isDayFinalized(tenantId, countDate) {
  const dbTenant = getDbTenant();
  const { finalCollection } = await getDynamicCollectionNames(tenantId);
  const record = await dbTenant
    .collection(finalCollection)
    .findOne({ countDate });
  return !!record;
}

/**
 * Recupera el histórico de un día cruzándolo con el catálogo maestro para rellenar descripciones
 */
async function getFinalInventoryReport(tenantId, countDate) {
  const dbTenant = getDbTenant();
  const { finalCollection, productsCollection } =
    await getDynamicCollectionNames(tenantId);

  return await dbTenant
    .collection(finalCollection)
    .aggregate([
      { $match: { countDate } },
      { $unwind: "$inventorySnapshot" },
      {
        $lookup: {
          from: productsCollection,
          localField: "inventorySnapshot.productId",
          foreignField: "id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: 0,
          operatorName: 1,
          closedAt: 1,
          code: "$productInfo.code",
          description: "$productInfo.description",
          category: "$productInfo.category",
          productId: "$inventorySnapshot.productId",
          batchLines: "$inventorySnapshot.batchLines",
        },
      },
    ])
    .toArray();
}

module.exports = {
  getDynamicCollectionNames,
  getProductsWithActiveCounts,
  saveTemporaryCount,
  getTemporaryCountsByDate,
  consolidateFinalRecord,
  isDayFinalized,
  getFinalInventoryReport,
};
