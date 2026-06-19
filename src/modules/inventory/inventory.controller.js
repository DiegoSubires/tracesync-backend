const mongoose = require("mongoose");
const inventoryService = require("./inventory.service");
const {
  HomeSummarySchema,
  BatchDetailSchema,
  SaveTemporaryCountSchema,
  FinalizeInventorySchema,
} = require("./schemas/inventory.schema");
const asyncHandler = require("../../utils/asyncHandler");
const { getInitialProductState } = require("../../utils/inventoryDefaults");

/**
 * Obtiene los productos temporales de una jornada específica (versión Home)
 */
exports.getDaySummary = async (req, res) => {
  console.log(`\n📢 [PETICIÓN ENTRANTE] GET a la ruta: /api/inventory/summary`);

  try {
    const { date } = req.query;
    const dbPrefix = req.dbPrefix; // 🎯 Usamos el prefijo resuelto ("mp") en vez del tenantId crudo

    /*console.log(
      `   📥 [CONTROLADOR SUMMARY] Query recibida -> Fecha: "${date}" | dbPrefix: "${dbPrefix}"`,
    );*/

    // Invocamos pasándole el prefijo unificado
    const data = await inventoryService.getInventorySummary(dbPrefix, date);

    /*console.log(
      `\n📊 [Inventory.controller.getDaySummary]: "data" | dbPrefix: "${JSON.stringify(data, null, 2)}"`,
    );*/

    const payload = {
      tenantId: req.query.tenantId || dbPrefix,
      date,
      summary: data,
    };

    /*console.log(
      `\n📊 [Inventory.controller.getDaySummary]: "payload" | dbPrefix: "${JSON.stringify(payloadParaValidar, null, 2)}"`,
    );*/
    /*console.log(
      "🔍 Payload completo a validar:",
      JSON.stringify(payload, null, 2),
    );*/

    const validatedData = HomeSummarySchema.parse(payload);

    /*console.log(
      `\n📊 [Inventory.controller.getDaySummary]: "validatedData" | dbPrefix: "${JSON.stringify(validatedData, null, 2)}"`,
    );*/

    //console.log("📤 [BACKEND] Respuesta Home enviada correctamente.");
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
  /*console.log(
    `\n📢 [PETICIÓN ENTRANTE] GET a la ruta: /api/inventory/day-status`,
  );*/

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

/**
 * Obtiene los productos temporales de una jornada específica (versión BatchDetail)
 */
exports.getProductDetail = asyncHandler(async (req, res) => {
  const { date, id } = req.query;
  const dbPrefix = req.dbPrefix;

  // 1. Obtener Maestro
  const { getProductModelByTenant } = require("../products/products.model");
  const ProductModel = getProductModelByTenant(dbPrefix);

  // Buscamos el producto, si no existe, productInfo será null
  const productInfo = await ProductModel.findOne({ id: id })
    .select("alternativeDescription unitsPerCrate")
    .lean();

  // 2. Obtener Temporal
  const temporalData = await inventoryService.getProductCountById(
    dbPrefix,
    date,
    id,
  );

  // 3. BLINDAJE: Construimos la base de forma segura.
  // Si no hay productInfo, usamos al menos el ID que viene de la query.
  const baseProduct = getInitialProductState(productInfo || { id: id });

  // 4. Consolidamos el Payload final
  const payload = {
    tenantId: req.query.tenantId || dbPrefix,
    date: date,
    product: {
      // Forzamos que el ID siempre sea el id de la query si baseProduct fallara
      id: baseProduct.id || id,
      alternativeDescription: baseProduct.alternativeDescription,
      unitsPerCrate: baseProduct.unitsPerCrate,
      batchLines: temporalData?.batchLines || [],
    },
  };

  // 5. Validación
  const validatedData = BatchDetailSchema.parse(payload);
  return res.json(validatedData);
});

/**
 * Guarda el recuento temporal por artículo
 */
exports.saveTemporaryCount = asyncHandler(async (req, res) => {
  const validatedData = SaveTemporaryCountSchema.parse(req.body);
  const dbPrefix = req.dbPrefix;
  await inventoryService.saveTemporaryCount(dbPrefix, validatedData);
  res.json({ success: true, message: "Guardado con éxito." });
});

/**
 * Guarda el recuento finalizado de todos los productos,
 * recuperando los archivos temporales, y guardando en finalizado
 * Borra los archivos temporales que se habían consultado
 * Cambia el status del día del recuento.
 */
exports.finalizeDay = asyncHandler(async (req, res) => {
  //const { tenantId, countDate, operatorName } = req.body;
  console.log("📥 [Controlador] Cuerpo recibido:", req.body);
  console.log("📥 [Controlador] Query recibida:", req.query);

  const { countDate, operatorName, comments } = FinalizeInventorySchema.parse(
    req.body,
  );
  const tenantId = req.query.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: "Falta el tenantId en la query" });
  }

  const dbPrefix = req.dbPrefix;

  console.log(
    `🛠️ [Backend] Finalizando para Tenant: ${tenantId}, Fecha: ${countDate}`,
  );

  const dbTenant = mongoose.connection.useDb("tracesync_tenant");
  const tempColl = dbTenant.collection(`${dbPrefix}_ch_temporary_counts`);

  const allTemporaryCounts = await tempColl.find({ countDate }).toArray();
  console.log(
    `🔍 [Controlador] Registros temporales encontrados: ${allTemporaryCounts.length}`,
  );

  if (allTemporaryCounts.length === 0) {
    return res
      .status(400)
      .json({ error: "No hay datos temporales para consolidar." });
  }

  await inventoryService.finalizeDayTransaction(dbPrefix, {
    tenantId,
    countDate,
    operatorName,
    products: allTemporaryCounts,
    comments: comments || "Finalización automatizada desde backend",
  });

  res.json({ success: true });
});

/**
 * Obtiene el csv del recuento finalizado
 */
exports.exportToExcelCsv = asyncHandler(async (req, res) => {
  // Ahora req.query ya ha sido validado por QuerySchema
  const { date, tenantId } = req.query;
  const dbPrefix = req.dbPrefix;

  console.log(
    `🔍 [DEBUG] Solicitud recibida: Tenant: ${tenantId}, Fecha: ${date}`,
  );

  const dbTenant = mongoose.connection.useDb("tracesync_tenant");
  const productsColl = dbTenant.collection(`${dbPrefix}_products`);
  const finalColl = dbTenant.collection(
    `${dbPrefix}_ch_final_inventory_records`,
  );

  // 1. Traer datos
  const products = await productsColl
    .find({
      visible: { $nin: [false, "false"] },
      category: {
        $in: ["Frescos Granel", "Frescos Pequeña", " Frescos Pequeña"],
      },
    })
    .toArray();

  const finalRecord = await finalColl.findOne({ countDate: date });

  // 2. Validación temprana (Aquí es donde controlas si falta info)
  console.log(
    `🔍 [DEBUG] Productos: ${products.length}, Record encontrado: ${!!finalRecord}`,
  );

  if (products.length === 0) {
    return res.status(404).send("No se encontraron productos para exportar.");
  }
  if (!finalRecord) {
    return res
      .status(404)
      .send(`No hay registro de inventario para la fecha ${date}.`);
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

  // 7. Respuesta
  res.setHeader("X-Debug-Tenant", tenantId);
  res.setHeader("X-Debug-Date", date);
  res.setHeader("X-Debug-Products-Count", products.length);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Stock_${date}_${tenantId}.csv`,
  );

  return res.status(200).send(csvContent);
});
