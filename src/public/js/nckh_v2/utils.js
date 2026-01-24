/**
 * NCKH V2 Utils - Unified Version
 * Các hàm tiện ích dùng chung cho tất cả loại NCKH
 * Date: 2026-01-20
 * Refactored for unified database schema
 */

// =====================================================
// CONSTANTS - NCKH TYPES (Match backend)
// =====================================================

const NCKH_TYPES = {
    DETAI_DUAN: 'DETAI_DUAN',
    BAIBAO: 'BAIBAO',
    SACHGIAOTRINH: 'SACHGIAOTRINH',
    GIAITHUONG: 'GIAITHUONG',
    SANGKIEN: 'SANGKIEN',
    DEXUAT: 'DEXUAT',
    HUONGDAN: 'HUONGDAN',
    HOIDONG: 'HOIDONG'
};

// Mapping từ tab name sang NCKH type và API path
const NCKH_CONFIG = {
    'detaiduan': {
        type: 'DETAI_DUAN',
        apiPath: 'de-tai-du-an',
        displayName: 'Đề tài, dự án',
        phanLoaiField: 'CapDeTai',
        tenField: 'TenDeTai',
        tacGiaField: 'ChuNhiem'
    },
    'baibaokhoahoc': {
        type: 'BAIBAO',
        apiPath: 'bai-bao-khoa-hoc',
        displayName: 'Bài báo khoa học',
        phanLoaiField: 'LoaiTapChi',
        tenField: 'TenBaiBao',
        tacGiaField: 'TacGia'
    },
    'sangkien': {
        type: 'SANGKIEN',
        apiPath: 'sang-kien',
        displayName: 'Sáng kiến',
        phanLoaiField: 'LoaiSangKien',
        tenField: 'TenSangKien',
        tacGiaField: 'TacGiaChinh'
    },
    'giaithuong': {
        type: 'GIAITHUONG',
        apiPath: 'giai-thuong',
        displayName: 'Giải thưởng, bằng sáng chế',
        phanLoaiField: 'LoaiBangSangCheVaGiaiThuong',
        tenField: 'TenBangSangCheVaGiaiThuong',
        tacGiaField: 'TacGia'
    },
    'dexuat': {
        type: 'DEXUAT',
        apiPath: 'de-xuat-nghien-cuu',
        displayName: 'Đề xuất nghiên cứu',
        phanLoaiField: 'CapDeXuat',
        tenField: 'TenDeXuat',
        tacGiaField: 'TacGiaChinh'
    },
    'sachgiaotrinh': {
        type: 'SACHGIAOTRINH',
        apiPath: 'sach-giao-trinh',
        displayName: 'Sách, giáo trình',
        phanLoaiField: 'LoaiTapChi',
        tenField: 'TenSachVaGiaoTrinh',
        tacGiaField: 'TacGia'
    },
    'huongdansvnckh': {
        type: 'HUONGDAN',
        apiPath: 'huong-dan-sv-nckh',
        displayName: 'Hướng dẫn SV NCKH',
        phanLoaiField: 'LoaiHuongDan',
        tenField: 'TenDeTai',
        tacGiaField: 'HuongDanChinh'
    },
    'hoidong': {
        type: 'HOIDONG',
        apiPath: 'thanh-vien-hoi-dong',
        displayName: 'Thành viên hội đồng',
        phanLoaiField: 'LoaiHoiDong',
        tenField: 'TenDeTai',
        tacGiaField: 'ThanhVien'
    }
};

// =====================================================
// CÔNG THỨC TÍNH TIẾT V2 (Client-side)
// =====================================================

/**
 * Quy đổi số tiết theo công thức v2 (Standard)
 */
function quyDoiSoTietV2(T, tongSoTacGia, soDongChuNhiem = 1, soNamThucHien = 1) {
    let chuNhiem = 0;
    let thanhVien = 0;

    if (tongSoTacGia === 1) {
        chuNhiem = T;
        thanhVien = 0;
    } else if (tongSoTacGia === 2) {
        chuNhiem = (2 * T) / 3;
        thanhVien = T / 3;
    } else if (tongSoTacGia === 3) {
        chuNhiem = T / 2;
        thanhVien = T / 4;
    } else {
        const phanChia = (2 * T / 3) / tongSoTacGia;
        chuNhiem = T / 3 + phanChia;
        thanhVien = phanChia;
    }

    // Chia cho số đồng chủ nhiệm
    chuNhiem = chuNhiem / soDongChuNhiem;

    // Chia cho số năm thực hiện
    chuNhiem = chuNhiem / soNamThucHien;
    thanhVien = thanhVien / soNamThucHien;

    return {
        chuNhiem: Math.round(chuNhiem * 100) / 100,
        thanhVien: Math.round(thanhVien * 100) / 100
    };
}

/**
 * Quy đổi số tiết chia đều (Equal)
 */
function quyDoiSoTietChiaDeu(T, tongSoNguoi, soNamThucHien = 1) {
    if (tongSoNguoi <= 0) return 0;
    const tietMoiNguoi = T / tongSoNguoi / soNamThucHien;
    return Math.round(tietMoiNguoi * 100) / 100;
}

