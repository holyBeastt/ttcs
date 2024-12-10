const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();
const session = require("express-session");
const login = require("./routes/loginRoute");
//const importFile = require("./routes/importRoute");
//console.log("> check env: ", process.env);

// Connect to database
const connection = require("./config/database");

// config engine template
const configViewEngine = require("./config/viewEngine");

// Cấu hình đường dẫn routes
const webRoutes = require("./routes/web");
const createGvmRoutes = require("./routes/createGvmRoute");
const gvmListRoutes = require("./routes/gvmListRoute");
const updateGvm = require("./routes/updateGvmRoute");
const classInfoGvm = require("./routes/classInfoGvmRoute");
const importGvmList = require("./routes/importGvmListRoute");
const infoHDGvmRoutes = require("./routes/infoHDGvmRoute");
const adminRoute = require("./routes/adminRoute");
const xemCacLopGvmRoute = require("./routes/xemCacLopGvmRoute");
const phuLucHDRoute = require("./routes/phuLucHDRoute");
const exportHDRoute = require("./routes/exportHDRoute");
const logRoute = require("./routes/logRoute");
const xemCacLopMoiRoute = require("./routes/xemCacLopMoiRoute");
const vuotGioAddClassRoute = require("./routes/vuotGioAddClassRoute");
const vuotGioExportRoute = require("./routes/vuotGioExportRoute");
const vuotGioImportDoAnRoute = require("./routes/vuotGioImportDoAnRoute");
const vuotGioSoTietDMRouter = require("./routes/vuotGioSoTietDMRoute");
const vuotGioExportDoAnRoute = require("./routes/vuotGioExportDoAnRoute");
const thongkemgRoute = require("./routes/thongkemgRoute");
const thongkenckhRoute = require("./routes/thongkenckhRoute");
const thongkedoanRoute = require("./routes/thongkedoanRoute");
const suaHDRoute = require("./routes/suaHDRoute");

const app = express();
const port = process.env.port || 8888;
const hostname = process.env.HOST_NAME;

app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// config engine template
configViewEngine(app);

// cấu hình session cho login
//app.use(express.urlencoded({ extended: true }));
// app.use(
//   session({
//     secret: "your_secret_key",
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false }, // set secure: true nếu bạn sử dụng HTTPS
//   })
// );

// Thiết lập session trong Express
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    // Đặt true nếu bạn sử dụng HTTPS
    cookie: { maxAge: 86400000 }, // Session sẽ hết hạn sau 1 ngày không hoạt động

    // cookie: { secure: true, maxAge: 6000000 }, // Session sẽ hết hạn sau 100 phút không hoạt động
  })
);

// config res.body
//app.use(express.json()); // for json
//app.use(express.urlencoded({ extended: true })); // for form data

// Khai bao route
app.use("/", webRoutes);
app.use("/", login);
app.use("/", createGvmRoutes);
app.use("/", gvmListRoutes);
app.use("/", updateGvm);
app.use("/", classInfoGvm);
app.use("/", importGvmList);
app.use("/", infoHDGvmRoutes);
app.use("/", adminRoute);
app.use("/", phuLucHDRoute);
app.use("/", exportHDRoute);
app.use("/", logRoute);
app.use("/", xemCacLopGvmRoute);
app.use("/", xemCacLopMoiRoute);
app.use("/", vuotGioAddClassRoute);
app.use("/", vuotGioExportRoute);
app.use("/", vuotGioImportDoAnRoute);
app.use("/", vuotGioSoTietDMRouter);
app.use("/", vuotGioExportDoAnRoute);
app.use("/", thongkemgRoute);
app.use("/", thongkenckhRoute);
app.use("/", thongkedoanRoute);
app.use("/", suaHDRoute);


app.listen(port, hostname, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Phục vụ các file tĩnh từ thư mục node_modules
app.use(express.static(path.join(__dirname, "../node_modules")));
app.use(express.static(path.join(__dirname, "public/images")));

// == src of L ==
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public/js"))); // cấu hình tệp js
// app.use(express.static(path.join(__dirname, "public"))); // cấu hình tệp js

//app.use(express.json()); // Thêm dòng này để xử lý JSON

const importFile = require("./routes/importRoute");
const infoGvm = require("./routes/infoRoute");
const tableQc = require("./routes/gvmRoute");
const xoaQCDK = require("./routes/qcdkRoute");
const nckhRoute = require("./routes/nckhRoute");

app.use("/", importFile); // cấu hình import
app.use("/", infoGvm); // cấu hình import
app.use("/", tableQc); // cấu hình import
app.use("/", xoaQCDK);
app.use("/", nckhRoute);

// Thay đổi giới hạn kích thước payload (ví dụ: 10mb)
