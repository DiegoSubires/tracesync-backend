require("dotenv").config();

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
