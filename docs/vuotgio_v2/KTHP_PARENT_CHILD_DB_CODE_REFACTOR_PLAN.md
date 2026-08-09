# Kế hoạch refactor KTHP theo mô hình bảng cha - ba bảng con

## 1. Mục tiêu

Refactor dữ liệu Kết thúc học phần (KTHP) từ bảng phẳng
`vg_coi_cham_ra_de` sang mô hình:

```text
vg_kthp
├── vg_kthp_ra_de
├── vg_kthp_coi_thi
└── vg_kthp_cham_thi
```

Phạm vi gồm:

- CSDL và migration dữ liệu hiện có.
- Backend CRUD, import, duyệt, khóa dữ liệu và tổng hợp vượt giờ.
- View nhập thủ công và view import Excel.
- View duyệt KTHP.
- Compatibility trong thời gian chuyển đổi, test, cutover và rollback.

Mục tiêu chất lượng:

- Dữ liệu chung và trạng thái duyệt chỉ tồn tại ở bảng cha.
- Trường riêng của từng nghiệp vụ nằm đúng bảng con.
- Một bản ghi KTHP có đúng một loại chi tiết.
- Không thay đổi kết quả tổng hợp `quy_chuan`.
- Không mất ID và không mất dữ liệu hiện có.
- Import Excel và nhập thủ công tiếp tục đi qua cùng pipeline
  preview/commit.
- Không để service/controller truy cập trực tiếp tên bảng.

## Nguyên tắc bắt buộc: không fallback, không vá tạm

Các nguyên tắc dưới đây là quality gate của refactor, không phải khuyến nghị:

1. **Không automatic fallback về schema cũ.**
   Nếu query/insert schema mới lỗi, request phải fail và transaction rollback.
   Cấm `try new schema -> catch -> query/insert vg_coi_cham_ra_de`.
2. **Chỉ có một nguồn sự thật tại một thời điểm.**
   Trước cutover, bảng cũ là nguồn sự thật. Sau cutover, `vg_kthp` và ba child
   là nguồn sự thật. Không đọc trộn hai schema và không dual-write vô thời hạn.
3. **Không dùng storage feature flag trong application.**
   Code sau refactor chỉ biết schema parent/child. Cutover được điều phối bằng
   migration và deployment; không tồn tại mode `LEGACY` trong runtime.
4. **Không default âm thầm loại nghiệp vụ.**
   Unknown label/type phải trả validation error. Cấm mặc định mọi giá trị không
   nhận diện được thành `RA_DE`.
5. **Không default âm thầm dữ liệu bắt buộc.**
   Không dùng `|| ""`, `|| 0`, ID/hệ đào tạo mặc định để làm một DTO lỗi trở
   thành hợp lệ. `NULL`, `0` và “không áp dụng” phải có semantics rõ theo loại.
6. **Không tạo parent thiếu child.**
   Parent và child phải được ghi trong cùng transaction. Child insert lỗi thì
   rollback parent; không catch lỗi child rồi giữ parent.
7. **Không raw SQL KTHP ngoài repository.**
   Controller, service, mapper và frontend không biết tên bảng. Không thêm một
   query tạm trong service để “chạy trước rồi dọn sau”.
8. **Không compatibility shim vô thời hạn.**
   Legacy alias/view/endpoint chỉ được tạo khi có consumer đã kiểm kê, phải
   read-only nếu là view, có test, tiêu chí tháo bỏ và được xóa trong phase
   contract của cùng refactor.
9. **Không sửa dữ liệu âm thầm trong migration.**
   Bản ghi bất thường đi vào report và decision gate. Migration phải fail hoặc
   dừng cutover nếu chưa có quyết định nghiệp vụ.
10. **Không nuốt lỗi để tiếp tục batch.**
    Lỗi persistence/FK/invariant làm rollback toàn transaction. Chỉ duplicate
    đã được policy định nghĩa rõ mới được skip và phải trả thống kê.
11. **Không duy trì hai business contract.**
    Canonical DTO là contract duy nhất. Legacy projection, nếu bắt buộc, chỉ là
    adapter ở biên response và không được đi ngược vào save pipeline.
12. **Không đánh đổi thiết kế để giữ endpoint cũ.**
    Tất cả frontend trong scope phải chuyển sang preview/commit canonical.
    Endpoint cũ được xóa sau khi caller inventory bằng 0, không giữ làm đường
    cứu hộ.

Mỗi pull request của refactor phải chứng minh không vi phạm các nguyên tắc này
bằng test và tìm kiếm static. Review phải reject nếu xuất hiện fallback branch,
silent default hoặc truy cập bảng KTHP ngoài repository.

## Trạng thái implementation ngày 2026-07-28

Đã triển khai source tree và chạy migration trên DB cấu hình `ttcs2`:

- Tạo migration expand, backfill bảo toàn giá trị, validation invariant và
  rollback projection độc lập.
- Backend chỉ ghi `vg_kthp` và đúng một child trong một transaction.
- DTO import dùng duy nhất `activityType`; unknown/missing type bị từ chối.
- Xóa parser grouped legacy, facade import cũ, endpoint save/upload cũ và CRUD
  trùng dưới `/them-kthp`.
- Manual và Excel dùng chung preview/token/commit canonical.
- View duyệt đọc canonical DTO, edit đúng child, khóa đổi loại và reset hai cấp
  duyệt khi sửa.
- Batch approval khóa row `FOR UPDATE` và kiểm tra transition/department ở
  backend.
- Tổng hợp, data lock và duyệt tổng hợp đọc parent repository; source runtime
  không còn tham chiếu `vg_coi_cham_ra_de`.
