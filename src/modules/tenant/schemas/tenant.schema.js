const { z } = require("zod");

// Validamos que el tenantId sea un string no vacío
const TenantParamsSchema = z.object({
  tenantId: z.string().min(1, "El ID del tenant es obligatorio"),
});

// Middleware de validación para parámetros de ruta
const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success)
    return res.status(400).json({ error: result.error.errors });
  next();
};

module.exports = { TenantParamsSchema, validateParams };
