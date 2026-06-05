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
  // 1. Garantizar conexiones a Atlas antes de abrir el puerto
  await connectDB();

  // 2. Escuchar peticiones
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor TraceSync corriendo en http://localhost:${PORT}`);

    // 3. Levantar el túnel seguro (solo en entorno de desarrollo/pruebas)
    if (process.env.NODE_ENV !== "production") {
      const localtunnel = require("localtunnel");

      // Personaliza este subdominio para que sea único (ej: tracesync-mp-tuapellido)
      const SUBDOMINIO_DESEADO = "tracesync-backend-dev";

      const iniciarTunelResiliente = async () => {
        try {
          console.log(
            `🔌 Intentando abrir túnel seguro en: https://${SUBDOMINIO_DESEADO}.localtunnel.me...`,
          );

          const tunnel = await localtunnel({
            port: PORT,
            subdomain: SUBDOMINIO_DESEADO,
          });

          console.log(
            `🌐 ¡Túnel activo! Tu servidor es accesible públicamente en: ${tunnel.url}`,
          );

          // CONTROL DE DESCONEXIONES BRUSCAS
          // Si el túnel se cierra por un microcorte, internet inestable o caída del servicio, reconecta en 5 segundos
          tunnel.on("close", () => {
            console.log(
              "🔴 El túnel de Localtunnel se ha cerrado inesperadamente. Reconectando en 5 segundos...",
            );
            setTimeout(iniciarTunelResiliente, 5000);
          });

          tunnel.on("error", (err) => {
            console.error("⚠️ Error detectado en el túnel:", err.message);
          });
        } catch (err) {
          console.error(
            "❌ Error fatal al levantar el túnel, reintentando en 5 segundos...",
            err.message,
          );
          setTimeout(iniciarTunelResiliente, 5000);
        }
      };

      // Lanzamos la primera conexión del túnel
      iniciarTunelResiliente();
    }
  });
}

startServer();
