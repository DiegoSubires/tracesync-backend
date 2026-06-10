const { getProductModelByTenant } = require("./products.model");

exports.getCatalogByPrefix = async (dbPrefix) => {
  try {
    // Obtenemos el modelo acoplado a la colección física del cliente desde su propio archivo de modelos
    const ProductModel = getProductModelByTenant(dbPrefix);

    const products = await ProductModel.find({
      visible: true,
      category: { $in: ["Frescos Granel", "Frescos Pequeña"] },
    })
      .select(
        "id code description alternativeDescription category subcategory visible sortOrder",
      )
      .sort({ sortOrder: 1 })
      .lean();

    return products;
  } catch (error) {
    console.error(
      `🚨 Error al consultar el catálogo de productos con prefijo ${dbPrefix}:`,
      error,
    );
    throw error;
  }
};
