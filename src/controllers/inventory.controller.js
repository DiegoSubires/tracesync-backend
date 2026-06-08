/*/ backend/controllers/inventory.controller.js
const { getDbGlobal, getDbTenant } = require("../config/db");

// 1. Función auxiliar corregida para forzar minúsculas
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
  // 🟢 CORRECCIÓN: Forzamos .toLowerCase() para evitar el mp_CH_...
  const appPrefix =
    appConfig && appConfig.dbPrefix ? appConfig.dbPrefix.toLowerCase() : "ch";
  const tenantPrefix = tenantConfig.dbPrefix.toLowerCase();

  const basePrefix = `${tenantPrefix}_${appPrefix}`; // Asegura unificado "mp_ch"

  return {
    temporaryCollection: `${basePrefix}_temporary_counts`,
    finalCollection: `${basePrefix}_final_inventory_records`,
    productsCollection: `${tenantPrefix}_chamber_products`,
  };
}

// 2. Tu Pipeline de Agregación intacto (La forma más eficiente)
exports.getProductsWithCounts = async (req, res) => {
  try {
    const { date } = req.query;
    const tenantId = req.query.tenantId || req.query.tenant;

    if (!tenantId || !date) {
      return res
        .status(400)
        .json({ error: "tenantId y date son obligatorios" });
    }

    const dbTenant = getDbTenant();
    const collections = await getDynamicCollectionNames(tenantId);

    console.log(
      `📊 [Aggregation] Cruzando catálogo [${collections.productsCollection}] con temporales [${collections.temporaryCollection}] para el día: ${date}`,
    );

    const aggregatedProducts = await dbTenant
      .collection(collections.productsCollection)
      .aggregate([
        { $match: {} },
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

    res.json(aggregatedProducts);
  } catch (err) {
    console.error("❌ Error en getProductsWithCounts:", err);
    res
      .status(500)
      .json({ error: err.message || "Error al sincronizar recuentos" });
  }
};

// backend/controllers/inventory.controller.js

/*exports.saveTemporaryCount = async (req, res) => {
  try {
    const { tenantId, productId, countDate, batchLines, batches } = req.body;

    if (!tenantId || !productId || !countDate) {
      return res
        .status(400)
        .json({ error: "tenantId, productId y countDate son obligatorios" });
    }

    const dbTenant = getDbTenant();
    const { temporaryCollection } = await getDynamicCollectionNames(tenantId);

    let incomingBatches =
      batchLines && batchLines.length > 0 ? batchLines : batches || [];

    const cleanBatches = Array.isArray(incomingBatches)
      ? incomingBatches.flat()
      : [];

    console.log(
      `📥 [Save Final] Escribiendo array plano en ${temporaryCollection} para ${productId}`,
    );

    await dbTenant.collection(temporaryCollection).updateOne(
      { productId, countDate },
      {
        $set: {
          tenantId,
          productId,
          countDate,
          batchLines: cleanBatches,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return res.json({ success: true, message: "Borrador guardado con éxito." });
  } catch (error) {
    console.error("❌ Error en saveTemporaryCount:", error.message);
    return res.status(500).json({ error: error.message });
  }
};//

exports.saveTemporaryCount = async (req, res) => {
  try {
    const { tenantId, productId, countDate, batchLines } = req.body;

    if (!tenantId || !productId || !countDate) {
      return res
        .status(400)
        .json({ error: "tenantId, productId y countDate son obligatorios" });
    }

    const dbTenant = getDbTenant();
    const { temporaryCollection } = await getDynamicCollectionNames(tenantId);

    // Aseguramos que venga como array y lo aplanamos por si las moscas
    const cleanBatches = Array.isArray(batchLines) ? batchLines.flat() : [];

    const sanitizedBatches = cleanBatches.map((b) => ({
      batch: String(b.batch || b.batchCode || ""),
      quantity: Number(b.quantity || b.totalUnits || 0),
      crates: Number(b.crates || 0),
      looseUnits: Number(b.looseUnits || 0),
      packingDate: b.packingDate || null,
      elapsedDays: Number(b.elapsedDays || 0),
    }));

    await dbTenant.collection(temporaryCollection).updateOne(
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

    return res.json({ success: true, message: "Borrador guardado con éxito." });
  } catch (error) {
    console.error("❌ Error en saveTemporaryCount:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// 4. Finalizar Recuento Diario
exports.finalizeCount = async (req, res) => {
  try {
    const { tenantId, countDate, operatorName } = req.body;
    const dbTenant = getDbTenant();
    const { temporaryCollection, finalCollection } =
      await getDynamicCollectionNames(tenantId);

    const activeDayCounts = await dbTenant
      .collection(temporaryCollection)
      .find({ countDate })
      .toArray();

    if (activeDayCounts.length === 0) {
      return res.status(400).json({
        error: "No hay registros en el borrador para finalizar este día.",
      });
    }

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

    await dbTenant.collection(finalCollection).insertOne(finalRecordDoc);
    await dbTenant.collection(temporaryCollection).deleteMany({ countDate });

    res.json({
      success: true,
      message: "Recuento diario consolidado con éxito.",
    });
  } catch (error) {
    console.error("❌ Error en finalizeCount:", error.message);
    res.status(500).json({ error: error.message });
  }
};*/