// =====================================================
// FORMAT FUNCTIONS
// =====================================================

function formatDate(dateValue) {
    if (!dateValue) return "";

    try {
        let date;

        if (typeof dateValue === "string") {
            if (dateValue.includes("T")) {
                date = new Date(dateValue);
            } else if (dateValue.includes("/")) {
                const parts = dateValue.split("/");
                if (parts.length === 3) {
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            } else if (dateValue.includes("-")) {
                date = new Date(dateValue);
            }
        } else if (dateValue instanceof Date) {
            date = dateValue;
        }

        if (!date || isNaN(date.getTime())) {
            return dateValue;
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateValue;
    }
}

function formatHours(num) {
    return num.toFixed(2).replace(/,/g, ".");
}

// =====================================================
// YEAR SELECT HELPERS
// =====================================================

function populateYearSelect(selectElement, selectedYear = null) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;
    const endYear = currentYear + 2;

    selectElement.innerHTML = "";

    for (let year = endYear; year >= startYear; year--) {
        const namHoc = `${year}-${year + 1}`;
        const option = document.createElement("option");
        option.value = namHoc;
        option.textContent = namHoc;

        if (selectedYear && namHoc === selectedYear) {
            option.selected = true;
        } else if (!selectedYear && year === currentYear) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    }
}

// =====================================================
// DEPARTMENT SELECT HELPERS
// =====================================================

async function populateDepartmentSelect(selectElement) {
    try {
        const response = await fetch("/api/shared/phong-ban-info");
        const departments = await response.json();

        // Thêm option "Tất cả"
        const allOption = document.createElement("option");
        allOption.value = "ALL";
        allOption.textContent = "Tất cả khoa";
        selectElement.appendChild(allOption);

        departments.forEach(dept => {
            const option = document.createElement("option");
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading departments:", error);
    }
}

// =====================================================
// TEACHER AUTOCOMPLETE
// =====================================================

let giangVienCoHuu = [];

async function loadGiangVienCoHuu() {
    try {
        const response = await fetch("/v2/giang-vien-co-huu");
        giangVienCoHuu = await response.json();
        // Export ra window để các file khác có thể truy cập
        window.giangVienCoHuu = giangVienCoHuu;
        console.log("Loaded giangVienCoHuu:", giangVienCoHuu.length, "records");
        return giangVienCoHuu;
    } catch (error) {
        console.error("Error loading teachers:", error);
        window.giangVienCoHuu = [];
        return [];
    }
}

function setupAutocomplete(inputElement, suggestionContainer, onSelect = null) {
    inputElement.addEventListener("input", () => {
        const query = inputElement.value.trim().toLowerCase();
        suggestionContainer.innerHTML = "";

        if (!query) return;

        const suggestions = giangVienCoHuu.filter(
            item => item.HoTen && item.HoTen.toLowerCase().includes(query)
        );

        suggestions.slice(0, 10).forEach(item => {
            const suggestionItem = document.createElement("div");
            suggestionItem.className = "suggestion-item";
            suggestionItem.textContent = item.HoTen;
            suggestionItem.addEventListener("click", () => {
                inputElement.value = item.HoTen;
                suggestionContainer.innerHTML = "";
                if (onSelect) onSelect(item);
            });
            suggestionContainer.appendChild(suggestionItem);
        });
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
        if (!inputElement.contains(e.target) && !suggestionContainer.contains(e.target)) {
            suggestionContainer.innerHTML = "";
        }
    });
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

function showSuccessToast(message) {
    Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Thành công",
        text: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });
}

function showErrorToast(message) {
    Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Lỗi",
        text: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });
}

// =====================================================
// VALIDATION
// =====================================================

function validateForm(formData, requiredFields) {
    const missing = [];

    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].toString().trim() === "") {
            missing.push(field);
        }
    });

    return {
        isValid: missing.length === 0,
        missingFields: missing
    };
}

// =====================================================
// PERMISSION HELPERS
// =====================================================

/**
 * Kiểm tra xem user có quyền nhập dữ liệu hay không
 */
function checkCanInputData() {
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");

    const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
    const APP_ROLES = window.APP_ROLES || {};

    const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";
    const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
    const troLyPhongRole = APP_ROLES.troLy_phong || "tro_ly_phong";
    const lanhDaoPhongRole = APP_ROLES.lanhDao_phong || "lanh_dao_phong";
    const gvCnbmKhoaRole = APP_ROLES.gv_cnbm_khoa || "gv_cnbm_khoa";
    const lanhDaoKhoaRole = APP_ROLES.lanhDao_khoa || "lanh_dao_khoa";

    const canApprove = (role === troLyPhongRole || role === lanhDaoPhongRole) &&
        (MaPhongBan === ncHtptCode || MaPhongBan === daoTaoCode);

    const canInputData = canApprove ||
        role === gvCnbmKhoaRole ||
        role === lanhDaoKhoaRole;

    return canInputData;
}

/**
 * Ẩn tab "Nhập dữ liệu" nếu user là view-only
 */
