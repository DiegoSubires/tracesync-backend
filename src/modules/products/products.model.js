const mongoose = require("mongoose");
const { getTenantModel } = require("../../config/tenantConnection");

const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    alternativeDescription: { type: String, default: "" },
    category: { type: String, required: true },
    subcategory: { type: String, default: "" },
    visible: { type: Boolean, default: true },
    unitsPerRack: { type: Number, default: 0 },
    traysPerCrate: { type: Number, default: 0 },
    unitsPerRod: { type: Number, default: 0 },
    countType: { type: String, default: "Fresco" },
    unitsPerTray: { type: Number, default: 0 },
    unitsPerBox: { type: Number, default: 0 },
    unitsPerCrate: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  },
);

/**
 * Función puente que solicita la creación del modelo al gestor de infraestructura
 */
const getProductModelByTenant = (dbPrefix) => {
  // Le pasamos el prefijo, la parte fija del nombre de la colección y su esquema local
  return getTenantModel(dbPrefix, "chamber_products", ProductSchema);
};

module.exports = { getProductModelByTenant };
