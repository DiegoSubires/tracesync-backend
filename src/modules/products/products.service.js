const Product = require("./products.model");

exports.getCatalogByTenant = async (tenantId) => {
  try {
    // En Mongoose, usamos .select() para traer solo lo indispensable y ganar velocidad
    // Adaptamos el '_id' de Mongo a 'id' para cumplir con el frontend
    const products = await Product.find({ tenantId, visible: true })
      .select(
        "code description alternativeDescription category subcategory visible sortOrder",
      )
      .sort({ sortOrder: 1 })
      .lean(); // .lean() optimiza la velocidad devolviendo objetos JS planos de alto rendimiento

    return products;
  } catch (error) {
    console.error("🚨 Error en productService de la base de datos:", error);
    throw error;
  }
};