- Targeted KTHP tests và static syntax check là quality gate trước cutover.

Kết quả kiểm tra source tại thời điểm hoàn tất:

- `npm test`: 16 Jest suites / 116 tests và 4 Node test files đều pass.
- Route/controller module load thành công.
- `git diff --check` không có whitespace error.
- Static search không tìm thấy bảng cũ hoặc endpoint ghi cũ trong runtime KTHP.
- Migration đã chạy theo thứ tự `01 -> 02 -> 03 -> 04`.
- Backfill giữ nguyên 320 bản ghi và tổng `quy_chuan = 8304.29`.
- Phân bổ child: 13 ra đề/ngân hàng câu hỏi, 234 coi thi, 73 chấm thi.
- Validation parent/child, orphan, giá trị chi tiết và tổng giờ đều pass.
- Repository runtime đọc đúng 320/320 bản ghi của năm học `2025 - 2026`.
- Bốn bảng mới dùng `utf8mb4_general_ci`, đồng nhất với các bảng nghiệp vụ
  hiện hữu; không có nhánh fallback về bảng legacy.

## 2. Ngoài phạm vi

Plan này không thực hiện:

- Thay đổi công thức tính giờ quy chuẩn.
- Thay đổi chính sách duyệt hai cấp.
- Thay đổi công thức tổng hợp vượt giờ/NCKH.
- Tách chi tiết từng dòng của bộ tính giờ thủ công thành bảng thứ tư.
- Xóa bảng cũ ngay trong lần triển khai đầu tiên.

Các dòng nhập trong calculator như `1a`, `1b`, `4a` hiện chỉ dùng để tính tổng
giờ trên trình duyệt. Plan giữ nguyên mức lưu hiện tại: một bản ghi lưu theo
nhóm công việc, không lưu breakdown từng dòng calculator. Nếu nghiệp vụ cần
truy vết breakdown, phải bổ sung một bảng detail-line riêng ở phase sau.

## 3. Hiện trạng cần bảo toàn

### 3.1. Dữ liệu

Tại thời điểm khảo sát, `vg_coi_cham_ra_de` có 320 bản ghi:

| Hình thức hiện tại | Số bản ghi | Bảng con đích |
|---|---:|---|
| `Ra đề` | 12 | `vg_kthp_ra_de` |
| `Ngân hàng câu hỏi` | 1 | `vg_kthp_ra_de` |
| `Coi thi` | 234 | `vg_kthp_coi_thi` |
| `Chấm thi` | 73 | `vg_kthp_cham_thi` |

Điểm cần xử lý trước migration:

- Có một bản ghi Coi thi chưa có ngày thi.
- Có hai bản ghi Chấm thi có `quy_chuan > 1000`, giá trị lớn nhất là 3510.
- `Ngân hàng câu hỏi` đang được UI tạo như một loại riêng nhưng backend
  mặc định áp dụng policy Ra đề.
- `tong_so` đang có ba nghĩa: số đề/số ca/tổng số bài.
- Một số cột dùng `0` hoặc chuỗi rỗng để biểu diễn “không áp dụng”.

Các dữ liệu bất thường không được tự sửa trong migration. Phải xuất báo cáo,
xác nhận nghiệp vụ và lưu kết quả xử lý trước cutover.

Các trường dự kiến bắt buộc đã được kiểm tra trên dữ liệu hiện tại: không có
bản ghi thiếu `id_User`, `he_dao_tao_id`, giảng viên, khoa, tên học phần hoặc
`quy_chuan > 0`; không có giá trị `hinh_thuc` ngoài bốn loại đã liệt kê.

### 3.2. Luồng code sau refactor

Các đường ghi chính:

```text
Manual view
  -> /kthp-import/preview
  -> preview token
  -> /kthp-import/commit
  -> KthpImportSaveService
  -> kthp.repo.create(parent, child)

Excel view
  -> /import-kthp/preview
  -> preview token
  -> /kthp-import/commit
  -> KthpImportSaveService
  -> kthp.repo.create(parent, child)
```

Các endpoint cũ `/import-kthp/import`, `/import-kthp/save`,
`/import-kthp/upload`, `/duyet-kthp/approve/:ID` và các POST/CRUD trùng dưới
`/them-kthp` đã bị xóa. Không có compatibility route.

Các consumer đọc trực tiếp hoặc gián tiếp bảng cũ:

- `src/repositories/vuotgio_v2/kthp.repo.js`
- `src/repositories/vuotgio_v2/tongHop.repo.js`
- `src/repositories/vuotgio_v2/dataLock.repo.js`
- `src/repositories/vuotgio_v2/duyetTongHop.repo.js`
- `src/services/vuotgio_v2/kthp.service.js`
- `src/config/vuotgio_v2/templatePreview.alias.js`
- Các màn hình nhập/import/duyệt và Excel export KTHP.

## 4. Quyết định kiến trúc

### 4.1. Đơn vị dữ liệu

Một dòng cũ tương ứng:

- Một dòng trong `vg_kthp`.
- Đúng một dòng trong một bảng con.

Không hiểu bảng cha là “header của một lần nhập”. Nếu một form tạo Ra đề,
Coi thi và Chấm thi thì hệ thống tạo ba parent record độc lập. Quyết định này
giữ nguyên:

- ID của từng công việc.
- Quy chuẩn của từng công việc.
- Quyền sửa/xóa.
- Trạng thái duyệt theo từng công việc.
- Khả năng import và phát hiện trùng.

### 4.2. Loại nghiệp vụ

Backend sử dụng mã ổn định, không dùng nhãn tiếng Việt làm khóa:

```js
RA_DE
NGAN_HANG_CAU_HOI
COI_THI
CHAM_THI
```

Ba nhóm lưu chi tiết:

```js
RA_DE, NGAN_HANG_CAU_HOI -> vg_kthp_ra_de
COI_THI                   -> vg_kthp_coi_thi
CHAM_THI                  -> vg_kthp_cham_thi
```

`Ngân hàng câu hỏi` cần policy backend riêng. Không tiếp tục dùng nhánh mặc
định Ra đề trong `ManualKthpInputStrategy`.

### 4.3. Chủ sở hữu dữ liệu

Bảng cha sở hữu:

- Danh tính bản ghi.
- Giảng viên/khoa.
- Năm học, học kỳ, đợt.
- Học phần/hệ đào tạo.
- Loại nghiệp vụ.
- Tổng giờ quy chuẩn.
- Ghi chú.
- Trạng thái duyệt khoa và khảo thí.
- Audit timestamp.

Bảng con chỉ sở hữu chi tiết nghiệp vụ. Không lặp lại:

- `id_user`.
- `nam_hoc`, `hoc_ky`, `dot`.
- `khoa`.
- `quy_chuan`.
- Trạng thái duyệt.

### 4.4. Quy tắc quan hệ

- `vg_kthp.id` giữ nguyên ID từ bảng cũ khi backfill.
- Mỗi child dùng `kthp_id` vừa là PK vừa là FK.
- FK child dùng `ON DELETE CASCADE`.
- Xóa parent sẽ tự xóa detail.
- Thay đổi loại phải chạy transaction: xóa child cũ, tạo child mới.
- Không cho phép parent không có child sau commit.
- Không cho phép một parent xuất hiện trong nhiều bảng con.

CSDL khó biểu diễn ràng buộc “đúng một trong ba bảng con” chỉ bằng FK. Phase
đầu kiểm soát invariant bằng repository/service transaction và validation
query. Không thêm trigger để tránh ẩn logic ghi dữ liệu. Có thể bổ sung trigger
sau khi hệ thống ổn định nếu thực sự cần bảo vệ các thao tác SQL ngoài ứng dụng.

### 4.5. API

Contract chuẩn mới:

```json
{
  "id": 123,
  "activityType": "COI_THI",
  "displayType": "Coi thi",
  "employee": {
    "id": 10,
    "name": "Nguyễn Văn A",
    "department": "K01"
  },
  "academicYear": "2025 - 2026",
  "semester": 1,
  "round": 1,
  "course": {
    "code": "ABC123",
    "name": "Tên học phần",
    "className": "L01",
    "credits": 3,
    "studentCount": 50
  },
  "educationSystem": {
    "id": 1,
    "name": "Hệ đào tạo"
  },
  "coefficient": 1.2,
  "standardHours": 0.6,
  "notes": "",
  "approval": {
    "departmentApproved": false,
    "examOfficeApproved": false
  },
  "detail": {
    "examDate": "2026-01-20",
    "shift": "Ca 1",
    "duration": 90,
    "room": "P101",
    "shiftCount": 1
  }
}
```

Trong phase chuyển đổi, response có thể kèm aliases phẳng cũ như
`hinhthuc`, `tongso`, `sotietqc`, `baicham1`. Aliases chỉ được tạo ở mapper
compatibility cho consumer đã kiểm kê, không để lan vào repository mới. Nếu
không có consumer ngoài scope, không tạo aliases và chuyển toàn bộ caller trong
cùng cutover.

## 5. Schema đề xuất

Tên và kiểu dữ liệu cuối cùng cần được xác nhận trên bản sao schema production
trước khi viết migration chạy thật.

### 5.1. Bảng cha `vg_kthp`

```sql
CREATE TABLE vg_kthp (
  id                  INT NOT NULL AUTO_INCREMENT,
  id_user             INT NOT NULL,
  giang_vien          VARCHAR(255) NOT NULL,
  khoa                VARCHAR(255) NOT NULL,
  nam_hoc             VARCHAR(20) NOT NULL,
  hoc_ky              TINYINT NOT NULL,
  dot                 INT NOT NULL DEFAULT 1,
  loai_kthp           VARCHAR(32) NOT NULL,

  ten_hoc_phan        VARCHAR(255) NOT NULL,
  ma_hoc_phan         VARCHAR(100) NULL,
  lop_hoc_phan        VARCHAR(255) NULL,
  so_tc               INT NULL,
  so_sv               INT NULL,
  he_dao_tao_id       INT NOT NULL,
  doi_tuong           VARCHAR(255) NULL,
  hinh_thuc_thi       VARCHAR(255) NULL,
  he_so               DECIMAL(5,2) NULL,

  quy_chuan           DECIMAL(10,2) NOT NULL,
  ghi_chu             VARCHAR(255) NULL,
  khoa_duyet          TINYINT(1) NOT NULL DEFAULT 0,
  khao_thi_duyet      TINYINT(1) NOT NULL DEFAULT 0,

  created_at          DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_vg_kthp_nhanvien
    FOREIGN KEY (id_user) REFERENCES nhanvien(id_User),
  CONSTRAINT fk_vg_kthp_he_dao_tao
    FOREIGN KEY (he_dao_tao_id) REFERENCES he_dao_tao(id)
);
```

Lý do giữ snapshot `giang_vien`, `khoa`, `doi_tuong` bên cạnh FK: báo cáo năm
cũ không nên tự đổi tên/khoa khi hồ sơ nhân viên hoặc danh mục hệ đào tạo thay
đổi. Cần thống nhất đây là snapshot lịch sử, không phải dữ liệu master.

