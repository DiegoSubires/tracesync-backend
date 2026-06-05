const { getDbGlobal, getDbTenant } = require("../config/db");

async function getTenantCollectionName(tenantId) {
  const dbGlobal = getDbGlobal();
  const tenantConfig = await dbGlobal
    .collection("tenant_list")
    .findOne({ tenantId });
  if (!tenantConfig) throw new Error("Tenant no localizado");
  return `${tenantConfig.dbPrefix}_chamber_products`;
}

// GET /api/products
exports.getAllProducts = async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.query.tenant;
    if (!tenantId)
      return res.status(400).json({ error: "Falta el parámetro tenantId" });

    const dbTenant = getDbTenant();
    const collectionName = await getTenantCollectionName(tenantId);

    const products = await dbTenant
      .collection(collectionName)
      .find({ visible: true })
      .sort({ sortOrder: 1 })
      .toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error al obtener catálogo" });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId || req.query.tenant;
    if (!tenantId)
      return res.status(400).json({ error: "Falta el parámetro tenantId" });

    const dbTenant = getDbTenant();
    const collectionName = await getTenantCollectionName(tenantId);

    const product = await dbTenant
      .collection(collectionName)
      .findOne({ id: id, visible: true });
    if (!product)
      return res.status(404).json({ error: "Producto no localizado" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Error al recuperar el producto" });
  }
};

/*/ 🔍 ENDPOINT TEMPORAL: Extraer alineación de maestros para comparar con Salidas de Fresco.xlsx
exports.debugProductsAlignment = async (req, res) => {
  try {
    const tenantId = req.query.tenantId || "moreno_plaza";
    const dbTenant = getDbTenant();

    // Obtenemos el nombre dinámico correcto de tu colección (ej: mp_chamber_products)
    const { productsCollection } = await getDynamicCollectionNames(tenantId);

    // Traemos todos los productos de la cámara
    const products = await dbTenant
      .collection(productsCollection)
      .find({})
      .toArray();

    // 🔀 LÓGICA DE ORDENACIÓN PRIORITARIA:
    products.sort((a, b) => {
      // 1. Asignamos pesos numéricos a las categorías requeridas
      const getCategoryWeight = (category) => {
        if (category === "Frescos Granel") return 1;
        if (category === "Frescos Pequeña") return 2;
        return 3; // Cualquier otra categoría va al final
      };

      const weightA = getCategoryWeight(a.category);
      const weightB = getCategoryWeight(b.category);

      // Si las categorías son distintas, ordena por el peso ("Frescos Granel" primero)
      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // 2. Si pertenecen a la misma categoría, desempatamos por su 'sortOrder' numérico
      const orderA = a.sortOrder !== undefined ? Number(a.sortOrder) : 9999;
      const orderB = b.sortOrder !== undefined ? Number(b.sortOrder) : 9999;

      return orderA - orderB;
    });

    // 📝 Generación del CSV compatible con Excel (BOM UTF-8 para tildes y eñes)
    let csvContent = "\uFEFF";
    // Metemos también CATEGORÍA y ORDEN ORIGINAL como chivatos para auditar visualmente el porqué de esa posición
    csvContent += "code;alternativeDescription;category;sortOrder\n";

    products.forEach((prod) => {
      const code = prod.code || "";
      // Si no tiene descripción alternativa, usamos la descripción estándar para no dejar celdas vacías
      const altDesc = prod.alternativeDescription || prod.description || "";
      const category = prod.category || "";
      const sortOrder = prod.sortOrder !== undefined ? prod.sortOrder : "";

      // Limpiamos posibles saltos de línea o comillas molestas en las descripciones
      const sanitizedDesc = altDesc.replace(/"/g, '""').replace(/\n/g, " ");

      csvContent += `"${code}";"${sanitizedDesc}";"${category}";${sortOrder}\n`;
    });

    // Configuración de cabeceras de descarga directa
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Alineacion_Maestra_Productos.csv",
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("❌ Error en debugProductsAlignment:", error.message);
    return res.status(500).send("Error generando alineación: " + error.message);
  }
};*/
