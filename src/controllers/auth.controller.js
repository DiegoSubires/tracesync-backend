const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

/*const { getDbGlobal, getDbOperation } = require("../config/db");

exports.login = async (req, res) => {
  console.log("\n=========================================");
  console.log("📥 [LOGIN] Nueva petición recibida en /api/login");

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    const dbOperation = getDbOperation();
    const dbGlobal = getDbGlobal();

    if (!dbOperation || !dbGlobal) {
      return res
        .status(500)
        .json({ error: "Error de conexión interna a las bases de datos" });
    }

    // Buscar usuario en tracesync_operation
    const user = await dbOperation
      .collection("users")
      .findOne({ email: email });
    if (!user) {
      return res
        .status(401)
        .json({ error: "El correo electrónico no está registrado." });
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    // Buscar metadatos del Tenant en la tabla global
    const tenant = await dbGlobal
      .collection("tenant_list")
      .findOne({ tenantId: user.tenantId });

    // Cargar y filtrar aplicaciones
    const allApps = await dbGlobal
      .collection("app_registry")
      .find({})
      .toArray();
    const allowedApps = allApps.filter(
      (app) =>
        user.role === "admin" ||
        app.appId === user.group ||
        user.group === "todos",
    );

    // Firmar JWT
    const token = jwt.sign(
      {
        userId: user._id,
        tenantId: user.tenantId,
        role: user.role,
        group: user.group,
      },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "365d" },
    );

    console.log(`✅ [LOGIN] Autenticación exitosa para: ${user.email}`);
    console.log("=========================================\n");

    // Retornamos la estructura exacta que tus servicios y mapeos necesitan
    return res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        group: user.group,
      },
      tenant: {
        tenantId: user.tenantId,
        businessName: tenant ? tenant.businessName : "TraceSync Partner",
        // Pasamos el string base64 de la BD al campo logoUrl que espera el front
        logoUrl: tenant ? tenant.logoBase64 || tenant.logoUrl : "",
      },
      apps: allowedApps,
    });
  } catch (err) {
    console.error("💥 [LOGIN] Error:", err);
    return res
      .status(500)
      .json({ error: "Error interno en el servidor central de TraceSync." });
  }
};

exports.verifyOperator = async (req, res) => {
  console.log("\n=========================================");
  console.log(
    "📥 [VERIFY OPERATOR] Petición recibida en /api/operators/verify",
  );
  console.log("📦 [VERIFY OPERATOR] Body recibido:", JSON.stringify(req.body));

  try {
    const { pin, appId } = req.body;
    const pinRecibido = pin ? String(pin).trim() : "";
    const appIdRecibido = appId ? String(appId).trim().toLowerCase() : "";

    const dbOperation = getDbOperation();

    if (!dbOperation) {
      return res.status(500).json({ error: "Fallo de conexión en planta" });
    }

    // 1. Recuperamos todos los operarios para poder verificar el hash de Bcrypt
    const operators = await dbOperation
      .collection("operators")
      .find({})
      .toArray();

    let verifiedOperator = null;

    for (const op of operators) {
      if (!op.pin) continue;

      // Comparamos el PIN en texto plano con el hash de la BD
      const match = await bcrypt.compare(pinRecibido, op.pin);
      if (match) {
        verifiedOperator = op;
        break;
      }
    }

    // Si no coincide ningún Bcrypt, cambiamos a 401 (Credenciales incorrectas)
    if (!verifiedOperator) {
      console.log(`❌ [VERIFY OPERATOR] PIN incorrecto.`);
      console.log("=========================================\n");
      return res.status(401).json({
        error: "El PIN introducido no pertenece a ningún operario activo.",
      });
    }

    // 2. 🔒 CONTROL DE ACCESO INDUSTRIAL ADAPTATIVO MULTI-APP (Recuperado)
    const dbAllowedApps = verifiedOperator.allowedApps;
    let hasPermission = false;

    if (Array.isArray(dbAllowedApps)) {
      const cleanArray = dbAllowedApps.map((app) =>
        String(app).trim().toLowerCase(),
      );
      hasPermission =
        cleanArray.includes("todos") || cleanArray.includes(appIdRecibido);
    } else if (typeof dbAllowedApps === "string") {
      const cleanString = dbAllowedApps.trim().toLowerCase();
      hasPermission = cleanString === "todos" || cleanString === appIdRecibido;
    }

    // Si el operario existe pero no tiene permisos para esta app específica
    if (!hasPermission) {
      console.log(
        `🚫 [VERIFY OPERATOR] Acceso denegado a la app para: ${verifiedOperator.fullName || verifiedOperator.name}`,
      );
      console.log("=========================================\n");
      return res.status(403).json({
        error: `Acceso denegado. ${verifiedOperator.fullName || verifiedOperator.name} no tiene permisos asignados para acceder a este módulo de planta.`,
      });
    }

    console.log(
      `✅ [VERIFY OPERATOR] Operario verificado con éxito: ${verifiedOperator.fullName || verifiedOperator.name}`,
    );
    console.log("=========================================\n");

    // 3. Respuesta exitosa estructurada para el estado del frontend
    return res.json({
      name: verifiedOperator.fullName || verifiedOperator.name,
      role: verifiedOperator.role || "Operario",
      tenantId: verifiedOperator.tenantId,
    });
  } catch (err) {
    console.error("💥 [VERIFY OPERATOR] Error:", err);
    return res.status(500).json({ error: "Error al verificar operario" });
  }
};*/

