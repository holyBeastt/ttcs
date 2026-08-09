# Kế hoạch refactor import Kết thúc học phần

## 1. Mục tiêu

Chuẩn hóa hai cách nhập dữ liệu Kết thúc học phần (KTHP):

- Import bằng file Excel.
- Nhập thủ công trên giao diện.

Hai nguồn dữ liệu phải đi qua cùng một pipeline kiểm tra, chuẩn hóa, phát hiện trùng và lưu dữ liệu. Khác biệt giữa hai nguồn chỉ nằm ở bước đọc đầu vào.

Kết quả mong muốn:

- Không còn hai nhánh lưu dữ liệu có logic khác nhau.
- Không bỏ sót các trường chi tiết của ra đề, coi thi và chấm thi.
- Không lưu bản ghi khi chưa xác định được nhân viên.
- Không mặc định âm thầm hệ đào tạo.
- Có preview và báo lỗi theo từng dòng trước khi ghi DB.
- Có thể thêm nguồn import mới mà không sửa pipeline chung.

## 2. Hiện trạng và vấn đề

### 2.1. Import Excel

Luồng hiện tại tập trung trong `kthpImport.service.js`:

1. Đọc workbook.
2. Phân nhánh theo sheet/loại công việc bằng `if/else`.
3. Chuẩn hóa dữ liệu ngay trong quá trình đọc.
4. Tìm nhân viên theo tên.
5. Tạo dữ liệu cho ra đề, coi thi hoặc chấm thi.
6. Lưu qua luồng riêng của import file.

Các vấn đề:

- Ghép người thực hiện bằng tên nên dễ sai khi tên không khớp hoàn toàn.
- Có thể tạo dữ liệu với `khoa` rỗng khi không tìm thấy nhân viên.
- Hệ đào tạo đang có giá trị mặc định riêng cho file.
- Logic đọc file, nghiệp vụ và lưu DB đang trộn lẫn.
- Quy chuẩn của từng loại công việc chưa được đóng gói thành policy độc lập.

### 2.2. Nhập thủ công

Nhập thủ công có lợi thế là chọn nhân viên và hệ đào tạo từ dữ liệu hệ thống, nhưng dùng luồng tạo payload và lưu riêng.

Các vấn đề:

- Validation không hoàn toàn giống import Excel.
- Có nguy cơ thiếu các trường chi tiết KTHP khi lưu batch.
- Cách tính hoặc tiếp nhận quy chuẩn có thể khác file Excel.
- Không có một contract chung để so sánh kết quả giữa hai nguồn.

### 2.3. Kết luận thiết kế

Không xây hai service import độc lập. Thiết kế đích:

```text
Excel file ──> ExcelInputStrategy ──┐
                                    ├─> Unified KTHP DTO
Manual form ─> ManualInputStrategy ─┘
                                             │
                                             v
       Normalize -> Resolve employee -> Type policy -> Validate
                                             │
                                             v
                             Detect duplicate -> Preview
                                             │
                                             v
                                  Transactional save
```

## 3. Kiến trúc đích

### 3.1. DTO dùng chung

Mọi strategy phải trả về cùng một cấu trúc trung gian:

```js
{
  source: "EXCEL" | "MANUAL",
  sourceRef: {
    fileName: null,
    sheetName: null,
    rowNumber: null
  },

  type: "RA_DE" | "COI_THI" | "CHAM_THI",
  employee: {
    id: null,
    name: "",
    department: ""
  },

  academicYear: "2025 - 2026",
  semester: "",
  educationSystemId: null,
  educationSystemName: "",

  course: {
    code: "",
    name: "",
    className: ""
  },

  exam: {
    date: null,
    room: "",
    shift: "",
    studentCount: null,
    pageCount: null,
    questionCount: null,
    examForm: "",
    role: ""
  },

  standardHours: null,
  notes: "",
  raw: {}
}
```

Nguyên tắc:

- DTO không chứa tên cột DB hoặc tên header Excel.
- Ngày được chuẩn hóa thành một kiểu duy nhất.
- Số phải là `number` hoặc `null`, không dùng chuỗi số.
- Năm học luôn có dạng `YYYY - YYYY`.
- `raw` chỉ phục vụ truy vết lỗi, không ghi trực tiếp vào bảng nghiệp vụ.

