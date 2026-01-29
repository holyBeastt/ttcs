/**
 * NCKH V2 - Thành viên Hội đồng - Form Module
 * Xử lý form nhập liệu và submit
 * Hỗ trợ NHIỀU thành viên, mỗi người nhận đủ số tiết
 * Pattern tham khảo từ: dexuat/form.js
 */

(function () {
    'use strict';

    // =====================================================
    // LOAD LOAI HOI DONG OPTIONS
    // =====================================================

    async function loadLoaiHoiDongOptions() {
        try {
            const response = await fetch("/v2/quydinh/HOIDONG");
            const data = await response.json();

            const select = document.getElementById("loaiHoiDongHD");
            if (select) {
                select.innerHTML = '<option value="">-- Chọn loại hội đồng --</option>';
                data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.PhanLoai;
                    option.textContent = `${item.PhanLoai} (${item.SoGio} tiết/người)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading loai hoi dong:", error);
        }
    }

    // =====================================================
    // FORM SUBMIT SETUP
    // =====================================================

    function setupFormSubmit() {
        const form = document.getElementById("hoiDongForm");

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("HoiDong Form submit triggered");
                await submitForm();
            });
        } else {
            console.error("Form hoiDongForm not found!");
        }
    }

    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    async function submitForm() {
        console.log("=== HoiDong submitForm called ===");

        // Lấy danh sách thành viên từ Autocomplete module
        const memberList = HoiDong_Autocomplete.getMemberList();
        console.log("memberList:", memberList);

        // Validate phải có ít nhất 1 thành viên
        if (!memberList || memberList.length === 0) {
            NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 thành viên hội đồng");
            return;
        }

        const formData = {
            loaiHoiDong: document.getElementById("loaiHoiDongHD").value,
            namHoc: document.getElementById("namHocFormHoiDong").value,
            tenDeTai: document.getElementById("tenDeTaiHoiDong")?.value.trim() || "",
            thanhVien: memberList, // Array of members
            tongSoThanhVien: memberList.length,
            khoa: document.getElementById("khoaSelectHDKH").value
        };

        console.log("Form data:", formData);

        // Validate
        const validation = NCKH_V2_Utils.validateForm(formData, ["loaiHoiDong", "namHoc", "khoa"]);
        console.log("Validation result:", validation);

        if (!validation.isValid) {
            NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
            return;
        }

        // Hiển thị modal xác nhận
        const confirmResult = await HoiDong_Modal.showConfirmationModal(formData, memberList);
        if (!confirmResult.isConfirmed) {
            console.log("User cancelled submission");
            return;
        }

        try {
            console.log("Sending POST request to /v2/thanh-vien-hoi-dong");
            const response = await fetch("/v2/thanh-vien-hoi-dong", {
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
                document.getElementById("hoiDongForm")?.reset();
                HoiDong_Autocomplete.clearMemberList();
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

    window.HoiDong_Form = {
        loadLoaiHoiDongOptions,
        loadKhoaOptions: () => NCKH_V2_Utils.loadKhoaOptions("khoaSelectHDKH"),
        setupFormSubmit,
        submitForm
    };

})(); // End of IIFE