Bảng cũ không có timestamp nên migration không được giả lập ngày tạo lịch sử.
`created_at`/`updated_at` của dòng backfill để `NULL` hoặc ghi rõ
`migration timestamp`; dữ liệu mới dùng timestamp thực tế.

Constraint/index dự kiến:

```text
CHECK hoc_ky IN (1, 2)
CHECK dot > 0
CHECK quy_chuan > 0
CHECK loai_kthp IN (
  'RA_DE',
  'NGAN_HANG_CAU_HOI',
  'COI_THI',
  'CHAM_THI'
)

INDEX (id_user, nam_hoc, hoc_ky)
INDEX (nam_hoc, khoa, hoc_ky, dot)
INDEX (nam_hoc, khoa, khoa_duyet, khao_thi_duyet)
INDEX (nam_hoc, loai_kthp)
```

Nếu production không enforce `CHECK` theo phiên bản MariaDB/MySQL đang dùng,
validation tương đương phải nằm ở service và migration validation.

### 5.2. Bảng `vg_kthp_ra_de`

Áp dụng cho `RA_DE` và `NGAN_HANG_CAU_HOI`:

```sql
CREATE TABLE vg_kthp_ra_de (
  kthp_id             INT NOT NULL,
  so_luong            INT NULL,
  PRIMARY KEY (kthp_id),
  CONSTRAINT fk_vg_kthp_ra_de_parent
    FOREIGN KEY (kthp_id) REFERENCES vg_kthp(id) ON DELETE CASCADE
);
```

`so_luong` thay cho `tong_so`, có nghĩa theo `loai_kthp`:

- `RA_DE`: số đề.
- `NGAN_HANG_CAU_HOI`: số lượng câu hỏi/ma trận/lần thực hiện nếu nguồn có
  cung cấp.

Nếu sau này cần phân biệt đơn vị `đề`, `câu hỏi`, `ma trận`, phải bổ sung
`don_vi_tinh` hoặc detail-line; không overload thêm cột mới trong parent.

### 5.3. Bảng `vg_kthp_coi_thi`

```sql
CREATE TABLE vg_kthp_coi_thi (
  kthp_id             INT NOT NULL,
  ngay_thi            DATE NULL,
  ca_thi              VARCHAR(100) NULL,
  thoi_gian           INT NULL,
  phong_thi           VARCHAR(255) NULL,
  so_ca               INT NOT NULL DEFAULT 1,
  PRIMARY KEY (kthp_id),
  CONSTRAINT fk_vg_kthp_coi_thi_parent
    FOREIGN KEY (kthp_id) REFERENCES vg_kthp(id) ON DELETE CASCADE
);
```

`ngay_thi` tạo nullable ở bước expand để backfill được dòng cũ. Sau khi xử lý
dữ liệu thiếu ngày, migration contract mới đổi thành `NOT NULL`.

### 5.4. Bảng `vg_kthp_cham_thi`

```sql
CREATE TABLE vg_kthp_cham_thi (
  kthp_id             INT NOT NULL,
  bai_cham_1          INT NOT NULL DEFAULT 0,
  bai_cham_2          INT NOT NULL DEFAULT 0,
  tong_so_bai         INT NOT NULL DEFAULT 0,
  vai_tro             VARCHAR(100) NULL,
  PRIMARY KEY (kthp_id),
  CONSTRAINT fk_vg_kthp_cham_thi_parent
    FOREIGN KEY (kthp_id) REFERENCES vg_kthp(id) ON DELETE CASCADE
);
```

Validation:

```text
bai_cham_1 >= 0
bai_cham_2 >= 0
tong_so_bai >= 0
```

Không tự ép `tong_so_bai = bai_cham_1 + bai_cham_2` vì file thực tế có thể
dùng vai trò và số bài/phách theo cách khác. Policy phải tính/đối chiếu và cảnh
báo nếu không khớp.

## 6. Migration dữ liệu

### 6.1. Nguyên tắc rollout

Áp dụng expand -> backfill -> verify -> cutover -> contract.

Không dual-write lâu dài. Với 320 dòng, ưu tiên một khoảng khóa ghi ngắn khi
backfill cuối và cutover để tránh hai nguồn sự thật.

Không xóa bảng cũ trong cùng release cutover.

### 6.2. File migration dự kiến

```text
database/migrations/
├── YYYYMMDD_01_create_vg_kthp_parent_children.sql
├── YYYYMMDD_02_backfill_vg_kthp_parent_children.sql
├── YYYYMMDD_03_validate_vg_kthp_parent_children.sql
├── YYYYMMDD_04_create_kthp_legacy_read_view.sql
└── YYYYMMDD_90_rollback_kthp_parent_children.sql
```

Migration phải chạy được nhiều lần hoặc có guard rõ ràng. Mọi thao tác đổi tên,
xóa hoặc truncate phải tách khỏi file create/backfill.

### 6.3. Mapping backfill

Parent:

```text
id_User              -> id_user
giang_vien            -> giang_vien
khoa                  -> khoa
nam_hoc               -> nam_hoc
hoc_ky                -> hoc_ky
dot                   -> dot
ten_hoc_phan          -> ten_hoc_phan
ma_hoc_phan           -> ma_hoc_phan; '' thành NULL
lop_hoc_phan          -> lop_hoc_phan; '' thành NULL
so_tc                 -> so_tc; 0 cân nhắc thành NULL
so_sv                 -> so_sv; 0 cân nhắc thành NULL theo loại
he_dao_tao_id         -> he_dao_tao_id
doi_tuong             -> doi_tuong
hinh_thuc_thi         -> hinh_thuc_thi; '' thành NULL
he_so                 -> he_so; chỉ đổi 0 thành NULL khi nghiệp vụ xác nhận
quy_chuan             -> quy_chuan
ghi_chu               -> ghi_chu
khoa_duyet            -> khoa_duyet
khao_thi_duyet        -> khao_thi_duyet
```

