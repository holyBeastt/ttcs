# Files

## File: skills/vuot_gio/excel-dept-analyzer/SKILL.md
````markdown
---
name: excel-dept-analyzer
description: Analyze, extract, and document business logic from department-specific Excel sheets (e.g., 'CNTT-092025', 'CB-092025', 'DTVM-092025', 'ATTT-092025', 'PHÂN HIỆU', etc.). Use this skill whenever the user asks to explain calculations for a specific faculty or department, especially regarding unit rates, the 300-hour cap, and workload distribution across different funding sources.
---

# Excel Department Sheet Analyzer

Skill này chuyên dùng để mổ xẻ các sheet chi tiết của từng Khoa/Phòng. Tất cả các sheet này đều tuân theo một bộ quy tắc tính toán thống nhất nhưng có dữ liệu đầu vào khác nhau.

## 1. Quy trình Phân tích (Analysis Workflow)

Khi nhận được yêu cầu cho một sheet Khoa cụ thể:

1.  **Xác định biến đầu vào (Inputs):**
    *   `base_income` (Cột C): Lương thực nhận.
    *   `required_hours` (Cột G): Định mức giờ giảng.
    *   `hours_by_source`: Tiết thực dạy chia theo các nguồn (VN, Lào, CPC, Đóng HP...).

2.  **Trích xuất Logic đặc trưng:**
    *   **Tính Đơn giá:** Kiểm tra công thức tại cột `AE`. Quy tắc chuẩn: `TRUNC(base_income / 176, 1)`.
    *   **Áp trần 300:** Kiểm tra công thức tại cột `AD`. Quy tắc: Nếu vượt > 300 thì chỉ tính 300.
    *   **Phân bổ nguồn:** Kiểm tra cách chia số tiết vượt đã áp trần cho từng nguồn quỹ tương ứng.

3.  **Tạo Đặc tả Kỹ thuật (Technical Spec):**
    *   Liệt kê các hằng số (Magic numbers) tìm thấy (VD: 176).
    *   Viết mã Python minh họa cho logic của sheet đó.

## 2. Quy tắc về Độ chính xác (Precision Rules)

*   **Hàm TRUNC:** Luôn dịch sang `math.floor(x * 10**n) / 10**n` hoặc xử lý tương đương để đảm bảo tiền không bị lệch 1 đồng.
*   **Hàm ROUND:** Dùng trong bước phân bổ tiết (thường làm tròn đến số nguyên).

## 3. Mẫu kết quả đầu ra (Required Output Format)

### [Tên Sheet] - Phân tích Logic Tính toán

**1. Từ điển dữ liệu ô:**
- `AE14`: Đơn giá thanh toán.
- `AD14`: Tiết vượt áp trần.

**2. Mô tả Logic:**
[Giải thích bằng lời các bước tính toán]

**3. Mã Python minh họa:**
```python
import math

def calculate_payment(base_income, actual_excess):
    unit_rate = math.floor(base_income / 176 * 10) / 10
    capped_excess = min(max(0, actual_excess), 300)
    # ... logic tiếp theo
```

## 4. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Tài liệu gốc về hệ thống tính toán vượt giờ.
````

## File: skills/vuot_gio/excel-master-consolidator/SKILL.md
````markdown
---
name: excel-master-consolidator
description: Analyze and document the consolidation logic in the 'TỔNG HỢP' (Master) sheet. Use this skill when the user asks how data from individual department sheets is gathered, mapped, and summarized into the main report. It focuses on cross-sheet references and the structure of the summary table.
---

# Excel Master Sheet Consolidator

Skill này chuyên dùng để giải mã "bản đồ tham chiếu" trong sheet Tổng hợp. Nhiệm vụ chính là xác định xem mỗi ô trong sheet Tổng hợp đang lấy dữ liệu từ đâu và theo quy tắc nào.

## 1. Quy trình Phân tích (Consolidation Analysis)

1.  **Nhận diện cấu trúc Khối (Block Identification):**
    *   Xác định các vùng dòng tương ứng với từng Khoa (VD: Dòng 14-30 là khoa CNTT).
    *   Tìm các ô chứa công thức tham chiếu sang sheet khác (VD: `='CNTT-092025'!A15`).

2.  **Lập bản đồ Tham chiếu (Reference Mapping):**
    *   Tạo bảng đối chiếu giữa Cột trong Master và Cột trong Dept Sheet.
    *   Phát hiện các ô có logic tính toán thêm tại Master (không chỉ là link đơn thuần).

3.  **Xác định Logic Tổng hợp (Aggregation Logic):**
    *   Kiểm tra các dòng "Cộng" hoặc "Tổng cộng" ở cuối mỗi khối hoặc cuối sheet.
    *   Sử dụng regex hoặc scripts để đếm số lượng tham chiếu ngoại.

## 2. Lưu ý về Liên kết (Link Integrity)

*   **Tên Sheet động:** Chú ý các hậu tố như `-092025`. Skill phải có khả năng nhận diện pattern tên sheet.
*   **Lỗi tham chiếu:** Cảnh báo nếu có ô #REF! hoặc link đến sheet không tồn tại.

## 3. Mẫu kết quả đầu ra (Required Output Format)

### Phân tích Sheet TỔNG HỢP 2025

**1. Bản đồ tham chiếu các Khoa:**
| Khoa | Vùng dòng (Master) | Sheet Nguồn (Source) |
| :--- | :--- | :--- |
| CNTT | 38 - 50 | `CNTT-092025` |
| ... | ... | ... |

**2. Logic ánh xạ cột:**
- Cột A (Master) -> Lấy từ Cột A (Source).
- Cột AK (Master) -> Lấy từ Cột AK (Source).

**3. Mã Python minh họa (Data Loading):**
```python
# Ví dụ loop qua các sheet để lấy dữ liệu
faculty_sheets = ['CNTT-092025', 'CB-092025', ...]
for sheet in faculty_sheets:
    data = load_from_sheet(sheet)
    # Map to master layout...
```

## 4. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Xem phần 4.2 về Luồng liên kết Master -> Detail.
````

## File: skills/vuot_gio/excel-payment-generator/SKILL.md
````markdown
---
name: excel-payment-generator
description: Analyze and document the final payment logic in the 'Tiền chuyển khoản' sheet. Use this skill when the user asks about the final amounts to be paid to each department or the bank transfer list generation. It focuses on the final aggregation of calculated values for payout.
---

# Excel Payment Sheet Generator

Skill này tập trung vào giai đoạn cuối cùng của quy trình: Kết xuất số tiền cần thanh toán cho từng đơn vị/cá nhân dựa trên kết quả từ sheet Tổng hợp.

## 1. Quy trình Phân tích (Payment Analysis)

1.  **Xác định nguồn tiền (Payment Sources):**
    *   Trace ngược các ô trong sheet `Tiền chuyển khoản` về sheet `TỔNG HỢP 2025`.
    *   Thường là các hàm `SUM` các ô tổng cộng của từng Khoa.

2.  **Kiểm tra tính toàn vẹn (Integrity Check):**
    *   Đảm bảo tổng tiền tại sheet Payment khớp chính xác với tổng tiền tại sheet Master.
    *   Phát hiện các khoản phụ thu hoặc khấu trừ (nếu có) được thực hiện ở bước này.

3.  **Định dạng đầu ra (Output Formatting):**
    *   Mô tả cấu trúc danh sách ngân hàng (Số tài khoản, Tên đơn vị, Số tiền).

## 2. Mẫu kết quả đầu ra (Required Output Format)

### Phân tích Sheet Tiền chuyển khoản

**1. Nguồn dữ liệu:**
Dữ liệu được tổng hợp từ các dòng tổng cộng của sheet `TỔNG HỢP 2025`.

**2. Bảng đối soát nhanh:**
| Đơn vị | Số tiền (Master) | Số tiền (Payment) | Trạng thái |
| :--- | :--- | :--- | :--- |
| Khoa CNTT | [Amount] | [Amount] | OK |

**3. Mã Python minh họa (Bank List):**
```python
def generate_bank_list(master_summary):
    payment_list = []
    for dept, amount in master_summary.items():
        payment_list.append({
            "dept": dept,
            "total": amount
        })
    return payment_list
```

## 3. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Xem phần 4.3 về Luồng liên kết Master -> Payment.
````

## File: src/services/vuotgio_v2/consolidatedExport.service.js
````javascript
/**
 * VUOT GIO V2 - Consolidated Export Service (Type B: Tổng hợp Khoa/Phòng)
 *
 * Cấu trúc file xuất:
 *   1. Các Sheet Khoa/Phòng (36 cột): chi tiết từng đơn vị
 *   2. Sheet TỔNG HỢP (Master): danh sách tất cả khoa, liên kết dữ liệu
 *   3. Sheet TIỀN THANH TOÁN (Payment): bảng kê chuyển khoản toàn trường
 *
 * Folder: src/services/vuotgio_v2/department_excel/  (ConsolidatedGenerator)
 */

const { ConsolidatedGenerator, PaymentCalculator } = require('./department_excel');

// ─── Re-export constants (backward-compat) ──────────────────────────────────
const PAYMENT_RATE    = PaymentCalculator.PAYMENT_RATE;
const STANDARD_HOURS  = PaymentCalculator.STANDARD_HOURS;
const MAX_PAYABLE_HOURS = PaymentCalculator.MAX_PAYABLE_HOURS;

/**
 * Xuất workbook tổng hợp toàn trường theo Khoa/Phòng.
 * Bao gồm đầy đủ 3 loại sheet (Khoa + Tổng hợp + Tiền chuyển khoản).
 *
 * @param {string} namHoc
 * @returns {Promise<ExcelJS.Workbook>}
 */
const exportConsolidatedByDepartment = async (namHoc) => {
    return ConsolidatedGenerator.generateConsolidatedWorkbook(namHoc);
};

/**
 * Lấy dữ liệu preview tổng hợp (không tạo file Excel).
 * Dùng cho frontend hiển thị trước khi xuất.
 *
 * @param {string} namHoc
 * @returns {Promise<Object>}
 */
const getConsolidatedPreviewData = async (namHoc) => {
    return ConsolidatedGenerator.getConsolidatedPreviewData(namHoc);
};

/** @deprecated Dùng PaymentCalculator.truncDecimals */
const truncDecimals = (value, digits = 2) => PaymentCalculator.truncDecimals(value, digits);

module.exports = {
    exportConsolidatedByDepartment,
    getConsolidatedPreviewData,
    truncDecimals,
    PAYMENT_RATE,
    STANDARD_HOURS,
    MAX_PAYABLE_HOURS,
};
````

## File: src/services/vuotgio_v2/excel/components/excel-block.renderer.js
````javascript
const {
  BORDERS,
  COLOR,
  cellAddr,
  mergeAndStyle,
  richText,
  styleCell,
  sumFormula,
} = require("../utils/excel-style.utils");

const DEFAULT_RENDER_OPTIONS = {
  useFormulas: true,
  codeSeparator: ".",
  sectionNumbering: false,
  sectionSubtotalGap: 1,
};

const numericColIndexes = (columns) => {
  const explicit = columns
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.includeInSubtotal)
    .map((x) => x.i);
  if (explicit.length) return explicit;

  const marked = columns
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.isNumeric)
    .map((x) => x.i);
  return marked.length ? marked : [columns.length - 1];
};

const numericNumFmt = (column) => {
  if (!column || !column.isNumeric) return undefined;
  const decimals = Math.max(0, column.numericFormat?.decimalPlaces ?? 2);
  const useThousands = column.numericFormat?.useThousandsSeparator ?? true;
  const intPart = useThousands ? "#,##0" : "0";
  return decimals === 0 ? intPart : `${intPart}.${"0".repeat(decimals)}`;
};

const columnTextColor = (column, fallback) => (column?.highlightColumn ? COLOR.RED : fallback);

const alphaCode = (index) => {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};

