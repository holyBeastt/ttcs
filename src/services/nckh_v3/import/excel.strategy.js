const XLSX = require("xlsx");
const createPoolConnection = require("../../../config/databasePool");
const importRepo = require("../../../repositories/nckh_v3/nckhImport.repo");
const importMapper = require("../../../mappers/nckh_v3/import.mapper");
const formulaService = require("../formula.service");
const NCKHImportStrategy = require("./strategy.interface");

// ─── Normalization Helpers for Fuzzy Name Matching ──────────────────────────

const normString = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

const stripAccents = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"));
};

const normalizeTonePosition = (str) => {
  return str
    .replace(/oà/g, "oà").replace(/oá/g, "oá").replace(/oả/g, "oả").replace(/oã/g, "oã").replace(/oạ/g, "oạ")
    .replace(/òa/g, "oà").replace(/óa/g, "oá").replace(/ỏa/g, "oả").replace(/õa/g, "oã").replace(/ọa/g, "oạ")
    .replace(/uỳ/g, "uỳ").replace(/uý/g, "uý").replace(/uỷ/g, "uỷ").replace(/uỹ/g, "uỹ").replace(/uỵ/g, "uỵ")
    .replace(/ùy/g, "uỳ").replace(/úy/g, "uý").replace(/ủy/g, "uỷ").replace(/ũy/g, "uỹ").replace(/ụy/g, "uỵ")
    .replace(/oè/g, "oè").replace(/oé/g, "oé").replace(/oẻ/g, "oẻ").replace(/oẽ/g, "oẽ").replace(/oẹ/g, "oẹ")
    .replace(/òe/g, "oè").replace(/óe/g, "oé").replace(/ỏe/g, "oẻ").replace(/õe/g, "oẽ").replace(/ọe/g, "oẹ");
};

