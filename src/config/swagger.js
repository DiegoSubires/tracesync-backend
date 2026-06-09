// src/config/swagger.js
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TraceSync Inventory API",
      version: "1.0.0",
      description: "Documentación de la API de Inventario",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000/api",
        description: "API",
      },
    ],
  },
  // AQUÍ es donde le dices que busque los comentarios dentro de tu módulo
  apis: ["./src/modules/inventory/inventory.routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
