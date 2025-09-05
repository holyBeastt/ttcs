const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '../.env') });
const session = require("express-session");
const login = require("./routes/loginRoute");
const configViewEngine = require("./config/viewEngine");
// Middleware for constants
const constantsMiddleware = require("./middlewares/constantsMiddleware");


const app = express();
const port = process.env.port || 8888;
const hostname = process.env.HOST_NAME;

// Thiết lập MIME types tường minh
express.static.mime.define({'text/css': ['css']});
express.static.mime.define({'application/javascript': ['js']});

app.use(constantsMiddleware);
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
configViewEngine(app);


// Thiết lập session trong Express
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    rolling: true, // Gia hạn mỗi request
    // Đặt true nếu bạn sử dụng HTTPS
    cookie: { maxAge: 3600000 }, // Session sẽ hết hạn sau 1 giờ không hoạt động
  })
);

// cấu hình file tĩnh
app.use(express.static(path.join(__dirname, "../node_modules")));
app.use(express.static(path.join(__dirname, "public/images")));
app.use(express.static(path.join(__dirname, "public/js"))); // tệp js
app.use(express.static(path.join(__dirname, "public/css"))); // css

// cấu hình ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// cấu hình phiên
app.use("/", login);
app.use((req, res, next) => {
  const publicRoutes = ["/", "/login"];
  
  // Bỏ qua xác thực cho các file static (CSS, JS, images, etc.)
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|svg)$/i)) {
    return next();
  }

  // Nếu session không tồn tại & route hiện tại không thuộc danh sách public => Chuyển hướng đến /login
  if (!req.session.userId && !publicRoutes.includes(req.path)) {
    return res.redirect("/?sessionExpired=true");
    //return res.redirect("/");
  }

  next(); // Tiếp tục xử lý route tiếp theo nếu session hợp lệ
});

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
const vuotGioSoTietDMRouter = require("./routes/vuotGioSoTietDMRoute");
const vuotGioCuoiKyRoute = require("./routes/vuotGioCuoiKyRoute");
const thongkemgRoute = require("./routes/thongkemgRoute");
const thongkenckhRoute = require("./routes/thongkenckhRoute");
const thongkedoanRoute = require("./routes/thongkedoanRoute");
const suaHDRoute = require("./routes/suaHDRoute");
const thongkevuotgioRoute = require("./routes/thongkevuotgioRoute");
const thongketonghopRoute = require("./routes/thongketonghopRoute");
const thongkeChiTietMGRoute = require("./routes/thongkeChiTietMGRoute");
const backupRoute = require("./routes/backupRoute");
const tongHopGvmExportRoute = require("./routes/tongHopGvmExportRoute");
const soHopDong = require("./routes/hopdong.soHopDongRoute");
const duyetHopDongMoiGiang = require("./routes/hopdong.duyetHopDongMoiGiangRoute");
const duyetHopDongDoAn = require("./routes/hopdong.duyetHopDongDoAnRoute");
const previewHopDong = require("./routes/hopdong.previewRoute");
const chinhSuaQuyChuanRoute = require("./routes/chinhSuaQuyChuanRoute");
const chinhSuaDoAnRoute = require("./routes/chinhSuaDoAnRoute");

// Phần admin
const adminThemFileHocPhanRoute = require("./routes/adminThemFileHocPhanRoute");
const adminPhongHocRoute = require("./routes/adminPhongHocRoute");

// Phần thời khóa biểu
const TKBRoute = require("./routes/TKBRoute");
const TKBImportRoute = require("./routes/TKBImportRoute");

// Phần đồ án
const vuotGioImportDoAnRoute = require("./routes/vuotGioImportDoAnRoute");
const doAnRoute = require("./routes/doAnRoute");
const vuotGioDoAnDuKienRoute = require("./routes/vuotGioDoAnDuKienRoute");
const doAnHopDongDuKienRoute = require("./routes/doAnHopDongDuKienRoute");
const exportPhuLucDARoute = require("./routes/exportPhuLucDARoute");
const hopDongDARoute = require("./routes/hopDongDARoute");

const phongHocRoute = require("./routes/phongHocRoute");
const uyNhiemChiRoute = require("./routes/uyNhiemChiRoute");

const importFile = require("./routes/importRoute");
const infoGvm = require("./routes/infoRoute");
const tableQc = require("./routes/gvmRoute");
const xoaQCDK = require("./routes/qcdkRoute");
const nckhRoute = require("./routes/nckhRoute");
const { backupDatabase } = require("./controllers/backupController");


// Khai bao route
app.use("/", webRoutes);
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
app.use("/", vuotGioSoTietDMRouter);
app.use("/", thongkemgRoute);
app.use("/", thongkenckhRoute);
app.use("/", thongkedoanRoute);
app.use("/", suaHDRoute);
app.use("/", exportPhuLucDARoute);
app.use("/", thongkevuotgioRoute);
app.use("/", thongketonghopRoute);
app.use("/", thongkeChiTietMGRoute);
app.use("/", backupRoute);
app.use("/", tongHopGvmExportRoute);
app.use("/", soHopDong);
app.use("/", duyetHopDongMoiGiang);
app.use("/", duyetHopDongDoAn);
app.use("/", previewHopDong);
app.use("/", vuotGioCuoiKyRoute);

app.use("/", chinhSuaQuyChuanRoute);
app.use("/", chinhSuaDoAnRoute);

// Phần admin
app.use("/", adminThemFileHocPhanRoute);
app.use("/", adminPhongHocRoute);

// Phần thời khóa biểu
app.use("/", TKBRoute);
app.use("/", TKBImportRoute);

// Phần đồ án
app.use("/", doAnRoute);
app.use("/", vuotGioImportDoAnRoute);
app.use("/", vuotGioDoAnDuKienRoute);
app.use("/", doAnHopDongDuKienRoute);
app.use("/", hopDongDARoute);

// Thêm route mới
app.use("/", phongHocRoute);
app.use("/uy-nhiem-chi", uyNhiemChiRoute);


app.use("/", importFile); // cấu hình import
app.use("/", infoGvm); // cấu hình import
app.use("/", tableQc); // cấu hình import
app.use("/", xoaQCDK);
app.use("/", nckhRoute);

app.listen(port, hostname, () => {
  console.log(`Server running on http://localhost:${port}`);
});