# Cấu trúc Dự án (Project Structure)

> **Dự án:** TTCS — Hệ thống quản lý giảng dạy & mời giảng  
> **Stack:** Node.js · Express.js · EJS · MySQL2 · AG Grid  
> **Entry point:** `src/server.js` · Port mặc định: `8888`

---

## Cây thư mục tổng quan

```
ttcs/
├── src/                        # Mã nguồn backend chính
│   ├── server.js               # Entry point — khởi động Express, đăng ký middleware & routes
│   ├── config/                 # Cấu hình kết nối & thư viện
│   │   ├── Pool.js             # MySQL connection pool (mysql2/promise)
│   │   ├── databasePool.js     # Pool phụ (dùng cho một số module riêng)
│   │   ├── viewEngine.js       # Cấu hình EJS template engine
│   │   ├── nckh_v3/            # Config riêng cho module NCKH v3
│   │   └── vuotgio_v2/         # Config riêng cho module Vượt giờ v2
│   ├── constants/              # Hằng số toàn cục
│   │   └── moigiang/
│   │       └── errorCodes.constant.js   # [NEW] Mã lỗi module Mời giảng
│   ├── middlewares/            # Express middleware
│   │   ├── constantsMiddleware.js       # Inject APP_ROLES, APP_DEPARTMENTS vào res.locals
│   │   ├── jwtMiddleware.js             # Xác thực JWT token
│   │   ├── adminRoleMiddleware.js       # [NEW] Kiểm tra role ADMIN (server-side session)
│   │   ├── syncAuthMiddleware.js        # Auth cho sync endpoints
│   │   ├── dataLockMiddleware.js        # Kiểm tra trạng thái khóa dữ liệu
│   │   ├── khoaFilterMiddleware.js      # Lọc dữ liệu theo khoa
│   │   └── ...                         # (các middleware upload, export)
│   ├── routes/                 # Định nghĩa router Express
│   │   ├── web.js              # Routes render trang HTML chính
│   │   ├── loginRoute.js       # Đăng nhập / đăng xuất
│   │   ├── adminRoute.js       # Admin CRUD (nhân viên, phòng ban, học phần, ...)
│   │   ├── adminMoiGiangCoreInfoRoute.js  # [NEW] PUT /api/v1/admin/moi-giang/core-info
│   │   ├── TKBRoute.js         # Thời khóa biểu
│   │   ├── gvmRoute.js         # Mời giảng (QCDK)
│   │   ├── nckhV3Route.js      # NCKH v3
│   │   ├── vuotGioV2Route.js   # Vượt giờ v2
│   │   └── ...                 # (50+ route files)
│   ├── controllers/            # Xử lý request → gọi service → trả response
│   │   ├── moigiang/
│   │   │   └── adminCoreInfo.controller.js  # [NEW]
│   │   ├── nckh_v3/
│   │   ├── vuotgio_v2/
│   │   ├── adminController.js
│   │   ├── importController.js
│   │   ├── moiGiangQCDKController.js        # Controller chính của module Mời giảng
│   │   └── ...
│   ├── services/               # Business logic thuần (không phụ thuộc HTTP)
│   │   ├── moigiang/
│   │   │   └── adminCoreInfo.service.js     # [NEW] Optimistic lock + Audit log
│   │   ├── nckh_v3/
│   │   ├── vuotgio_v2/
│   │   ├── save_moigiang/
│   │   ├── gvmServices.js
│   │   ├── logService.js
│   │   └── tkbServices.js
│   ├── repositories/           # Truy vấn DB (tầng data access)
│   │   ├── moigiang/
│   │   │   └── adminCoreInfo.repository.js  # [NEW] Parameterized query + transaction
│   │   ├── nckh_v3/
│   │   ├── vuotgioDuKien/
│   │   └── vuotgio_v2/
│   ├── validators/             # Validate & sanitize dữ liệu đầu vào
│   │   ├── moigiang/
│   │   │   └── adminCoreInfo.validator.js   # [NEW] Validate từng field
│   │   └── nckh_v3/
│   │       └── typeInput.validator.js
│   ├── queries/                # SQL query strings thuần (tách khỏi controller)
│   │   └── hopdongQueries.js
│   ├── helpers/                # Hàm tiện ích nhỏ
│   ├── mappers/                # Ánh xạ dữ liệu (DB → DTO và ngược lại)
│   ├── utils/                  # Các tiện ích dùng chung
│   │   ├── logChanges.js       # Ghi log thay đổi
│   │   └── sql-escape.js       # Escape SQL (phòng injection thủ công)
│   ├── templates/              # File mẫu Word/PDF (docxtemplater)
│   ├── views/                  # EJS template files (giao diện)
│   │   ├── moigiang.thongTinGiangVienSiteKhoa.ejs   # Trang chính mời giảng (ADMIN edit)
│   │   ├── tkb.thoiKhoaBieuChinhThuc.ejs            # Trang TKB (reference AG Grid)
│   │   └── ...
│   └── public/                 # Static files (CSS, JS, images)
│       ├── css/
│       ├── js/
│       └── exports/            # File export tạm thời
├── tests/                      # Kiểm thử tự động
│   └── moigiang/
│       ├── unit/               # Test hàm thuần (không cần DB/server)
│       │   ├── adminCoreInfo.validator.test.js   # [NEW]
│       │   └── adminCoreInfo.service.test.js     # [NEW]
│       ├── integration/        # Test API thực với server
│       │   └── adminCoreInfo.api.test.js         # [NEW]
│       └── regression/         # Đảm bảo API cũ không bị phá vỡ
│           └── adminCoreInfo.regression.test.js  # [NEW]
├── docs/                       # Tài liệu dự án
│   ├── project-structure.md    # File này
│   ├── architecture.md         # Kiến trúc tổng thể
│   ├── moi-giang/
│   │   └── thiet-ke-chinh-sua-thong-tin-giang-day.md
│   ├── business-workflow/
│   └── vuotgio_v2/
├── .env                        # Biến môi trường (không commit)
├── package.json
└── README.md
```

