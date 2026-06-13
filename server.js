/*require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");

const PORT = process.env.PORT || 4000;
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error(
    "🚨 [CRÍTICO] No se ha definido la variable de entorno MONGO_URI",
  );
}

/*app.listen(PORT, () => {
  console.log(`🚀 Servidor en modo local iniciado en http://localhost:${PORT}`);
});//

async function startServer() {
  try {
    console.log("⏳ Conectando a MongoDB Atlas con Mongoose...");

    // 1. Conectamos Mongoose de manera asíncrona y esperamos a que sea exitoso
    await mongoose.connect(mongoURI);
    console.log(
      "💾 [MONGO] Conexión establecida con éxito a la base de datos.",
    );

    // 2. Una vez conectados a la base de datos con éxito, levantamos el servidor Express
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ ERROR CRÍTICO AL ARRANCAR EL SERVIDOR:", error);
    process.exit(1);
  }
}

startServer();*/

require("dotenv").config();
const connectDB = require("./src/config/mongoose");
const app = require("./src/app");

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB(); // Espera a conectar antes de escuchar

  app.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
  });
}

start();
