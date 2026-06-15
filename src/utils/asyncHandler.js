// src/utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("💥 [AsyncHandler Error]:", error);

    // Aquí centralizas todas las respuestas de error
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Validación fallida", details: error.issues });
    }

    res
      .status(500)
      .json({ error: "Error interno del servidor", message: error.message });
  });
};

export default asyncHandler;
