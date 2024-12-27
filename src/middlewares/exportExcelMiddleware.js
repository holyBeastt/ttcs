const express = require('express');
const app = express();

// Sử dụng middleware mặc định của Express.js để xử lý yêu cầu GET đến /gvm/export-excel
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Định nghĩa route cho /gvm/export-excel
app.use("/gvm", gvmList);