const InventoryModel = require("../models/inventory.model");
const { getDbTenant } = require("../config/db");

// 1a. Obtener catálogo cruzado con recuentos activos
exports.getProductsWithCounts = async (req, res) => {
  try {
    const { date } = req.query;
    const tenantId = req.query.tenantId || req.query.tenant;

    if (!tenantId || !date) {
      return res
        .status(400)
        .json({ error: "tenantId y date son obligatorios" });
    }

    // Opcional: Para auditoría interna en logs de producción
    const collections =
      await InventoryModel.getDynamicCollectionNames(tenantId);
    console.log(
      `📊 [Aggregation] Consultando catálogo [${collections.productsCollection}] mediante capa de modelo para el día: ${date}`,
    );

    const aggregatedProducts = await InventoryModel.getProductsWithActiveCounts(
      tenantId,
      date,
    );
    return res.json(aggregatedProducts);
  } catch (err) {
    console.error("❌ Error en getProductsWithCounts:", err);
    return res
      .status(500)
      .json({ error: err.message || "Error al sincronizar recuentos" });
  }
};

// 1b. Obtener un producto del catálogo cruzado con recuentos activos
/*exports.getProductWithCountsById = async (req, res) => {
  try {
    const { date } = req.query;
    const tenantId = req.query.tenantId || req.query.tenant;
    const { productId } = req.params; // Obtenemos el ID de la ruta

    if (!tenantId || !date || !productId) {
      return res
        .status(400)
        .json({ error: "tenantId, date y productId son obligatorios" });
    }

    console.log(
      `📊 [Aggregation] Consultando detalle producto [${productId}] para el día: ${date}`,
    );

    // Llamamos al modelo pasando el productId extra
    const result = await InventoryModel.getProductsWithActiveCounts(
      tenantId,
      date,
      productId,
    );

    // Si el resultado es un array vacío, devolvemos 404
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Retornamos el primer elemento (ya que filtramos por ID)
    const product = Array.isArray(result) ? result[0] : result;

    return res.json(product);
  } catch (err) {
    console.error("❌ Error en getProductWithCountsById:", err);
    return res
      .status(500)
      .json({ error: err.message || "Error al obtener el producto" });
  }
};*/
exports.getProductWithCountsById = async (req, res) => {
  try {
    const { productId } = req.params; // Captura el ID de la URL
    const { tenant, date } = req.query; // Captura los parámetros de búsqueda

    if (!tenant || !date) {
      return res.status(400).json({ error: "Faltan parámetros tenant o date" });
    }

    // Llama al modelo pasando el productId opcional
    const data =
      await require("../models/inventory.model").getProductsWithActiveCounts(
        tenant,
        date,
        productId,
      );

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error en getProductWithCountsById:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al obtener el producto" });
  }
};

