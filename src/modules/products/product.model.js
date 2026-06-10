const mongoose = require("mongoose");

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
    tenantId: { type: String, required: true },
  },
  {
    collection: "mp_chamber_products",
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  },
);

// Índice compuesto para acelerar las búsquedas por planta y orden de catálogo
ProductSchema.index({ tenantId: 1, visible: 1, sortOrder: 1 });

module.exports = mongoose.model("Product", ProductSchema);