### 3.2. Input Strategy

Tạo interface thống nhất:

```js
class KthpInputStrategy {
  async parse(input, context) {
    throw new Error("Not implemented");
  }
}
```

Các implementation:

- `ExcelKthpInputStrategy`
  - Đọc workbook và sheet.
  - Ánh xạ header/cell vào DTO.
  - Gắn `fileName`, `sheetName`, `rowNumber`.
  - Không truy cập repository lưu KTHP.
- `ManualKthpInputStrategy`
  - Ánh xạ form/body vào cùng DTO.
  - Giữ `employee.id` và `educationSystemId` từ lựa chọn người dùng.
  - Không tự lưu DB.

Factory:

```js
KthpInputStrategyFactory.create("EXCEL");
KthpInputStrategyFactory.create("MANUAL");
```

Factory chỉ chọn strategy, không chứa nghiệp vụ.

### 3.3. Policy theo loại công việc

Tạo ba policy:

- `RaDeImportPolicy`
- `CoiThiImportPolicy`
- `ChamThiImportPolicy`

Interface:

```js
class KthpTypePolicy {
  normalize(dto, context) {}
  validate(dto, context) {}
  calculateStandardHours(dto, context) {}
  toPersistenceModel(dto, context) {}
}
```

Mỗi policy chịu trách nhiệm:

- Trường bắt buộc riêng theo loại.
- Chuẩn hóa các trường chi tiết.
- Kiểm tra giá trị âm, ngày không hợp lệ và dữ liệu thiếu.
- Tính quy chuẩn nếu nghiệp vụ yêu cầu hệ thống tính.
- Chuyển DTO chung thành model đầy đủ để lưu.

`KthpTypePolicyFactory` chọn policy theo `dto.activityType`.

Không dùng `OvertimePolicyFactory` cho bước import. Factory đó phục vụ chính sách tính vượt giờ theo năm học, không phải chính sách đọc/lưu KTHP.

### 3.4. Các service dùng chung

#### `KthpNormalizer`

- Chuẩn hóa khoảng trắng và Unicode.
- Chuẩn hóa tên để phục vụ tìm kiếm, nhưng giữ tên hiển thị gốc.
- Chuẩn hóa ngày Excel và ngày từ form.
- Chuẩn hóa số.
- Chuẩn hóa năm học về `YYYY - YYYY`.

#### `KthpEmployeeResolver`

Thứ tự resolve:

1. Nếu có `employee.id`, kiểm tra ID còn tồn tại và được phép sử dụng.
2. Nếu không có ID, tìm theo tên đã chuẩn hóa.
3. Nếu chỉ có đúng một kết quả, gắn ID, tên chuẩn và khoa.
4. Nếu không có hoặc có nhiều kết quả, trả lỗi theo dòng.

Không cho phép lưu nếu chưa resolve được nhân viên. Không dùng `khoa = ""` như một giá trị thay thế.

#### `KthpEducationSystemResolver`

- Với nhập thủ công: dùng ID người dùng đã chọn.
- Với Excel: người dùng chọn hệ đào tạo ở bước upload/preview hoặc file cung cấp giá trị hợp lệ.
- Kiểm tra ID và tên khớp dữ liệu hệ thống.
- Không hard-code `ĐH Đóng học phí` hoặc `heDaoTaoId = 1`.

#### `KthpDuplicateService`

Sinh fingerprint nghiệp vụ từ các trường ổn định, ví dụ:

- Loại công việc.
- Nhân viên.
- Năm học và học kỳ.
- Mã học phần/lớp học phần.
- Ngày thi, ca thi, phòng thi hoặc vai trò tùy loại.

Kiểm tra:

- Trùng trong cùng batch.
- Trùng với dữ liệu đã có trong DB.

Mặc định đề xuất: bỏ qua bản ghi trùng và báo rõ lý do trong preview. Không cập nhật đè tự động.

#### `KthpImportValidator`

Trả lỗi có cấu trúc:

```js
{
  code: "EMPLOYEE_NOT_FOUND",
  field: "employee.name",
  message: "Không tìm thấy nhân viên trong hệ thống",
  sourceRef: {
    sheetName: "Coi thi",
    rowNumber: 12
  }
}
```

