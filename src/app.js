const express = require("express");
const cors = require("cors");
const apiRouter = require("./routes/index");

const app = express();

/*app.use((req, res, next) => {
  console.log(`\n📢 [PETICIÓN ENTRANTE] ${req.method} a la ruta: ${req.url}`);
  console.log(
    `🌐 Origen detectado por el servidor: ${req.headers.origin || "No trae header origin"}`,
  );
  next();
});*/

const whitelist = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://diegosubires.github.io",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // Ahora 'whitelist' ya existirá perfectamente aquí
    if (whitelist.indexOf(origin) !== -1 || origin.endsWith(".loca.lt")) {
      callback(null, true);
    } else {
      console.error(`❌ [CORS BLOCKED] Origen denegado: ${origin}`);
      callback(new Error(`Origen ${origin} no permitido`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "bypass-tunnel-reminder",
  ],
  credentials: true,
  optionsSuccessStatus: 200, // Responde OK a las peticiones preflight OPTIONS
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  console.log(`\n📢 [PETICIÓN ENTRANTE] ${req.method} a la ruta: ${req.url}`);
  console.log(
    `🌐 Origen detectado por el servidor: ${req.headers.origin || "Sin origen (Directo/Postman)"}`,
  );
  next();
});

app.use(express.json());

// Inyectamos todas las combinaciones de rutas bajo el prefijo global /api
app.use("/api", apiRouter);

module.exports = app;
