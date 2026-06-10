const mongoose = require("mongoose");

/**
 * Factoría global para obtener modelos dinámicos basados en prefijos.
 * @param {string} dbPrefix - Prefijo del tenant (ej: 'mp')
 * @param {string} baseCollectionName - Nombre base de la colección (ej: 'chamber_products')
 * @param {mongoose.Schema} schema - El esquema de Mongoose del módulo correspondiente
 */
const getTenantModel = (dbPrefix, baseCollectionName, schema) => {
  const fullCollectionName = `${dbPrefix}_${baseCollectionName}`;

  // Apuntamos a la base de datos de producción multi-tenant
  const tenantDb = mongoose.connection.useDb("tracesync_tenant");

  // Si Mongoose ya compiló este modelo específico, lo reutilizamos para no duplicar memoria
  if (tenantDb.models[fullCollectionName]) {
    return tenantDb.models[fullCollectionName];
  }

  // Registramos el modelo dinámicamente inyectando el esquema que viene del módulo
  return tenantDb.model(fullCollectionName, schema, fullCollectionName);
};

module.exports = { getTenantModel };
