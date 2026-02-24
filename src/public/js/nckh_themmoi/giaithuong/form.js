/**
 * NCKH V2 - Giải Thưởng KHCN - Form Module
 * Xử lý form nhập liệu và submit
 */

(function() {
    'use strict';

// =====================================================
// LOAD LOẠI GIẢI THƯỞNG OPTIONS
// =====================================================

async function loadLoaiGiaiThuongOptions() {
    try {
        const response = await fetch("/v2/quydinh/GIAITHUONG");
        const data = await response.json();

        const select = document.getElementById("loaiGiaiThuong");
        if (select) {
            select.innerHTML = '<option value="">-- Chọn phân loại --</option>';
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.PhanLoai;
                option.textContent = `${item.PhanLoai} (${item.SoGio} tiết)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading loai giai thuong:", error);
    }
}

// =====================================================
// FORM SUBMIT SETUP
// =====================================================

function setupFormSubmit() {
    const form = document.getElementById("giaithuongForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("GiaiThuong Form submit triggered");
            await submitForm();
        });
    } else {
        console.error("Form giaithuongForm not found!");
    }
}

// =====================================================
// FORM SUBMISSION
// =====================================================

async function submitForm() {
    console.log("=== GiaiThuong submitForm called ===");

    // Lấy danh sách tác giả chính từ view
    const tacGiaListFromView = window.tacGiaListGT || [];
    console.log("tacGiaListGT:", tacGiaListFromView);

    // Lấy danh sách thành viên từ Autocomplete module
    const memberList = GiaiThuong_Autocomplete.getMemberList();

    // Validate phải có ít nhất 1 tác giả
    if (tacGiaListFromView.length === 0) {
        NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 tác giả chính");
        return;
    }

    const formData = {
        loaiGiaiThuong: document.getElementById("loaiGiaiThuong").value,
        namHoc: document.getElementById("namHocFormGT").value,
        tenGiaiThuong: document.getElementById("tenGiaiThuong").value.trim(),
        soQuyetDinh: document.getElementById("soQuyetDinh").value.trim(),
        ngayQuyetDinh: document.getElementById("ngayQuyetDinh").value,
        tacGiaChinh: tacGiaListFromView,
        thanhVien: memberList,
        soNamThucHien: document.getElementById("soNamThucHienGT")?.value || 1,
        tongSoTacGia: tacGiaListFromView.length + memberList.length,
        tongSoThanhVien: memberList.length,
        khoa: document.getElementById("khoaSelectGT").value
    };

    console.log("Form data:", formData);

    // Validate
    const validation = NCKH_V2_Utils.validateForm(formData, ["loaiGiaiThuong", "namHoc", "tenGiaiThuong"]);
    console.log("Validation result:", validation);

    if (!validation.isValid) {
        NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
        return;
    }

    // Hiển thị modal xác nhận
    const confirmResult = await GiaiThuong_Modal.showConfirmationModal(formData, tacGiaListFromView);
    if (!confirmResult.isConfirmed) {
        console.log("User cancelled submission");
        return;
    }

    try {
        console.log("Sending POST request to /v2/giai-thuong");
        const response = await fetch("/v2/giai-thuong", {
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
            document.getElementById("giaithuongForm")?.reset();
            GiaiThuong_Autocomplete.clearMemberList();
            // Reset tác giả list
            if (window.tacGiaListGT) {
                window.tacGiaListGT = [];
                if (typeof updateTacGiaDisplayGT === 'function') {
                    updateTacGiaDisplayGT();
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

window.GiaiThuong_Form = {
    loadLoaiGiaiThuongOptions,
    loadKhoaOptions: () => NCKH_V2_Utils.loadKhoaOptions("khoaSelectGT"),
    setupFormSubmit,
    submitForm
};

})(); // End of IIFE
