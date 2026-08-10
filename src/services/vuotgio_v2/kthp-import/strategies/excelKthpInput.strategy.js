"use strict";

const XLSX = require("xlsx");
const KthpInputStrategy = require("./kthpInput.strategy");
const {
    KTHP_SOURCES,
    KTHP_TYPES,
    createKthpImportDto,
} = require("../dto/kthpImport.dto");
const {
    collapseWhitespace,
    normalizeLookupText,
    normalizeNumber,
} = require("../kthpNormalizer");

const SHEET_TYPES = [
    {
        pattern: /^(ra de|san luong de thi)$/u,
        activityType: KTHP_TYPES.RA_DE,
        activityName: "Ra đề",
    },
    {
        pattern: /^(ngan hang cau hoi|xay dung ngan hang cau hoi)$/u,
        activityType: KTHP_TYPES.NGAN_HANG_CAU_HOI,
        activityName: "Ngân hàng câu hỏi",
    },
    {
        pattern: /^(coi thi|san luong coi thi)$/u,
        activityType: KTHP_TYPES.COI_THI,
        activityName: "Coi thi",
    },
    {
        pattern: /^(cham thi|san luong cham thi)$/u,
        activityType: KTHP_TYPES.CHAM_THI,
        activityName: "Chấm thi",
    },
];

const headerKey = (value) => normalizeLookupText(value).replace(/[^\p{Letter}\p{Number}]+/gu, " ");

const findHeaderIndex = (headers, aliases) => {
    const normalizedAliases = aliases.map(headerKey);
    return headers.findIndex((header) => normalizedAliases.includes(headerKey(header)));
};

const cell = (row, headers, aliases) => {
    const index = findHeaderIndex(headers, aliases);
    return index >= 0 ? row[index] : null;
};

const getTypeForSheet = (sheetName) => {
    const normalized = headerKey(sheetName);
    return SHEET_TYPES.find((candidate) => candidate.pattern.test(normalized)) || null;
};

const isEmptyRow = (row) => !row || row.every((value) =>
    value === null || value === undefined || collapseWhitespace(value) === "");

const rowToRawObject = (headers, row) => Object.fromEntries(
    headers.map((header, index) => [collapseWhitespace(header) || `column_${index + 1}`, row[index] ?? null])
);

const getLecturerName = (row, headers) => {
    const combined = cell(row, headers, ["Họ và tên", "Giảng viên"]);
    if (combined !== null && combined !== undefined && combined !== "") return collapseWhitespace(combined);
    return collapseWhitespace([
        cell(row, headers, ["Họ đệm", "Họ"]),
        cell(row, headers, ["Tên"]),
    ].filter(Boolean).join(" "));
};

const createDtoFromRow = ({ row, headers, sheetName, rowNumber, fileName, typeInfo, context }) => {
    const role = collapseWhitespace(cell(row, headers, ["Vai trò"]));
    const roleCount = normalizeNumber(cell(row, headers, ["Số bài/phách", "Số bài phách"]));

    const questionCount = normalizeNumber(cell(row, headers, ["Số đề", "Số câu hỏi"]));

    let quantity = null;
    if (typeInfo.activityType === KTHP_TYPES.RA_DE
        || typeInfo.activityType === KTHP_TYPES.NGAN_HANG_CAU_HOI) {
        quantity = questionCount;
    }

    return createKthpImportDto({
        source: KTHP_SOURCES.EXCEL,
        sourceRef: { fileName: fileName || null, sheetName, rowNumber },
        activityType: typeInfo.activityType,
        activityName: typeInfo.activityName,
        employee: {
            id: cell(row, headers, ["Mã CBGV", "ID nhân viên"]),
            name: getLecturerName(row, headers),
            department: cell(row, headers, ["Khoa", "Đơn vị"]),
        },
        academicYear: context.academicYear ?? context.namHoc ?? context.nam,
        semester: context.semester ?? context.hocKy ?? context.ki,
        round: context.round ?? context.dot,
        educationSystemId: context.educationSystemId ?? context.heDaoTaoId
            ?? cell(row, headers, ["ID hệ đào tạo"]),
        educationSystemName: context.educationSystemName ?? context.heDaoTao
            ?? cell(row, headers, ["Hệ đào tạo", "Đối tượng"]),
        course: {
            code: cell(row, headers, ["Mã môn thi", "Mã học phần"]),
            name: cell(row, headers, ["Tên học phần", "Tên môn thi"]),
            className: cell(row, headers, ["Lớp học phần", "Lớp"]),
            credits: cell(row, headers, ["Số tín chỉ", "Số TC"]),
        },
        exam: {
            date: cell(row, headers, ["Ngày thi"]),
            room: cell(row, headers, ["Phòng thi"]),
            shift: cell(row, headers, ["Ca thi"]),
            studentCount: cell(row, headers, ["Số sinh viên", "Sĩ số"]),
            pageCount: cell(row, headers, ["Số trang"]),
            questionCount,
            markedCount: roleCount,
            quantity,
            examForm: cell(row, headers, ["Hình thức", "Hình thức thi"]),
            coefficient: cell(row, headers, ["Hệ số"]),
            duration: cell(row, headers, ["Thời gian", "Thời gian thi"]),
            role,
        },
        standardHours: cell(row, headers, ["Số tiết QC", "Số giờ chuẩn", "Quy chuẩn"]),
        notes: cell(row, headers, ["Ghi chú"]),
        raw: rowToRawObject(headers, row),
    });
};