// 2. Guardar Borrador Temporal por Artículo
exports.saveTemporaryCount = async (req, res) => {
  try {
    const countDate = String(req.body.countDate).trim();
    const { tenantId, productId, batchLines } = req.body;

    if (!tenantId || !productId || !countDate) {
      return res
        .status(400)
        .json({ error: "tenantId, productId y countDate son obligatorios" });
    }

    const cleanBatches = Array.isArray(batchLines) ? batchLines.flat() : [];

    // 🛡️ Barrera estricta de sanitización antes de pasar los datos al modelo
    const sanitizedBatches = cleanBatches.map((b) => ({
      batch: String(b.batch || b.batchCode || ""),
      quantity: Number(b.quantity || b.totalUnits || 0),
      crates: Number(b.crates || 0),
      looseUnits: Number(b.looseUnits || 0),
      packingDate: b.packingDate || null,
      elapsedDays: Number(b.elapsedDays || 0),
    }));

    await InventoryModel.saveTemporaryCount(
      tenantId,
      productId,
      countDate,
      sanitizedBatches,
    );
    return res.json({ success: true, message: "Borrador guardado con éxito." });
  } catch (error) {
    console.error("❌ Error en saveTemporaryCount:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

/*/ 3. Finalizar e Inmutabilizar Recuento Diario
exports.finalizeCount = async (req, res) => {
  try {
    const { tenantId, operatorName } = req.body;
    const countDate = String(req.body.countDate).trim();

    if (!tenantId || !countDate) {
      return res.status(400).json({
        error:
          "tenantId y countDate son obligatorios en el cuerpo del mensaje.",
      });
    }

    // Recuperamos los borradores usando el modelo
    const activeDayCounts = await InventoryModel.getTemporaryCountsByDate(
      tenantId,
      countDate,
    );

    if (activeDayCounts.length === 0) {
      return res.status(400).json({
        error: "No hay registros en el borrador para finalizar este día.",
      });
    }

    // Delegamos la consolidación histórica y borrado físico al modelo
    await InventoryModel.consolidateFinalRecord(
      tenantId,
      countDate,
      operatorName,
      activeDayCounts,
    );

    return res.json({
      success: true,
      message: "Recuento diario consolidado con éxito.",
    });
  } catch (error) {
    console.error("❌ Error en finalizeCount:", error.message);
    return res.status(500).json({ error: error.message });
  }
};*/

// 4. Finalizar Recuento Diario
exports.finalizeCount = async (req, res) => {
  try {
    // 🧹 Forzamos limpieza absoluta de la fecha para evitar espacios invisibles
    const countDate = String(req.body.countDate).trim();
    const { tenantId, operatorName } = req.body;

    const dbTenant = getDbTenant();
    const { temporaryCollection, finalCollection } =
      await InventoryModel.getDynamicCollectionNames(tenantId);

    // Buscamos usando la fecha limpia
    const activeDayCounts = await dbTenant
      .collection(temporaryCollection)
      .find({ countDate: countDate })
      .toArray();

    if (activeDayCounts.length === 0) {
      return res.status(400).json({
        error: "No hay registros en el borrador para finalizar este día.",
      });
    }

    const finalRecordDoc = {
      tenantId,
      countDate: countDate, // Guardamos la fecha limpia en el histórico
      closedAt: new Date(),
      operatorName,
      inventorySnapshot: activeDayCounts.map((item) => ({
        productId: item.productId,
        batchLines: item.batchLines,
      })),
    };

    // Insertamos en la colección definitiva
    await dbTenant.collection(finalCollection).insertOne(finalRecordDoc);

    // 🔥 CLAVE: Borramos asegurando el match exacto con la variable sanitizada
    const deleteResult = await dbTenant
      .collection(temporaryCollection)
      .deleteMany({ countDate: countDate });

    console.log(
      `🧹 [MongoDB] Limpieza completada. Eliminados ${deleteResult.deletedCount} borradores temporales para el día [${countDate}]`,
    );

    res.json({
      success: true,
      message: "Jornada consolidada y borradores limpiados.",
    });
  } catch (error) {
    console.error("❌ Error en finalizeCount:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Comprobar estado de la fecha
exports.getDayStatus = async (req, res) => {
  try {
    const { date } = req.query;
    const tenantId = req.query.tenantId || req.query.tenant;

    if (!tenantId || !date) {
      return res
        .status(400)
        .json({ error: "tenantId y date son obligatorios" });
    }

    const finalized = await InventoryModel.isDayFinalized(tenantId, date);
    return res.json({ finalized });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Exportación directa a formato CSV alineado fila a fila para plantilla de Excel
exports.exportToExcelCsv = async (req, res) => {
  try {
    const { date } = req.query;
    const tenantId = req.query.tenantId || req.query.tenant;

    console.log("\n====================================================");
    console.log(
      `📊 [AUDITORÍA REPORTE] Iniciando generación de volcado columnar.`,
    );
    console.log(
      `   -> Parámetro 'date' recibido: "${date}" (Tipo: ${typeof date})`,
    );
    console.log(`   -> Parámetro 'tenantId' recibido: "${tenantId}"`);

    if (!tenantId || !date) {
      return res
        .status(400)
        .send("Faltan parámetros requeridos (tenantId o date).");
    }

    const dbTenant = getDbTenant();

    // 1. Obtener nombres de las colecciones dinámicas del Tenant
    const { productsCollection, finalCollection } =
      await InventoryModel.getDynamicCollectionNames(tenantId);

    // 2. Traer el catálogo maestro FILTRANDO por visibilidad Y exclusivamente por tus categorías de Frescos
    const products = await dbTenant
      .collection(productsCollection)
      .find({
        visible: { $nin: [false, "false"] },
        category: {
          $in: ["Frescos Granel", "Frescos Pequeña", " Frescos Pequeña"],
        },
      })
      .toArray();

    console.log(
      `📦 [Paso 2] Documentos recuperados de catálogo maestro (Filtrados por Frescos): ${products.length}`,
    );

    // 3. Traer el informe definitivo consolidado de la fecha seleccionada
    const finalRecord = await dbTenant
      .collection(finalCollection)
      .findOne({ countDate: date });

    if (finalRecord) {
      console.log(
        `✅ [Paso 3] Documento definitivo de cierre localizado con éxito.`,
      );
    } else {
      console.log(
        `⚠️ [Paso 3] No se localizó ningún registro de cierre final para la fecha: ${date}`,
      );
    }

    // 4. Mapear y sumar las quantities de todos los lotes agrupándolas por su productId
    const quantityMap = {};
    if (finalRecord && finalRecord.inventorySnapshot) {
      console.log(
        `   -> Elementos dentro de 'inventorySnapshot': ${finalRecord.inventorySnapshot.length} artículos.`,
      );
      finalRecord.inventorySnapshot.forEach((item) => {
        let totalProductQty = 0;
        if (item.batchLines && item.batchLines.length > 0) {
          item.batchLines.forEach((line) => {
            totalProductQty += Number(line.quantity || 0);
          });
        }
        if (item.productId) {
          quantityMap[item.productId] =
            (quantityMap[item.productId] || 0) + totalProductQty;
        }
      });
    }

    // 5. Organizar los productos en un diccionario de ARRAYS usando el sortOrder como clave
    // 🔥 CLAVE: Usamos arrays para evitar que "Frescos Granel" pise a "Frescos Pequeña" si repiten sortOrder
    const productBySortOrder = {};
    let maxSortOrder = 3; // Inicializamos en 3 como mínimo estándar

    products.forEach((prod) => {
      const so = Number(prod.sortOrder);
      if (!isNaN(so)) {
        if (!productBySortOrder[so]) {
          productBySortOrder[so] = [];
        }
        productBySortOrder[so].push(prod);
        if (so > maxSortOrder) {
          maxSortOrder = so; // Buscamos el techo del bucle dinámicamente
        }
      }
    });

    console.log(`🔢 [Paso 5] Mapeo de índices completado.`);
    console.log(
      `   -> Techo superior determinado del bucle (maxSortOrder): ${maxSortOrder}`,
    );

    // 6. Construcción del CSV con BOM UTF-8 para asegurar la compatibilidad con Excel
    let csvContent = "\uFEFF";

    // Fila 1: Fecha del recuento
    csvContent += `"${date}"\n`;

    // Fila 2: Literal de control "STOCK"
    csvContent += "STOCK\n";

    let filasTotalesEscritas = 2;
    let coincidenciaPintadas = 0;

    // Fila 3 en adelante: Mapeo estricto indexado por fila/sortOrder
    for (let i = 3; i <= maxSortOrder; i++) {
      const prodsInSlot = productBySortOrder[i] || [];

      // Caso A: El sortOrder está vacío/saltado en la numeración del catálogo maestro
      if (prodsInSlot.length === 0) {
        csvContent += "\n";
        filasTotalesEscritas++;
        continue;
      }

      // Sumamos las cantidades de todos los productos que compartan este casillero/fila
      let slotQty = 0;
      prodsInSlot.forEach((prod) => {
        const qtyById = quantityMap[prod.id] || 0;
        const qtyByOid = prod._id ? quantityMap[prod._id.toString()] || 0 : 0;
        const finalProdQty = qtyById || qtyByOid;

        if (finalProdQty > 0) {
          slotQty += finalProdQty;
          coincidenciaPintadas++;
          console.log(
            `   🎯 [MATCH STOCK] Fila Excel [${i}] -> Code: "${prod.code}" | Cat: "${prod.category}" | Qty: ${finalProdQty}`,
          );
        }
      });

      // Caso B y C: Inyección del stock consolidado en el renglón correspondiente
      if (slotQty === 0) {
        csvContent += "\n";
      } else {
        csvContent += `${slotQty}\n`;
      }
      filasTotalesEscritas++;
    }

    console.log(`📊 [Fin de Generación] Bucle de filas completado.`);
    console.log(
      `   -> Filas escritas totales en el archivo CSV: ${filasTotalesEscritas}`,
    );
    console.log(
      `   -> Número de productos que SÍ encontraron coincidencia y pintaron datos: ${coincidenciaPintadas}`,
    );
    console.log("====================================================\n");

    // 7. Configuración de cabeceras HTTP para descarga limpia en el navegador
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Columnar_Stock_${date}_${tenantId}.csv`,
    );

    return res.status(200).send(csvContent);
  } catch (err) {
    console.error("❌ Error generando el volcado columnar para Excel:", err);
    return res.status(500).send("Error generando el informe.");
  }
};

// 🔍 ENDPOINT TEMPORAL: Extraer alineación de maestros para comparar con Salidas de Fresco.xlsx
exports.debugProductsAlignment = async (req, res) => {
  // 🛰️ LOG: Ver la construcción de la URL exacta que ha entrado al backend
  const protocol = req.protocol;
  const host = req.get("host");
  const originalUrl = req.originalUrl;

  console.log("\n=======================================================");
  console.log("🚀 [DEBUG MASTER] ¡PETICIÓN DETECTADA EN EL BACKEND!");
  console.log(`🔗 URL COMPLETA LLAMADA: ${protocol}://${host}${originalUrl}`);
  console.log("=======================================================");

  try {
    const tenantId = req.query.tenantId || "moreno_plaza";
    console.log(`🔹 [Step 1] tenantId procesado: "${tenantId}"`);

    // Importamos la conexión localmente aquí dentro para no alterar tus imports de arriba
    const { getDbTenant } = require("../config/db");
    const dbTenant = getDbTenant();
    console.log("🔹 [Step 2] Conexión interna a MongoDB obtenida con éxito.");

    // 🟢 CORRECCIÓN: Llamamos a través de InventoryModel que es donde vive ahora la función
    console.log(
      "🔹 [Step 3] Solicitando nombres de colecciones a 'InventoryModel'...",
    );
    const { productsCollection } =
      await InventoryModel.getDynamicCollectionNames(tenantId);
    console.log(
      `🔹 [Step 4] Nombre de colección maestra recuperado: "${productsCollection}"`,
    );

    console.log(
      `🔹 [Step 5] Lanzando consulta .find({}) en la colección [${productsCollection}]...`,
    );
    const products = await dbTenant
      .collection(productsCollection)
      .find({})
      .toArray();

    console.log(
      `🔹 [Step 6] Consulta finalizada. Documentos encontrados: ${products.length}`,
    );

    if (products.length === 0) {
      console.log(
        "⚠️ [ALERTA] La colección maestra no ha devuelto ningún artículo.",
      );
      return res
        .status(404)
        .send("La colección de productos está vacía en la base de datos.");
    }

    // 🔀 Ordenación prioritaria
    console.log(
      "🔹 [Step 7] Ejecutando algoritmo de ordenación por categorías...",
    );
    products.sort((a, b) => {
      const getCategoryWeight = (category) => {
        if (category === "Frescos Granel") return 1;
        if (category === "Frescos Pequeña") return 2;
        return 3;
      };

      const weightA = getCategoryWeight(a.category);
      const weightB = getCategoryWeight(b.category);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      const orderA = a.sortOrder !== undefined ? Number(a.sortOrder) : 9999;
      const orderB = b.sortOrder !== undefined ? Number(b.sortOrder) : 9999;

      return orderA - orderB;
    });
    console.log("🔹 [Step 8] Ordenación de estructura completada.");

    // 📝 Generación del CSV
    console.log("🔹 [Step 9] Estructurando cadenas de texto para el CSV...");
    let csvContent = "\uFEFF"; // BOM UTF-8
    csvContent += "code;alternativeDescription;category;sortOrder\n";

    products.forEach((prod) => {
      const code = prod.code || "";
      const altDesc = prod.alternativeDescription || prod.description || "";
      const category = prod.category || "";
      const sortOrder = prod.sortOrder !== undefined ? prod.sortOrder : "";

      const sanitizedDesc = altDesc.replace(/"/g, '""').replace(/\n/g, " ");
      csvContent += `"${code}";"${sanitizedDesc}";"${category}";${sortOrder}\n`;
    });

    console.log(
      "🎉 [EXITO] Enviando flujo de descarga de archivo al cliente.\n",
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Alineacion_Maestra_Productos.csv",
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("\n❌ [ERROR CRÍTICO] Fallo en debugProductsAlignment:");
    console.error(`Mensaje: ${error.message}`);
    console.error(`Stack trace: ${error.stack}\n`);

    return res.status(500).json({
      error: error.message,
      step: "Error durante la ejecución del proceso de depuración.",
      stack: error.stack,
    });
  }
};
