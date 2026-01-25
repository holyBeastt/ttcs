/**
 * NCKH V2 - Đề Xuất Nghiên Cứu - Form Module
 * Xử lý form nhập liệu và submit
 */

(function () {
    'use strict';

    // =====================================================
    // LOAD CAP DE XUAT OPTIONS
    // =====================================================

    async function loadCapDeXuatOptions() {
        try {
            const response = await fetch("/v2/quydinh/DEXUAT");
            const data = await response.json();

            const select = document.getElementById("capDeXuat");
            if (select) {
                select.innerHTML = '<option value="">-- Chọn cấp đề xuất --</option>';
                data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.PhanLoai;
                    option.textContent = `${item.PhanLoai} (${item.SoGio} tiết)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading cap de xuat:", error);
        }
    }

    // =====================================================
    // FORM SUBMIT SETUP
    // =====================================================

    function setupFormSubmit() {
        const form = document.getElementById("dexuatForm");

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("DeXuat Form submit triggered");
                await submitForm();
            });
        } else {
            console.error("Form dexuatForm not found!");
        }
    }

    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    async function submitForm() {
        console.log("=== DeXuat submitForm called ===");

        // Lấy danh sách thành viên từ Autocomplete module
        const memberList = DeXuat_Autocomplete.getMemberList();

        // Validate phải có ít nhất 1 thành viên
        if (memberList.length === 0) {
            NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 thành viên tham gia");
            return;
        }

        const formData = {
            capDeXuat: document.getElementById("capDeXuat").value,
            namHoc: document.getElementById("namHocFormDX").value,
            tenDeXuat: document.getElementById("tenDeXuat").value.trim(),
            maSoDeXuat: document.getElementById("maSoDeXuat").value.trim(),
            ngayNghiemThu: document.getElementById("ngayNghiemThuDX").value,
            ketQua: document.getElementById("ketQuaDX").value,
            thanhVien: memberList,
            tongSoTacGia: memberList.length, // Tổng số thành viên (chia đều)
            khoa: document.getElementById("khoaSelectDX").value
        };

        console.log("Form data:", formData);

        // Validate
        const validation = NCKH_V2_Utils.validateForm(formData, ["capDeXuat", "namHoc", "tenDeXuat", "khoa"]);
        console.log("Validation result:", validation);

        if (!validation.isValid) {
            NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
            return;
        }

        // Hiển thị modal xác nhận
        const confirmResult = await DeXuat_Modal.showConfirmationModal(formData);
        if (!confirmResult.isConfirmed) {
            console.log("User cancelled submission");
            return;
        }

        try {
            console.log("Sending POST request to /v2/de-xuat-nghien-cuu");
            const response = await fetch("/v2/de-xuat-nghien-cuu", {
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
                document.getElementById("dexuatForm")?.reset();
                DeXuat_Autocomplete.clearMemberList();
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

    window.DeXuat_Form = {
        loadCapDeXuatOptions,
        loadKhoaOptions: () => NCKH_V2_Utils.loadKhoaOptions("khoaSelectDX"),
        setupFormSubmit,
        submitForm
    };

})(); // End of IIFE
