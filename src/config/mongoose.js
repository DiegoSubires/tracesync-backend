const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    // Si MONGO_URI no existe, fallará rápido
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI no definida en variables de entorno");
    }

    await mongoose.connect(process.env.MONGO_URI);
    const hora = new Date().toLocaleTimeString("es-ES", {
      timeZone: "Europe/Madrid",
      hour12: false, // Formato 24h
    });
    console.log(
      `💾 [MONGOOSE] Conexión establecida a MongoDB Atlas a las ${hora}`,
    );
  } catch (error) {
    console.error("❌ Error fatal conectando a MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