Phân loại:

- `error`: không được phép lưu.
- `warning`: được phép lưu nhưng cần hiển thị cho người dùng.

#### `KthpImportSaveService`

- Nhận duy nhất các DTO đã resolve và validate thành công.
- Chuyển đổi qua mapper chung.
- Lưu toàn bộ batch trong transaction.
- Rollback toàn batch khi có lỗi DB.
- Không tự đọc Excel hoặc body HTTP.

### 3.5. Pipeline điều phối

`KthpImportOrchestrator` là điểm vào chung:

```js
async preview({ source, input, context })
async commit({ previewToken, actor })
```

Luồng `preview`:

1. Chọn input strategy.
2. Parse thành DTO.
3. Normalize dữ liệu chung.
4. Resolve nhân viên.
5. Resolve hệ đào tạo.
6. Chọn type policy.
7. Normalize và validate theo loại.
8. Tính/đối chiếu quy chuẩn.
9. Kiểm tra trùng.
10. Trả danh sách hợp lệ, cảnh báo, lỗi và thống kê.

Luồng `commit`:

1. Xác nhận preview token chưa hết hạn và thuộc đúng người dùng.
2. Không nhận lại payload nghiệp vụ đã bị client sửa.
3. Recheck các điều kiện có thể thay đổi như bản ghi trùng.
4. Lưu transaction.
5. Trả số bản ghi đã lưu, bỏ qua và lỗi.

## 4. Quyết định nghiệp vụ cần áp dụng

### 4.1. Nhân viên không tồn tại

- Không lưu bản ghi.
- Hiển thị tên, sheet và dòng bị lỗi.
- Cho phép người dùng sửa dữ liệu nguồn hoặc chọn nhân viên tương ứng trong preview ở phase sau.

### 4.2. Quy chuẩn từ Excel

- Giữ giá trị quy chuẩn trong file nếu đây là dữ liệu được đơn vị xác nhận.
- Hệ thống vẫn tính giá trị tham chiếu bằng policy.
- Nếu hai giá trị khác nhau, sinh warning và hiển thị cả hai.
- Không tự ghi đè giá trị trong file nếu chưa có quyết định nghiệp vụ khác.

### 4.3. Bản ghi trùng

- Không insert bản ghi trùng.
- Preview phải ghi rõ trùng trong file hay trùng DB.
- Không update bản ghi cũ ngầm.

### 4.4. Hệ đào tạo

- Bắt buộc xác định trước khi commit.
- Nhập thủ công lấy từ lựa chọn trên form.
- Import Excel yêu cầu chọn trước khi preview nếu file không có cột đáng tin cậy.

### 4.5. Transaction

- Một lần commit là một transaction.
- Lỗi DB làm rollback toàn bộ batch.
- Lỗi dữ liệu phải được phát hiện ở preview, không đợi đến lúc insert.

## 5. Cấu trúc file dự kiến

```text
src/services/vuotgio_v2/kthp-import/
├── kthpImport.orchestrator.js
├── kthpImportSave.service.js
├── kthpImportValidator.js
├── kthpNormalizer.js
├── kthpEmployeeResolver.js
├── kthpEducationSystemResolver.js
├── kthpDuplicate.service.js
├── dto/
│   └── kthpImport.dto.js
├── strategies/
│   ├── kthpInput.strategy.js
│   ├── kthpInputStrategy.factory.js
│   ├── excelKthpInput.strategy.js
│   └── manualKthpInput.strategy.js
└── policies/
    ├── kthpType.policy.js
    ├── kthpTypePolicy.factory.js
    ├── raDeImport.policy.js
    ├── coiThiImport.policy.js
    └── chamThiImport.policy.js
```

Các file hiện tại cần chuyển vai trò:

- `kthpImport.service.js`
  - Tạm thời trở thành facade tương thích ngược.
  - Gọi orchestrator mới.
  - Xóa dần logic parse/validate/save cũ sau khi migration hoàn tất.
- `kthp.service.js`
  - Dùng chung save service hoặc mapper khi nhập thủ công.
  - Không còn tự dựng câu lệnh lưu batch theo contract riêng.