exports.login = async (req, res) => {
  console.log("\n=========================================");
  console.log("📥 [LOGIN] Nueva petición recibida en /api/login");

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    // 👈 2. Reemplazo seguro: Si Mongoose está conectado, accedemos bajo demanda a las bases de datos
    if (mongoose.connection.readyState !== 1) {
      console.error("⏳ [MONGO] La conexión principal no está lista todavía.");
      return res.status(500).json({
        error:
          "El servidor de base de datos se está iniciando. Reintenta en unos segundos.",
      });
    }

    // Acceso directo usando .useDb con caché nativo de Mongoose
    const dbOperation = mongoose.connection.useDb("tracesync_operation", {
      useCache: true,
    });
    const dbGlobal = mongoose.connection.useDb("tracesync_global", {
      useCache: true,
    });

    // Buscar usuario en tracesync_operation
    const user = await dbOperation
      .collection("users")
      .findOne({ email: email });
    if (!user) {
      return res
        .status(401)
        .json({ error: "El correo electrónico no está registrado." });
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    // Buscar metadatos del Tenant en la tabla global
    const tenant = await dbGlobal
      .collection("tenant_list")
      .findOne({ tenantId: user.tenantId });

    // Cargar y filtrar aplicaciones
    const allApps = await dbGlobal
      .collection("app_registry")
      .find({})
      .toArray();
    const allowedApps = allApps.filter(
      (app) =>
        user.role === "admin" ||
        app.appId === user.group ||
        user.group === "todos",
    );

    // Firmar JWT - Tu configuración de '365d' ya está perfecta aquí 🎯
    const token = jwt.sign(
      {
        userId: user._id,
        tenantId: user.tenantId,
        role: user.role,
        group: user.group,
      },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "365d" },
    );

    console.log(`✅ [LOGIN] Autenticación exitosa para: ${user.email}`);
    console.log("=========================================\n");

    return res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        group: user.group,
      },
      tenant: {
        tenantId: user.tenantId,
        businessName: tenant ? tenant.businessName : "TraceSync Partner",
        logoUrl: tenant ? tenant.logoBase64 || tenant.logoUrl : "",
      },
      apps: allowedApps,
    });
  } catch (err) {
    console.error("💥 [LOGIN] Error real:", err); // 👈 3. Esto imprimirá el error real en Render si algo más falla
    return res
      .status(500)
      .json({ error: "Error interno en el servidor central de TraceSync." });
  }
};
