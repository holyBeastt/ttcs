/**
 * NCKH V3 Import Service
 * Parse Excel → Map → Calculate hours → Check duplicates → Save to DB
 */

const XLSX = require("xlsx");
const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");

const importRepo = require("../../repositories/nckh_v3/nckhImport.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const importMapper = require("../../mappers/nckh_v3/import.mapper");
const formulaService = require("./formula.service");

// ─── Excel Parsing ──────────────────────────────────────────────────────────

/**
 * Find the header row by looking for rows with enough non-empty cells.
 */
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let row = 0; row <= Math.min(range.e.r, 10); row += 1) {
    const rowData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: row })[0] || [];
    const nonEmpty = rowData.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    if (nonEmpty.length >= 3) {
      return row;
    }
  }
  return 0;
}

/**
 * Parse an Excel buffer into an array of raw row objects.
 */
function parseExcelBuffer(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
    cellText: true,
  });

  let allRows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) return;

    const headerRowIndex = findHeaderRow(sheet);
    const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, range: headerRowIndex })[0] || [];
    const normalizedHeaders = headerRow.map((h) =>
      (h || "")
        .toString()
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: normalizedHeaders,
      range: headerRowIndex + 1,
      defval: "",
      raw: false,
      cellText: true,
    });

    // Override with display values for date cells
    rawRows.forEach((row, rowIndex) => {
      const realRowNumber = headerRowIndex + 1 + rowIndex + 1;
      for (let col = 0; col < normalizedHeaders.length; col += 1) {
        const colLetter = XLSX.utils.encode_col(col);
        const cellAddress = `${colLetter}${realRowNumber}`;
        const cell = sheet[cellAddress];
        if (cell && cell.w !== undefined) {
          row[normalizedHeaders[col]] = cell.w;
        }
      }
    });

    allRows = allRows.concat(rawRows);
  });

  return allRows;
}

// ─── Preview Logic ──────────────────────────────────────────────────────────

/**
 * Parse Excel, map rows, resolve employee codes, calculate hours,
 * check duplicates, and return preview data.
 */