const stripLeadingHierarchyCode = (label) =>
  label.replace(/^\s*(?:[A-Z](?:\.\d+)+\.?|[A-Z]\.|[0-9]+(?:\.\d+)+\.?|[IVXLCDM]+\.)\s+/i, "").trimStart();

const applyGroupOutlineBorder = (sheet, startRow, endRow, startCol, endCol) => {
  const medium = { style: "medium", color: { argb: COLOR.BORDER } };

  for (let col = startCol; col <= endCol; col += 1) {
    const topCell = sheet.getCell(startRow, col);
    topCell.border = { ...(topCell.border ?? {}), top: medium };

    const bottomCell = sheet.getCell(endRow, col);
    bottomCell.border = { ...(bottomCell.border ?? {}), bottom: medium };
  }

  for (let row = startRow; row <= endRow; row += 1) {
    const leftCell = sheet.getCell(row, startCol);
    leftCell.border = { ...(leftCell.border ?? {}), left: medium };

    const rightCell = sheet.getCell(row, endCol);
    rightCell.border = { ...(rightCell.border ?? {}), right: medium };
  }
};

const normalizeColumns = (columns, layout) => {
  const totalCols = Math.max(2, layout.totalCols);
  const normalized = Array.from({ length: totalCols }, () => ({ label: "" }));

  const first = columns[0];
  const last = columns.length > 1 ? columns[columns.length - 1] : undefined;
  const middle = columns.slice(1, -1);

  if (first) normalized[0] = { ...first };
  if (last) normalized[totalCols - 1] = { ...last };

  const middleSlots = Math.max(0, totalCols - 2);
  for (let i = 0; i < Math.min(middle.length, middleSlots); i += 1) {
    normalized[i + 1] = { ...middle[i] };
  }

  normalized.forEach((col, index) => {
    const widthFromConfig = layout.colWidths?.[index];
    if (widthFromConfig !== undefined) {
      col.width = widthFromConfig;
    }
  });

  return normalized;
};

const normalizeRowCells = (cells, totalCols) => {
  const normalized = Array.from({ length: totalCols }, () => "");
  if (!cells.length) return normalized;

  normalized[0] = cells[0] ?? "";
  if (cells.length > 1) {
    normalized[totalCols - 1] = cells[cells.length - 1] ?? "";
  }

  const middleInput = cells.slice(1, -1);
  const middleSlots = Math.max(0, totalCols - 2);
  for (let i = 0; i < Math.min(middleInput.length, middleSlots); i += 1) {
    normalized[i + 1] = middleInput[i] ?? "";
  }

  return normalized;
};

const normalizeSection = (section, totalCols) => ({
  ...section,
  rows: section.rows.map((row) => ({ ...row, cells: normalizeRowCells(row.cells, totalCols) })),
});

const normalizeBlock = (block, layout) => {
  const columns = normalizeColumns(block.columns, layout);
  const totalCols = columns.length;
  const lastColIndex = totalCols - 1;

  return {
    ...block,
    columns,
    sections: block.sections.map((section) => {
      const normalizedSection = normalizeSection(section, totalCols);
      if (normalizedSection.subtotalColIndex !== undefined && normalizedSection.subtotalColIndex >= totalCols) {
        normalizedSection.subtotalColIndex = lastColIndex;
      }
      if (normalizedSection.subtotalColIndexes?.length) {
        normalizedSection.subtotalColIndexes = normalizedSection.subtotalColIndexes.filter(
          (index) => index >= 0 && index < totalCols,
        );
        if (!normalizedSection.subtotalColIndexes.length) {
          normalizedSection.subtotalColIndexes = [lastColIndex];
        }
      }
      return normalizedSection;
    }),
    grandTotal: block.grandTotal
      ? {
          ...block.grandTotal,
          colIndex:
            block.grandTotal.colIndex !== undefined && block.grandTotal.colIndex < totalCols
              ? block.grandTotal.colIndex
              : lastColIndex,
          colIndexes: block.grandTotal.colIndexes?.filter((index) => index >= 0 && index < totalCols),
        }
      : undefined,
    finalTotal: block.finalTotal
      ? {
          ...block.finalTotal,
          colIndex:
            block.finalTotal.colIndex !== undefined && block.finalTotal.colIndex < totalCols
              ? block.finalTotal.colIndex
              : lastColIndex,
          colIndexes: block.finalTotal.colIndexes?.filter((index) => index >= 0 && index < totalCols),
        }
      : undefined,
  };
};

const applyColumnWidths = (sheet, columns, startCol = 1) => {
  columns.forEach((col, i) => {
    sheet.getColumn(startCol + i).width = col.width ?? 20;
  });
};

const renderBlockTitle = (ctx, block, startCol = 1) => {
  const { title } = block;
  if (!title) return;
  const { sheet, colCount } = ctx;
  const endCol = startCol + colCount - 1;

  let cellValue;
  if (title.annotation) {
    cellValue = richText([
      { text: `${title.label} `, bold: true, italic: true },
      { text: title.annotation, italic: true, color: COLOR.RED },
    ]);
  } else {
    cellValue = title.label;
  }

  sheet.getRow(ctx.currentRow);
  mergeAndStyle(sheet, ctx.currentRow, startCol, ctx.currentRow, endCol, cellValue, {
    bold: true,
    italic: true,
    hAlign: "left",
    borders: BORDERS.noBorder(),
  });
  ctx.currentRow += 1;

  if (title.bulletLines) {
    for (const line of title.bulletLines) {
      mergeAndStyle(sheet, ctx.currentRow, startCol, ctx.currentRow, endCol, line.text, {
        fontColor: line.color ?? COLOR.RED,
        italic: true,
        hAlign: "left",
        borders: BORDERS.noBorder(),
      });
      ctx.currentRow += 1;
    }
  }
};

const renderGroupTitle = (ctx, title, startCol = 1) => {
  const { sheet, colCount } = ctx;
  const endCol = startCol + colCount - 1;

  let cellValue;
  if (title.annotation) {
    cellValue = richText([
      { text: `${title.label} `, bold: true },
      { text: title.annotation, italic: true, color: COLOR.RED },
    ]);
  } else {
    cellValue = title.label;
  }

  sheet.getRow(ctx.currentRow);
  mergeAndStyle(sheet, ctx.currentRow, startCol, ctx.currentRow, endCol, cellValue, {
    bold: true,
    hAlign: "left",
    borders: BORDERS.noBorder(),
    fontSize: 12,
  });
  ctx.currentRow += 1;
};

const renderHeaderRow = (ctx, columns, startCol = 1) => {
  const { sheet, currentRow } = ctx;
  sheet.getRow(currentRow);
  columns.forEach((col, i) => {
    const cell = sheet.getCell(currentRow, startCol + i);
    cell.value = col.label;
    styleCell(cell, {
      bgColor: COLOR.HEADER_BG,
      fontColor: columnTextColor(col, COLOR.BLACK),
      bold: true,
      hAlign: "center",
      vAlign: "middle",
      wrapText: true,
    });
  });
  ctx.currentRow += 1;
};

const renderSectionHeader = (ctx, section, startCol = 1) => {
  if (!section.label) {
    return;
  }
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;

  let cellValue;
  if (section.annotation) {
    cellValue = richText([
      { text: `${section.label} `, italic: true },
      { text: section.annotation, italic: true, color: COLOR.RED },
    ]);
  } else {
    cellValue = section.label;
  }

  mergeAndStyle(sheet, currentRow, startCol, currentRow, endCol, cellValue, {
    bgColor: COLOR.WHITE,
    italic: true,
    hAlign: "left",
    vAlign: "middle",
  });
  ctx.currentRow += 1;
};

const renderDataRows = (ctx, rows, columns, startCol = 1) => {
  const { sheet } = ctx;
  const renderedRows = [];

  const safeRows = rows.length
    ? rows
    : [
        {
          cells: Array.from({ length: columns.length }, () => ""),
        },
      ];

  safeRows.forEach((row) => {
    const excelRow = ctx.currentRow;
    renderedRows.push(excelRow);

    columns.forEach((colDef, i) => {
      const col = startCol + i;
      const cell = sheet.getCell(excelRow, col);
      cell.value = row.cells[i] ?? null;

      const colNumFmt = numericNumFmt(colDef);
      if (colNumFmt) {
        cell.numFmt = colNumFmt;
      }

      styleCell(cell, {
        bgColor: COLOR.WHITE,
        fontColor: columnTextColor(colDef, row.fontColor ?? COLOR.BLACK),
        hAlign: colDef.align ?? "center",
      });

      if (colDef.validation?.length) {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`\"${colDef.validation.join(",")}\"`],
          showErrorMessage: true,
          errorTitle: "Giá trị không hợp lệ",
          error: `Chỉ được chọn: ${colDef.validation.join(", ")}`,
        };
      }
    });

    ctx.currentRow += 1;
  });

  return renderedRows;
};

const sumValues = (sheet, rowNumbers, colNumber) => {
  let total = 0;
  rowNumbers.forEach((row) => {
    const value = sheet.getCell(row, colNumber).value;
    if (typeof value === "number") {
      total += value;
    } else if (value && typeof value === "object" && typeof value.result === "number") {
      total += value.result;
    }
  });
  return total;
};

const evalFormula = (sheet, formula) => {
  if (!formula || typeof formula !== "string") return 0;
  const trimmed = formula.trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("SUM(")) {
    const inner = trimmed.slice(4, -1);
    const refs = inner.split(",").map((s) => s.trim()).filter(Boolean);
    return refs.reduce((sum, ref) => sum + evalFormula(sheet, ref), 0);
  }
  const cell = sheet.getCell(trimmed);
  const value = cell.value;
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.result === "number") return value.result;
  return 0;
};

const renderSubtotalRow = (
  ctx,
  label,
  dataRowNumbers,
  sumColIndexes,
  columns,
  startCol = 1,
  renderOptions = DEFAULT_RENDER_OPTIONS,
) => {
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;
  const firstSumColExcel = startCol + Math.min(...sumColIndexes);
  const labelEndCol = firstSumColExcel > startCol ? firstSumColExcel - 1 : startCol;

  mergeAndStyle(sheet, currentRow, startCol, currentRow, labelEndCol, label, {
    bgColor: COLOR.SUBTOTAL_BG,
    hAlign: "center",
  });

  const sumColsExcel = new Set(sumColIndexes.map((i) => startCol + i));
  sumColIndexes.forEach((idx) => {
    const sumColExcel = startCol + idx;
    const cell = sheet.getCell(currentRow, sumColExcel);
    if (renderOptions.useFormulas) {
      const sumCells = dataRowNumbers.map((r) => cellAddr(r, sumColExcel));
      cell.value = { formula: sumFormula(sumCells) };
    } else {
      cell.value = sumValues(sheet, dataRowNumbers, sumColExcel);
    }
    cell.numFmt = numericNumFmt(columns?.[idx]) ?? "#,##0.00";
    styleCell(cell, {
      bgColor: COLOR.SUBTOTAL_BG,
      fontColor: columnTextColor(columns?.[idx], COLOR.BLUE),
      bold: true,
      hAlign: "center",
    });
  });

  for (let c = firstSumColExcel; c <= endCol; c += 1) {
    if (!sumColsExcel.has(c)) {
      styleCell(sheet.getCell(currentRow, c), { bgColor: COLOR.SUBTOTAL_BG });
    }
  }

  const subtotalRow = ctx.currentRow;
  ctx.currentRow += 1;
  return subtotalRow;
};