function hideFormTabIfViewOnly(formPanelId) {
    const canInputData = checkCanInputData();

    if (!canInputData) {
        const formTabBtn = document.querySelector(`.sub-tab-btn[data-panel="${formPanelId}"]`);
        if (formTabBtn) {
            formTabBtn.style.display = 'none';
            console.log(`[Permission] Hidden form tab for panel: ${formPanelId}`);
        }
    }
}

// =====================================================
// API HELPERS (NEW - for unified table)
// =====================================================

/**
 * Lấy quy định số giờ từ API mới
 * @param {string} loaiNCKH - Loại NCKH (DETAI_DUAN, BAIBAO, ...)
 */
async function loadQuyDinhSoGio(loaiNCKH) {
    try {
        const response = await fetch(`/v2/quydinh/${loaiNCKH}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error loading quy dinh for ${loaiNCKH}:`, error);
        return [];
    }
}

/**
 * Populate select box với quy định số giờ (NEW API)
 * @param {HTMLElement} selectElement - Select element
 * @param {string} loaiNCKH - Loại NCKH
 */
async function populatePhanLoaiSelectV2(selectElement, loaiNCKH) {
    try {
        const quyDinh = await loadQuyDinhSoGio(loaiNCKH);

        selectElement.innerHTML = '<option value="">-- Chọn phân loại --</option>';

        quyDinh.forEach(item => {
            const option = document.createElement("option");
            option.value = item.PhanLoai;
            option.textContent = `${item.PhanLoai} (${item.SoGio} tiết)`;
            option.dataset.soGio = item.SoGio;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error(`Error populating select for ${loaiNCKH}:`, error);
    }
}

/**
 * Lấy dữ liệu bảng từ API mới
 * @param {string} tabName - Tab name (detaiduan, baibaokhoahoc, ...)
 * @param {string} namHoc - Năm học
 * @param {string} khoa - Khoa (hoặc 'ALL')
 */
async function loadTableDataV2(tabName, namHoc, khoa = 'ALL') {
    const config = NCKH_CONFIG[tabName];
    if (!config) {
        console.error(`Unknown tab: ${tabName}`);
        return [];
    }

    const encodedNamHoc = encodeURIComponent(namHoc);
    const encodedKhoa = encodeURIComponent(khoa);

    try {
        const response = await fetch(`/v2/${config.apiPath}/${encodedNamHoc}/${encodedKhoa}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error loading data for ${tabName}:`, error);
        return [];
    }
}

/**
 * Submit form đến API mới
 * @param {string} tabName - Tab name
 * @param {Object} formData - Dữ liệu form
 */
async function submitFormV2(tabName, formData) {
    const config = NCKH_CONFIG[tabName];
    if (!config) {
        throw new Error(`Unknown tab: ${tabName}`);
    }

    const response = await fetch(`/v2/${config.apiPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
    });

    return response.json();
}

/**
 * Cập nhật bản ghi
 * @param {string} tabName - Tab name
 * @param {number} id - ID bản ghi
 * @param {Object} data - Dữ liệu cập nhật
 */
async function updateRecordV2(tabName, id, data) {
    const config = NCKH_CONFIG[tabName];
    if (!config) {
        throw new Error(`Unknown tab: ${tabName}`);
    }

    const response = await fetch(`/v2/${config.apiPath}/edit/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    return response.json();
}

/**
 * Xóa bản ghi
 * @param {number} id - ID bản ghi
 */
async function deleteRecordV2(id) {
    const response = await fetch(`/v2/nckh/delete/${id}`, {
        method: "POST"
    });

    return response.json();
}

/**
 * Cập nhật trạng thái duyệt
 * @param {number} id - ID bản ghi
 * @param {number} status - 0 hoặc 1
 */
async function updateApprovalV2(id, status) {
    const response = await fetch(`/v2/nckh/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ DaoTaoDuyet: status })
    });

    return response.json();
}

/**
 * Lấy config cho một tab
 * @param {string} tabName - Tab name
 */
function getNCKHConfig(tabName) {
    return NCKH_CONFIG[tabName] || null;
}

// =====================================================
// EXPORTS
// =====================================================

window.NCKH_V2_Utils = {
    // Constants
    NCKH_TYPES,
    NCKH_CONFIG,
    getNCKHConfig,

    // Công thức tính tiết
    quyDoiSoTietV2,
    quyDoiSoTietChiaDeu,

    // Format functions
    formatDate,
    formatHours,

    // Select helpers
    populateYearSelect,
    populateDepartmentSelect,
    populatePhanLoaiSelectV2,

    // Teacher autocomplete
    loadGiangVienCoHuu,
    setupAutocomplete,

    // Toasts
    showSuccessToast,
    showErrorToast,

    // Validation
    validateForm,

    // Permissions
    checkCanInputData,
    hideFormTabIfViewOnly,

    // API helpers (NEW)
    loadQuyDinhSoGio,
    loadTableDataV2,
    submitFormV2,
    updateRecordV2,
    deleteRecordV2,
    updateApprovalV2
};
