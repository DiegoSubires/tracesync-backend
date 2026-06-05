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
    // 1. Garantizar conexiones a Atlas antes de abrir el puerto
    await connectDB();

    // 2. Escuchar peticiones en el puerto asignado
    app.listen(PORT, () => {
      console.log(
        `🚀 Servidor TraceSync corriendo de forma estable en el puerto ${PORT}`,
      );
    });
  } catch (error) {
    console.error("❌ Error fatal al iniciar el servidor:", error);
    process.exit(1);
  }
}

startServer();