const renderGrandTotalRow = (
  ctx,
  label,
  subtotalRowNumbers,
  sumColIndexes,
  columns,
  startCol = 1,
  renderOptions = DEFAULT_RENDER_OPTIONS,
) => {
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;
  const firstSumColExcel = startCol + Math.min(...sumColIndexes);
  const labelEndCol = firstSumColExcel > startCol ? firstSumColExcel - 1 : startCol;

  mergeAndStyle(sheet, currentRow, startCol, currentRow, labelEndCol, label, {
    bgColor: COLOR.GRAND_TOTAL_BG,
    bold: true,
    hAlign: "center",
    borders: BORDERS.topBottomMedium(),
  });

  const sumColsExcel = new Set(sumColIndexes.map((i) => startCol + i));
  sumColIndexes.forEach((idx) => {
    const sumColExcel = startCol + idx;
    const cell = sheet.getCell(currentRow, sumColExcel);
    if (renderOptions.useFormulas) {
      const sumCells = subtotalRowNumbers.map((r) => cellAddr(r, sumColExcel));
      cell.value = { formula: sumFormula(sumCells) };
    } else {
      cell.value = sumValues(sheet, subtotalRowNumbers, sumColExcel);
    }
    cell.numFmt = numericNumFmt(columns?.[idx]) ?? "#,##0.00";
    styleCell(cell, {
      bgColor: COLOR.GRAND_TOTAL_BG,
      fontColor: columnTextColor(columns?.[idx], COLOR.BLUE),
      bold: true,
      hAlign: "center",
      borders: BORDERS.topBottomMedium(),
    });
  });

  for (let c = firstSumColExcel; c <= endCol; c += 1) {
    if (!sumColsExcel.has(c)) {
      styleCell(sheet.getCell(currentRow, c), {
        bgColor: COLOR.GRAND_TOTAL_BG,
        borders: BORDERS.topBottomMedium(),
      });
    }
  }

  const row = ctx.currentRow;
  ctx.currentRow += 1;
  return row;
};

const renderFinalTotalRow = (
  ctx,
  label,
  sumColIndexes,
  values = [],
  externalFormulaCells = [],
  columns,
  startCol = 1,
  renderOptions = DEFAULT_RENDER_OPTIONS,
) => {
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;
  const firstSumColExcel = startCol + Math.min(...sumColIndexes);
  const labelEndCol = firstSumColExcel > startCol ? firstSumColExcel - 1 : startCol;

  mergeAndStyle(sheet, currentRow, startCol, currentRow, labelEndCol, label, {
    bgColor: COLOR.FINAL_TOTAL_BG,
    bold: true,
    hAlign: "center",
    borders: BORDERS.allMedium(),
  });

  const sumColsExcel = new Set(sumColIndexes.map((i) => startCol + i));
  sumColIndexes.forEach((idx, arrIdx) => {
    const sumColExcel = startCol + idx;
    const cell = sheet.getCell(currentRow, sumColExcel);
    const extCell = externalFormulaCells[arrIdx];
    if (renderOptions.useFormulas) {
      if (extCell) {
        cell.value = { formula: extCell };
      } else {
        cell.value = values[arrIdx] ?? null;
      }
    } else if (extCell) {
      cell.value = evalFormula(sheet, extCell);
    } else {
      cell.value = values[arrIdx] ?? null;
    }
    cell.numFmt = numericNumFmt(columns?.[idx]) ?? "#,##0.00";
    styleCell(cell, {
      bgColor: COLOR.FINAL_TOTAL_BG,
      fontColor: columnTextColor(columns?.[idx], COLOR.DARK_RED),
      bold: true,
      hAlign: "center",
      borders: BORDERS.allMedium(),
    });
  });

  for (let c = firstSumColExcel; c <= endCol; c += 1) {
    if (!sumColsExcel.has(c)) {
      styleCell(sheet.getCell(currentRow, c), { bgColor: COLOR.FINAL_TOTAL_BG, borders: BORDERS.allMedium() });
    }
  }

  const row = ctx.currentRow;
  ctx.currentRow += 1;
  return row;
};

const renderBlock = (sheet, block, startRow = 1, startCol = 1, layout, numbering, renderOptions = {}) => {
  const options = { ...DEFAULT_RENDER_OPTIONS, ...renderOptions };
  const normalizedBlock = normalizeBlock(block, layout);
  const colCount = normalizedBlock.columns.length;
  const ctx = { sheet, currentRow: startRow, colCount };

  const defaultSumCols = numericColIndexes(normalizedBlock.columns);

  const resolvedTitle = (() => {
    if (!numbering || numbering.prefixBlockTitle === false || normalizedBlock.disableTitlePrefix) return normalizedBlock.title;
    const base = normalizedBlock.title ? stripLeadingHierarchyCode(normalizedBlock.title.label) : "";
    const label = base ? `${numbering.blockCode}${options.codeSeparator}${base}` : numbering.blockCode;
    return {
      ...(normalizedBlock.title ?? {}),
      label,
    };
  })();

  applyColumnWidths(sheet, normalizedBlock.columns, startCol);
  renderBlockTitle(ctx, { ...normalizedBlock, title: resolvedTitle }, startCol);
  renderHeaderRow(ctx, normalizedBlock.columns, startCol);

  const subtotalRows = [];
  const sectionCodes = [];
  const sectionMetas = [];

  for (let sectionIndex = 0; sectionIndex < normalizedBlock.sections.length; sectionIndex += 1) {
    const section = normalizedBlock.sections[sectionIndex];
    const sectionCode = numbering && options.sectionNumbering
      ? `${numbering.sectionBaseCode ?? numbering.blockCode}.${sectionIndex + 1}`
      : undefined;
    const resolvedSection = sectionCode
      ? { ...section, label: `${sectionCode}${options.codeSeparator}${stripLeadingHierarchyCode(section.label)}` }
      : section;

    if (sectionCode) {
      sectionCodes.push(sectionCode);
    }

    renderSectionHeader(ctx, resolvedSection, startCol);
    const dataRows = renderDataRows(ctx, section.rows, normalizedBlock.columns, startCol);

    if (options.sectionSubtotalGap > 0) {
      ctx.currentRow += options.sectionSubtotalGap;
    }

    const sumCols =
      section.subtotalColIndexes ??
      (section.subtotalColIndex !== undefined ? [section.subtotalColIndex] : defaultSumCols);
    const subtotalLabel = section.subtotalLabel ?? (sectionCode ? `Tổng ${sectionCode}` : "Tổng cộng");
    const subtotalRow = renderSubtotalRow(
      ctx,
      subtotalLabel,
      dataRows,
      sumCols,
      normalizedBlock.columns,
      startCol,
      options,
    );
    subtotalRows.push(subtotalRow);
    sectionMetas.push({
      tag: section.metaTag,
      label: resolvedSection.label,
      dataStart: dataRows[0],
      dataEnd: dataRows[dataRows.length - 1],
      subtotalRow,
      sumCols,
      startCol,
    });
  }

  let grandTotalRow;
  if (!numbering?.suppressGrandTotalRow) {
    const blockSumCols =
      normalizedBlock.grandTotal?.colIndexes ??
      (normalizedBlock.grandTotal?.colIndex !== undefined ? [normalizedBlock.grandTotal.colIndex] : defaultSumCols);
    const blockTotalLabel =
      normalizedBlock.grandTotal?.label ??
      (numbering && sectionCodes.length ? `Tổng ${numbering.blockCode} = ${sectionCodes.join(" + ")}` : "Tổng block");
    grandTotalRow = renderGrandTotalRow(
      ctx,
      blockTotalLabel,
      subtotalRows,
      blockSumCols,
      normalizedBlock.columns,
      startCol,
      options,
    );
  }

  let finalTotalRow;
  if (normalizedBlock.finalTotal) {
    const sumCols =
      normalizedBlock.finalTotal.colIndexes ??
      (normalizedBlock.finalTotal.colIndex !== undefined ? [normalizedBlock.finalTotal.colIndex] : defaultSumCols);
    const finalTotalLabel = normalizedBlock.finalTotal.label ?? (numbering ? `Tổng ${numbering.blockCode}` : "Tổng block");
    const hasManualFinal =
      (normalizedBlock.finalTotal.values?.length ?? 0) > 0 ||
      (normalizedBlock.finalTotal.externalFormulaCells?.length ?? 0) > 0;

    let externalFormulaCells = normalizedBlock.finalTotal.externalFormulaCells ?? [];
    if (!hasManualFinal) {
      externalFormulaCells = sumCols.map((idx) => {
        const refs = subtotalRows.map((r) => cellAddr(r, startCol + idx));
        if (!refs.length) return "";
        return refs.length === 1 ? refs[0] : sumFormula(refs);
      });
    }

    finalTotalRow = renderFinalTotalRow(
      ctx,
      finalTotalLabel,
      sumCols,
      normalizedBlock.finalTotal.values ?? [],
      externalFormulaCells,
      normalizedBlock.columns,
      startCol,
      options,
    );
  }

  return {
    subtotalRows,
    grandTotalRow,
    finalTotalRow,
    nextRow: ctx.currentRow,
    blockCode: numbering?.blockCode,
    sectionCodes,
    sectionMetas,
  };
};

const renderBlocks = (sheet, blocks, startRow = 1, startCol = 1, rowGap = 0, layout, renderOptions = {}) => {
  const results = [];
  let currentRow = startRow;
  for (let i = 0; i < blocks.length; i += 1) {
    const result = renderBlock(sheet, blocks[i], currentRow, startCol, layout, undefined, renderOptions);
    results.push(result);
    currentRow = result.nextRow + (i < blocks.length - 1 ? rowGap : 0);
  }
  return results;
};

const renderBlockGroups = (sheet, groups, startRow = 1, startCol = 1, rowGap = 0, layout, renderOptions = {}) => {
  const options = { ...DEFAULT_RENDER_OPTIONS, ...renderOptions };
  const allResults = [];
  let currentRow = startRow;
  const groupMetas = [];

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const groupCode = alphaCode(i);
    const hasMultipleBlocks = group.blocks.length > 1;
    const groupStartRow = currentRow;

    if (group.title) {
      const groupTitle = group.disableTitlePrefix
        ? group.title
        : {
            ...group.title,
            label: `${groupCode}${options.codeSeparator}${stripLeadingHierarchyCode(group.title.label)}`,
          };
      const groupCtx = { sheet, currentRow, colCount: layout.totalCols };
      renderGroupTitle(groupCtx, groupTitle, startCol);
      currentRow = groupCtx.currentRow;
    } else {
      const groupCtx = { sheet, currentRow, colCount: layout.totalCols };
      renderGroupTitle(groupCtx, { label: `${groupCode}${options.codeSeparator}` }, startCol);
      currentRow = groupCtx.currentRow;
    }

    const blockResults = [];
    for (let blockIndex = 0; blockIndex < group.blocks.length; blockIndex += 1) {
      const blockCode = hasMultipleBlocks ? `${groupCode}.${blockIndex + 1}` : groupCode;
      const block = group.blocks[blockIndex];
      const suppressBlockGrandTotalRow =
        (!hasMultipleBlocks && Boolean(group.finalTotal)) ||
        (block.sections.length === 1 && !block.finalTotal) ||
        Boolean(block.finalTotal);

      const result = renderBlock(
        sheet,
        block,
        currentRow,
        startCol,
        layout,
        {
          blockCode,
          sectionBaseCode: hasMultipleBlocks ? blockCode : groupCode,
          prefixBlockTitle: hasMultipleBlocks,
          suppressGrandTotalRow: suppressBlockGrandTotalRow,
        },
        options,
      );
      blockResults.push(result);
      currentRow = result.nextRow + (blockIndex < group.blocks.length - 1 ? (group.rowGap ?? rowGap) : 0);
    }

    allResults.push(...blockResults);

    if (blockResults.length) {
      currentRow = blockResults[blockResults.length - 1].nextRow;
    }

    const groupFinal = group.finalTotal ?? {};
    let groupFinalRow;
    let groupSumCols = [];
    {
      const sampleBlock = group.blocks[0];
      const normalizedSample = sampleBlock ? normalizeBlock(sampleBlock, layout) : undefined;
      const defaultSumCols = normalizedSample ? numericColIndexes(normalizedSample.columns) : [layout.totalCols - 1];
      const sumCols =
        groupFinal.colIndexes ?? (groupFinal.colIndex !== undefined ? [groupFinal.colIndex] : defaultSumCols);
      groupSumCols = sumCols;

      const blockCodes = blockResults.map((r) => r.blockCode).filter((code) => code !== undefined);
      const firstBlockSections = blockResults[0]?.sectionCodes ?? [];

      const autoGroupFinalLabel = blockCodes.length
        ? blockCodes.length === 1 && firstBlockSections.length
          ? `Tổng ${groupCode} = ${firstBlockSections.join(" + ")}`
          : `Tổng ${groupCode} = ${blockCodes.join(" + ")}`
        : `Tổng ${groupCode}`;
      const finalLabel = groupFinal.label ?? autoGroupFinalLabel;

      const hasManualFinal = (groupFinal.values?.length ?? 0) > 0 || (groupFinal.externalFormulaCells?.length ?? 0) > 0;

      const grandRows = blockResults
        .map((r) => r.grandTotalRow)
        .filter((rowNumber) => rowNumber !== undefined);

      const sourceRows = grandRows.length
        ? grandRows
        : blockResults.flatMap((result) => result.subtotalRows ?? []);

      const externalFormulaCells = hasManualFinal
        ? (groupFinal.externalFormulaCells ?? [])
        : sumCols.map((idx) => {
            const refs = sourceRows.map((r) => cellAddr(r, startCol + idx));
            if (!refs.length) return "";
            return refs.length === 1 ? refs[0] : sumFormula(refs);
          });

      const ctx = { sheet, currentRow, colCount: layout.totalCols };
      groupFinalRow = renderFinalTotalRow(
        ctx,
        finalLabel,
        sumCols,
        groupFinal.values ?? [],
        externalFormulaCells,
        normalizedSample?.columns,
        startCol,
        options,
      );
      currentRow = ctx.currentRow;
    }

    if (groupFinalRow !== undefined) {
      groupMetas.push({ code: groupCode, tag: group.summaryTag, finalRow: groupFinalRow, sumCols: groupSumCols });
    }

    const groupEndRow = currentRow - 1;
    if (groupEndRow >= groupStartRow) {
      applyGroupOutlineBorder(sheet, groupStartRow, groupEndRow, startCol, startCol + layout.totalCols - 1);
    }

    currentRow += i < groups.length - 1 ? rowGap : 0;
  }

  allResults.groupMetas = groupMetas;
  return allResults;
};