const cleanName = (n) => String(n || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();

const matchEmployee = (inputName, employeesList) => {
  const cleanInput = cleanName(inputName);
  if (!cleanInput) return null;

  let nameOnly = cleanInput;
  let deptOverride = null;
  let isExternal = false;
  let externalDept = null;

  const deptMatch = cleanInput.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (deptMatch) {
    const candidateName = deptMatch[1].trim();
    let possibleDept = deptMatch[2].trim();
    
    if (possibleDept.startsWith("$")) {
      possibleDept = possibleDept.substring(1).trim();
    }
    
    const possibleDeptUpper = possibleDept.toUpperCase();
    const allDepts = new Set(employeesList.map((e) => String(e.MaPhongBan || "").trim().toUpperCase()).filter(Boolean));
    if (allDepts.has(possibleDeptUpper)) {
      nameOnly = candidateName;
      deptOverride = possibleDeptUpper;
    } else {
      isExternal = true;
      nameOnly = candidateName;
      externalDept = possibleDept;
    }
  }

  if (isExternal) {
    return {
      type: "external",
      external: {
        ten: nameOnly,
        donVi: externalDept,
      },
    };
  }

  const normInput = normString(nameOnly);
  const toneInput = normalizeTonePosition(normInput);
  const stripInput = stripAccents(normInput);

  const candidates = [];

  for (const emp of employeesList) {
    const dbName = String(emp.TenNhanVien || "").trim();
    const normDb = normString(dbName);
    const toneDb = normalizeTonePosition(normDb);
    const stripDb = stripAccents(normDb);

    let matchScore = 0;
    let matchType = null;

    if (nameOnly === dbName) {
      matchScore = 4;
      matchType = "perfect";
    } else if (normInput === normDb) {
      matchScore = 3;
      matchType = "spacing_case";
    } else if (toneInput === toneDb) {
      matchScore = 2;
      matchType = "tone_position";
    } else if (stripInput === stripDb) {
      const isInputUnaccented = (normInput === stripInput);
      if (isInputUnaccented) {
        matchScore = 1;
        matchType = "accents_mismatch";
      }
    }

    if (matchScore > 0) {
      if (deptOverride) {
        const empDept = String(emp.MaPhongBan || "").trim().toUpperCase();
        if (empDept === deptOverride) {
          candidates.push({ emp, matchScore, matchType });
        }
      } else {
        candidates.push({ emp, matchScore, matchType });
      }
    }
  }

  if (candidates.length === 0) {
    if (deptOverride) {
      return { resolved: null, error: `Không tìm thấy nhân viên tên "${nameOnly}" thuộc khoa "${deptOverride}"` };
    }
    return { resolved: null, error: `Không tìm thấy nhân viên tên "${inputName}" trong bảng nhân viên` };
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);
  
  const bestScore = candidates[0].matchScore;
  const bestCandidates = candidates.filter(c => c.matchScore === bestScore);

  if (bestCandidates.length > 1 && !deptOverride) {
    const depts = [...new Set(bestCandidates.map(c => c.emp.MaPhongBan).filter(Boolean))];
    const deptListStr = depts.length > 0 ? depts.join(", ") : "chưa rõ";
    return {
      resolved: null,
      error: `Phát hiện trùng tên "${nameOnly}" ở các khoa: ${deptListStr}. Vui lòng ghi rõ khoa trong file Excel theo dạng "${nameOnly} (Khoa)"`
    };
  }

  const best = bestCandidates[0];
  let warning = null;
  if (best.matchType === "spacing_case") {
    warning = `Tên "${nameOnly}" khớp với "${best.emp.TenNhanVien}" nhưng thừa/thiếu khoảng trắng hoặc lệch hoa thường.`;
  } else if (best.matchType === "tone_position") {
    warning = `Tên "${nameOnly}" khớp với "${best.emp.TenNhanVien}" nhưng viết sai kiểu gõ dấu.`;
  } else if (best.matchType === "accents_mismatch") {
    warning = `Tên "${nameOnly}" khớp với "${best.emp.TenNhanVien}" nhưng viết không dấu hoặc sai dấu thanh.`;
  }

  return {
    type: "internal",
    resolved: best.emp,
    warning
  };
};

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

/**
 * Excel Import Strategy implementation
 */
class ExcelImportStrategy extends NCKHImportStrategy {
  async process(fileBuffer, options = {}) {
    const { type, namHoc: namHocFromUI } = options;

    const rawRows = parseExcelBuffer(fileBuffer);
    if (rawRows.length === 0) {
      throw new Error("File Excel không có dữ liệu.");
    }

    const filteredRows = rawRows.filter((row) => {
      const values = Object.values(row).map((v) => String(v || "").trim());
      return values.some((v) => v !== "");
    });

    if (filteredRows.length === 0) {
      throw new Error("File Excel không có dữ liệu hợp lệ.");
    }

    const mappedRecords = filteredRows.map((row, index) => {
      try {
        const mapped = importMapper.mapRow(type, row);
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
          participants: { tacGiaNames: [], thanhVienNames: [], tacGiaLienHeNames: [], ngoaiList: [] },
          mode: "standard",
          namThucHien: 1,
        };
      }
    });

    const validMappedRecords = mappedRecords.filter((rec) => {
      if (rec.chung?.tenCongTrinh === "LỖI") return true;
      const title = String(rec.chung?.tenCongTrinh || "").trim();
      return title !== "";
    });

    validMappedRecords.forEach((rec) => {
      if (!rec.chung.tenCongTrinh || rec.chung.tenCongTrinh === "LỖI") {
        rec._errors.push("Thiếu tên công trình");
      }
      if (!rec.chung.tongSoTiet || rec.chung.tongSoTiet <= 0) {
        rec._errors.push("Thiếu hoặc sai tổng số tiết");
      }
    });

    const allNames = new Set();
    validMappedRecords.forEach((rec) => {
      if (rec.participants) {
        rec.participants.tacGiaNames = (rec.participants.tacGiaNames || []).map(cleanName).filter(Boolean);
        rec.participants.thanhVienNames = (rec.participants.thanhVienNames || []).map(cleanName).filter(Boolean);
        rec.participants.tacGiaLienHeNames = (rec.participants.tacGiaLienHeNames || []).map(cleanName).filter(Boolean);

        rec.participants.tacGiaNames.forEach((n) => allNames.add(n));
        rec.participants.thanhVienNames.forEach((n) => allNames.add(n));
        rec.participants.tacGiaLienHeNames.forEach((n) => allNames.add(n));
      }
      if (rec.hoiDongRoles) {
        rec.hoiDongRoles.forEach((r) => {
          r.name = cleanName(r.name);
          if (r.name) allNames.add(r.name);
        });
        rec.hoiDongRoles = rec.hoiDongRoles.filter((r) => r.name);
      }
    });

    let connection;
    let allEmployees = [];
    let duplicateMaSoSet = new Set();
    let quyDinhMap = new Map();

    try {
      connection = await createPoolConnection();

      const loaiNckh = validMappedRecords.find(r => r.chung.loaiNckh)?.chung.loaiNckh;
      if (loaiNckh) {
        const { getQuyDinhSoGioByLoai } = require("../quyDinh.service");
        const quyDinhs = await getQuyDinhSoGioByLoai(loaiNckh);
        quyDinhs.forEach(qd => {
          if (qd.PhanLoai) {
            const cleanedKey = qd.PhanLoai.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
            quyDinhMap.set(cleanedKey, qd);
          }
        });
      }

      allEmployees = await importRepo.getAllNhanVien(connection);

      const allMaSo = validMappedRecords
        .map((r) => r.chung.maSo)
        .filter((m) => m !== null && m !== undefined && String(m).trim() !== "");

      if (allMaSo.length > 0) {
        const namHoc = validMappedRecords.find(r => r.chung.namHoc)?.chung.namHoc || namHocFromUI;
        const existing = await importRepo.findExistingMaSo(connection, allMaSo, loaiNckh, namHoc);
        duplicateMaSoSet = new Set(existing);
      }
    } finally {
      if (connection) connection.release();
    }

    const previewRecords = validMappedRecords.map((rec) => {
      let matchedGio;
      let matchedRule;
      let hasPhanLoaiOrCapNhiemVu = false;

      if (rec.chung.phanLoai) {
        hasPhanLoaiOrCapNhiemVu = true;
        const cleanPhanLoai = rec.chung.phanLoai.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        matchedRule = quyDinhMap.get(cleanPhanLoai);
        if (matchedRule) {
          matchedGio = Number(matchedRule.SoGio);
          rec.chung.phanLoai = matchedRule.PhanLoai;
        }
      }
      if (matchedGio === undefined && rec.chung.capNhiemVu) {
        hasPhanLoaiOrCapNhiemVu = true;
        const cleanCapNhiemVu = rec.chung.capNhiemVu.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        matchedRule = quyDinhMap.get(cleanCapNhiemVu);
        if (matchedRule) {
          matchedGio = Number(matchedRule.SoGio);
          rec.chung.capNhiemVu = matchedRule.PhanLoai;
        }
      }

      if (hasPhanLoaiOrCapNhiemVu && matchedGio === undefined) {
        rec._errors.push("Phân loại hoặc cấp nhiệm vụ không tồn tại trong cơ sở dữ liệu");
      }

      const fieldErrors = {};
      const fieldWarnings = {};

      if (rec.chung?.tenCongTrinh === "LỖI") {
        fieldErrors.tenCongTrinh = rec._errors[0] || "Lỗi đọc hàng dữ liệu Excel";
      }

      if (matchedGio !== undefined) {
        rec.chung.tongSoTiet = matchedGio;
        rec._errors = rec._errors.filter(e => e !== "Thiếu hoặc sai tổng số tiết");
      }

      const errors = [...rec._errors];
      const warnings = [];
      let status = "ok";

      if (!rec.chung.tenCongTrinh || rec.chung.tenCongTrinh === "LỖI") {
        if (!fieldErrors.tenCongTrinh) {
          errors.push("Thiếu tên công trình");
          fieldErrors.tenCongTrinh = "Thiếu tên công trình";
        }
      }
      if (!rec.chung.tongSoTiet || rec.chung.tongSoTiet <= 0) {
        errors.push("Thiếu hoặc sai tổng số tiết");
        fieldErrors.tongSoTiet = "Thiếu hoặc sai tổng số tiết";
      }

      if (rec.chung.maSo && duplicateMaSoSet.has(rec.chung.maSo)) {
        status = "error";
        errors.push(`Mã số "${rec.chung.maSo}" đã tồn tại trong hệ thống`);
        fieldErrors.maSo = `Mã số "${rec.chung.maSo}" đã tồn tại trong hệ thống`;
      }

      let previewParticipants = [];
      const participantErrorMsg = [];

      if (rec.hoiDongRoles) {
        let hasError = false;
        rec.hoiDongRoles.forEach((rolePair) => {
          const matchResult = matchEmployee(rolePair.name, allEmployees);
          if (!matchResult || (!matchResult.resolved && !matchResult.external)) {
            const errMsg = matchResult ? matchResult.error : `Không tìm thấy nhân viên tên "${rolePair.name}"`;
            errors.push(errMsg);
            participantErrorMsg.push(errMsg);
            hasError = true;
          } else if (matchResult.external) {
            previewParticipants.push({
              nhanvienId: null,
              maSoCanBo: null,
              tenNhanVien: matchResult.external.ten,
              vaiTro: rolePair.vaiTro,
              tenNgoai: matchResult.external.ten,
              donViNgoai: matchResult.external.donVi,
              soTiet: 0,
              namThucHien: rec.namThucHien || 1,
            });
          } else {
            if (matchResult.warning) {
              errors.push(matchResult.warning);
              participantErrorMsg.push(matchResult.warning);
              hasError = true;
            }
            previewParticipants.push({
              nhanvienId: matchResult.resolved.id_User,
              maSoCanBo: matchResult.resolved.MaNhanVien,
              tenNhanVien: matchResult.resolved.TenNhanVien,
              vaiTro: rolePair.vaiTro,
              tenNgoai: null,
              donViNgoai: null,
              soTiet: 0,
              namThucHien: rec.namThucHien || 1,
            });
          }
        });

        if (hasError) {
          previewParticipants = [];
        } else {
          if (rec.chung.tongSoTiet > 0 && previewParticipants.length > 0) {
            const fixedHours = formulaService.round2(Number(rec.chung.tongSoTiet));
            previewParticipants.forEach((p) => {
              p.soTiet = fixedHours;
            });
            // Cập nhật lại tổng số tiết công trình bằng tổng số tiết của tất cả thành viên
            rec.chung.tongSoTiet = formulaService.round2(fixedHours * previewParticipants.length);
          }
        }
      } else if (rec.participants) {
        const tacGiaIds = [];
        const thanhVienIds = [];
        const tacGiaLienHeIds = [];

        const tacGiaNgoai = [];
        const thanhVienNgoai = [];
        const tacGiaLienHeNgoai = [];

        const matchedEmpMap = {};
        let hasError = false;

        // Resolve tac gia names
        (rec.participants.tacGiaNames || []).forEach((name) => {
          const matchResult = matchEmployee(name, allEmployees);
          if (!matchResult || (!matchResult.resolved && !matchResult.external)) {
            const errMsg = matchResult ? matchResult.error : `Không tìm thấy nhân viên tên "${name}"`;
            errors.push(errMsg);
            participantErrorMsg.push(errMsg);
            hasError = true;
          } else if (matchResult.external) {
            tacGiaNgoai.push({ ten: matchResult.external.ten, donVi: matchResult.external.donVi });
          } else {
            if (matchResult.warning) {
              errors.push(matchResult.warning);
              participantErrorMsg.push(matchResult.warning);
              hasError = true;
            }
            tacGiaIds.push(matchResult.resolved.id_User);
            matchedEmpMap[matchResult.resolved.id_User] = matchResult.resolved;
          }
        });

        // Resolve thanh vien names
        (rec.participants.thanhVienNames || []).forEach((name) => {
          const matchResult = matchEmployee(name, allEmployees);
          if (!matchResult || (!matchResult.resolved && !matchResult.external)) {
            const errMsg = matchResult ? matchResult.error : `Không tìm thấy nhân viên tên "${name}"`;
            errors.push(errMsg);
            participantErrorMsg.push(errMsg);
            hasError = true;
          } else if (matchResult.external) {
            thanhVienNgoai.push({ ten: matchResult.external.ten, donVi: matchResult.external.donVi });
          } else {
            if (matchResult.warning) {
              errors.push(matchResult.warning);
              participantErrorMsg.push(matchResult.warning);
              hasError = true;
            }
            thanhVienIds.push(matchResult.resolved.id_User);
            matchedEmpMap[matchResult.resolved.id_User] = matchResult.resolved;
          }
        });

        // Resolve tac gia lien he names
        (rec.participants.tacGiaLienHeNames || []).forEach((name) => {
          const matchResult = matchEmployee(name, allEmployees);
          if (!matchResult || (!matchResult.resolved && !matchResult.external)) {
            const errMsg = matchResult ? matchResult.error : `Không tìm thấy nhân viên tên "${name}"`;
            errors.push(errMsg);
            participantErrorMsg.push(errMsg);
            hasError = true;
          } else if (matchResult.external) {
            tacGiaLienHeNgoai.push({ ten: matchResult.external.ten, donVi: matchResult.external.donVi });
          } else {
            if (matchResult.warning) {
              errors.push(matchResult.warning);
              participantErrorMsg.push(matchResult.warning);
              hasError = true;
            }
            tacGiaLienHeIds.push(matchResult.resolved.id_User);
            matchedEmpMap[matchResult.resolved.id_User] = matchResult.resolved;
          }
        });

        // External participants from manual list
        (rec.participants.ngoaiList || []).forEach((ext) => {
          if (ext.vaiTro === "tac_gia") {
            tacGiaNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
          } else if (ext.vaiTro === "tac_gia_lien_he") {
            tacGiaLienHeNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
          } else {
            thanhVienNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
          }
        });

        if (hasError) {
          previewParticipants = [];
        } else {
          const totalPeople = tacGiaIds.length + thanhVienIds.length + tacGiaLienHeIds.length +
                              tacGiaNgoai.length + thanhVienNgoai.length + tacGiaLienHeNgoai.length;

          if (totalPeople > 0 && rec.chung.tongSoTiet > 0) {
            try {
              const participants = formulaService.buildParticipantsByMode(
                rec.mode || "standard",
                rec.chung.tongSoTiet,
                tacGiaIds,
                thanhVienIds,
                tacGiaNgoai,
                thanhVienNgoai,
                rec.namThucHien || 1,
                null,
                tacGiaLienHeIds,
                tacGiaLienHeNgoai
              );

              previewParticipants = participants.map((p) => {
                const matchedEmp = p.nhanvienId ? matchedEmpMap[p.nhanvienId] : null;
                return {
                  nhanvienId: p.nhanvienId,
                  maSoCanBo: matchedEmp ? matchedEmp.MaNhanVien : null,
                  tenNhanVien: matchedEmp ? matchedEmp.TenNhanVien : (p.tenNgoai || ""),
                  vaiTro: p.vaiTro,
                  tenNgoai: p.tenNgoai || null,
                  donViNgoai: p.donViNgoai || null,
                  soTiet: p.soTiet,
                  namThucHien: p.namThucHien || rec.namThucHien || 1,
                };
              });
            } catch (calcErr) {
              errors.push(`Lỗi tính số tiết: ${calcErr.message}`);
              participantErrorMsg.push(`Lỗi tính số tiết: ${calcErr.message}`);
            }
          } else if (totalPeople === 0) {
            errors.push("Không có người tham gia");
            participantErrorMsg.push("Không có người tham gia");
          }
        }
      }

      if (participantErrorMsg.length > 0) {
        fieldErrors.participants = participantErrorMsg.join("; ");
      }

      if (errors.length > 0) {
        status = "error";
      }

      return {
        rowIndex: rec._rowIndex,
        status,
        errors,
        warnings,
        fieldErrors,
        fieldWarnings,
        chung: rec.chung,
        participants: previewParticipants,
        mode: rec.mode,
        namThucHien: rec.namThucHien || 1,
      };
    });

    return previewRecords;
  }
}

module.exports = ExcelImportStrategy;
