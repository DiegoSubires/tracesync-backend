const { z } = require("zod");

// Esquema de query por si filtras por planta
const ProductQuerySchema = z.object({
  tenantId: z.string().min(1, "El tenantId es obligatorio"),
});

// Contrato optimizado para los artículos de la Home
const HomeCatalogItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  alternativeDescription: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  visible: z.boolean(),
  sortOrder: z.number().int(),
});

// El esquema final es un array de estos artículos maestros
const HomeCatalogSchema = z.array(HomeCatalogItemSchema);

module.exports = {
  ProductQuerySchema,
  HomeCatalogSchema,
};
