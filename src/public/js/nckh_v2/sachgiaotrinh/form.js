/**
 * NCKH V2 - Sách Giáo Trình - Form Module
 * Xử lý form nhập liệu và submit
 */

(function () {
    'use strict';

    // =====================================================
    // LOAD PHÂN LOẠI OPTIONS
    // =====================================================

    async function loadPhanLoaiOptions() {
        try {
            const response = await fetch("/v2/data/sachvagiaotrinh");
            const data = await response.json();

            const select = document.getElementById("phanLoaiSGT");
            if (select) {
                select.innerHTML = '<option value="">-- Chọn phân loại --</option>';
                data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.SachGiaoTrinh;
                    option.textContent = `${item.SachGiaoTrinh} (${item.SoGio} tiết)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading phan loai:", error);
        }
    }

    // =====================================================
    // FORM SUBMIT SETUP
    // =====================================================

    function setupFormSubmit() {
        const form = document.getElementById("sachGiaoTrinhForm");

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("SachGiaoTrinh Form submit triggered");
                await submitForm();
            });
        } else {
            console.error("Form sachGiaoTrinhForm not found!");
        }
    }

    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    async function submitForm() {
        console.log("=== SachGiaoTrinh submitForm called ===");

        // Lấy danh sách chủ biên từ view
        const tacGiaListFromView = window.tacGiaListSGT || [];
        console.log("tacGiaListSGT:", tacGiaListFromView);

        // Lấy danh sách thành viên từ Autocomplete module
        const memberList = SachGiaoTrinh_Autocomplete.getMemberList();

        // Validate phải có ít nhất 1 chủ biên
        if (tacGiaListFromView.length === 0) {
            NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 chủ biên");
            return;
        }

        const formData = {
            phanLoai: document.getElementById("phanLoaiSGT").value,
            namHoc: document.getElementById("namHocFormSGT").value,
            tenSachGiaoTrinh: document.getElementById("tenSachGiaoTrinh").value.trim(),
            soXuatBan: document.getElementById("soXuatBan").value.trim(),
            soTrang: document.getElementById("soTrang").value,
            ketQua: document.getElementById("ketQuaSGT").value,
            tacGiaChinh: tacGiaListFromView,
            thanhVien: memberList,
            soNamThucHien: document.getElementById("soNamThucHienSGT")?.value || 1,
            tongSoTacGia: tacGiaListFromView.length + memberList.length,
            tongSoThanhVien: memberList.length,
            khoa: localStorage.getItem("MaPhongBan")
        };

        console.log("Form data:", formData);

        // Validate
        const validation = NCKH_V2_Utils.validateForm(formData, ["phanLoai", "namHoc", "tenSachGiaoTrinh"]);
        console.log("Validation result:", validation);

        if (!validation.isValid) {
            NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
            return;
        }

        // Hiển thị modal xác nhận
        const confirmResult = await SachGiaoTrinh_Modal.showConfirmationModal(formData, tacGiaListFromView);
        if (!confirmResult.isConfirmed) {
            console.log("User cancelled submission");
            return;
        }

        try {
            console.log("Sending POST request to /v2/sach-giao-trinh");
            const response = await fetch("/v2/sach-giao-trinh", {
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
                document.getElementById("sachGiaoTrinhForm")?.reset();
                SachGiaoTrinh_Autocomplete.clearMemberList();
                // Reset chủ biên list
                if (window.tacGiaListSGT) {
                    window.tacGiaListSGT = [];
                    if (typeof updateTacGiaDisplaySGT === 'function') {
                        updateTacGiaDisplaySGT();
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

    window.SachGiaoTrinh_Form = {
        loadPhanLoaiOptions,
        setupFormSubmit,
        submitForm
    };

})(); // End of IIFE