Loại:

```text
'Ra đề'               -> RA_DE
'Ngân hàng câu hỏi'   -> NGAN_HANG_CAU_HOI
'Coi thi'             -> COI_THI
'Chấm thi'            -> CHAM_THI
```

Child:

```text
RA_DE/NGAN_HANG_CAU_HOI:
  tong_so             -> vg_kthp_ra_de.so_luong

COI_THI:
  ngay_thi            -> vg_kthp_coi_thi.ngay_thi
  ca_thi              -> vg_kthp_coi_thi.ca_thi
  thoi_gian           -> vg_kthp_coi_thi.thoi_gian
  phong_thi           -> vg_kthp_coi_thi.phong_thi
  tong_so             -> vg_kthp_coi_thi.so_ca

CHAM_THI:
  bai_cham_1          -> vg_kthp_cham_thi.bai_cham_1
  bai_cham_2          -> vg_kthp_cham_thi.bai_cham_2
  tong_so             -> vg_kthp_cham_thi.tong_so_bai
  vai_tro             -> vg_kthp_cham_thi.vai_tro
```

### 6.4. Validation bắt buộc

Migration chưa được coi là hoàn thành nếu một trong các đối chiếu sau sai:

```text
COUNT(old) = COUNT(vg_kthp)
COUNT(vg_kthp) = COUNT(ra_de) + COUNT(coi_thi) + COUNT(cham_thi)
Không có parent thiếu child
Không có parent có hơn một child
Không có child mồ côi
ID parent trùng ID cũ
SUM(quy_chuan) bằng nhau theo:
  - toàn bảng
  - năm học
  - học kỳ
  - khoa
  - loại
  - trạng thái duyệt hai cấp
Số lượng từng loại bằng baseline
```

Phải có report máy đọc được, ví dụ:

```text
scratch/kthp-migration-validation-YYYYMMDD.json
```

Không commit dữ liệu cá nhân trong report.

### 6.5. Compatibility view

Sau khi toàn bộ code ngừng ghi bảng cũ:

1. Đổi tên bảng cũ thành `vg_coi_cham_ra_de_legacy`.
2. Chỉ tạo read-only view tên `vg_coi_cham_ra_de` nếu caller inventory chứng
   minh còn consumer đọc đã biết, có owner và kế hoạch chuyển đổi cụ thể.
3. View `LEFT JOIN` ba child và project lại các cột phẳng cũ bằng `CASE`.

View không được dùng cho INSERT/UPDATE vì join view không bảo đảm updatable.
Mọi đường ghi phải chuyển sang repository mới trước bước này.
Ứng dụng chính không được dùng view này và không được retry sang view khi query
schema mới lỗi.

## 7. Refactor backend

### 7.1. Repository

Cấu trúc đề xuất:

```text
src/repositories/vuotgio_v2/kthp/
├── kthpParent.repo.js
├── raDeDetail.repo.js
├── coiThiDetail.repo.js
├── chamThiDetail.repo.js
└── kthpQuery.repo.js

src/repositories/vuotgio_v2/kthp.repo.js
  -> facade ổn định cho service trong giai đoạn chuyển đổi
```

Trách nhiệm:

- `kthpParent.repo`: insert/update/delete/approval parent.
- Detail repositories: insert/update detail theo đúng loại.
- `kthpQuery.repo`: query joined cho danh sách, edit, duplicate và export.
- Facade: điều phối transaction, không để service biết tên bảng con.

Không dùng một `INSERT ... VALUES ?` phẳng như hiện tại. Save ban đầu có thể
insert từng parent/detail bằng prepared statement trong cùng transaction để
lấy ID chính xác. Chỉ tối ưu batch sau khi có benchmark cho thấy cần thiết.

Các thao tác:

- Create: insert parent -> insert đúng child -> commit.
- Update common: update parent.
- Update detail: update child tương ứng.
- Change type: delete child cũ -> update `loai_kthp` -> insert child mới.
- Delete: delete parent, FK cascade child.
- Approve: update cột approval trên parent.
- Batch approve: một update parent theo danh sách ID có kiểm tra permission.

### 7.2. Service và controller

Refactor `kthp.service.js`:

- Bỏ toàn bộ raw SQL và constant tên bảng.
- Chuyển `getList`, `updateBatch`, edit/delete qua repository.
- Mọi edit chạy transaction.
- Permission lấy record parent trước khi sửa/xóa.
- Không tin `khoa`, approval hoặc loại do client gửi nếu user không có quyền.

Controller:

- Chỉ parse request, gọi service và map HTTP status.
- Không gọi repository trực tiếp.
- Giữ route hiện tại trong phase compatibility.
- Đánh dấu và xóa dần endpoint import cũ sau khi frontend không còn gọi.

Quyết định nghiệp vụ cần chốt trước implementation:

- Edit dữ liệu đã được một hoặc hai cấp duyệt có được phép hay không.
- Nếu được edit nội dung, có reset `khoa_duyet` và `khao_thi_duyet` về `0`
  không. Khuyến nghị: reset cả hai khi thay đổi trường ảnh hưởng quy chuẩn.
- Có cho đổi loại sau khi tạo hay không. Khuyến nghị phase đầu: không cho đổi
  loại trên màn hình duyệt; muốn đổi thì xóa và tạo lại.

### 7.3. Mapper và DTO

`kthp.mapper.js` tách thành:

- Request -> canonical command.
- Joined DB row -> canonical DTO.
- Canonical DTO -> legacy flat DTO trong phase compatibility.

Không đưa thứ tự cột SQL vào mapper nghiệp vụ. Repository nhận object có tên
trường thay vì mảng 27 phần tử để giảm lỗi lệch vị trí.

### 7.4. Import pipeline

DTO import đổi từ `type` mơ hồ thành:

```js
activityType:
  RA_DE
  NGAN_HANG_CAU_HOI
  COI_THI
  CHAM_THI
```

Thêm:

```text
NganHangCauHoiImportPolicy
```

`KthpTypePolicy.toPersistenceModel()` trả:

```js
{
  parent: { ... },
  detailKind: "RA_DE" | "COI_THI" | "CHAM_THI",
  detail: { ... }
}
```

`KthpImportSaveService`:

1. Mở transaction.
2. Recheck duplicate.
3. Với mỗi DTO hợp lệ, insert parent và đúng detail.
4. Rollback toàn batch khi có lỗi.
5. Commit và ghi audit log.

`KthpDuplicateService` query parent join detail. Fingerprint theo loại:

```text
Common:
  activityType + employeeId + academicYear + semester + round

Ra đề/NHCH:
  common + courseCode/className + quantity + examForm

Coi thi:
  common + examDate + shift + room

Chấm thi:
  common + courseCode/className + role + marker counts
```

Không dùng tên giảng viên làm khóa trùng nếu đã resolve được `id_user`.

### 7.5. Tổng hợp, khóa dữ liệu và export

Các query chỉ cần số giờ/trạng thái phải đọc `vg_kthp`:

- Tổng `quy_chuan` theo giảng viên.
- Kiểm tra số dòng chưa duyệt.
- Khóa dữ liệu năm học.
- Duyệt tổng hợp khoa.

Các query hiển thị/export chi tiết mới join child:

- Chi tiết cá nhân.
- Bảng A2 KTHP.
- Màn hình duyệt.
- Template preview/export.

`tongHop.repo.js` không cần join child để tính tổng. Điều này giữ query tổng
hợp đơn giản hơn schema cũ.

Trong phase compatibility, query joined cho `raw.kthp` phải tiếp tục project
các field phẳng mà `summary.mapper.js`, `caNhan/main.js` và
`excel/utils/sdo-data.helpers.js` đang sử dụng. Chỉ chuyển các consumer này
sang canonical DTO khi có test export/hiển thị tương ứng.

## 8. Refactor view nhập thủ công

Files chính:

```text
src/views/vuotgio_v2/vuotgio.add.coiChamRaDe.ejs
src/public/js/vuotgio_v2/themKTHP/index.js
```

### 8.1. Payload

Không gửi một cụm field thi chung rồi copy vào mọi `details`. Payload mới:

```json
{
  "common": {
    "academicYear": "2025 - 2026",
    "semester": 1,
    "round": 1,
    "employeeId": 10,
    "department": "K01",
    "educationSystemId": 1,
    "course": {}
  },
  "items": [
    {
      "activityType": "COI_THI",
      "standardHours": 0.6,
      "detail": {
        "examDate": "2026-01-20",
        "shift": "Ca 1",
        "duration": 90,
        "room": "P101",
        "shiftCount": 1
      }
    }
  ]
}
```

Mỗi section tự tạo detail đúng loại. Không gửi field Chấm thi vào item Coi thi
hoặc field Coi thi vào item Ra đề.

### 8.2. UI

- Giữ phần thông tin chung ở đầu form.
- Mỗi nhóm công việc có panel chi tiết riêng.
- `Ngân hàng câu hỏi` có type rõ ràng và policy riêng.
- Chỉ validate trường đang áp dụng cho item có số giờ lớn hơn 0.
- Preview hiển thị từng item sắp lưu, loại, chi tiết và quy chuẩn.
- Commit tiếp tục chỉ gửi `previewToken`.
- Error/warning gắn đúng section/field để người dùng sửa.

Phải quyết định các field ngày/ca/phòng là:

- Một giá trị cho cả nhóm Coi thi; hoặc
- Nhiều ca thi độc lập.

Plan mặc định giữ parity: một parent record cho một item tổng hợp. Nếu người
dùng cần nhiều ngày/ca trong cùng lần nhập, frontend phải tạo nhiều item Coi
thi, không nhét mảng vào một child record.

## 9. Refactor view import Excel

Files chính:

```text
src/views/vuotgio_v2/vuotgio.file.coiChamRaDe.ejs
src/public/js/ketthuchocphan/themfilecuoiki.js
src/services/vuotgio_v2/kthp-import/strategies/excelKthpInput.strategy.js
```

Công việc:

- Parser vẫn đọc ba sheet Ra đề/Coi thi/Chấm thi.
- Bổ sung mapping explicit cho Ngân hàng câu hỏi nếu file có sheet này.
- Preview row dùng canonical DTO có `activityType` và `detail`.
- Bảng preview render cột chi tiết theo loại.
- Không chuyển canonical row ngược lại payload legacy trước commit.
- Xóa đường frontend gọi `/import-kthp/import` và `/import-kthp/save`.
- Chỉ dùng `/import-kthp/preview` và `/kthp-import/commit`.
- Nút xóa dòng khỏi preview phải tạo preview mới hoặc cập nhật server-side
  preview an toàn; không commit danh sách đã bị client sửa.

## 10. Refactor view duyệt

Files chính:

```text
src/views/vuotgio_v2/vuotgio.duyet.coiChamRaDe.ejs
src/public/js/vuotgio_v2/duyetKTHP/index.js
```

### 10.1. Danh sách

