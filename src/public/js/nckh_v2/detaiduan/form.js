/**
 * NCKH V2 - Đề Tài Dự Án - Form Module
 * Xử lý form nhập liệu và submit
 */

(function() {
    'use strict';

// =====================================================
// LOAD CAP DE TAI OPTIONS
// =====================================================

async function loadCapDeTaiOptions() {
    try {
        const response = await fetch("/v2/quydinh/DETAI_DUAN");
        const data = await response.json();

        const select = document.getElementById("capDeTai");
        if (select) {
            select.innerHTML = '<option value="">-- Chọn cấp đề tài --</option>';
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.PhanLoai;
                option.textContent = `${item.PhanLoai} (${item.SoGio} tiết)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading cap de tai:", error);
    }
}

// =====================================================
// FORM SUBMIT SETUP
// =====================================================

function setupFormSubmit() {
    const form = document.getElementById("detaiduanForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Form submit triggered");
            await submitForm();
        });
    } else {
        console.error("Form detaiduanForm not found!");
    }
}

// =====================================================
// FORM SUBMISSION
// =====================================================

async function submitForm() {
    console.log("=== submitForm called ===");

    // Lấy danh sách chủ nhiệm từ view (được quản lý bởi script trong view)
    const chuNhiemListFromView = window.chuNhiemList || [];
    console.log("chuNhiemList:", chuNhiemListFromView);

    // Lấy danh sách thành viên từ Autocomplete module
    const memberList = DeTaiDuAn_Autocomplete.getMemberList();

    // Validate phải có ít nhất 1 chủ nhiệm
    if (chuNhiemListFromView.length === 0) {
        NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 chủ nhiệm/tác giả chính");
        return;
    }

    const formData = {
        capDeTai: document.getElementById("capDeTai").value,
        namHoc: document.getElementById("namHocForm").value,
        tenDeTai: document.getElementById("tenDeTai").value.trim(),
        maDeTai: document.getElementById("maDeTai").value.trim(),
        chuNhiem: chuNhiemListFromView.join(", "), // Ghép các chủ nhiệm thành chuỗi
        ngayNghiemThu: document.getElementById("ngayNghiemThu").value,
        ketQua: document.getElementById("ketQua").value,
        thanhVien: memberList,
        soDongChuNhiem: chuNhiemListFromView.length, // Số đồng chủ nhiệm = số người trong list
        soNamThucHien: document.getElementById("soNamThucHien")?.value || 1,
        tongSoTacGia: chuNhiemListFromView.length + memberList.length, // Tổng số tác giả
        tongSoThanhVien: memberList.length, // Tổng số thành viên
        khoa: document.getElementById("khoaSelect").value
    };

    console.log("Form data:", formData);

    // Validate
    const validation = NCKH_V2_Utils.validateForm(formData, ["capDeTai", "namHoc", "tenDeTai", "khoa"]);
    console.log("Validation result:", validation);

    if (!validation.isValid) {
        NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
        return;
    }

    // Hiển thị modal xác nhận
    const confirmResult = await DeTaiDuAn_Modal.showConfirmationModal(formData, chuNhiemListFromView);
    if (!confirmResult.isConfirmed) {
        console.log("User cancelled submission");
        return;
    }

    try {
        console.log("Sending POST request to /v2/de-tai-du-an");
        const response = await fetch("/v2/de-tai-du-an", {
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
            document.getElementById("detaiduanForm")?.reset();
            DeTaiDuAn_Autocomplete.clearMemberList();
            // Reset chủ nhiệm list (trong view)
            if (window.chuNhiemList) {
                window.chuNhiemList = [];
                if (typeof updateChuNhiemDisplay === 'function') {
                    updateChuNhiemDisplay();
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

window.DeTaiDuAn_Form = {
    loadCapDeTaiOptions,
    loadKhoaOptions: () => NCKH_V2_Utils.loadKhoaOptions("khoaSelect"),
    setupFormSubmit,
    submitForm
};

})(); // End of IIFE
