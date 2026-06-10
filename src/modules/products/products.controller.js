const productService = require("./products.service");
const { HomeCatalogSchema } = require("./schemas/products.schema");

exports.getHomeCatalog = async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res
        .status(400)
        .json({ error: "El parámetro tenantId es requerido" });
    }

    // Buscamos el catálogo maestro en la base de datos
    const rawCatalog = await productService.getCatalogByTenant(tenantId);

    // Validamos el contrato estricto de salida antes de responder
    const validatedCatalog = HomeCatalogSchema.parse(rawCatalog);

    console.log(
      `📤 [BACKEND] Catálogo maestro enviado para tenant: ${tenantId} (${validatedCatalog.length} productos)`,
    );
    res.json(validatedCatalog);
  } catch (error) {
    console.error("💥 Error en getHomeCatalog:", error);
    res
      .status(500)
      .json({ error: "Error al recuperar el catálogo maestro de productos" });
  }
};