- `kthp.mapper.js`
  - Là điểm ánh xạ duy nhất từ persistence model sang tham số repository.
- `kthp.repo.js`
  - Chỉ truy cập DB.
  - Bổ sung truy vấn kiểm tra fingerprint/trùng nếu cần.
- Controller/routes
  - Thêm endpoint preview và commit.
  - Giữ endpoint cũ trong giai đoạn chuyển tiếp.
- Frontend Excel và manual
  - Dùng cùng format response preview.
  - Hiển thị lỗi/cảnh báo theo dòng và thống kê trước khi commit.

## 6. Kế hoạch triển khai theo phase

### Phase 0 — Khóa hành vi hiện tại bằng test

Mục tiêu: tạo baseline trước refactor.

Công việc:

- Viết characterization test cho parser của ba loại sheet.
- Viết test cho payload nhập thủ công hiện tại.
- Dùng bốn file Excel thật trong `docs_private/kthp` làm fixture kiểm tra ở mức local/integration.
- Ghi nhận số dòng parse được, số nhân viên không resolve được và các trường quan trọng.
- Không ghi DB trong parser test.

Hoàn thành khi:

- Test mô tả rõ hành vi hiện tại.
- Có fixture tối giản không chứa dữ liệu nhạy cảm để chạy CI.

### Phase 1 — DTO và normalizer dùng chung

Mục tiêu: thống nhất ngôn ngữ dữ liệu.

Công việc:

- Tạo DTO schema.
- Tách chuẩn hóa tên, năm học, ngày và số.
- Chuyển parser Excel trả DTO.
- Chuyển body manual trả cùng DTO.

Hoàn thành khi:

- Cùng một nghiệp vụ từ Excel và manual tạo DTO tương đương.
- Năm học luôn có dạng `YYYY - YYYY`.

### Phase 2 — Strategy cho nguồn đầu vào

Mục tiêu: tách khác biệt nguồn dữ liệu khỏi nghiệp vụ.

Công việc:

- Tạo interface và factory.
- Tạo Excel strategy.
- Tạo Manual strategy.
- Đưa toàn bộ truy cập workbook vào Excel strategy.
- Không cho strategy gọi repository lưu dữ liệu.

Hoàn thành khi:

- Orchestrator không cần biết cấu trúc Excel hay body HTTP.
- Thêm strategy mới không yêu cầu sửa policy nghiệp vụ.

### Phase 3 — Policy cho loại công việc

Mục tiêu: cô lập quy tắc ra đề, coi thi và chấm thi.

Công việc:

- Tạo interface và factory.
- Di chuyển validation/tính quy chuẩn riêng vào ba policy.
- Bảo đảm đủ các trường chi tiết KTHP khi chuyển sang persistence model.
- Thêm unit test riêng cho từng policy.

Hoàn thành khi:

- Không còn chuỗi `if/else` lớn theo loại trong import service.
- Mỗi loại có contract và test độc lập.

### Phase 4 — Resolver và duplicate detection

Mục tiêu: ngăn dữ liệu mồ côi và trùng.

Công việc:

- Resolve nhân viên ưu tiên bằng ID, fallback bằng tên cho Excel.
- Phân biệt `not found` và `ambiguous`.
- Resolve hệ đào tạo, bỏ hard-code.
- Xây fingerprint cho từng loại.
- Kiểm tra trùng trong batch và DB.

Hoàn thành khi:

- Không có DTO hợp lệ nào thiếu `employee.id`, `department` hoặc hệ đào tạo.
- Preview chỉ rõ mọi bản ghi trùng.

### Phase 5 — Preview chung

Mục tiêu: người dùng xem và sửa lỗi trước khi ghi DB.

Response đề xuất:

```js
{
  summary: {
    total: 100,
    valid: 90,
    warning: 5,
    invalid: 10,
    duplicate: 3
  },
  rows: [],
  errors: [],
  warnings: [],
  previewToken: "..."
}
```

Công việc:

- Tạo orchestrator preview.
- Chuẩn hóa response cho Excel và manual.
- Cập nhật frontend hiển thị lỗi theo dòng.
- Chặn commit nếu còn error.

Hoàn thành khi:

- Hai nguồn hiển thị cùng loại lỗi theo cùng format.
- Người dùng biết chính xác bản ghi nào sẽ được lưu.

### Phase 6 — Save service và transaction

Mục tiêu: chỉ còn một đường ghi dữ liệu.

Công việc:

- Tạo save service.
- Dùng mapper/repository hiện có sau khi chuẩn hóa contract.
- Recheck duplicate trước insert.
- Lưu batch bằng transaction.
- Trả kết quả commit có thống kê.

Hoàn thành khi:

- Excel và manual gọi cùng save service.
- Các trường chi tiết được lưu giống nhau.
- DB rollback đầy đủ khi một thao tác ghi thất bại.

### Phase 7 — Migration tương thích

Mục tiêu: triển khai an toàn, không phá giao diện cũ.

Công việc:

- Giữ `kthpImport.service.js` làm facade.
- Cho endpoint cũ gọi pipeline mới.
- Bật pipeline mới theo từng nguồn hoặc feature flag nếu cần.
- So sánh output cũ/mới bằng log trong môi trường test.
- Xóa code cũ sau khi đạt parity.

Hoàn thành khi:

- Không còn consumer gọi trực tiếp logic import cũ.
- Không còn hai implementation lưu batch.

### Phase 8 — Dọn dẹp và tài liệu hóa

Công việc:

- Xóa branch và helper không còn sử dụng.
- Cập nhật tài liệu luồng KTHP.
- Ghi rõ format file, trường bắt buộc và cách xử lý lỗi.
- Ghi rõ rule năm học `YYYY - YYYY`.
- Bổ sung logging/audit cho batch import.

## 7. Kế hoạch test

Theo yêu cầu project, toàn bộ test mới đặt trong `test/`. Thư mục này hiện được `.gitignore`; cần bỏ rule ignore hoặc force-add nếu muốn commit test vào repository.

### 7.1. Unit test

```text
test/vuotgio_v2/kthp-import/unit/
├── kthpNormalizer.test.js
├── kthpInputStrategy.factory.test.js
├── excelKthpInput.strategy.test.js
├── manualKthpInput.strategy.test.js
├── kthpTypePolicy.factory.test.js
├── raDeImport.policy.test.js
├── coiThiImport.policy.test.js
├── chamThiImport.policy.test.js
├── kthpEmployeeResolver.test.js
├── kthpEducationSystemResolver.test.js
├── kthpDuplicate.service.test.js
└── kthpImportValidator.test.js
```

Ca kiểm tra bắt buộc:

- Năm học có/không có khoảng trắng đều được chuẩn hóa thành `YYYY - YYYY`.
- Ngày Excel serial, chuỗi ngày và ngày không hợp lệ.
- Số `0`, ô trống, chuỗi số và số âm.
- Nhân viên tồn tại, không tồn tại và trùng tên.
- Thiếu hệ đào tạo.
- Thiếu trường bắt buộc theo từng loại.
- Đủ tám trường chi tiết KTHP.
- Trùng trong batch và trùng DB.
- Quy chuẩn file khác quy chuẩn hệ thống tạo warning.

### 7.2. Contract test

Với cùng một bản ghi nghiệp vụ:

1. Parse từ fixture Excel.
2. Parse từ payload manual.
3. Loại bỏ metadata nguồn.
4. So sánh DTO và persistence model.

Đây là test quan trọng nhất để chứng minh hai cách nhập đã đồng bộ.

### 7.3. Integration test

- Preview không ghi DB.
- Commit hợp lệ ghi đủ trường.
- Batch lỗi DB rollback toàn bộ.
- Nhân viên không tồn tại không được ghi.
- Duplicate không được ghi lần hai.
- Permission của người dùng được kiểm tra.

### 7.4. Regression test với file thật

Chạy bốn file trong `docs_private/kthp`:

- Kiểm tra parser không crash.
- So sánh tổng số dòng theo từng loại.
- Kiểm tra lỗi resolve nhân viên được báo đúng dòng.
- Không khẳng định tất cả dòng hợp lệ vì một số tên hiện chưa có trong bảng nhân viên.
- Mặc định chạy ở chế độ preview/read-only.

### 7.5. End-to-end test

