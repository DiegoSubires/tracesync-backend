// src/config/db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);

let dbGlobal = null;
let dbTenantInstance = null;
let dbOperation = null;

async function connectDB() {
  try {
    await client.connect();
    dbOperation = client.db("tracesync_operation");
    dbGlobal = client.db("tracesync_global");
    dbTenantInstance = client.db("tracesync_tenant");
    console.log(
      "⚡ Conectado con éxito a MongoDB Atlas (Global, Tenant, Operation)",
    );
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error);
    process.exit(1);
  }
}

// Helper functions para obtener las instancias activas de base de datos
const getDbGlobal = () => dbGlobal;
const getDbTenant = () => dbTenantInstance;
const getDbOperation = () => dbOperation;

module.exports = { connectDB, getDbGlobal, getDbTenant, getDbOperation };
