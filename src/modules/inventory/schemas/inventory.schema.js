const { z } = require("zod");

const BatchLineSchema = z.object({
  batch: z.string().optional(),
  quantity: z.number().nonnegative(),
  crates: z.number().nonnegative(),
  looseUnits: z.number().nonnegative(),
  packingDate: z.string().nullable(), // o z.date()
  elapsedDays: z.number().int(),
});

const InventorySchema = z.object({
  _id: z.string(),
  countDate: z.string(),
  productId: z.string(),
  batchLines: z.array(BatchLineSchema),
  tenantId: z.string(),
  updatedAt: z.string(),
});

const QuerySchema = z.object({
  tenantId: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD"),
});

// Middleware genérico para usarlo en tus rutas
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) return res.status(400).json(result.error);
  req.query = result.data; // req.query queda tipado y limpio
  next();
};

// Define la estructura de cada producto individual en el resumen
const SummaryItemSchema = z.object({
  productId: z.string(),
  productName: z.string(), // Ej: "HAMBURGUESAS TERN"
  category: z.string().optional(), // Ej: "GRANEL", "PEQUEÑA", "CURADOS"
  totalQuantity: z.number().nonnegative(), // El total sumado (Ej: 106)
  totalCrates: z.number().nonnegative(), // Total de cajas si lo necesitas
});

const HomeSummarySchema = z.object({
  tenantId: z.string(),
  date: z.string(),
  summary: z.array(SummaryItemSchema), // El array con todos los productos calculados
});

module.exports = {
  InventorySchema,
  HomeSummarySchema,
  QuerySchema,
  validateQuery,
};
