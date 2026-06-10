const productService = require("./products.service");
const { HomeCatalogSchema } = require("./schema/products.schema");

exports.getHomeCatalog = async (req, res) => {
  try {
    // El 'dbPrefix' nos lo ha regalado el middleware limpiamente
    const { dbPrefix } = req;

    const rawCatalog = await productService.getCatalogByPrefix(dbPrefix);

    const validatedCatalog = HomeCatalogSchema.parse(rawCatalog);

    res.json(validatedCatalog);
  } catch (error) {
    console.error("💥 Error en getHomeCatalog:", error);
    res
      .status(500)
      .json({ error: "Error al recuperar el catálogo maestro de productos" });
  }
};