const buildPreview = async (fileBuffer, type, namHocFromUI) => {
  const rawRows = parseExcelBuffer(fileBuffer);

  if (rawRows.length === 0) {
    throw new Error("File Excel không có dữ liệu.");
  }

  // Filter out completely empty rows
  const filteredRows = rawRows.filter((row) => {
    const values = Object.values(row).map((v) => String(v || "").trim());
    return values.some((v) => v !== "");
  });

  if (filteredRows.length === 0) {
    throw new Error("File Excel không có dữ liệu hợp lệ.");
  }

  // Map each row
  const mappedRecords = filteredRows.map((row, index) => {
    try {
      const mapped = importMapper.mapRow(type, row);
      
      // Override namHoc from UI for the whole file
      if (namHocFromUI) {
        mapped.chung.namHoc = namHocFromUI;
      }
      

      mapped._rowIndex = index + 1;
      mapped._errors = [];
      mapped._warnings = [];
      return mapped;
    } catch (err) {
      return {
        _rowIndex: index + 1,
        _errors: [err.message],
        _warnings: [],
        chung: { tenCongTrinh: "LỖI", loaiNckh: "", maSo: "" },
        participants: { tacGiaMaCodes: [], thanhVienMaCodes: [], ngoaiList: [] },
        mode: "standard",
        namThucHien: 1,
      };
    }
  });

  // Validate basic required fields
  mappedRecords.forEach((rec) => {
    if (!rec.chung.tenCongTrinh || rec.chung.tenCongTrinh === "LỖI") {
      rec._errors.push("Thiếu tên công trình");
    }
    if (!rec.chung.tongSoTiet || rec.chung.tongSoTiet <= 0) {
      rec._errors.push("Thiếu hoặc sai tổng số tiết");
    }
  });

  // Collect all employee codes to resolve
  const allMaCodes = new Set();
  mappedRecords.forEach((rec) => {
    if (rec.participants) {
      (rec.participants.tacGiaMaCodes || []).forEach((c) => allMaCodes.add(c));
      (rec.participants.thanhVienMaCodes || []).forEach((c) => allMaCodes.add(c));
    }
    if (rec.hoiDongRoles) {
      rec.hoiDongRoles.forEach((r) => allMaCodes.add(r.ma));
    }
  });

  // Resolve codes → nhanvien IDs
  let connection;
  let codeToIdMap = {};
  let codeToNameMap = {};
  let duplicateMaSoSet = new Set();
  let quyDinhMap = new Map();

  try {
    connection = await createPoolConnection();

    // Lấy danh sách quy định số giờ cho loại NCKH này
    // Chú ý: Cần lấy loaiNckh từ config hoặc record đầu tiên
    const loaiNckh = mappedRecords.find(r => r.chung.loaiNckh)?.chung.loaiNckh;
    if (loaiNckh) {
      const { getQuyDinhSoGioByLoai } = require("./quyDinh.service");
      const quyDinhs = await getQuyDinhSoGioByLoai(loaiNckh);
      quyDinhs.forEach(qd => {
        if (qd.PhanLoai) {
          const cleanedKey = qd.PhanLoai.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
          quyDinhMap.set(cleanedKey, Number(qd.SoGio));
        }
      });
    }

    if (allMaCodes.size > 0) {
      const employees = await importRepo.findNhanVienByMaCodes(connection, [...allMaCodes]);
      employees.forEach((emp) => {
        codeToIdMap[String(emp.MaSoCanBo).trim()] = emp.id_User;
        codeToNameMap[String(emp.MaSoCanBo).trim()] = emp.TenNhanVien;
      });
    }

    // Check duplicates
    const allMaSo = mappedRecords
      .map((r) => r.chung.maSo)
      .filter((m) => m !== null && m !== undefined && String(m).trim() !== "");

    if (allMaSo.length > 0) {
      const existing = await importRepo.findExistingMaSo(connection, allMaSo);
      duplicateMaSoSet = new Set(existing);
    }
  } finally {
    if (connection) connection.release();
  }

  // Build preview output
  const previewRecords = mappedRecords.map((rec) => {
    // Tự động gán Tổng số tiết LUÔN LUÔN dựa theo Phân loại (bỏ qua file Excel)
    // Fallback thử tìm theo Cấp nhiệm vụ nếu Phân loại không khớp (đặc thù Đề tài dự án)
    let matchedGio;
    if (rec.chung.phanLoai) {
      const cleanPhanLoai = rec.chung.phanLoai.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      matchedGio = quyDinhMap.get(cleanPhanLoai);
    }
    if (matchedGio === undefined && rec.chung.capNhiemVu) {
      const cleanCapNhiemVu = rec.chung.capNhiemVu.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      matchedGio = quyDinhMap.get(cleanCapNhiemVu);
    }

    if (matchedGio !== undefined) {
      rec.chung.tongSoTiet = matchedGio;
      // Xóa thông báo lỗi "Thiếu tổng số tiết" nếu đã lấy được từ quy định
      rec._errors = rec._errors.filter(e => e !== "Thiếu hoặc sai tổng số tiết");
    }
    const errors = [...rec._errors];
    const warnings = [...rec._warnings];
    let status = "ok";

    // Check duplicate
    if (rec.chung.maSo && duplicateMaSoSet.has(rec.chung.maSo)) {
      status = "duplicate";
      warnings.push(`Mã số "${rec.chung.maSo}" đã tồn tại trong hệ thống`);
    }

    // Resolve participant codes and build preview participants
    let previewParticipants = [];

    if (rec.hoiDongRoles) {
      // Hội đồng mode
      rec.hoiDongRoles.forEach((rolePair) => {
        const id = codeToIdMap[rolePair.ma];
        const name = codeToNameMap[rolePair.ma];
        if (!id) {
          errors.push(`Không tìm thấy nhân viên mã "${rolePair.ma}"`);
        }
        previewParticipants.push({
          nhanvienId: id || null,
          maSoCanBo: rolePair.ma,
          tenNhanVien: name || rolePair.ma,
          vaiTro: rolePair.vaiTro,
          tenNgoai: null,
          donViNgoai: null,
          soTiet: 0,
          namThucHien: rec.namThucHien || 1,
        });
      });

      // Calculate fixed hours for each member
      if (rec.chung.tongSoTiet > 0 && previewParticipants.length > 0) {
        const fixedHours = formulaService.round2(Number(rec.chung.tongSoTiet));
        previewParticipants.forEach((p) => {
          p.soTiet = fixedHours;
        });
      }
    } else if (rec.participants) {
      // Standard / Equal mode
      const tacGiaIds = [];
      const thanhVienIds = [];
      const tacGiaNgoai = [];
      const thanhVienNgoai = [];

      // Resolve tac gia codes
      (rec.participants.tacGiaMaCodes || []).forEach((code) => {
        const id = codeToIdMap[code];
        if (id) {
          tacGiaIds.push(id);
        } else {
          errors.push(`Không tìm thấy tác giả mã "${code}"`);
        }
      });

      // Resolve thanh vien codes
      (rec.participants.thanhVienMaCodes || []).forEach((code) => {
        const id = codeToIdMap[code];
        if (id) {
          thanhVienIds.push(id);
        } else {
          errors.push(`Không tìm thấy thành viên mã "${code}"`);
        }
      });

      // External participants
      (rec.participants.ngoaiList || []).forEach((ext) => {
        if (ext.vaiTro === "tac_gia") {
          tacGiaNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
        } else {
          thanhVienNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
        }
      });

      // Calculate hours using formulaService
      const totalPeople = tacGiaIds.length + thanhVienIds.length + tacGiaNgoai.length + thanhVienNgoai.length;

      if (totalPeople > 0 && rec.chung.tongSoTiet > 0) {
        try {
          const participants = formulaService.buildParticipantsByMode(
            rec.mode || "standard",
            rec.chung.tongSoTiet,
            tacGiaIds,
            thanhVienIds,
            tacGiaNgoai,
            thanhVienNgoai,
            rec.namThucHien || 1
          );

          previewParticipants = participants.map((p) => ({
            nhanvienId: p.nhanvienId,
            maSoCanBo: p.nhanvienId
              ? Object.entries(codeToIdMap).find(([, id]) => id === p.nhanvienId)?.[0] || null
              : null,
            tenNhanVien: p.nhanvienId
              ? Object.entries(codeToIdMap)
                  .filter(([, id]) => id === p.nhanvienId)
                  .map(([code]) => codeToNameMap[code])[0] || ""
              : p.tenNgoai || "",
            vaiTro: p.vaiTro,
            tenNgoai: p.tenNgoai || null,
            donViNgoai: p.donViNgoai || null,
            soTiet: p.soTiet,
            namThucHien: p.namThucHien || rec.namThucHien || 1,
          }));
        } catch (calcErr) {
          errors.push(`Lỗi tính số tiết: ${calcErr.message}`);
        }
      } else if (totalPeople === 0) {
        warnings.push("Không có người tham gia");
      }
    }

    if (errors.length > 0 && status === "ok") {
      status = "error";
    }

    return {
      rowIndex: rec._rowIndex,
      status,
      errors,
      warnings,
      chung: rec.chung,
      participants: previewParticipants,
      mode: rec.mode,
      namThucHien: rec.namThucHien || 1,
    };
  });

  return {
    totalRows: previewRecords.length,
    errorCount: previewRecords.filter((r) => r.status === "error").length,
    duplicateCount: previewRecords.filter((r) => r.status === "duplicate").length,
    records: previewRecords,
  };
};

