/*const app = require("./src/app");
const { connectDB } = require("./src/config/db");

const PORT = process.env.PORT || 4000;

async function startServer() {
  // 1. Garantizar conexiones a Atlas antes de abrir el puerto
  await connectDB();

  // 2. Escuchar peticiones
  app.listen(PORT, () => {
    console.log(`🚀 Servidor TraceSync corriendo en http://localhost:${PORT}`);
  });
}

startServer();*/

const app = require("./src/app");
const { connectDB } = require("./src/config/db");

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    console.log("⏳ Conectando a MongoDB...");
    await connectDB();
    console.log("✅ Conectado a MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    // ESTO ES LO QUE NECESITAMOS VER
    console.error("❌ ERROR CRÍTICO AL ARRANCAR:", error);
    process.exit(1);
  }
}

startServer();
