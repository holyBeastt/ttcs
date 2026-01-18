/**
 * NCKH V2 Utils
 * Các hàm tiện ích dùng chung cho tất cả loại NCKH
 */

// =====================================================
// CÔNG THỨC TÍNH TIẾT V2 (Client-side)
// =====================================================

/**
 * Quy đổi số tiết theo công thức v2
 * @param {number} T - Tổng số tiết chuẩn
 * @param {number} tongSoTacGia - Số người tham gia
 * @param {number} soDongChuNhiem - Số đồng chủ nhiệm (default: 1)
 * @param {number} soNamThucHien - Số năm thực hiện (default: 1)
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
 * @returns {boolean} true nếu có quyền nhập liệu
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

    // Quyền nhập liệu: 
    // 1. troLy_phong hoặc lanhDao_phong thuộc DAOTAO hoặc NC&HTPT
    // 2. gv_cnbm_khoa (bất kỳ khoa)
    // 3. lanhDao_khoa (bất kỳ khoa)
    const canApprove = (role === troLyPhongRole || role === lanhDaoPhongRole) &&
        (MaPhongBan === ncHtptCode || MaPhongBan === daoTaoCode);

    const canInputData = canApprove ||
        role === gvCnbmKhoaRole ||
        role === lanhDaoKhoaRole;

    return canInputData;
}

/**
 * Ẩn tab "Nhập dữ liệu" nếu user là view-only
 * @param {string} formPanelId - ID của form panel (e.g., "form-panel", "form-panel-bb")
 */
function hideFormTabIfViewOnly(formPanelId) {
    const canInputData = checkCanInputData();

    if (!canInputData) {
        // Tìm button sub-tab-btn có data-panel tương ứng
        const formTabBtn = document.querySelector(`.sub-tab-btn[data-panel="${formPanelId}"]`);
        if (formTabBtn) {
            formTabBtn.style.display = 'none';
            console.log(`[Permission] Hidden form tab for panel: ${formPanelId}`);
        }
    }
}

// Export for use in other files
window.NCKH_V2_Utils = {
    quyDoiSoTietV2,
    formatDate,
    formatHours,
    populateYearSelect,
    populateDepartmentSelect,
    loadGiangVienCoHuu,
    setupAutocomplete,
    showSuccessToast,
    showErrorToast,
    validateForm,
    checkCanInputData,
    hideFormTabIfViewOnly
};