API `/duyet-kthp/data` trả canonical DTO joined. UI:

- Hiển thị `displayType`.
- Render `detail` theo `activityType`.
- Không suy luận loại bằng lowercase label tiếng Việt.
- Filter bằng activity code, label chỉ dùng hiển thị.
- Approval checkbox vẫn map tới parent ID.

### 10.2. Modal sửa

Modal gồm:

- Nhóm field chung.
- Panel Ra đề/NHCH.
- Panel Coi thi.
- Panel Chấm thi.

Chỉ panel đúng loại được hiện và submit. Không tiếp tục giữ field detail cũ
trong `currentRecord` rồi gửi ngầm mà người dùng không nhìn thấy.

Khuyến nghị phase đầu:

- Khóa select loại khi edit.
- Cho sửa common/detail hiện tại.
- Nếu sửa field ảnh hưởng nghiệp vụ hoặc `quy_chuan`, reset trạng thái duyệt
  theo rule đã được phê duyệt.

### 10.3. Duyệt batch

- Batch update chỉ nhận `{id, khoaDuyet, khaoThiDuyet}`.
- Backend tự kiểm tra vai trò và phạm vi khoa.
- Update bảng cha duy nhất.
- Không cho client gửi common/detail trong request duyệt.

## 11. Compatibility và cutover

### Phase A - Baseline

- Chụp thống kê dữ liệu cũ.
- Bổ sung characterization test cho API flat hiện tại.
- Chốt cách xử lý Ngân hàng câu hỏi và các dòng bất thường.
- Ghi lại tổng quy chuẩn theo năm/khoa/loại/trạng thái duyệt.

### Phase B - Expand DB

- Tạo bốn bảng mới.
- Backfill trên bản sao DB.
- Chạy validation report.
- Chưa đổi code production.

### Phase C - Backend hỗ trợ schema mới

- Tạo repository/mapper canonical.
- Chuyển import save và CRUD sang transaction parent/detail.
- Chuyển tổng hợp/khóa dữ liệu/duyệt tổng hợp sang parent.
- Application chỉ hỗ trợ schema parent/child; không có storage feature flag.

### Phase D - Frontend

- Chuyển manual/import view sang canonical preview.
- Chuyển view duyệt sang canonical detail.
- Giữ legacy aliases trong API trong một release để tránh consumer ngoài scope.

### Phase E - Cutover

1. Bật maintenance/khóa ghi KTHP.
2. Chạy backfill delta lần cuối.
3. Chạy validation.
4. Deploy/bật `PARENT_CHILD`.
5. Smoke test nhập, import, duyệt, tổng hợp và export.
6. Mở lại ghi dữ liệu.

### Phase F - Soak

- Theo dõi ít nhất một chu kỳ nhập và duyệt.
- So sánh tổng quy chuẩn với baseline/report.
- Theo dõi lỗi FK, orphan, duplicate và mismatch detail.
- Chưa xóa bảng cũ.

### Phase G - Contract

- Đổi tên bảng cũ thành `_legacy`.
- Chỉ tạo compatibility read view cho consumer đã kiểm kê; ứng dụng chính
  không sử dụng view.
- Xóa legacy aliases/endpoints sau khi xác nhận không còn sử dụng.
- Chỉ drop `_legacy` bằng một thay đổi riêng có backup và phê duyệt.

## 12. Rollback

Rollback trước cutover:

- Không deploy code mới nếu expand/backfill/validation chưa đạt.
- Bảng cũ vẫn nguyên trạng và chưa bị application mới ghi.
- Chỉ drop bảng mới bằng thay đổi riêng sau khi xác nhận không có write mới.

Rollback sau cutover:

1. Khóa ghi KTHP.
2. Project toàn bộ parent/detail về schema phẳng trong bảng rollback tạm.
3. Đối chiếu count/ID/tổng quy chuẩn.
4. Đồng bộ delta về `vg_coi_cham_ra_de_legacy`.
5. Deploy lại release cũ sau khi projection đã được kiểm chứng.
6. Smoke test.
7. Mở ghi.

Không rollback bằng cách chỉ đổi feature flag nếu schema mới đã nhận write;
làm vậy sẽ mất các thay đổi sau cutover.

## 13. Kế hoạch kiểm thử

### 13.1. Migration test

- Chạy migration trên dump/snapshot.
- Chạy lại migration để kiểm tra guard/idempotency.
- Validate 320 parent và tổng 320 child theo baseline hiện tại.
- Validate ID và tổng quy chuẩn.
- Validate rollback projection.
- Validate dữ liệu chuỗi rỗng/0/NULL.

### 13.2. Repository integration test

- Insert từng loại tạo đúng parent/child.
- Insert lỗi child rollback parent.
- Update common không làm mất detail.
- Update detail không ảnh hưởng loại khác.
- Delete parent cascade.
- Không tạo orphan/multiple-child.
- Batch approval chỉ update parent.
- Query list không gây N+1.

### 13.3. Import test

- Excel và manual cùng nghiệp vụ tạo persistence model tương đương.
- Bốn `activityType` có policy explicit.
- Preview không ghi DB.
- Commit ghi parent và child trong một transaction.
- Duplicate detection hoạt động theo từng loại.
- Commit lỗi rollback toàn batch.
- Preview token không cho client sửa DTO sau preview.

### 13.4. API/UI test

- Manual: nhập từng loại và nhiều loại trong một form.
- Excel: preview/commit ba sheet.
- Duyệt: render đúng detail bốn activity type.
- Edit: chỉ sửa đúng detail.
- Delete: parent/detail cùng biến mất.
- Batch approve theo đúng quyền.
- Lock năm học chặn write.
- Tổng hợp cá nhân/khoa và export không đổi số.