---

## Luồng xử lý Request (Request Lifecycle)

```
Browser / Mobile App
        │
        ▼
    server.js
   ┌──────────────────────────────────┐
   │  1. Global Middleware            │
   │     - cors, cookieParser         │
   │     - bodyParser (JSON, urlenc.) │
   │     - session (express-session)  │
   │     - constantsMiddleware        │
   │       (inject APP_ROLES vào      │
   │        res.locals cho EJS)       │
   │  2. Auth Guard (inline)          │
   │     - Kiểm tra session.userId    │
   │     - Hoặc verify JWT từ cookie  │
   │       / Authorization header     │
   │     - Populate session từ JWT    │
   └──────────────────────────────────┘
        │
        ▼
   Router (route/*.js)
        │
        ▼
   Controller (controllers/*.js)
   ┌──────────────────────────────────┐
   │  - Parse req.body / req.params   │
   │  - Gọi Validator → nếu lỗi      │
   │    trả về 400 ngay               │
   │  - Gọi Service                   │
   │  - Trả về res.json() hoặc       │
   │    res.render() (EJS)            │
   └──────────────────────────────────┘
        │
        ▼
   Service (services/*.js)
   ┌──────────────────────────────────┐
   │  - Business logic thuần          │
   │  - Không import Express          │
   │  - Gọi Repository                │
   │  - Có thể gọi nhiều Repository   │
   │    trong 1 transaction           │
   └──────────────────────────────────┘
        │
        ▼
   Repository (repositories/*.js)
   ┌──────────────────────────────────┐
   │  - Tất cả SQL nằm ở đây          │
   │  - Dùng Parameterized Query      │
   │    (chống SQL Injection)         │
   │  - Dùng Pool.js để lấy           │
   │    connection                    │
   └──────────────────────────────────┘
        │
        ▼
   MySQL Database
```

---

## Cấu trúc Module điển hình

Mỗi module lớn (VD: `moigiang`, `nckh_v3`, `vuotgio_v2`) đều có cấu trúc nhất quán:

```
Module: [ten-module]/
├── routes/         → Khai báo endpoint HTTP
├── controllers/    → Tiếp nhận request, delegate sang service
├── services/       → Business logic
├── repositories/   → Data access layer (SQL)
├── validators/     → Validate đầu vào
└── constants/      → Error codes, enums
```

---

## Cấu trúc Auth & Session

| Nguồn | Cơ chế | Khi nào dùng |
|---|---|---|
| EJS Web App | `express-session` → `req.session.userId`, `req.session.role` | Khi user đăng nhập qua form truyền thống |
| Mobile / API Client | JWT trong HttpOnly Cookie hoặc `Authorization: Bearer` header | Mobile app, Postman, đối tác API |
| Hybrid | JWT được decode và populate vào `req.session` tự động | Hiện tại dự án hỗ trợ cả hai song song |

> **Lưu ý:** Role và userId **luôn được đọc từ `req.session`** (server-side) sau khi auth guard xử lý. Không bao giờ tin dữ liệu role từ `req.body` hay `localStorage`.

---

## Biến môi trường quan trọng (`.env`)

| Biến | Mô tả |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | Kết nối MySQL |
| `JWT_SECRET` | Secret key để sign/verify JWT |
| `PORT` | Port server (mặc định 8888) |
| `ROLE_PHONGBAN_LANHDAO` | Mã role Lãnh đạo phòng |
| `ROLE_PHONGBAN_TROLY` | Mã role Trợ lý phòng |
| `ROLE_KHOA_LANHDAO` | Mã role Lãnh đạo khoa |
| `ROLE_KHOA_GV_CNBM` | Mã role GV + CNBM khoa |
| `ROLE_KHOA_GV` | Mã role Giảng viên khoa |
| `DAO_TAO`, `VAN_PHONG`, ... | Mã phòng ban cụ thể |

---

## Quy ước đặt tên File

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Route | `[tenModule]Route.js` | `adminMoiGiangCoreInfoRoute.js` |
| Controller | `[tenModule]Controller.js` hoặc `[tenModule].controller.js` | `adminCoreInfo.controller.js` |
| Service | `[tenModule]Services.js` hoặc `[tenModule].service.js` | `adminCoreInfo.service.js` |
| Repository | `[tenModule].repository.js` | `adminCoreInfo.repository.js` |
| Validator | `[tenModule].validator.js` | `adminCoreInfo.validator.js` |
| Constant | `[tenModule].constant.js` | `errorCodes.constant.js` |
| Test | `[tenModule].[loai].test.js` | `adminCoreInfo.validator.test.js` |
