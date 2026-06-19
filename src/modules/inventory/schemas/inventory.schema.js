const { z } = require("zod");

// Esquemas para los datos temporales de los recuentos

const BatchLineSchema = z.object({
  batch: z.string().nullable().optional().or(z.literal("")),
  quantity: z.number().nonnegative(),
  crates: z.number().nonnegative(),
  looseUnits: z.number().nonnegative(),
  packingDate: z.string().nullable().optional(),
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

const QueryIdSchema = z.object({
  tenantId: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD"),
  id: z.string().min(1),
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
  category: z.string(),
  subcategory: z.string().optional(),
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

// Esquemas para BatchDetail

const BatchDetailItemSchema = z.object({
  alternativeDescription: z.string().optional(),
  id: z.string().min(1),
  unitsPerCrate: z.number().nonnegative().optional().nullable(),
  batchLines: z.array(BatchLineSchema).default([]),
});

const BatchDetailSchema = z.object({
  tenantId: z.string(),
  date: z.string(),
  operator: z.string().optional(),
  product: BatchDetailItemSchema,
});

// Esquemas para guardar los recuentos temporales

const SaveTemporaryCountSchema = z.object({
  tenantId: z.string().min(1),
  productId: z.string().min(1),
  countDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  batchLines: z.array(BatchLineSchema),
  updatedAt: z.string().datetime().optional(),
  operator: z.string().optional(),
});

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body); // Sobrescribe el body con los datos validados
    next();
  } catch (error) {
    return res
      .status(400)
      .json({ error: "Datos de cuerpo inválidos", details: error.issues });
  }
};

// Esquemas para guardar los recuentos finalizados

const BatchLineFinalSchema = z.object({
  batch: z.string(),
  crates: z.number().int().nonnegative(),
  elapsedDays: z.number().int().nonnegative(),
  looseUnits: z.union([z.number().int(), z.string()]),
  packingDate: z.string(),
  quantity: z.number().int().nonnegative(),
});

// 2. Luego la pieza intermedia (ProductFinalizationSchema) que usa BatchLineFinalSchema
/*const ProductFinalizationSchema = z.object({
  productId: z.string(),
  batchLines: z.array(BatchLineFinalSchema),
});

// 3. Finalmente el contrato principal (FinalizeInventoryPayloadSchema) que usa ProductFinalizationSchema
const FinalizeInventoryPayloadSchema = z.object({
  tenantId: z.string().min(1),
  countDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operatorName: z.string().min(1),
  products: z.array(ProductFinalizationSchema), 
  comments: z.string().optional().default(""),
});*/

const FinalizeInventorySchema = z.object({
  //tenantId: z.string().min(1),
  countDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  operatorName: z.string().min(1),
  //products: z.array(ProductFinalizationSchema),
  comments: z.string().optional(),
});

module.exports = {
  InventorySchema,
  HomeSummarySchema,
  QuerySchema,
  QueryIdSchema,
  validateQuery,
  DayStatusQuerySchema,
  DayStatusResponseSchema,
  BatchDetailItemSchema,
  BatchDetailSchema,
  SaveTemporaryCountSchema,
  validateBody,
  FinalizeInventorySchema,
};