### 13.5. Regression test bắt buộc

- `soTietKTHP` trước/sau bằng nhau cho từng giảng viên/năm.
- Bảng A2 export giữ đúng số dòng và quy chuẩn.
- Duyệt hai cấp giữ nguyên kết quả lọc.
- `Ngân hàng câu hỏi` đã duyệt vẫn được tổng hợp theo quyết định nghiệp vụ.
- Không phát sinh khác biệt do label `Ra đề`/`Ra Đề`.

## 14. Phạm vi file dự kiến thay đổi

### Database

```text
database/migrations/*
```

### Backend

```text
src/repositories/vuotgio_v2/kthp.repo.js
src/repositories/vuotgio_v2/kthp/**
src/repositories/vuotgio_v2/tongHop.repo.js
src/repositories/vuotgio_v2/dataLock.repo.js
src/repositories/vuotgio_v2/duyetTongHop.repo.js
src/mappers/vuotgio_v2/kthp.mapper.js
src/services/vuotgio_v2/kthp.service.js
src/services/vuotgio_v2/kthpImport.service.js
src/services/vuotgio_v2/kthp-import/**
src/controllers/vuotgio_v2/duyetKTHP.controller.js
src/controllers/vuotgio_v2/coiChamRaDe.file.controller.js
src/routes/vuotGioV2Route.js
src/config/vuotgio_v2/templatePreview.alias.js
src/mappers/vuotgio_v2/summary.mapper.js
src/services/vuotgio_v2/excel/utils/sdo-data.helpers.js
```

### Frontend

```text
src/views/vuotgio_v2/vuotgio.add.coiChamRaDe.ejs
src/views/vuotgio_v2/vuotgio.file.coiChamRaDe.ejs
src/views/vuotgio_v2/vuotgio.duyet.coiChamRaDe.ejs
src/public/js/vuotgio_v2/themKTHP/index.js
src/public/js/ketthuchocphan/themfilecuoiki.js
src/public/js/vuotgio_v2/duyetKTHP/index.js
src/public/js/vuotgio_v2/caNhan/main.js
```

### Test và tài liệu

```text
test/vuotgio_v2/kthp-schema/**
test/vuotgio_v2/kthp-import/**
test/services/vuotgio_v2/kthp*.test.js
docs/vuotgio_v2/KTHP_IMPORT_WORKFLOW.md
docs/vuotgio_v2/KTHP_PARENT_CHILD_DB_CODE_REFACTOR_PLAN.md
```

## 15. Thứ tự implementation đề xuất

1. Chốt các decision gate ở mục 16.
2. Viết baseline và migration validation test.
3. Tạo schema expand và backfill trên DB snapshot.
4. Tạo canonical DTO/mapper.
5. Tạo parent/detail repositories và transaction facade.
6. Chuyển import save service.
7. Chuyển CRUD và approval service.
8. Chuyển tổng hợp, data lock, duyệt tổng hợp và export.
9. Chuyển manual view.
10. Chuyển Excel import view.
11. Chuyển approval view.
12. Chạy regression/E2E trên snapshot.
13. Cutover có khóa ghi ngắn.
14. Soak, sau đó mới contract legacy.

## 16. Decision gate đã chốt

1. `Ngân hàng câu hỏi` được tính trong tổng KTHP.
2. `Ngân hàng câu hỏi` dùng chung child `vg_kthp_ra_de` nhưng có
   `activityType = NGAN_HANG_CAU_HOI` và policy riêng.
3. Edit dữ liệu nghiệp vụ reset cả `khoa_duyet` và `khao_thi_duyet`.
4. Không cho đổi loại record khi edit; phải xóa và tạo record mới.
5. Một work item tương ứng một parent và đúng một child.
6. Dữ liệu bất thường hiện hữu được giữ nguyên khi backfill và được report;
   migration không tự chữa ngày thi, số ca hoặc quy chuẩn.
5. Một ca thi khác ngày/phòng có phải là một parent record riêng không?
   Plan mặc định là có.
6. `he_so = 0` hiện tại là “không áp dụng” hay hệ số thực?
7. Dòng Coi thi thiếu ngày và hai dòng Chấm thi quy chuẩn rất lớn được xử lý
   thế nào?
8. Có cần lưu breakdown calculator `1a...4j` không?
   Plan mặc định không lưu.

## 17. Definition of Done

Refactor hoàn thành khi:

- Schema parent/child đã chạy trên production và validation đạt 100%.
- Mỗi parent có đúng một child, không có orphan/multiple-child.
- ID và tổng quy chuẩn trước/sau khớp.
- Tất cả write KTHP đi qua một transaction facade.
- Không còn raw SQL KTHP trong service/controller.
- Manual và Excel dùng chung preview/commit canonical.
- View duyệt render/edit đúng detail theo loại.
- Approval và data lock chỉ cập nhật/đọc parent khi không cần chi tiết.
- Tổng hợp cá nhân/khoa, preview và export không sai khác.
- Endpoint legacy không còn frontend gọi.
- Có rollback procedure đã chạy thử trên snapshot.
- Bảng cũ được giữ trong thời gian soak và chỉ xóa bằng thay đổi riêng.
- Không có automatic fallback branch giữa schema mới/cũ.
- Không có silent default cho loại, nhân viên, hệ đào tạo hoặc field bắt buộc.
- Không có raw SQL KTHP ngoài repository.
- Không có parent thiếu child hoặc persistence error bị catch để tiếp tục.
- Mọi compatibility adapter còn lại đều có consumer, owner và tiêu chí xóa.