module.exports = {
  renderBlocks,
  renderBlockGroups,
  renderBlock,
  DEFAULT_RENDER_OPTIONS,
  sumValues,
  evalFormula,
};
````

## File: src/services/vuotgio_v2/excel/components/excel-document.renderer.js
````javascript
const { renderDocumentHeader } = require("./excel-header.renderer");
const { renderBlockGroups } = require("./excel-block.renderer");
const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("../layouts/excel-global-layout.config");

const renderDocument = (sheet, doc, startRow = 1, startCol = 1, renderOptions = {}) => {
  let row = startRow;

  row = renderDocumentHeader(sheet, doc.header, row, startCol);

  row += 1;

  const results = renderBlockGroups(
    sheet,
    doc.groups,
    row,
    startCol,
    doc.rowGap ?? 0,
    EXCEL_GLOBAL_BLOCKS_LAYOUT,
    renderOptions,
  );
  if (results.length) {
    row = results[results.length - 1].nextRow;
  }

  row += 1;

  return row;
};

module.exports = {
  renderDocument,
};
````

## File: src/services/vuotgio_v2/excel/components/excel-header.renderer.js
````javascript
const { BORDERS, COLOR, mergeAndStyle, richText } = require("../utils/excel-style.utils");

const estimateWrappedRowHeight = (text, charsPerLine, lineHeight = 16) => {
  const normalized = text.replace(/\r\n/g, "\n");
  const explicitLines = normalized.split("\n");
  const visualLines = explicitLines.reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );
  return Math.max(lineHeight, visualLines * lineHeight);
};

const renderDocumentHeader = (sheet, header, startRow = 1, startCol = 1) => {
  const { totalCols } = header;
  const endCol = startCol + totalCols - 1;
  const midCol = Math.ceil(totalCols / 2);

  let row = startRow;

  mergeAndStyle(sheet, row, startCol, row, midCol - 1, header.leftTop, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
    fontSize: 12,
  });
  mergeAndStyle(sheet, row, midCol, row, endCol, header.rightTop, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
    fontSize: 12,
  });
  row += 1;

  mergeAndStyle(sheet, row, startCol, row, midCol - 1, header.leftSub, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
  });
  mergeAndStyle(sheet, row, midCol, row, endCol, header.rightSub, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
  });
  row += 1;

  if (header.dateLine) {
    mergeAndStyle(sheet, row, midCol, row, endCol, header.dateLine, {
      italic: true,
      hAlign: "center",
      borders: BORDERS.noBorder(),
    });
  }
  row += 1;

  row += 1;

  mergeAndStyle(sheet, row, startCol, row, endCol, header.title, {
    bold: true,
    hAlign: "center",
    wrapText: true,
    borders: BORDERS.noBorder(),
    fontSize: 14,
  });
  row += 1;

  mergeAndStyle(sheet, row, startCol, row, endCol, header.subtitle, {
    bold: true,
    hAlign: "center",
    wrapText: true,
    borders: BORDERS.noBorder(),
  });
  row += 1;

  if (header.legalNote) {
    sheet.getRow(row).height = estimateWrappedRowHeight(header.legalNote, 52, 18);
    mergeAndStyle(sheet, row, startCol, row, endCol, header.legalNote, {
      italic: true,
      fontColor: COLOR.RED,
      hAlign: "center",
      vAlign: "middle",
      wrapText: true,
      borders: BORDERS.noBorder(),
    });
    row += 1;
  }

  row += 1;

  if (header.personalFields?.length) {
    let i = 0;
    while (i < header.personalFields.length) {
      const field = header.personalFields[i];
      const isFieldHighlighted = field.highlightValue ?? false;

      if (field.fullWidth) {
        const cellValue = richText([
          { text: `${field.label} ` },
          { text: field.value, color: isFieldHighlighted ? COLOR.RED : COLOR.BLACK },
        ]);
        mergeAndStyle(sheet, row, startCol, row, endCol, cellValue, {
          hAlign: "left",
          borders: BORDERS.noBorder(),
        });
        i += 1;
      } else {
        const leftVal = richText([
          { text: `${field.label} ` },
          { text: field.value, color: isFieldHighlighted ? COLOR.RED : COLOR.BLACK },
        ]);
        mergeAndStyle(sheet, row, startCol, row, midCol - 1, leftVal, {
          hAlign: "left",
          borders: BORDERS.noBorder(),
        });

        const next = header.personalFields[i + 1];
        if (next && !next.fullWidth) {
          const isNextHighlighted = next.highlightValue ?? false;
          const rightVal = richText([
            { text: `${next.label} ` },
            { text: next.value, color: isNextHighlighted ? COLOR.RED : COLOR.BLACK },
          ]);
          mergeAndStyle(sheet, row, midCol, row, endCol, rightVal, {
            hAlign: "left",
            borders: BORDERS.noBorder(),
          });
          i += 2;
        } else {
          i += 1;
        }
      }
      row += 1;
    }
  }

  return row;
};

module.exports = {
  renderDocumentHeader,
};
````

## File: src/services/vuotgio_v2/excel/components/kekhai-payment.component.js
````javascript
const { COLOR, styleCell } = require("../utils/excel-style.utils");
const PaymentCalculator = require("../../department_excel/data/calculator");

const renderPaymentSheet = (workbook, summaries) => {
  const sheet = workbook.addWorksheet("Tiền chuyển khoản", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  sheet.properties.defaultRowHeight = 22;
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  [6, 26, 12, 22, 24, 18].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E79" } };
  const subFill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9EAF7" } };
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "A9D08E" } };

  const applyBorder = (cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  };

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "TIỀN CHUYỂN KHOẢN";
  styleCell(sheet.getCell("A1"), { bgColor: titleFill.fgColor.argb, bold: true, fontColor: COLOR.WHITE, fontSize: 14, hAlign: "center" });

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = "Bảng kê thanh toán vượt giờ";
  styleCell(sheet.getCell("A2"), { bgColor: subFill.fgColor.argb, bold: true, hAlign: "center" });

  const headers = ["STT", "Họ tên giảng viên", "Mã phòng ban", "Số tài khoản", "Ngân hàng", "Số tiền chuyển khoản"];
  headers.forEach((label, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = label;
    styleCell(cell, { bgColor: headerFill.fgColor.argb, bold: true, hAlign: "center", wrapText: true });
  });

  let row = 5;
  let total = 0;

  (summaries || []).forEach((summary, index) => {
    const bd = summary.breakdown || PaymentCalculator.computeSdoBreakdown(summary.tableF, summary.thanhToan, summary.luong);
    const amount = bd.thucNhan ?? bd.money?.total ?? PaymentCalculator.calculatePaymentAmount(summary.thanhToan || 0, summary.luong || 0);
    total += amount;
    const values = [
      index + 1,
      summary.giangVien || "",
      summary.maKhoa || summary.khoa || "",
      summary.soTaiKhoan || "",
      summary.nganHang || "",
      amount,
    ];

    values.forEach((value, colIndex) => {
      const cell = sheet.getCell(row, colIndex + 1);
      cell.value = value;
      cell.numFmt = colIndex === 5 ? "#,##0.00" : undefined;
      applyBorder(cell);
      styleCell(cell, {
        hAlign: colIndex === 1 || colIndex === 5 ? "left" : "center",
        fontSize: 11,
      });
    });

    row += 1;
  });

  sheet.mergeCells(`A${row}:E${row}`);
  const totalLabelCell = sheet.getCell(row, 1);
  totalLabelCell.value = "TỔNG CỘNG";
  styleCell(totalLabelCell, { bold: true, bgColor: "EEF3FF", hAlign: "center" });

  const totalCell = sheet.getCell(row, 6);
  totalCell.value = Number(total.toFixed(2));
  totalCell.numFmt = "#,##0.00";
  styleCell(totalCell, { bold: true, bgColor: "EEF3FF", hAlign: "center" });

  for (let col = 1; col <= 6; col += 1) {
    applyBorder(sheet.getCell(row, col));
    sheet.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF3FF" } };
  }

  return sheet;
};

module.exports = {
  renderPaymentSheet,
};
````

## File: src/services/vuotgio_v2/excel/components/kekhai-summary.component.js
````javascript
const { BORDERS, COLOR, mergeAndStyle, styleCell } = require("../utils/excel-style.utils");
const KeKhaiFormulaGenerator = require("../generators/kekhai-formula.generator");

/**
 * Summary Component Service cho báo cáo Kê khai cá nhân Giảng viên
 * Cô lập toàn bộ các thao tác dựng hình, gộp ô, màu sắc và cấu trúc của Section E và Section F.
 */