// ─── Save Logic ─────────────────────────────────────────────────────────────

/**
 * Save validated records to database within a single transaction.
 */
const saveToDatabase = async (records, userContext) => {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Không có dữ liệu để lưu.");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    let savedCount = 0;

    for (const record of records) {
      // Skip error rows
      if (record.status === "error") continue;

      const chung = record.chung;

      const nckhId = await importRepo.insertChungExtended(connection, {
        tenCongTrinh: chung.tenCongTrinh,
        loaiNckh: chung.loaiNckh,
        phanLoai: chung.phanLoai || null,
        namHoc: chung.namHoc,
        tongSoTiet: chung.tongSoTiet || 0,
        khoaDuyet: 0,
        vienNcDuyet: 0,
        ngayNghiemThu: chung.ngayNghiemThu || null,
        xepLoai: chung.xepLoai || null,
        maSo: chung.maSo || null,
        soQuyetDinh: chung.soQuyetDinh || null,
        capNhiemVu: chung.capNhiemVu || null,
        kinhPhi: chung.kinhPhi || null,
        tenTapChi: chung.tenTapChi || null,
        soBao: chung.soBao || null,
        soTrichDan: chung.soTrichDan ?? null,
        coQuanChuTri: chung.coQuanChuTri || null,
        coQuanChuQuan: chung.coQuanChuQuan || null,
        thuocNhiemVu: chung.thuocNhiemVu || null,
        linhVucNghienCuu: chung.linhVucNghienCuu || null,
        kinhPhiNamNhat: chung.kinhPhiNamNhat || null,
        kinhPhiNamHai: chung.kinhPhiNamHai || null,
        kinhPhiNamBa: chung.kinhPhiNamBa || null,
        nguonKinhPhi: chung.nguonKinhPhi || null,
        ngayQuyetDinh: chung.ngayQuyetDinh || null,
      });

      // Insert participants into nckh_so_tiet
      const participants = (record.participants || [])
        .filter((p) => p.nhanvienId || p.tenNgoai)
        .map((p) => ({
          nhanvienId: p.nhanvienId || null,
          tenNgoai: p.tenNgoai || null,
          donViNgoai: p.donViNgoai || null,
          vaiTro: p.vaiTro || "thanh_vien",
          soTiet: p.soTiet || 0,
          namThucHien: p.namThucHien || 1,
        }));

      if (participants.length > 0) {
        await nckhSoTietRepo.bulkInsert(connection, nckhId, participants);
      }

      savedCount += 1;
    }

    await connection.commit();

    // Log
    try {
      await LogService.logChange(
        userContext.userId,
        userContext.userName,
        "NCKH V3",
        `Import ${savedCount} công trình NCKH từ file Excel`
      );
    } catch (logErr) {
      console.error("[NCKH V3 Import] Log failed:", logErr.message);
    }

    return { savedCount };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  buildPreview,
  saveToDatabase,
};
