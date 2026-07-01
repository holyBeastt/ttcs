# Kiến trúc Hệ thống (Architecture)

> **Dự án:** TTCS — Hệ thống quản lý giảng dạy & mời giảng  
> **Pattern chính:** Layered Architecture (Route → Controller → Service → Repository)

---

## 1. Kiến trúc Tổng thể

```
┌────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│                                                            │
│  ┌─────────────────────┐    ┌──────────────────────────┐  │
│  │   Web Browser        │    │   Mobile App (Flutter)   │  │
│  │   (EJS + AG Grid)    │    │   + Postman / API Client │  │
│  └──────────┬──────────┘    └────────────┬─────────────┘  │
│             │ HTTP + Session Cookie       │ HTTP + JWT      │
└─────────────┼─────────────────────────────┼────────────────┘
              │                             │
              ▼                             ▼
┌────────────────────────────────────────────────────────────┐
│                     APPLICATION TIER                        │
│                    (Node.js + Express)                       │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    server.js                          │  │
│  │         Global Middleware Pipeline                    │  │
│  │  cors → cookieParser → session → bodyParser →        │  │
│  │  constantsMiddleware → Auth Guard                     │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│          ┌────────────────┼────────────────┐               │
│          ▼                ▼                ▼               │
│     [Web Routes]    [API Routes]    [Admin Routes]         │
│     /views/...      /api/v1/...     /admin/...             │
│          │                │                │               │
│          ▼                ▼                ▼               │
│     ┌─────────────────────────────────────────────┐       │
│     │              Controllers                      │       │
│     │  Tiếp nhận request, validate, delegate        │       │
│     └──────────────────────┬──────────────────────┘       │
│                            │                               │
│                            ▼                               │
│     ┌─────────────────────────────────────────────┐       │
│     │                Services                       │       │
│     │  Business logic, transaction coordination     │       │
│     └──────────────────────┬──────────────────────┘       │
│                            │                               │
│                            ▼                               │
│     ┌─────────────────────────────────────────────┐       │
│     │              Repositories                     │       │
│     │  Data access, parameterized SQL queries       │       │
│     └──────────────────────┬──────────────────────┘       │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                       DATA TIER                             │
│                     MySQL Database                          │
│                  (mysql2/promise Pool)                       │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Layered Architecture Chi Tiết

### Tầng Route (Routing Layer)
- **Trách nhiệm:** Khai báo HTTP endpoint, gắn middleware chain, delegate sang controller.
- **Không chứa:** Business logic, SQL queries.
- **Pattern:**
  ```javascript
  router.put('/core-info', verifyToken, requireAdminRole, controller.updateCoreInfo);
  ```

### Tầng Controller (Presentation Layer)
- **Trách nhiệm:** Parse request, gọi validator, gọi service, format và trả về response.
- **Không chứa:** SQL trực tiếp, business logic phức tạp.
- **Pattern:**
  ```javascript
  const result = await service.doSomething(validated.data);
  return res.status(200).json({ success: true, data: result });
  ```

### Tầng Service (Business Logic Layer)
- **Trách nhiệm:** Toàn bộ business logic, điều phối nhiều repository trong transaction.
- **Không import:** Express (`req`, `res`).
- **Pattern:**
  ```javascript
  await repository.runInTransaction(async (trx) => {
    await repository.update(data, trx);
    await repository.insertLog(logData, trx);
  });
  ```

### Tầng Repository (Data Access Layer)
- **Trách nhiệm:** Toàn bộ SQL queries, dùng Parameterized Query.
- **Không chứa:** Business logic, HTTP-related code.
- **Pattern:**
  ```javascript
  const [result] = await conn.execute('UPDATE table SET col=? WHERE id=?', [val, id]);
  return result.affectedRows;
  ```

### Tầng Validator (Input Validation Layer)
- **Trách nhiệm:** Validate & sanitize dữ liệu đầu vào trước khi vào controller.
- **Không phụ thuộc:** Database, Express.
- **Trả về:** Data đã sanitize hoặc throw `ValidationError` có mã lỗi.

---

## 3. Authentication & Authorization

```
Request đến
     │
     ▼
Auth Guard (server.js — inline middleware)
  ├── Kiểm tra req.session.userId (session-based)
  ├── Nếu không có: đọc JWT từ HttpOnly Cookie
  │   hoặc Authorization header
  ├── Verify JWT → decode → populate req.session
  └── Nếu không có token hợp lệ:
      ├── API request → 401 JSON
      └── Web request → redirect /?sessionExpired=true
     │
     ▼
Route-level Middleware (tùy route)
  ├── requireAdminRole → đọc req.session.role
  │   ├── role === 'ADMIN' → next()
  │   └── khác → 403 JSON
  ├── dataLockMiddleware → kiểm tra trạng thái dữ liệu
  └── khoaFilterMiddleware → lọc theo khoa
     │
     ▼
