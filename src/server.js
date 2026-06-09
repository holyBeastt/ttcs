const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
// require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, '../.env') });
const session = require("express-session");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const login = require("./routes/loginRoute");
//const importFile = require("./routes/importRoute");

const fs = require("fs");

const exportDir = path.join(__dirname, "public", "exports");

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// config engine template
const configViewEngine = require("./config/viewEngine");

// Middleware for constants
const constantsMiddleware = require("./middlewares/constantsMiddleware");

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
const thongkemgRoute = require("./routes/thongkemgRoute");
const thongkenckhRoute = require("./routes/thongkenckhRoute");
const thongkedoanRoute = require("./routes/thongkedoanRoute");
const thongkemonhocRoute = require("./routes/thongkemonhocRoute");
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
const teachingInfoExportRoute = require("./routes/teachingInfoExportRoute");
const doanExportRoute = require("./routes/doanExportRoute");
const vuotGioSoTietDMRouter = require("./routes/vuotGioSoTietDMRoute");


// Phần admin
const adminThemFileHocPhanRoute = require("./routes/adminThemFileHocPhanRoute");
const adminPhongHocRoute = require("./routes/adminPhongHocRoute");

// Phần thời khóa biểu
const TKBRoute = require("./routes/TKBRoute");
const TKBImportRoute = require("./routes/TKBImportRoute");

// Phần đồ án
const vuotGioImportDoAnRoute = require("./routes/vuotGioImportDoAnRoute");
const doAnRoute = require("./routes/doAnRoute");
const doAnHopDongDuKienRoute = require("./routes/doAnHopDongDuKienRoute");
const exportPhuLucDARoute = require("./routes/exportPhuLucDARoute");
const hopDongDARoute = require("./routes/hopDongDARoute");

const phongHocRoute = require("./routes/phongHocRoute");
const uyNhiemChiRoute = require("./routes/uyNhiemChiRoute");
const kytubatdauKhoaRoute = require("./routes/kytubatdauKhoaRoute");
const syncRoute = require("./routes/syncRoute");

const app = express();
const port = process.env.PORT || 8888;
const hostname = process.env.HOST_NAME;

// Gọi middleware lấy roles và departments
app.use(constantsMiddleware);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());

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
    rolling: true, // Gia hạn mỗi request
    // Đặt true nếu bạn sử dụng HTTPS
    cookie: { maxAge: 3600000 }, // Session sẽ hết hạn sau 1 giờ không hoạt động
  })
);

app.use(express.static(path.join(__dirname, "../node_modules")));
app.use(express.static(path.join(__dirname, "public/images")));
app.use(express.static(path.join(__dirname, "public")));


// == src of L ==
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public/js"))); // tệp js

app.use("/", login);

app.use((req, res, next) => {
  const publicRoutes = ["/", "/login", "/api/mobile/v1/refresh"];
  const isApiRequest = req.path.startsWith('/api/') || req.headers['accept'] === 'application/json';

  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // 1. Try session (standard EJS)
  if (req.session && req.session.userId) {
    return next();
  }

  // 2. Try JWT from HttpOnly Cookie OR Authorization header
  let token = req.cookies && req.cookies.access_token;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(token, secret);
      
      // Populate session-like data from decoded token
      req.session.userId = decoded.userId;
      req.session.username = decoded.username;
      req.session.role = decoded.role;
      req.session.MaPhongBan = decoded.MaPhongBan;
      req.session.isKhoa = decoded.isKhoa;
      req.session.TenNhanVien = decoded.TenNhanVien;
      
      return next();
    } catch (err) {
      console.warn("Invalid JWT:", err.message);
      if (isApiRequest) {
        return res.status(401).json({ message: "Phiên đăng nhập hết hạn hoặc không hợp lệ" });
      }
      res.clearCookie("access_token");
    }
  }

  // Neither session nor valid token
  if (isApiRequest) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
  }
  return res.redirect("/?sessionExpired=true");
});
// config res.body
//app.use(express.json()); // for json
//app.use(express.urlencoded({ extended: true })); // for form data

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
app.use("/", thongkemgRoute);
app.use("/", thongkemonhocRoute);
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
app.use("/", vuotGioSoTietDMRouter);

app.use("/", chinhSuaQuyChuanRoute);
app.use("/", chinhSuaDoAnRoute);
app.use("/", teachingInfoExportRoute);
app.use("/", doanExportRoute);

// Phần admin
app.use("/", adminThemFileHocPhanRoute);
app.use("/", adminPhongHocRoute);

// Phần thời khóa biểu
app.use("/", TKBRoute);
app.use("/", TKBImportRoute);

// Phần đồ án
app.use("/", doAnRoute);
app.use("/", vuotGioImportDoAnRoute);
app.use("/", doAnHopDongDuKienRoute);
app.use("/", hopDongDARoute);

// Thêm route mới
app.use("/", phongHocRoute);
app.use("/uy-nhiem-chi", uyNhiemChiRoute);
app.use("/", kytubatdauKhoaRoute);
app.use("/sync", syncRoute);

// Mobile API Routes
const refreshTokenRoute = require("./routes/refreshTokenRoute");
app.use("/api/mobile/v1", refreshTokenRoute);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://${hostname}:${port}`);
});

// Phục vụ các file tĩnh từ thư mục node_modules

//app.use(express.json()); // Thêm dòng này để xử lý JSON

const importFile = require("./routes/importRoute");
const infoGvm = require("./routes/infoRoute");
const tableQc = require("./routes/gvmRoute");
const xoaQCDK = require("./routes/qcdkRoute");
const nckhV3Route = require("./routes/nckhV3Route");
const vuotGioV2Route = require("./routes/vuotGioV2Route");
const { backupDatabase } = require("./controllers/backupController");


app.use("/", importFile); // cấu hình import
app.use("/", infoGvm); // cấu hình import
app.use("/", tableQc); // cấu hình import
app.use("/", xoaQCDK);
app.use("/v3/nckh", nckhV3Route); // NCKH V3 routes
app.use("/v2/vuotgio", vuotGioV2Route); // VuotGio V2 routes

// Thay đổi giới hạn kích thước payload (ví dụ: 10mb)