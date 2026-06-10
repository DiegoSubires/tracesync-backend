const mongoose = require("mongoose");

// Definimos los esquemas base compartidos (sin compilar como modelo aún)
const BaseProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    alternativeDescription: { type: String, default: "" },
    category: { type: String, required: true },
    subcategory: { type: String, default: "" },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/**
 * Obtiene el modelo de Mongoose vinculado a la colección específica del cliente
 */
const getProductModel = (dbPrefix) => {
  const collectionName = `${dbPrefix}_chamber_products`;

  // Conectamos a la base de datos de producción 'tracesync_tenant'
  const tenantDb = mongoose.connection.useDb("tracesync_tenant");

  // Si Mongoose ya compiló este modelo específico para este prefijo, lo reutilizamos
  if (tenantDb.models[collectionName]) {
    return tenantDb.models[collectionName];
  }

  // Si no existe, lo creamos dinámicamente apuntando a su colección física
  return tenantDb.model(collectionName, BaseProductSchema, collectionName);
};

module.exports = {
  getProductModel,
};
