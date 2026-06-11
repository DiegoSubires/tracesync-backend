const { z } = require("zod");

// Esquemas para los datos temporales de los recuentos

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
const HomeSummaryItemSchema = z.object({
  alternativeDescription: z.string().optional(),
  id: z.string(),
  totalQuantity: z.number().nonnegative(),
});

const HomeSummarySchema = z.object({
  tenantId: z.string(),
  date: z.string(),
  summary: z.array(HomeSummaryItemSchema),
});

// Esquemas para la nueva colección de day_status

const DayStatusQuerySchema = z.object({
  tenantId: z.string({ required_error: "El tenantId es obligatorio" }).min(1),
  date: z
    .string({ required_error: "La fecha es obligatoria" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD"),
});

const DayStatusResponseSchema = z.object({
  finalized: z.boolean(),
});

module.exports = {
  InventorySchema,
  HomeSummarySchema,
  QuerySchema,
  validateQuery,
  DayStatusQuerySchema,
  DayStatusResponseSchema,
};