Controller → Service → Repository
```

**Nguyên tắc bảo mật:**
- Role được đọc từ `req.session.role` (server-side) — **không bao giờ** từ `req.body.role` hay `localStorage`.
- JWT được decode server-side và ghi vào session ngay tại Auth Guard.
- Mọi SQL đều dùng Parameterized Query để phòng SQL Injection.
- String input được sanitize XSS trước khi lưu.

---

## 4. Database Connection

```javascript
// src/config/Pool.js
const pool = mysql.createPool({
  host, user, password, database, port,
  connectionLimit: 150,   // Tối đa 150 kết nối đồng thời
  connectTimeout: 10000,  // 10 giây timeout
});
```

**Pattern Transaction:**
```javascript
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  // ... multiple queries
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release(); // Trả connection về pool
}
```

---

## 5. Frontend Architecture (EJS + AG Grid)

```
Browser
  │
  ├── EJS Template Engine (Server-Side Rendering)
  │   ├── Biến: res.locals.APP_ROLES, APP_DEPARTMENTS
  │   ├── Biến: session data (role, MaPhongBan, ...)
  │   └── Render HTML một lần khi load trang
  │
  └── Client-Side JavaScript (trong thẻ <script>)
      ├── AG Grid (bảng dữ liệu tương tác)
      │   ├── columnDefs — cấu hình cột
      │   ├── onCellValueChanged → gọi fetch() API
      │   └── getRowId → track row theo ID
      ├── Fetch API → gọi backend REST endpoints
      ├── Toastify.js → thông báo nhẹ (Toast)
      └── SweetAlert2 (Swal) → dialog xác nhận & lỗi
```

**Auto-save Pattern (AG Grid):**
```
User sửa ô → onCellValueChanged
          → fetch PUT /api/...
          ├── 200 → cập nhật version, show Toast ✅
          ├── 4xx → show Swal lỗi, revert ô về giá trị cũ
          └── Network err → revert ô
```

---

## 6. Module Inventory

| Module | Mô tả | Route Prefix |
|---|---|---|
| **Login** | Đăng nhập / logout | `/` |
| **Admin** | Quản lý nhân viên, phòng ban, tài khoản, năm học | `/admin/` |
| **Mời giảng (GVM)** | Tạo, quản lý, duyệt hợp đồng mời giảng | `/` |
| **Admin Mời giảng Core** | [NEW] ADMIN chỉnh sửa thông tin lõi | `/api/v1/admin/moi-giang/` |
| **TKB** | Thời khóa biểu chính thức | `/api/v1/tkb/` |
| **Đồ án** | Quản lý hợp đồng đồ án tốt nghiệp | `/` |
| **NCKH v3** | Nghiên cứu khoa học (phiên bản 3) | `/v3/nckh/` |
| **Vượt giờ v2** | Quản lý vượt giờ (phiên bản 2) | `/v2/vuotgio/` |
| **Hợp đồng** | Duyệt hợp đồng MG + ĐA | `/` |
| **Thống kê** | Báo cáo tổng hợp MG, ĐA, NCKH | `/` |
| **Sync** | Đồng bộ dữ liệu từ nguồn ngoài | `/sync/` |
| **Backup** | Sao lưu database | `/` |
| **Ủy nhiệm chi** | Quản lý phiếu ủy nhiệm chi | `/uy-nhiem-chi/` |
| **Mobile API** | Refresh token cho Flutter app | `/api/mobile/v1/` |

---

## 7. Quy tắc phát triển (Development Conventions)

### Viết code mới
1. **Không sửa code cũ** khi thêm tính năng mới — luôn tạo file riêng.
2. Tuân theo cấu trúc **Route → Controller → Service → Repository**.
3. **Error codes** phải được khai báo trong `constants/[module]/errorCodes.constant.js`.
4. **Không có SQL** trong controller hay service — chỉ ở repository.
5. **Không có business logic** trong repository.

### Security checklist
- [ ] Role kiểm tra từ `req.session` (server-side), không từ client.
- [ ] Tất cả SQL dùng Parameterized Query.
- [ ] String input được `.trim()` và escape XSS.
- [ ] Mọi thay đổi dữ liệu quan trọng có audit log.
- [ ] Optimistic locking với cột `version` cho tài nguyên có thể bị edit đồng thời.

### Testing strategy
| Loại test | Khi nào viết | Không cần |
|---|---|---|
| Unit Test | Validator, Service (mock repo) | DB, server |
| Integration Test | API endpoint đầu-cuối | (cần test DB) |
| Regression Test | Sau mỗi tính năng mới | |