- Upload file → preview → commit → xem danh sách KTHP.
- Nhập manual → preview → commit → xem danh sách KTHP.
- Hai cách nhập cùng dữ liệu phải tạo kết quả lưu tương đương.

## 8. Thứ tự file nên triển khai

1. Test baseline và fixture tối giản.
2. `kthpImport.dto.js`.
3. `kthpNormalizer.js`.
4. Input strategy interface/factory và hai strategy.
5. Type policy interface/factory và bốn policy explicit.
6. Employee/education resolver.
7. Duplicate service.
8. Validator và orchestrator preview.
9. Save service và transaction.
10. Facade tương thích cho service cũ.
11. Controller/routes.
12. Frontend preview.
13. Integration/E2E test.
14. Xóa code cũ và cập nhật tài liệu.

## 9. Phạm vi file dự kiến thay đổi

Phạm vi chính:

- `src/services/vuotgio_v2/kthpImport.service.js`
- `src/services/vuotgio_v2/kthp.service.js`
- `src/services/vuotgio_v2/kthp-import/**`
- `src/mappers/vuotgio_v2/kthp.mapper.js`
- `src/repositories/vuotgio_v2/kthp.repo.js`
- Controller và route KTHP liên quan.
- JS frontend import file và nhập thủ công.
- View preview/import KTHP.
- `test/vuotgio_v2/kthp-import/**`

Không nằm trong refactor này:

- Thay đổi công thức tổng hợp vượt giờ ngoài KTHP.
- Thay đổi `OvertimePolicyFactory` ngoài việc bảo đảm nhận năm học chuẩn.
- Tự động tạo nhân viên mới từ tên trong file.
- Tự động ghi đè dữ liệu KTHP đã tồn tại.

## 10. Rủi ro và biện pháp

### Sai khác dữ liệu giữa luồng cũ và mới

- Dùng characterization test và contract test.
- Chạy preview song song để so sánh trước khi chuyển hẳn.

### Ghép nhầm nhân viên trùng tên

- Không chọn ngẫu nhiên khi có nhiều kết quả.
- Báo `EMPLOYEE_AMBIGUOUS`.
- Ưu tiên mã/ID nhân viên nếu bổ sung được vào template Excel.

### Thay đổi công thức quy chuẩn

- Policy version hóa theo năm học nếu công thức phụ thuộc thời gian.
- Format năm học chuẩn là `YYYY - YYYY`.
- Lưu cảnh báo khi file và hệ thống tính khác nhau.

### Batch lớn

- Parse một lần và giới hạn kích thước file.
- Tránh query nhân viên từng dòng; preload/index hoặc query theo tập tên.
- Insert theo chunk trong cùng transaction khi cần.

### Preview bị chỉnh sửa ở client

- Commit bằng preview token phía server.
- Không tin tưởng lại dữ liệu nghiệp vụ do browser gửi lên.

## 11. Tiêu chí nghiệm thu

Refactor được coi là hoàn thành khi:

- Excel và manual dùng cùng orchestrator, validator, policy và save service.
- Cùng một nghiệp vụ từ hai nguồn tạo persistence model tương đương.
- Không lưu dòng chưa resolve được nhân viên hoặc hệ đào tạo.
- Không còn hard-code hệ đào tạo trong Excel import.
- Không lưu thiếu các trường chi tiết ra đề/coi thi/chấm thi.
- Năm học được chuẩn hóa về `YYYY - YYYY`.
- Duplicate được phát hiện trước commit và recheck khi commit.
- Preview không ghi DB.
- Commit dùng transaction và rollback đúng.
- Unit, contract và integration test đều pass.
- Bốn file thật trong `docs_private/kthp` chạy preview ổn định và báo đúng các tên chưa có trong hệ thống.

## 12. Ước lượng triển khai

Ước lượng theo tám phase:

- Phase 0–2: 1.5–2 ngày.
- Phase 3–4: 2–3 ngày.
- Phase 5–6: 2–3 ngày.
- Phase 7–8 và regression: 1.5–2 ngày.

Tổng dự kiến: 7–10 ngày làm việc, tùy mức độ thay đổi frontend và quyết định nghiệp vụ về quy chuẩn/duplicate.
