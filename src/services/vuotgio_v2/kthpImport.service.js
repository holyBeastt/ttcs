/**
 * VUOT GIO V2 - Kế Thúc Học Phần (Coi chấm ra đề) Import Service
 */

const XLSX = require('xlsx');
const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/kthp.repo");
const LogService = require("../logService");

/**
 * Xử lý đọc file Excel và phân loại dữ liệu
 */
const parseExcelFile = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const data = {
        raDe: [],
        coiThi: [],
        chamThi: []
    };

    // Tải bảng cấu hình ký tự bắt đầu để tự động map hệ đào tạo
    let connection;
    const mappingMap = new Map();
    try {
        connection = await createPoolConnection();
        const prefixQuery = `
            SELECT 
              k.viet_tat,
              h.he_dao_tao
            FROM kitubatdau k
            LEFT JOIN he_dao_tao h ON CAST(k.gia_tri_so_sanh AS UNSIGNED) = h.id;
        `;
        const [configs] = await connection.query(prefixQuery);
        for (const config of configs) {
            if (config.viet_tat) {
                mappingMap.set(config.viet_tat.toUpperCase().trim(), config.he_dao_tao);
            }
        }
    } catch (err) {
        console.error("Lỗi khi tải bảng cấu hình trong parseExcelFile:", err);
    } finally {
        if (connection) connection.release();
    }

    const getFirstParenthesesContent = (str) => {
        const match = String(str || "").match(/\(([^)]+)\)/);
        return match ? match[1] : str;
    };

    const extractPrefix = (classCode) => {
        const match = String(classCode || "").trim().match(/^[A-Za-z]+/);
        return match ? match[0] : "";
    };

    sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        // Tìm dòng tiêu đề
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            if (rawData[i].includes('STT') && rawData[i].includes('Họ và tên')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return;

        const headers = rawData[headerRowIndex];
        const hoVaTenIndex = headers.indexOf('Họ và tên');
        const khoaIndex = headers.indexOf('Khoa');
        const tenHocPhanIndex = headers.indexOf('Tên học phần');
        const lopHocPhanIndex = headers.indexOf('Lớp học phần');
        const doiTuongIndex = headers.indexOf('Đối tượng');
        const soDeIndex = headers.indexOf('Số đề');
        const soCaIndex = headers.indexOf('Số ca');
        const soBaiCham1Index = headers.indexOf('Số bài chấm 1');
        const soBaiCham2Index = headers.indexOf('Số bài chấm 2');
        const tongSoBaiIndex = headers.indexOf('Tổng số bài');
        const soTietQCIndex = headers.indexOf('Số tiết QC');

        let consecutiveEmptyRows = 0;

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
                consecutiveEmptyRows++;
                if (consecutiveEmptyRows >= 2) break;
                continue;
            }
            consecutiveEmptyRows = 0;

            const hoVaTen = hoVaTenIndex >= 0 ? row[hoVaTenIndex] : '';
            const khoa = khoaIndex >= 0 ? row[khoaIndex] : '';
            const tenHocPhan = tenHocPhanIndex >= 0 ? row[tenHocPhanIndex] : '';
            const lopHocPhan = lopHocPhanIndex >= 0 ? row[lopHocPhanIndex] : '';
            let doiTuong = doiTuongIndex >= 0 ? row[doiTuongIndex] : '';
            const soTietQC = soTietQCIndex >= 0 ? row[soTietQCIndex] : 0;

            // Tự động map đối tượng (hệ đào tạo) từ lớp học phần
            const classCode = getFirstParenthesesContent(lopHocPhan) || "";
            const prefix = extractPrefix(classCode).toUpperCase().trim();
            if (mappingMap.has(prefix)) {
                doiTuong = mappingMap.get(prefix) || doiTuong;
            }
            if (!doiTuong) {
                doiTuong = 'ĐH Đóng học phí';
            }

            const base = { hoVaTen, khoa, tenHocPhan, lopHocPhan, doiTuong, soTietQC };

            if (sheetName === 'Ra đề' && soDeIndex >= 0 && row[soDeIndex] !== null) {
                data.raDe.push({ ...base, soDe: row[soDeIndex], Type: "Ra Đề" });
            } else if (sheetName === 'Coi thi' && soCaIndex >= 0 && row[soCaIndex] !== null) {
                data.coiThi.push({ ...base, soCa: row[soCaIndex], Type: "Coi Thi" });
            } else if (sheetName === 'Chấm thi' && (soBaiCham1Index >= 0 || soBaiCham2Index >= 0)) {
                data.chamThi.push({
                    ...base,
                    soBaiCham1: soBaiCham1Index >= 0 ? row[soBaiCham1Index] : 0,
                    soBaiCham2: soBaiCham2Index >= 0 ? row[soBaiCham2Index] : 0,
                    tongSoBai: tongSoBaiIndex >= 0 ? row[tongSoBaiIndex] : 0,
                    Type: "Chấm Thi"
                });
            }
        }
    });

    return data;
};

