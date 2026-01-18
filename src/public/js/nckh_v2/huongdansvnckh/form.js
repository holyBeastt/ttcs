/**
 * NCKH V2 - Hướng dẫn SV NCKH - Form Module
 * Xử lý form nhập liệu và submit
 */

(function () {
    'use strict';

    // =====================================================
    // LOAD LOAI HUONG DAN OPTIONS
    // =====================================================

    async function loadLoaiHuongDanOptions() {
        try {
            const response = await fetch("/v2/data/huongdansvnckh");
            const data = await response.json();

            const select = document.getElementById("loaiHuongDanHD");
            if (select) {
                select.innerHTML = '<option value="">-- Chọn loại hướng dẫn --</option>';
                data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.LoaiHuongDan;
                    option.textContent = `${item.LoaiHuongDan} (${item.SoGio} tiết)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading loai huong dan:", error);
        }
    }

    // =====================================================
    // FORM SUBMIT SETUP
    // =====================================================

    function setupFormSubmit() {
        const form = document.getElementById("huongdansvnckhForm");

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("HuongDanSvNckh Form submit triggered");
                await submitForm();
            });
        } else {
            console.error("Form huongdansvnckhForm not found!");
        }
    }

    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    async function submitForm() {
        console.log("=== HuongDanSvNckh submitForm called ===");

        // Lấy danh sách thành viên tham gia hướng dẫn từ Autocomplete module
        const memberList = HuongDanSvNckh_Autocomplete.getMemberList();
        console.log("memberList:", memberList);

        // Validate phải có ít nhất 1 thành viên tham gia
        if (memberList.length === 0) {
            NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 thành viên tham gia hướng dẫn");
            return;
        }

        const formData = {
            loaiHuongDan: document.getElementById("loaiHuongDanHD").value,
            namHoc: document.getElementById("namHocFormHD").value,
            tenDeTai: document.getElementById("tenDeTaiHD").value.trim(),
            maSoDeTai: document.getElementById("maSoDeTaiHD")?.value.trim() || "",
            ngayNghiemThu: document.getElementById("ngayNghiemThuHD")?.value || "",
            ketQua: document.getElementById("ketQuaHD")?.value || "",
            thanhVien: memberList,
            tongSoTacGia: memberList.length,
            khoa: localStorage.getItem("MaPhongBan")
        };

        console.log("Form data:", formData);

        // Validate
        const validation = NCKH_V2_Utils.validateForm(formData, ["loaiHuongDan", "namHoc", "tenDeTai"]);
        console.log("Validation result:", validation);

        if (!validation.isValid) {
            NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
            return;
        }

        // Hiển thị modal xác nhận
        const confirmResult = await HuongDanSvNckh_Modal.showConfirmationModal(formData, memberList);
        if (!confirmResult.isConfirmed) {
            console.log("User cancelled submission");
            return;
        }

        try {
            console.log("Sending POST request to /v2/huong-dan-sv-nckh");
            const response = await fetch("/v2/huong-dan-sv-nckh", {
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
                document.getElementById("huongdansvnckhForm")?.reset();
                HuongDanSvNckh_Autocomplete.clearMemberList();
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

    window.HuongDanSvNckh_Form = {
        loadLoaiHuongDanOptions,
        setupFormSubmit,
        submitForm
    };

})(); // End of IIFE
