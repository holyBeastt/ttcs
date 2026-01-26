/**
 * NCKH V2 - Sáng Kiến - Form Module
 * Xử lý form nhập liệu và submit
 */

(function() {
    'use strict';

// =====================================================
// LOAD LOAI SANG KIEN OPTIONS
// =====================================================

async function loadLoaiSangKienOptions() {
    try {
        const response = await fetch("/v2/quydinh/SANGKIEN");
        const data = await response.json();

        const select = document.getElementById("loaiSangKien");
        if (select) {
            select.innerHTML = '<option value="">-- Chọn loại sáng kiến --</option>';
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.PhanLoai;
                option.textContent = `${item.PhanLoai} (${item.SoGio} tiết)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading loai sang kien:", error);
    }
}

// =====================================================
// FORM SUBMIT SETUP
// =====================================================

function setupFormSubmit() {
    const form = document.getElementById("sangkienForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("SangKien Form submit triggered");
            await submitForm();
        });
    } else {
        console.error("Form sangkienForm not found!");
    }
}

// =====================================================
// FORM SUBMISSION
// =====================================================

async function submitForm() {
    console.log("=== SangKien submitForm called ===");

    // Lấy danh sách tác giả chính từ view
    const tacGiaListFromView = window.tacGiaListSK || [];
    console.log("tacGiaListSK:", tacGiaListFromView);

    // Lấy danh sách thành viên từ Autocomplete module
    const memberList = SangKien_Autocomplete.getMemberList();

    // Validate phải có ít nhất 1 tác giả
    if (tacGiaListFromView.length === 0) {
        NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 tác giả chính");
        return;
    }

    const formData = {
        loaiSangKien: document.getElementById("loaiSangKien").value,
        namHoc: document.getElementById("namHocFormSK").value,
        tenSangKien: document.getElementById("tenSangKien").value.trim(),
        maSoSangKien: document.getElementById("maSoSangKien").value.trim(),
        tacGiaChinh: tacGiaListFromView.join(", "),
        ngayNghiemThu: document.getElementById("ngayNghiemThuSK").value,
        ketQua: document.getElementById("ketQuaSK").value,
        thanhVien: memberList,
        soNamThucHien: document.getElementById("soNamThucHienSK")?.value || 1,
        tongSoTacGia: tacGiaListFromView.length + memberList.length,
        tongSoThanhVien: memberList.length,
        khoa: document.getElementById("khoaSelectSK").value
    };

    console.log("Form data:", formData);

    // Validate
    const validation = NCKH_V2_Utils.validateForm(formData, ["loaiSangKien", "namHoc", "tenSangKien", "khoa"]);
    console.log("Validation result:", validation);

    if (!validation.isValid) {
        NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
        return;
    }

    // Hiển thị modal xác nhận
    const confirmResult = await SangKien_Modal.showConfirmationModal(formData, tacGiaListFromView);
    if (!confirmResult.isConfirmed) {
        console.log("User cancelled submission");
        return;
    }

    try {
        console.log("Sending POST request to /v2/sang-kien");
        const response = await fetch("/v2/sang-kien", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        console.log("Response status:", response.status);
        const result = await response.json();
        console.log("Response data:", result);

        if (result.success) {
            NCKH_V2_Utils.showSuccessToast(result.message);
            // Reset form
            document.getElementById("sangkienForm")?.reset();
            SangKien_Autocomplete.clearMemberList();
            // Reset tác giả list
            if (window.tacGiaListSK) {
                window.tacGiaListSK = [];
                if (typeof updateTacGiaDisplaySK === 'function') {
                    updateTacGiaDisplaySK();
                }
            }
        } else {
            NCKH_V2_Utils.showErrorToast(result.message);
        }
    } catch (error) {
        console.error("Error submitting form:", error);
        NCKH_V2_Utils.showErrorToast("Lỗi khi gửi dữ liệu");
    }
}

// =====================================================
// EXPORTS
// =====================================================

window.SangKien_Form = {
    loadLoaiSangKienOptions,
    loadKhoaOptions: () => NCKH_V2_Utils.loadKhoaOptions("khoaSelectSK"),
    setupFormSubmit,
    submitForm
};

})(); // End of IIFE
