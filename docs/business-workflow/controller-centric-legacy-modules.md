# Controller-Centric Legacy Modules

While the main modules like `vuotgio_v2` and `nckh_v3` follow an MVC-inspired layered architecture (Route → Controller → Service → Repository/Mapper), several legacy modules do not.

These legacy modules follow a **controller-centric workflow**, where the controller acts as a monolithic "god function."

---

## Identified Legacy Workflows

1. **Mời Giảng (Invited Guest Lecturers)**
   - See [Invited Lecturer Workflow](./invited-lecturer-workflow.md)
   - Core files: `createGvmController.js`, `moiGiangQCDKController.js`, `gvmListController.js`
2. **Đồ Án (Thesis/Project Supervision)**
   - See [Project Supervision Workflow](./project-supervision-workflow.md)
   - Core files: `doAnChinhThucController.js`, `hopdong.duyetHopDongDoAnController.js`
3. **Contract Generation (ExportHD)**
   - See [Contract Generation](./contract-generation.md)
   - Core file: `exportHDController.js`

---

## Characteristics of Legacy Controllers

The legacy controllers in this system exhibit the following technical characteristics:

### 1. No Service or Repository Layers
Business logic, calculation rules, and database queries are completely embedded in the controller file. There are no imported service classes or repository queries. Database connections (`pool` or `createPoolConnection`) are invoked directly within the HTTP handler.

### 2. Inline SQL
All SQL queries are written inline as string templates.
- They heavily rely on complex bulk operations, like `INSERT ... ON DUPLICATE KEY UPDATE` and `UPDATE ... CASE WHEN ID = ? THEN ? ... END`, explicitly constructed in `for` loops.
- **Risk:** Some queries are vulnerable to SQL injection because variables (like `req.session.MaPhongBan`) are interpolated directly into the query string (e.g., `LIKE '%${MaPhongBan}%'`) rather than being passed as parameterized arguments.

### 3. Hardcoded Business Rules & "Magic Values"
Core business logic operates on string-matching and hardcoded constants rather than configuration data or structured relationships:
- **String Parsing:** Extracting the internal/guest status from `"Name - Status - ID"` strings using `.split(" - ")`.
- **String Matching:** Looking for `"ĐH"`, `"CH"`, or `"NCS"` in a program name string to determine workload multipliers (1.0, 1.5, 2.0).
- **Substrings:** Slicing the first 4 characters of `MaSV` (`.slice(0,4)`) to determine the student's training faculty.
- **Constants:** Duplicating the 20/12/8 hour breakdown for thesis supervisors across multiple controllers.
- **System Records:** Excluding specific rows using magic IDs (`CCCD != '00001'`, `id_Gvm != 1`).

### 4. Ad-Hoc Access Control
Instead of using the centralized `enforceKhoaFilter` middleware, these controllers manually check `req.session.isKhoa` and apply scoping logic inline. This results in duplicated authorization logic that could fall out of sync.

### 5. Mixed Concerns
A single HTTP request handler often handles file uploading/parsing (via multer), data validation, manual string deduplication, raw database transactions, writing audit logs to the database, and manual rollback (using `DELETE`) if file writing fails.

---

## Refactoring Guidelines (Future State)

When these modules are modernized, they should conform to the patterns established in `vuotgio_v2`:
1. **Extract SQL:** Move all SQL strings to a repository layer using parameterized queries.
2. **Extract Business Rules:** Move logic (like the 20/12/8 rule or the multiplier checks) to a Mapper or Service layer.
3. **Use Middleware:** Strip out inline `isKhoa` checks and replace them with the `enforceKhoaFilter` middleware.
4. **Use Transactions:** Replace manual rollback strategies (like `DELETE` after a failed file write) with proper SQL transactions.
