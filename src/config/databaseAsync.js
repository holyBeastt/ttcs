const mysql = require("mysql2/promise");
require("dotenv").config();

async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });
  return connection;
}

module.exports = createConnection;
