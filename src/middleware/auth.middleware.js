const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Obtenemos el token del header Authorization
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato: "Bearer TOKEN"

  if (!token)
    return res
      .status(401)
      .json({ message: "Acceso denegado: Token no proporcionado" });

  console.log(
    "🔍 [DEBUG] LLAVE USADA PARA VERIFICAR:",
    process.env.JWT_SECRET || "supersecreto",
  );

  /*jwt.verify(token, process.env.JWT_SECRET || "supersecreto", (err, user) => {
    if (err)
      return res.status(403).json({ message: "Token inválido o expirado" });
    req.user = user; // Guardamos el usuario para usarlo en el controlador
    next();
  });*/

  jwt.verify(token, process.env.JWT_SECRET || "supersecreto", (err, user) => {
    if (err) {
      // ESTO NOS DIRÁ SI ES UN PROBLEMA DE FIRMA O DE EXPIRACIÓN
      console.error("❌ [ERROR AUTH]:", err.message);
      console.error("🔍 [DEBUG] Token recibido:", token);
      return res
        .status(403)
        .json({ message: "Token inválido o expirado", details: err.message });
    }
    req.user = user;
    next();
  });
};