class KeKhaiSummaryComponent {
  /**
   * Dựng Section E: Tổng hợp khối lượng đã thực hiện và đề nghị thanh toán vượt giờ
   * @param {Object} sheet Đối tượng Worksheet của ExcelJS
   * @param {number} startRow Dòng bắt đầu vẽ
   * @param {Object} summary Dữ liệu SDO Atomic của giảng viên
   * @param {Array} groupMetas Metadata của các group A, B, C từ block renderer
   * @param {boolean} useFormulas Cờ kích hoạt xuất công thức động
   * @returns {number} Dòng tiếp theo sau khi vẽ xong
   */
  static renderSummarySectionE(sheet, startRow, summary, groupMetas, useFormulas) {
    let row = startRow;

    mergeAndStyle(sheet, row, 1, row, 7, "E. TỔNG HỢP KHỐI LƯỢNG ĐÃ THỰC HIỆN VÀ ĐỀ NGHỊ THANH TOÁN VƯỢT GIỜ", {
      bold: true,
      hAlign: "left",
      borders: BORDERS.noBorder(),
      fontSize: 12,
    });
    row += 1;

    // Header row
    styleCell(sheet.getCell(row, 1), { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center" });
    sheet.getCell(row, 1).value = "TT";
    mergeAndStyle(sheet, row, 2, row, 4, "Nội dung công việc", {
      bgColor: COLOR.HEADER_BG,
      bold: true,
      hAlign: "center",
      wrapText: true,
    });
    styleCell(sheet.getCell(row, 5), { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center" });
    sheet.getCell(row, 5).value = "Số tiết";
    mergeAndStyle(sheet, row, 6, row, 7, "Lý do giảm trừ tại mục IV", {
      bgColor: COLOR.HEADER_BG,
      bold: true,
      hAlign: "center",
      wrapText: true,
    });
    row += 1;

    // Lấy bộ dữ liệu chuẩn hóa từ Formula Generator Service
    const tableE = summary.tableE || {};
    const eValues = KeKhaiFormulaGenerator.getSectionEValues(tableE, groupMetas, row, useFormulas);

    const rows = [
      { tt: "I", label: "Tổng số tiết thực hiện (A+B+C)", value: eValues.valI },
      { tt: "II", label: "Số tiết định mức phải giảng", value: eValues.valII },
      { tt: "III", label: "Số tiết chưa hoàn thành NCKH", value: eValues.valIII },
      { tt: "IV", label: "Số tiết được giảm trừ (theo lý do giảm trừ)", value: eValues.valIV },
      { tt: "V", label: "Tổng số tiết vượt giờ (I - II - III + IV)", value: eValues.valV },
      { tt: "VI", label: "Tổng số tiết vượt giờ đề nghị thanh toán", value: eValues.valVI },
    ];

    const dataStartRow = row;
    rows.forEach((item) => {
      sheet.getCell(row, 1).value = item.tt;
      styleCell(sheet.getCell(row, 1), { hAlign: "center" });
      mergeAndStyle(sheet, row, 2, row, 4, item.label, { hAlign: "center" });
      sheet.getCell(row, 5).value = item.value;
      sheet.getCell(row, 5).numFmt = "#,##0.00";
      styleCell(sheet.getCell(row, 5), { hAlign: "center", fontColor: COLOR.BLUE, bold: true });
      // Áp dụng đường viền cho các ô trống ở cột diễn giải lý do
      styleCell(sheet.getCell(row, 6), {});
      styleCell(sheet.getCell(row, 7), {});
      row += 1;
    });

    // Merge cột 6-7 cho toàn bộ phần diễn giải lý do giảm trừ
    mergeAndStyle(sheet, dataStartRow, 6, row - 1, 7, tableE.ly_do || "", {
      hAlign: "center",
      vAlign: "middle",
      wrapText: true,
    });

    return row;
  }

  /**
   * Dựng Section F: Tổng số tiết thống kê theo từng hệ đào tạo
   * @param {Object} sheet Worksheet ExcelJS
   * @param {number} startRow Dòng bắt đầu vẽ
   * @param {Object} summary Dữ liệu SDO
  * @param {boolean} useFormulas Cờ công thức
  * @param {Array|undefined} formulaRows Công thức cho từng dòng F (theo thứ tự VN/Lào/Cuba/CPC/Đóng HP)
   * @returns {number} Dòng tiếp theo
   */
  static renderStatsTableF(sheet, startRow, summary, useFormulas, formulaRows) {
    let row = startRow;
    const tableF = summary.tableF || { rows: [], totals: {} };

    mergeAndStyle(sheet, row, 1, row, 7, "F. TỔNG SỐ TIẾT THỐNG KÊ THEO TỪNG HỆ ĐÀO TẠO", {
      bold: true,
      hAlign: "left",
      borders: BORDERS.noBorder(),
      fontSize: 12,
    });
    row += 1;

    const headers = [
      "TT",
      "Đối tượng",
      "Số tiết thực hiện HK 1",
      "Số tiết thực hiện HK 2",
      "Hướng dẫn ĐATN",
      "Tham quan thực tế",
      "Tổng số tiết cả năm",
    ];
    headers.forEach((label, index) => {
      const cell = sheet.getCell(row, 1 + index);
      cell.value = label;
      styleCell(cell, { bgColor: COLOR.STATS_HEADER_BG, bold: true, hAlign: "center", wrapText: true });
    });
    row += 1;

    const dataStartRow = row;
    (tableF.rows || []).forEach((item, idx) => {
      const rowFormulas = Array.isArray(formulaRows) ? formulaRows[idx] : null;
      sheet.getCell(row, 1).value = item.tt;
      styleCell(sheet.getCell(row, 1), { hAlign: "center" });
      sheet.getCell(row, 2).value = item.doi_tuong || "";
      styleCell(sheet.getCell(row, 2), { hAlign: "center" });
      if (useFormulas && rowFormulas) {
        sheet.getCell(row, 3).value = { formula: rowFormulas.hk1 };
        sheet.getCell(row, 4).value = { formula: rowFormulas.hk2 };
        sheet.getCell(row, 5).value = { formula: rowFormulas.doAn };
        sheet.getCell(row, 6).value = { formula: rowFormulas.thamQuan };
        sheet.getCell(row, 7).value = { formula: `SUM(C${row}:F${row})` };
      } else {
        sheet.getCell(row, 3).value = item.hk1 || 0;
        sheet.getCell(row, 4).value = item.hk2 || 0;
        sheet.getCell(row, 5).value = item.do_an || 0;
        sheet.getCell(row, 6).value = item.tham_quan || 0;
        // Nạp công thức tổng hàng ngang từ Formula Generator Service
        sheet.getCell(row, 7).value = KeKhaiFormulaGenerator.getTableFRowTotal(item.tong, row, useFormulas);
      }

      for (let col = 3; col <= 7; col += 1) {
        sheet.getCell(row, col).numFmt = "#,##0.00";
        styleCell(sheet.getCell(row, col), { hAlign: "center" });
      }
      row += 1;
    });

    // Dòng tổng cộng dọc ở tfoot
    mergeAndStyle(sheet, row, 1, row, 2, "Tổng:", { bold: true, hAlign: "center" });
    const staticTotals = {
      3: tableF.totals?.hk1,
      4: tableF.totals?.hk2,
      5: tableF.totals?.do_an,
      6: tableF.totals?.tham_quan,
      7: tableF.totals?.tong,
    };

    [3, 4, 5, 6, 7].forEach((colIdx) => {
      const cell = sheet.getCell(row, colIdx);
      const colLetter = String.fromCharCode(64 + colIdx);

      if (useFormulas && dataStartRow <= row - 1) {
        cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${row - 1})` };
      } else {
        cell.value = KeKhaiFormulaGenerator.getTableFColumnTotal(
          staticTotals[colIdx],
          colLetter,
          dataStartRow,
          row - 1,
          false
        );
      }
      cell.numFmt = "#,##0.00";
      styleCell(cell, { bold: true, hAlign: "center" });
    });
    row += 1;

    return row;
  }
}

module.exports = KeKhaiSummaryComponent;
````

## File: src/services/vuotgio_v2/excel/generators/kekhai-formula.generator.js
````javascript
/**
 * Formula Generator Service cho báo cáo Kê khai cá nhân Giảng viên
 * Chịu trách nhiệm cô lập toàn bộ các chuỗi công thức Excel động nhằm đảm bảo nguyên tắc SRP.
 */
class KeKhaiFormulaGenerator {
  /**
   * Đóng gói giá trị gán cho Cell (giữ nguyên tĩnh nếu useFormulas = false)
   * @param {number|string} staticVal Giá trị tĩnh fallback
   * @param {string} formulaStr Chuỗi công thức Excel
   * @param {boolean} useFormulas Cờ quyết định xuất công thức hay giá trị
   */
  static getCellValue(staticVal, formulaStr, useFormulas) {
    if (useFormulas && formulaStr) {
      return { formula: formulaStr };
    }
    return Number(staticVal) || 0;
  }

  /**
   * Lấy công thức tính Tổng A + B + C (dùng cho dòng tổng sau Block C và dòng I Mục E)
   * @param {Array} groupMetas Metadata của các group đã render từ renderBlockGroups
   * @returns {string|null} Chuỗi công thức SUM
   */
  static getSumABCFormula(groupMetas) {
    if (!Array.isArray(groupMetas)) return null;
    const gMeta = (code) => groupMetas.find((m) => m.code === code);
    const metaA = gMeta("A");
    const metaB = gMeta("B");
    const metaC = gMeta("C");

    const cells = [];
    if (metaA?.finalRow) cells.push(`G${metaA.finalRow}`);
    if (metaB?.finalRow) cells.push(`G${metaB.finalRow}`);
    if (metaC?.finalRow) cells.push(`G${metaC.finalRow}`);

    return cells.length > 0 ? `SUM(${cells.join(",")})` : null;
  }

  /**
   * Sinh toàn bộ công thức hoặc giá trị tĩnh cho 6 dòng của Mục E (Tổng hợp khối lượng)
   * @param {Object} tableE Dữ liệu tĩnh từ SDO
   * @param {Array} groupMetas Metadata các group A, B, C
   * @param {number} startRow Dòng Excel bắt đầu của bảng E (dòng I)
   * @param {boolean} useFormulas Cờ bật công thức
   */
  static getSectionEValues(tableE = {}, groupMetas = [], startRow, useFormulas) {
    const rI = startRow;
    const rII = startRow + 1;
    const rIII = startRow + 2;
    const rIV = startRow + 3;
    const rV = startRow + 4;
    const rVI = startRow + 5;

    // Dòng I: Tổng số tiết thực hiện (A+B+C)
    const fI = this.getSumABCFormula(groupMetas);
    const valI = this.getCellValue(tableE.i, fI, useFormulas);

    // Dòng II: Số tiết định mức phải giảng (Tĩnh)
    const valII = Number(tableE.ii) || 0;

    // Dòng III: Số tiết chưa hoàn thành NCKH (Tĩnh)
    const valIII = Number(tableE.iii) || 0;

    // Dòng IV: Số tiết được giảm trừ (Tĩnh)
    const valIV = Number(tableE.iv) || 0;

    // Dòng V: Tổng số tiết vượt giờ (I - II - III + IV)
    const fV = `MAX(0,E${rI}-E${rII}-E${rIII}+E${rIV})`;
    const valV = this.getCellValue(tableE.v, fV, useFormulas);

    // Dòng VI: Tổng số tiết vượt giờ đề nghị thanh toán
    // Giới hạn thanh toán <= Định mức sau miễn giảm (II - IV)
    const fVI = `MIN(E${rV},E${rII}-E${rIV})`;
    const valVI = this.getCellValue(tableE.vi, fVI, useFormulas);

    return { valI, valII, valIII, valIV, valV, valVI };
  }

  /**
   * Lấy công thức tổng dòng cho bảng F (Thống kê theo hệ đào tạo)
   * Tổng = HK1 (Col C) + HK2 (Col D) + ĐATN (Col E) + TQTT (Col F)
   */
  static getTableFRowTotal(staticTong, rowIdx, useFormulas) {
    const formula = `SUM(C${rowIdx}:F${rowIdx})`;
    return this.getCellValue(staticTong, formula, useFormulas);
  }

  /**
   * Lấy công thức tổng cột cho dòng Tổng cộng ở footer bảng F
   */
  static getTableFColumnTotal(staticTotal, colLetter, startRow, endRow, useFormulas) {
    const formula = startRow <= endRow ? `SUM(${colLetter}${startRow}:${colLetter}${endRow})` : null;
    return this.getCellValue(staticTotal, formula, useFormulas);
  }
}

module.exports = KeKhaiFormulaGenerator;
````

## File: src/services/vuotgio_v2/excel/index.js
````javascript
const { buildWorkbook, renderKeKhaiWorksheet } = require("./generators/keKhaiReport.generator");

module.exports = {
  buildWorkbook,
  renderKeKhaiWorksheet,
};
````

## File: src/services/vuotgio_v2/excel/layouts/excel-columns.constants.js
````javascript
const columnsA1 = () => [
  { label: "TT", align: "center" },
  { label: "Tên học phần", align: "center" },
  { label: "Số TC (HT)", align: "center", isNumeric: true },
  { label: "Lớp học phần", align: "center" },
  { label: "Đối tượng", align: "center", highlightColumn: true },
  { label: "Số tiết theo TKB", align: "center", isNumeric: true, includeInSubtotal: true },
  { label: "Số tiết QC", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsA2 = () => [
  { label: "TT", align: "center" },
  { label: "Tên học phần", align: "center" },
  { label: "Ra đề/ Coi thi/ Chấm thi kết thúc học phần", align: "center" },
  { label: "Lớp học phần", align: "center" },
  { label: "Đối tượng", align: "center", highlightColumn: true },
  { label: "Số sinh viên của lớp", align: "center", isNumeric: true },
  {
    label: "Số tiết ra đề/ Coi thi/ Chấm thi",
    align: "center",
    isNumeric: true,
    includeInSubtotal: true,
  },
];

const columnsB = () => [
  { label: "TT", align: "center" },
  { label: "Họ tên NCS, Học viên, Sinh viên", align: "center" },
  { label: "Khóa đào tạo", align: "center" },
  { label: "Số QĐ Giao Luận án, Luận văn, đồ án", align: "center" },
  { label: "Số người HD", align: "center", isNumeric: true },
  { label: "HD chính/ HD hai", align: "center" },
  { label: "Số tiết quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsC = () => [
  { label: "TT", align: "center" },
  { label: "Mô tả hoạt động", align: "center" },
  { label: "Khóa đào tạo", align: "center" },
  { label: "Theo QĐ", align: "center" },
  { label: "Số ngày", align: "center", isNumeric: true },
  { label: "Số ngày", align: "center", isNumeric: true },
  { label: "Số tiết quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD1 = () => [
  { label: "TT", align: "center" },
  { label: "Tên đề tài, dự án (mã số đề tài, dự án)", align: "center" },
  { label: "Chủ trì/ thành viên", align: "center" },
  { label: "Cấp đề tài", align: "center" },
  { label: "Ngày nghiệm thu", align: "center" },
  { label: "Kết quả xếp loại", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD2 = () => [
  { label: "TT", align: "center" },
  { label: "Tên sáng kiến (mã số sáng kiến nếu có)", align: "center" },
  { label: "Chủ trì/ thành viên", align: "center" },
  { label: "Sáng kiến", align: "center" },
  { label: "Ngày nghiệm thu", align: "center" },
  { label: "Kết quả xếp loại", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD3 = () => [
  { label: "TT", align: "center" },
  { label: "Tên giải pháp khoa học, giải thưởng; Bằng sáng chế", align: "center" },
  { label: "Số QĐ công nhận", align: "center" },
  { label: "Ngày QĐ công nhận", align: "center" },
  { label: "Số người", align: "center", isNumeric: true },
  { label: "Tác giả chính/ thành viên", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD4 = () => [
  { label: "TT", align: "center" },
  { label: "Tên đề xuất (mã số nếu có)", align: "center" },
  { label: "Chủ trì/ thành viên", align: "center" },
  { label: "Cấp quốc gia, quốc tế; cấp Bộ và tương đương; cấp cơ sở", align: "center" },
  { label: "Ngày nghiệm thu", align: "center" },
  { label: "Kết quả xếp loại", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD5 = () => [
  { label: "TT", align: "center" },
  { label: "Tên sách, giáo trình", align: "center" },
  { label: "Số xuất bản", align: "center" },
  { label: "Số trang", align: "center" },
  { label: "Số người", align: "center", isNumeric: true },
  { label: "Tác giả chính/ thành viên", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD6 = () => [
  { label: "TT", align: "center" },
  { label: "Tên bài báo", align: "center" },
  { label: "Loại tạp chí/ hội nghị", align: "center" },
  { label: "Chỉ số tạp chí/ hội nghị", align: "center" },
  { label: "Số người", align: "center", isNumeric: true },
  { label: "Tác giả chính/ thành viên", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD7 = () => [
  { label: "TT", align: "center" },
  { label: "Tên đề tài", align: "center" },
  { label: "Số QĐ giao nhiệm vụ", align: "center" },
  { label: "Ngày ký QĐ giao nhiệm vụ", align: "center" },
  { label: "Kết quả bảo vệ cấp Khoa", align: "center" },
  { label: "Kết quả bảo vệ cấp Học viện", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD8 = () => [
  { label: "TT", align: "center" },
  { label: "Tên hội đồng khoa học", align: "center" },
  { label: "Hội đồng cấp", align: "center" },
  { label: "Hội đồng cấp", align: "center" },
  { label: "Chức danh (chủ tịch, phản biện, ủy viên)", align: "center" },
  { label: "Số QĐ giao nhiệm vụ, ngày ký QĐ", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD9 = () => [
  { label: "TT", align: "center" },
  { label: "Tên nhiệm vụ", align: "center" },
  { label: "Số QĐ giao nhiệm vụ", align: "center" },
  { label: "Ngày kí QĐ", align: "center" },
  { label: "Nghiệm vụ được phân công theo quyết định", align: "center" },
  { label: "Nghiệm vụ được phân công theo quyết định", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

module.exports = {
  columnsA1,
  columnsA2,
  columnsB,
  columnsC,
  columnsD1,
  columnsD2,
  columnsD3,
  columnsD4,
  columnsD5,
  columnsD6,
  columnsD7,
  columnsD8,
  columnsD9,
};
````

## File: src/services/vuotgio_v2/excel/layouts/excel-global-layout.config.js
````javascript
const EXCEL_GLOBAL_BLOCKS_LAYOUT = {
  totalCols: 7,
  colWidths: [4, 30, 22, 20, 22, 12, 12],
};

module.exports = {
  EXCEL_GLOBAL_BLOCKS_LAYOUT,
};
````

## File: src/services/vuotgio_v2/excel/layouts/kekhai.layout.builder.js
````javascript
const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("./excel-global-layout.config");
const { TAGS } = require("./section-tags.constants");
const {
  columnsA1, columnsA2, columnsB, columnsC,
  columnsD1, columnsD2, columnsD3, columnsD4,
  columnsD5, columnsD6, columnsD7, columnsD8, columnsD9,
} = require("./excel-columns.constants");
const {
  filterA1, mapA1Row, filterA2, mapA2Row,
  filterB, bFilterMatMa, bFilterDongHP, mapBRow,
  filterC, cFilterMatMa, cFilterDongHP, mapCRow,
  filterD, mapDRow, ensureRows, numberRows, normDate,
} = require("../utils/sdo-data.helpers");

const buildHeader = (summary) => ({
  leftTop: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
  leftSub: `KHOA: ${summary?.khoa || summary?.maKhoa || ""}`,
  rightTop: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
  rightSub: "Độc lập - Tự do - Hạnh phúc",
  dateLine: `Hà Nội, ngày ...... tháng ...... năm ${new Date().getFullYear()}`,
  title: "KÊ KHAI",
  subtitle: `Khối lượng thực hiện nhiệm vụ đào tạo, khoa học và công nghệ năm học ${summary?.nam_hoc || summary?.namHoc || ""}`,
  legalNote:
    "(Căn cứ theo QĐ 1267/QĐ-HVM ngày 04 tháng 12 năm 2025 về việc ban hành Quy định mức giờ chuẩn giảng dạy và nghiên cứu khoa học đối với nhà giáo và trợ lý nghiên cứu tại Học viện Kỹ thuật mật mã)",
  personalFields: [
    { label: "Họ và tên:", value: summary?.giangVien || "" },
    { label: "Ngày sinh:", value: normDate(summary?.ngaySinh || "") },
    { label: "Học hàm/ Học vị:", value: summary?.hocVi || "", fullWidth: true },
    { label: "Chức vụ hiện nay (Đảng, CQ, đoàn thể):", value: summary?.chucVu || "", fullWidth: true },
    { label: "Hệ số lương:", value: summary?.hsl ? Number(Number(summary.hsl).toFixed(2)).toString() : "", fullWidth: true, highlightValue: true },
    { label: "Thu nhập (lương thực nhận, không tính phụ cấp học hàm, học vị):", value: "", fullWidth: true },
  ],
  totalCols: EXCEL_GLOBAL_BLOCKS_LAYOUT.totalCols,
});

const buildSectionFromFilter = (data, mapFn, label, annotation, subtotalLabel, opts = {}) => ({
  label,
  annotation: annotation || undefined,
  subtotalLabel,
  subtotalColIndexes: opts.subtotalColIndexes,
  metaTag: opts.metaTag,
  rows: ensureRows(numberRows(data.map(mapFn))),
});

const buildAGroup = (summary) => ({
  title: { label: "GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN (không thống kê số giờ đã được thanh toán)" },
  disableTitlePrefix: true,
  blocks: [
    {
      title: { label: "Giảng dạy" },
      columns: columnsA1(),
      sections: [
        buildSectionFromFilter(filterA1(summary, 1, true), mapA1Row, "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (1):", { metaTag: TAGS.A1_HK1_MM }),
        buildSectionFromFilter(filterA1(summary, 1, false), mapA1Row, "Học kỳ I - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (2):", { metaTag: TAGS.A1_HK1_DHP }),
        buildSectionFromFilter(filterA1(summary, 2, true), mapA1Row, "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (3):", { metaTag: TAGS.A1_HK2_MM }),
        buildSectionFromFilter(filterA1(summary, 2, false), mapA1Row, "Học kỳ II - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (4):", { metaTag: TAGS.A1_HK2_DHP }),
      ],
      finalTotal: { label: "Tổng A.1= (1) + (2) + (3) + (4)", colIndexes: [5, 6] },
    },
    {
      title: { label: "Đánh giá kết thúc học phần (theo tổng hợp của phòng Khảo thí và đảm bảo chất lượng)" },
      columns: columnsA2(),
      sections: [
        buildSectionFromFilter(filterA2(summary, 1, true), mapA2Row, "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (5):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK1_MM }),
        buildSectionFromFilter(filterA2(summary, 1, false), mapA2Row, "Học kỳ I - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (6):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK1_DHP }),
        buildSectionFromFilter(filterA2(summary, 2, true), mapA2Row, "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (7):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK2_MM }),
        buildSectionFromFilter(filterA2(summary, 2, false), mapA2Row, "Học kỳ II - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (8):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK2_DHP }),
      ],
      finalTotal: { label: "Tổng A.2= (5) + (6) + (7) + (8)", colIndexes: [6] },
    },
  ],
  finalTotal: { label: "TỔNG A = A.1 + A.2", colIndexes: [6] },
});

const buildBGroup = (summary) => {
  const makeBlock = (title, filterFn, subtotalLabel, metaTag) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: columnsB(),
    sections: [{ label: "", subtotalLabel, metaTag, rows: ensureRows(numberRows(filterB(summary, filterFn).map(mapBRow))) }],
  });
  return {
    title: { label: "HƯỚNG DẪN LUẬN ÁN, LUẬN VĂN, ĐỒ ÁN TỐT NGHIỆP" },
    blocks: [
      makeBlock("B.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", bFilterMatMa("viet_nam"), "TỔNG B.1:", TAGS.B_VN),
      makeBlock("B.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", bFilterMatMa("lao"), "TỔNG B.2:", TAGS.B_LAO),
      makeBlock("B.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", bFilterMatMa("cuba"), "TỔNG B.3:", TAGS.B_CUBA),
      makeBlock("B.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", bFilterMatMa("campuchia"), "TỔNG B.4:", TAGS.B_CPC),
      makeBlock("B.5. Hướng dẫn cho sinh viên hệ đóng học phí", bFilterDongHP, "TỔNG B.5:", TAGS.B_DONG_HP),
    ],
    finalTotal: { label: "TỔNG B = B.1 + B.2 + B.3 + B.4 + B.5", colIndexes: [6] },
  };
};

const buildCGroup = (summary) => {
  const makeBlock = (title, filterFn, subtotalLabel, metaTag) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: columnsC(),
    sections: [{ label: "", subtotalLabel, metaTag, rows: ensureRows(numberRows(filterC(summary, filterFn).map(mapCRow))) }],
  });
  return {
    title: { label: "HƯỚNG DẪN THAM QUAN THỰC TẾ CỦA HỌC VIÊN, SINH VIÊN" },
    blocks: [
      makeBlock("C.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", cFilterMatMa("viet_nam"), "TỔNG C.1:", TAGS.C_VN),
      makeBlock("C.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", cFilterMatMa("lao"), "TỔNG C.2:", TAGS.C_LAO),
      makeBlock("C.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", cFilterMatMa("cuba"), "TỔNG C.3:", TAGS.C_CUBA),
      makeBlock("C.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", cFilterMatMa("campuchia"), "TỔNG C.4:", TAGS.C_CPC),
      makeBlock("C.5. Hướng dẫn cho sinh viên Đóng học phí", cFilterDongHP, "TỔNG C.5:", TAGS.C_DONG_HP),
    ],
    finalTotal: { label: "TỔNG C = C.1 + C.2 + C.3 + C.4 + C.5", colIndexes: [6] },
  };
};

const buildDGroup = (summary) => {
  const makeBlock = (title, bucketKey, colsFn) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: colsFn(),
    sections: [{
      label: "",
      subtotalLabel: `Tổng ${bucketKey}:`,
      rows: ensureRows(numberRows(filterD(summary, bucketKey).map((r) => mapDRow(bucketKey, r)))),
    }],
  });
  return {
    title: { label: "NGHIÊN CỨU KHOA HỌC" },
    blocks: [
      makeBlock("D.1 Đề tài, dự án", "D1", columnsD1),
      makeBlock("D.2 Sáng kiến", "D2", columnsD2),
      makeBlock("D.3 Giải thưởng khoa học và công nghệ; Bằng sáng chế, giải pháp hữu ích", "D3", columnsD3),
      makeBlock("D.4 Đề xuất nghiên cứu (theo đúng mẫu đề xuất quy định)", "D4", columnsD4),
      makeBlock("D.5 Sách, giáo trình, tài liệu dạy học, tài liệu huấn luyện, điều lệ, điều lệnh", "D5", columnsD5),
      makeBlock("D.6 Bài báo, báo cáo khoa học", "D6", columnsD6),
      makeBlock("D.7 Hướng dẫn học viên, sinh viên NCKH do GĐ Học viện phê duyệt", "D7", columnsD7),
      makeBlock("D.8 Thành viên hội đồng khoa học các cấp", "D8", columnsD8),
      makeBlock("D.9 Các nhiệm vụ khoa học và công nghệ khác", "D9", columnsD9),
    ],
    finalTotal: { label: "Tổng D = D.1+D.2+D.3+D.4+D.5+D.6+D.7+D.8+D.9", colIndexes: [5, 6] },
  };
};

const buildGroups = (summary) => [
  buildAGroup(summary),
  buildBGroup(summary),
  buildCGroup(summary),
  buildDGroup(summary),
];

module.exports = {
  buildHeader,
  buildGroups,
};
````

## File: src/services/vuotgio_v2/excel/layouts/section-tags.constants.js
````javascript
const TAGS = {
  A1_HK1_MM: "A1_HK1_MM",
  A1_HK1_DHP: "A1_HK1_DHP",
  A1_HK2_MM: "A1_HK2_MM",
  A1_HK2_DHP: "A1_HK2_DHP",
  A2_HK1_MM: "A2_HK1_MM",
  A2_HK1_DHP: "A2_HK1_DHP",
  A2_HK2_MM: "A2_HK2_MM",
  A2_HK2_DHP: "A2_HK2_DHP",
  B_VN: "B_vn",
  B_LAO: "B_lao",
  B_CUBA: "B_cuba",
  B_CPC: "B_cpc",
  B_DONG_HP: "B_dongHP",
  C_VN: "C_vn",
  C_LAO: "C_lao",
  C_CUBA: "C_cuba",
  C_CPC: "C_cpc",
  C_DONG_HP: "C_dongHP",
};

module.exports = {
  TAGS,
};
````

## File: src/services/vuotgio_v2/excel/normalizers/training-system.normalizer.js
````javascript
const trainingSystemMapper = require("../../../../mappers/vuotgio_v2/trainingSystem.mapper");

const classifyHeDaoTao = (tenHeDaoTao) => trainingSystemMapper.classify(tenHeDaoTao);

const normalizeDoiTuongLabel = (tenHeDaoTao) =>
  trainingSystemMapper.getLabel(trainingSystemMapper.getCategoryKey(tenHeDaoTao));

const getLabel = (key) => trainingSystemMapper.getLabel(key);

module.exports = {
  classifyHeDaoTao,
  normalizeDoiTuongLabel,
  getLabel,
};
````

## File: src/services/vuotgio_v2/excel/utils/excel-style.utils.js
````javascript
const ExcelJS = require("exceljs");

const COLOR = {
  WHITE: "FFFFFFFF",
  BLACK: "FF000000",
  RED: "FFFF0000",
  DARK_RED: "FFC00000",
  BLUE: "FF0070C0",
  BLUE_DARK: "FF17375E",
  HEADER_BG: "FFD9D9D9",
  SUBTOTAL_BG: "FFFFF2CC",
  GRAND_TOTAL_BG: "FFFFE699",
  FINAL_TOTAL_BG: "FFFFD966",
  SUMMARY_BG: "FFDCE6F1",
  STATS_HEADER_BG: "FFD9E1F2",
  BORDER: "FF000000",
};

const thin = () => ({ style: "thin", color: { argb: COLOR.BORDER } });
const medium = () => ({ style: "medium", color: { argb: COLOR.BORDER } });

const BORDERS = {
  allThin: () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() }),
  allMedium: () => ({ top: medium(), bottom: medium(), left: medium(), right: medium() }),
  topBottomMedium: () => ({ top: medium(), bottom: medium(), left: thin(), right: thin() }),
  noBorder: () => ({}),
  bottomOnly: () => ({ bottom: thin() }),
  bottomMedium: () => ({ bottom: medium() }),
};

const styleCell = (cell, opts = {}) => {
  const {
    bgColor,
    fontColor = COLOR.BLACK,
    bold = false,
    italic = false,
    fontSize = 12,
    hAlign = "center",
    vAlign = "middle",
    wrapText = true,
    borders = BORDERS.allThin(),
    fontName = "Times New Roman",
    underline = false,
  } = opts;

  if (bgColor) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  }
  cell.font = {
    name: fontName,
    size: fontSize,
    bold,
    italic,
    color: { argb: fontColor },
    underline,
  };
  cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText };
  cell.border = borders;
};

const mergeAndStyle = (sheet, r1, c1, r2, c2, value, opts = {}) => {
  if (r1 !== r2 || c1 !== c2) sheet.mergeCells(r1, c1, r2, c2);
  const cell = sheet.getCell(r1, c1);
  cell.value = value;
  styleCell(cell, opts);
  return cell;
};

const colLetter = (col) => {
  let r = "";
  let current = col;
  while (current > 0) {
    const rem = (current - 1) % 26;
    r = String.fromCharCode(65 + rem) + r;
    current = Math.floor((current - 1) / 26);
  }
  return r;
};

const cellAddr = (row, col) => `${colLetter(col)}${row}`;

const sumFormula = (cells) => `SUM(${cells.join(",")})`;

const richText = (parts) => ({
  richText: parts.map((p) => ({
    text: p.text,
    font: {
      name: "Times New Roman",
      size: p.fontSize ?? 12,
      bold: p.bold ?? false,
      italic: p.italic ?? false,
      color: { argb: p.color ?? COLOR.BLACK },
    },
  })),
});

module.exports = {
  COLOR,
  BORDERS,
  styleCell,
  mergeAndStyle,
  colLetter,
  cellAddr,
  sumFormula,
  richText,
  ExcelJS,
};
````

## File: src/services/vuotgio_v2/excel/utils/sdo-data.helpers.js
````javascript
const { classifyHeDaoTao, normalizeDoiTuongLabel, getLabel } = require("../normalizers/training-system.normalizer");

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : 0;
};

const normDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ── Hệ đào tạo classification ──────────────────────────────────────────────

const vungMienLabel = (v) => {
  return getLabel(v === "viet_nam" ? "vn" : v);
};

// ── A1: Giảng dạy ──────────────────────────────────────────────────────────

const filterA1 = (summary, hocKy, isMatMa) => {
  const all = [...(summary?.raw?.giangDay || []), ...(summary?.raw?.lopNgoaiQC || [])];
  return all.filter((r) => {
    const hk = Number(r.HocKy ?? r.hoc_ky ?? 1);
    const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
    const { isMatMa: mm } = classifyHeDaoTao(ten);
    return hk === hocKy && mm === isMatMa;
  });
};

const mapA1Row = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  const doiTuongLabel = normalizeDoiTuongLabel(ten);
  return {
    cells: [
      0, // stt placeholder
      r.TenHocPhan || r.ten_hoc_phan || "",
      toNum(r.SoTC ?? r.so_tc),
      r.Lop || r.lop || r.ten_lop || r.lop_hoc_phan || "",
      doiTuongLabel,
      toNum(r.SoTietCTDT ?? r.so_tiet_ctdt ?? r.SoTiet ?? r.so_tiet ?? r.ll),
      toNum(r.QuyChuan ?? r.quy_chuan),
    ],
  };
};

// ── A2: KTHP ────────────────────────────────────────────────────────────────

const filterA2 = (summary, hocKy, isMatMa) => {
  const all = summary?.raw?.kthp || [];
  return all.filter((r) => {
    const hk = Number(r.hoc_ky ?? r.HocKy ?? 1);
    const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
    const { isMatMa: mm } = classifyHeDaoTao(ten);
    return hk === hocKy && mm === isMatMa;
  });
};

const mapA2Row = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  const doiTuongLabel = normalizeDoiTuongLabel(ten);
  return {
    cells: [
      0,
      r.ten_hoc_phan || r.TenHocPhan || "",
      r.hinh_thuc || r.HinhThuc || "",
      r.lop_hoc_phan || r.Lop || r.ten_lop || "",
      doiTuongLabel,
      toNum(r.so_sv ?? r.tong_so ?? r.SoSV),
      toNum(r.quy_chuan ?? r.QuyChuan),
    ],
  };
};

// ── B: Đồ án ────────────────────────────────────────────────────────────────

const filterB = (summary, filterFn) => {
  const all = summary?.raw?.doAn || [];
  return all.filter(filterFn);
};

const bFilterMatMa = (vungMien) => (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || r.doi_tuong || r.DoiTuong || "";
  const c = classifyHeDaoTao(ten);
  return c.isMatMa && c.vungMien === vungMien;
};

const bFilterDongHP = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || r.doi_tuong || r.DoiTuong || "";
  return !classifyHeDaoTao(ten).isMatMa;
};

const mapBRow = (r) => ({
  cells: [
    0,
    r.TenSinhVien || r.SinhVien || r.ten_sinh_vien || "",
    r.Khoa || r.khoa_sinh_vien || "",
    r.SoQD || r.so_quyet_dinh || "",
    toNum(r.SoNguoi ?? r.so_nguoi),
    r.loai_huong_dan || (r.isHdChinh ? "HD Chính" : "HD Phụ"),
    toNum(r.SoTiet ?? r.so_tiet),
  ],
});

// ── C: Hướng dẫn tham quan ──────────────────────────────────────────────────

const filterC = (summary, filterFn) => {
  const all = summary?.raw?.huongDanThamQuan || summary?.raw?.hdtq || [];
  return all.filter(filterFn);
};

const cFilterMatMa = (vungMien) => (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  const c = classifyHeDaoTao(ten);
  return c.isMatMa && c.vungMien === vungMien;
};

const cFilterDongHP = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  return !classifyHeDaoTao(ten).isMatMa;
};

const mapCRow = (r) => ({
  cells: [
    0,
    r.mo_ta_hoat_dong || "",
    r.nganh_hoc || "",
    r.theo_qd || "",
    toNum(r.so_ngay),
    toNum(r.so_ngay),
    toNum(r.so_tiet_quy_doi),
  ],
});

// ── D: NCKH ─────────────────────────────────────────────────────────────────

const NCKH_BUCKET_MAP = {
  "de-tai-du-an": "D1",
  "sang-kien": "D2",
  "giai-thuong": "D3",
  "de-xuat-nghien-cuu": "D4",
  "sach-giao-trinh": "D5",
  "bai-bao-khoa-hoc": "D6",
  "huong-dan-sv-nckh": "D7",
  "thanh-vien-hoi-dong": "D8",
};

const filterD = (summary, bucketKey) => {
  const all = summary?.raw?.nckhRecords || [];
  if (bucketKey === "D9") {
    return all.filter((r) => !NCKH_BUCKET_MAP[String(r.typeSlug || "").trim()]);
  }
  const slugs = Object.entries(NCKH_BUCKET_MAP)
    .filter(([, v]) => v === bucketKey)
    .map(([k]) => k);
  return all.filter((r) => slugs.includes(String(r.typeSlug || "").trim()));
};

const countAuthors = (r) => {
  const c1 = r.tacGiaChinh ? r.tacGiaChinh.split(",").filter((s) => s.trim()).length : 0;
  const c2 = r.thanhVien ? r.thanhVien.split(",").filter((s) => s.trim()).length : 0;
  return c1 + c2;
};

const mapDRow = (bucketKey, r) => {
  const base = {
    ten: r.tenCongTrinh || "",
    vaiTro: r.vaiTroGiangVien || "",
    phanLoai: r.phanLoai || "",
    ngay: normDate(r.ngayNghiemThu || ""),
    xepLoai: r.xepLoai || "",
    maSo: r.maSo || "",
    soNguoi: countAuthors(r),
    soTiet: toNum(r.soTietGiangVien),
  };

  const cellsByBucket = {
    D1: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
    D2: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
    D3: [0, base.ten, base.maSo, base.ngay, base.soNguoi, base.vaiTro, base.soTiet],
    D4: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
    D5: [0, base.ten, base.maSo, null, base.soNguoi, base.vaiTro, base.soTiet],
    D6: [0, base.ten, base.phanLoai, base.maSo, base.soNguoi, base.vaiTro, base.soTiet],
    D7: [0, base.ten, base.maSo, base.ngay, base.phanLoai, base.phanLoai, base.soTiet],
    D8: [0, base.ten, base.phanLoai, base.phanLoai, base.vaiTro, base.maSo, base.soTiet],
    D9: [0, base.ten, base.maSo, "", base.phanLoai, base.phanLoai, base.soTiet],
  };

  return { cells: cellsByBucket[bucketKey] || cellsByBucket.D9 };
};

// ── Ensure minimum rows ─────────────────────────────────────────────────────

const EMPTY_ROWS = 2;

const ensureRows = (rows) => {
  if (rows.length) return rows;
  return Array.from({ length: EMPTY_ROWS }, (_, i) => ({
    cells: [i + 1, "", "", "", "", "", 0],
  }));
};

const numberRows = (rows) =>
  rows.map((r, i) => ({ ...r, cells: [i + 1, ...r.cells.slice(1)] }));

module.exports = {
  toNum,
  normDate,
  classifyHeDaoTao,
  vungMienLabel,
  filterA1,
  mapA1Row,
  filterA2,
  mapA2Row,
  filterB,
  bFilterMatMa,
  bFilterDongHP,
  mapBRow,
  filterC,
  cFilterMatMa,
  cFilterDongHP,
  mapCRow,
  filterD,
  mapDRow,
  ensureRows,
  numberRows,
};
````

## File: src/services/vuotgio_v2/excel/formulas/tableF.formula.builder.js
````javascript
const { TAGS } = require("../layouts/section-tags.constants");
const { getLabel } = require("../normalizers/training-system.normalizer");

const colLetter = (col) => {
  let n = col;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

const buildTableFFormulaRows = (abcResults, options = {}) => {
  const doiTuongCol = colLetter(options.doiTuongCol ?? 5);
  const valueCol = colLetter(options.valueCol ?? 7);

  const sectionMetaByTag = new Map();
  (abcResults || []).forEach((result) => {
    (result.sectionMetas || []).forEach((meta) => {
      if (meta?.tag) sectionMetaByTag.set(meta.tag, meta);
    });
  });

  const categories = [
    { key: "vn", label: getLabel("vn") },
    { key: "lao", label: getLabel("lao") },
    { key: "cuba", label: getLabel("cuba") },
    { key: "cpc", label: getLabel("cpc") },
    { key: "dongHP", label: getLabel("dongHP") },
  ];

  const sumIf = (meta, label) => {
    if (!meta?.dataStart || !meta?.dataEnd) return "0";
    return `SUMIF(${doiTuongCol}${meta.dataStart}:${doiTuongCol}${meta.dataEnd},"${label}",${valueCol}${meta.dataStart}:${valueCol}${meta.dataEnd})`;
  };

  const sumRange = (meta) => {
    if (!meta?.dataStart || !meta?.dataEnd) return "0";
    return `SUM(${valueCol}${meta.dataStart}:${valueCol}${meta.dataEnd})`;
  };

  const buildSumExpr = (parts) => {
    const active = parts.filter((p) => p && p !== "0");
    if (!active.length) return "0";
    if (active.length === 1) return active[0];
    return active.map((p) => `(${p})`).join("+");
  };

  const tagByCategory = {
    vn: { b: TAGS.B_VN, c: TAGS.C_VN },
    lao: { b: TAGS.B_LAO, c: TAGS.C_LAO },
    cuba: { b: TAGS.B_CUBA, c: TAGS.C_CUBA },
    cpc: { b: TAGS.B_CPC, c: TAGS.C_CPC },
    dongHP: { b: TAGS.B_DONG_HP, c: TAGS.C_DONG_HP },
  };

  return categories.map((category) => {
    const isDongHp = category.key === "dongHP";

    const hk1Parts = isDongHp
      ? [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK1_DHP), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK1_DHP), category.label),
        ]
      : [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK1_MM), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK1_MM), category.label),
        ];

    const hk2Parts = isDongHp
      ? [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK2_DHP), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK2_DHP), category.label),
        ]
      : [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK2_MM), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK2_MM), category.label),
        ];

    const tagGroup = tagByCategory[category.key];
    const doAn = sumRange(sectionMetaByTag.get(tagGroup?.b));
    const thamQuan = sumRange(sectionMetaByTag.get(tagGroup?.c));

    return {
      hk1: buildSumExpr(hk1Parts),
      hk2: buildSumExpr(hk2Parts),
      doAn,
      thamQuan,
    };
  });
};

module.exports = {
  buildTableFFormulaRows,
};
````

## File: src/services/vuotgio_v2/excel/generators/keKhaiReport.generator.js
````javascript
const { ExcelJS, BORDERS, COLOR, mergeAndStyle, styleCell } = require("../utils/excel-style.utils");
const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("../layouts/excel-global-layout.config");
const { buildTableFFormulaRows } = require("../formulas/tableF.formula.builder");
const { buildHeader, buildGroups } = require("../layouts/kekhai.layout.builder");
const { renderPaymentSheet } = require("../components/kekhai-payment.component");
const { renderBlockGroups } = require("../components/excel-block.renderer");
const { toNum } = require("../utils/sdo-data.helpers");
const KeKhaiSummaryComponent = require("../components/kekhai-summary.component");
const KeKhaiFormulaGenerator = require("./kekhai-formula.generator");

const renderSignatures = (sheet, startRow, summary) => {
  let row = startRow + 1;

  const signatures = [
    { title: "CHỦ NHIỆM KHOA", subtitle: "(ký, ghi rõ họ tên)", name: summary?.chuNhiemKhoa || "", colStart: 1, colEnd: 3 },
    { title: "NGƯỜI KÊ KHAI", subtitle: "(ký, ghi rõ họ tên)", name: summary?.giangVien || "", colStart: 5, colEnd: 7 },
  ];

  signatures.forEach((sig) => {
    mergeAndStyle(sheet, row, sig.colStart, row, sig.colEnd, sig.title, {
      bold: true, hAlign: "center", borders: BORDERS.noBorder(),
    });
  });
  row += 1;

  signatures.forEach((sig) => {
    if (sig.subtitle) {
      mergeAndStyle(sheet, row, sig.colStart, row, sig.colEnd, sig.subtitle, {
        italic: true, hAlign: "center", borders: BORDERS.noBorder(),
      });
    }
  });
  row += 4;

  signatures.forEach((sig) => {
    if (sig.name) {
      mergeAndStyle(sheet, row, sig.colStart, row, sig.colEnd, sig.name, {
        bold: true, hAlign: "center", borders: BORDERS.noBorder(),
      });
    }
  });

  return row + 1;
};

const renderKeKhaiWorksheet = (workbook, summary, sheetName, renderOptions = {}) => {
  const header = buildHeader(summary);
  const groups = buildGroups(summary);

  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const headerRow = require("../components/excel-header.renderer").renderDocumentHeader(sheet, header, 1, 1);
  let nextRow = headerRow + 1;

  const useFormulas = renderOptions.useFormulas ?? true;
  const renderOpts = {
    ...renderOptions,
    useFormulas,
    codeSeparator: ". ",
    sectionNumbering: false,
    sectionSubtotalGap: 1,
  };

  const abcResults = renderBlockGroups(sheet, groups.slice(0, 3), nextRow, 1, 1, EXCEL_GLOBAL_BLOCKS_LAYOUT, renderOpts);
  if (abcResults.length) {
    nextRow = abcResults[abcResults.length - 1].nextRow + 1;
  }

  mergeAndStyle(sheet, nextRow, 1, nextRow, 6, "TỔNG A + B + C:", {
    bgColor: COLOR.FINAL_TOTAL_BG, bold: true, hAlign: "center", borders: BORDERS.allMedium(),
  });
  const abcCell = sheet.getCell(nextRow, 7);
  const abcFormula = KeKhaiFormulaGenerator.getSumABCFormula(abcResults.groupMetas);
  abcCell.value = KeKhaiFormulaGenerator.getCellValue(toNum(summary.tongThucHien), abcFormula, useFormulas);
  abcCell.numFmt = "#,##0.00";
  styleCell(abcCell, { bgColor: COLOR.FINAL_TOTAL_BG, bold: true, hAlign: "center", borders: BORDERS.allMedium() });
  nextRow += 2;

  const dResults = renderBlockGroups(sheet, groups.slice(3), nextRow, 1, 1, EXCEL_GLOBAL_BLOCKS_LAYOUT, renderOpts);
  if (dResults.length) {
    nextRow = dResults[dResults.length - 1].nextRow + 1;
  }

  nextRow = KeKhaiSummaryComponent.renderSummarySectionE(sheet, nextRow + 2, summary, abcResults.groupMetas, useFormulas);
  const tableFFormulaRows = useFormulas ? buildTableFFormulaRows(abcResults) : null;
  nextRow = KeKhaiSummaryComponent.renderStatsTableF(sheet, nextRow + 2, summary, useFormulas, tableFFormulaRows);
  renderSignatures(sheet, nextRow + 2, summary);

  return sheet;
};

const buildWorkbook = (summaries, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VuotGioV2";
  workbook.created = new Date();

  const useFormulas = options.useFormulas ?? true;
  const resolvedOptions = { ...options, useFormulas };

  summaries.forEach((summary, index) => {
    const name = summary?.giangVien || `GiangVien_${index + 1}`;
    const trimmed = String(name).replace(/[\\/?*:[\]]/g, " ").slice(0, 31).trim();
    const sheetName = trimmed || `GiangVien_${index + 1}`;
    renderKeKhaiWorksheet(workbook, summary, sheetName, resolvedOptions);
  });

  if (options.includePaymentSheet) {
    renderPaymentSheet(workbook, summaries);
  }

  return workbook;
};

module.exports = {
  buildWorkbook,
  renderKeKhaiWorksheet,
};
````