const editableRowToDto = (item, activityType, activityName, context, index) => {
    const quantity = activityType === KTHP_TYPES.RA_DE
        || activityType === KTHP_TYPES.NGAN_HANG_CAU_HOI
        ? item.soDe : null;

    return createKthpImportDto({
        source: KTHP_SOURCES.EXCEL,
        sourceRef: {
            fileName: context.fileName || null,
            sheetName: item.sourceRef?.sheetName || activityName,
            rowNumber: item.sourceRef?.rowNumber ?? index + 1,
        },
        activityType,
        activityName,
        employee: {
            id: item.employeeId ?? item.id_user,
            name: item.hoVaTen ?? item.giang_vien ?? item.giangvien,
            department: item.khoa,
        },
        academicYear: context.academicYear ?? context.namHoc ?? context.nam,
        semester: context.semester ?? context.hocKy ?? context.ki,
        round: context.round ?? context.dot,
        educationSystemId: context.educationSystemId ?? context.heDaoTaoId
            ?? item.educationSystemId ?? item.he_dao_tao_id,
        educationSystemName: context.educationSystemName ?? context.heDaoTao
            ?? item.educationSystemName ?? item.doiTuong ?? item.doi_tuong,
        course: {
            code: item.maHocPhan ?? item.ma_hoc_phan,
            name: item.tenHocPhan ?? item.ten_hoc_phan,
            className: item.lopHocPhan ?? item.lop_hoc_phan,
            credits: item.soTC ?? item.so_tc,
        },
        exam: {
            date: item.ngayThi ?? item.ngay_thi,
            room: item.phongThi ?? item.phong_thi,
            shift: item.caThi ?? item.ca_thi,
            studentCount: item.soSV ?? item.so_sv,
            questionCount: item.soDe,
            markedCount: item.soBaiPhach ?? item.so_bai_phach,
            quantity,
            examForm: item.hinhThucThi ?? item.hinh_thuc_thi,
            coefficient: item.heSo ?? item.he_so,
            duration: item.thoiGian ?? item.thoi_gian,
            role: item.vaiTro ?? item.vai_tro,
        },
        standardHours: item.soTietQC ?? item.quy_chuan,
        notes: item.ghiChu ?? item.ghi_chu,
        raw: item,
    });
};

class ExcelKthpInputStrategy extends KthpInputStrategy {
    async parse(input, context = {}) {
        if (input && Array.isArray(input.rows)) {
            if (input.rows.length === 0) {
                const error = new Error("Danh sách preview Excel không có dòng dữ liệu");
                error.code = "KTHP_EXCEL_EMPTY";
                throw error;
            }
            const labels = {
                [KTHP_TYPES.RA_DE]: "Ra đề",
                [KTHP_TYPES.NGAN_HANG_CAU_HOI]: "Ngân hàng câu hỏi",
                [KTHP_TYPES.COI_THI]: "Coi thi",
                [KTHP_TYPES.CHAM_THI]: "Chấm thi",
            };
            return input.rows.map((item, index) => {
                if (!Object.values(KTHP_TYPES).includes(item.activityType)) {
                    const error = new Error(`Unsupported KTHP type: ${item.activityType}`);
                    error.code = "KTHP_TYPE_UNSUPPORTED";
                    throw error;
                }
                return editableRowToDto(
                    item,
                    item.activityType,
                    labels[item.activityType],
                    context,
                    index
                );
            });
        }

        const buffer = Buffer.isBuffer(input) ? input : input?.buffer;
        if (!buffer) throw new Error("Excel input must contain a buffer");

        const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
        const fileName = context.fileName || input?.originalname || null;
        const dtos = [];
        let recognizedSheetCount = 0;

        for (const sheetName of workbook.SheetNames) {
            const typeInfo = getTypeForSheet(sheetName);
            if (!typeInfo) continue;
            recognizedSheetCount += 1;

            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                header: 1,
                defval: null,
            });
            const headerRowIndex = rows.findIndex((row) => {
                const keys = (row || []).map(headerKey);
                return keys.includes("ho va ten")
                    || (keys.includes("ho dem") && keys.includes("ten"));
            });
            if (headerRowIndex < 0) {
                const error = new Error(
                    `Không tìm thấy header giảng viên trong sheet "${sheetName}"`
                );
                error.code = "KTHP_HEADER_NOT_FOUND";
                throw error;
            }

            const headers = rows[headerRowIndex];
            let emptyRows = 0;
            for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
                const row = rows[index];
                if (isEmptyRow(row)) {
                    emptyRows += 1;
                    if (emptyRows >= 2) break;
                    continue;
                }
                emptyRows = 0;
                if (!getLecturerName(row, headers)) continue;
                dtos.push(createDtoFromRow({
                    row,
                    headers,
                    sheetName,
                    rowNumber: index + 1,
                    fileName,
                    typeInfo,
                    context,
                }));
            }
        }
        if (recognizedSheetCount === 0) {
            const error = new Error("File không có sheet KTHP được hỗ trợ");
            error.code = "KTHP_SHEET_UNSUPPORTED";
            throw error;
        }
        if (dtos.length === 0) {
            const error = new Error("File KTHP không có dòng dữ liệu");
            error.code = "KTHP_EXCEL_EMPTY";
            throw error;
        }
        return dtos;
    }
}

module.exports = ExcelKthpInputStrategy;
module.exports.getTypeForSheet = getTypeForSheet;
