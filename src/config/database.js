const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   // password: process.env.DB_PASSWORD,
//   port: 3306,
//   database: "23_9",
// });

module.exports = connection;