/**
 * Import dữ liệu đã parse vào DB
 */
const importToDB = async (workloadData, { ki, nam, dot, user }) => {
    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        const insertValues = [];

        // 1. Lấy toàn bộ cấu hình kitubatdau để đối chiếu nhanh
        const prefixQuery = `
            SELECT 
              k.viet_tat,
              k.doi_tuong,
              h.id AS he_dao_tao_id,
              h.he_dao_tao
            FROM kitubatdau k
            LEFT JOIN he_dao_tao h ON CAST(k.gia_tri_so_sanh AS UNSIGNED) = h.id;
        `;
        const [configs] = await connection.query(prefixQuery);

        const mappingMap = new Map();
        const nameMappingMap = new Map();
        for (const config of configs) {
            if (config.viet_tat) {
                mappingMap.set(config.viet_tat.toUpperCase().trim(), {
                    doi_tuong: config.doi_tuong,
                    he_dao_tao_id: config.he_dao_tao_id
                });
            }
            if (config.he_dao_tao) {
                nameMappingMap.set(config.he_dao_tao.toUpperCase().trim(), {
                    doi_tuong: config.doi_tuong,
                    he_dao_tao_id: config.he_dao_tao_id
                });
            }
        }

        const getFirstParenthesesContent = (str) => {
            const match = String(str || "").match(/\(([^)]+)\)/);
            return match ? match[1] : str;
        };

        const extractPrefix = (classCode) => {
            const match = String(classCode || "").trim().match(/^[A-Za-z]+/);
            return match ? match[0] : "";
        };
        
        const processGroup = (items, type) => {
            for (const item of items) {
                let baicham1 = 0, baicham2 = 0, tongso = 0;
                if (type === "Ra đề") tongso = item.soDe || 0;
                else if (type === "Coi thi") tongso = item.soCa || 0;
                else if (type === "Chấm thi") {
                    baicham1 = item.soBaiCham1 || 0;
                    baicham2 = item.soBaiCham2 || 0;
                    tongso = item.tongSoBai || 0;
                }

                // Đối chiếu ký tự bắt đầu của lớp học phần
                const classCode = getFirstParenthesesContent(item.lopHocPhan) || "";
                const prefix = extractPrefix(classCode).toUpperCase().trim();
                let mappedDoiTuong = "Đóng HP";
                let mappedHeDaoTaoId = 1;

                if (mappingMap.has(prefix)) {
                    const matchConfig = mappingMap.get(prefix);
                    mappedDoiTuong = matchConfig.doi_tuong;
                    mappedHeDaoTaoId = matchConfig.he_dao_tao_id;
                } else if (item.doiTuong) {
                    const normalizedDoiTuong = String(item.doiTuong).toUpperCase().trim();
                    if (nameMappingMap.has(normalizedDoiTuong)) {
                        const matchConfig = nameMappingMap.get(normalizedDoiTuong);
                        mappedDoiTuong = matchConfig.doi_tuong;
                        mappedHeDaoTaoId = matchConfig.he_dao_tao_id;
                    } else {
                        mappedDoiTuong = item.doiTuong;
                    }
                }

                insertValues.push([
                    item.hoVaTen,
                    item.khoa,
                    ki,
                    nam,
                    dot || 1,
                    type,
                    item.tenHocPhan,
                    item.lopHocPhan,
                    mappedDoiTuong,
                    baicham1,
                    baicham2,
                    tongso,
                    item.soTietQC || 0,
                    0, // khoa_duyet
                    0, // khao_thi_duyet
                    user.id,
                    mappedHeDaoTaoId
                ]);
            }
        };

        processGroup(workloadData.raDe, "Ra đề");
        processGroup(workloadData.coiThi, "Coi thi");
        processGroup(workloadData.chamThi, "Chấm thi");

        if (insertValues.length > 0) {
            await repo.insertMany(connection, insertValues);
        }

        await connection.commit();
        await LogService.logChange(user.id, user.userName, "Import KTHP từ Excel", `Import thành công ${insertValues.length} bản ghi - Học kỳ ${ki}, Năm học ${nam}, Đợt ${dot || 1}`);
        
        return insertValues.length;
    } catch (error) {
        if (connection) await connection.rollback();
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    parseExcelFile,
    importToDB
};
