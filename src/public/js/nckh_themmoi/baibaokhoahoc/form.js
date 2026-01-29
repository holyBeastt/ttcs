/**
 * NCKH V2 - Bài Báo Khoa Học - Form Module
 * Xử lý form nhập liệu và submit
 */

(function () {
    'use strict';

    // =====================================================
    // LOAD LOẠI BÀI BÁO OPTIONS
    // =====================================================

    async function loadLoaiBaiBaoOptions() {
        try {
            const response = await fetch("/v2/quydinh/BAIBAO");
            const data = await response.json();

            const select = document.getElementById("loaiTapChiBB");
            const selectChiSo = document.getElementById("chiSoTapChiBB");

            if (select) {
                select.innerHTML = '<option value="">-- Chọn loại tạp chí --</option>';
                data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.PhanLoai;
                    option.textContent = `${item.PhanLoai} (${item.SoGio} tiết)`;
                    select.appendChild(option);
                });
            }

            if (selectChiSo) {
                selectChiSo.innerHTML = '<option value="">-- Chọn chỉ số --</option>';
                data.forEach(item => {
                    const option = document.createElement("option");
                    option.value = item.PhanLoai;
                    option.textContent = item.PhanLoai;
                    selectChiSo.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading loai bai bao:", error);
        }
    }

    // =====================================================
    // FORM SUBMIT SETUP
    // =====================================================

    function setupFormSubmit() {
        const form = document.getElementById("baibaokhoahocForm");

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                console.log("BaiBaoKhoaHoc Form submit triggered");
                await submitForm();
            });
        } else {
            console.error("Form baibaokhoahocForm not found!");
        }
    }

    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    async function submitForm() {
        console.log("=== BaiBaoKhoaHoc submitForm called ===");

        // Lấy danh sách tác giả chính từ view
        const tacGiaListFromView = window.tacGiaListBB || [];
        console.log("tacGiaListBB:", tacGiaListFromView);

        // Lấy danh sách thành viên từ Autocomplete module
        const memberList = BaiBao_Autocomplete.getMemberList();

        // Validate phải có ít nhất 1 tác giả
        if (tacGiaListFromView.length === 0) {
            NCKH_V2_Utils.showErrorToast("Vui lòng thêm ít nhất 1 tác giả chính");
            return;
        }

        const formData = {
            loaiTapChi: document.getElementById("loaiTapChiBB").value,
            chiSoTapChi: document.getElementById("chiSoTapChiBB").value,
            namHoc: document.getElementById("namHocFormBB").value,
            tenBaiBao: document.getElementById("tenBaiBaoBB").value.trim(),
            tacGiaChinh: tacGiaListFromView,
            thanhVien: memberList,
            soNamThucHien: document.getElementById("soNamThucHienBB")?.value || 1,
            tongSoTacGia: tacGiaListFromView.length + memberList.length,
            tongSoThanhVien: memberList.length,
            khoa: document.getElementById("khoaSelectBB").value
        };

        console.log("Form data:", formData);

        // Validate
        const validation = NCKH_V2_Utils.validateForm(formData, ["loaiTapChi", "namHoc", "tenBaiBao"]);
        console.log("Validation result:", validation);

        if (!validation.isValid) {
            NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
            return;
        }

        // Hiển thị modal xác nhận
        const confirmResult = await BaiBao_Modal.showConfirmationModal(formData, tacGiaListFromView);
        if (!confirmResult.isConfirmed) {
            console.log("User cancelled submission");
            return;
        }

        try {
            console.log("Sending POST request to /v2/bai-bao-khoa-hoc");
            const response = await fetch("/v2/bai-bao-khoa-hoc", {
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
                document.getElementById("baibaokhoahocForm")?.reset();
                BaiBao_Autocomplete.clearMemberList();
                // Reset tác giả list
                if (window.tacGiaListBB) {
                    window.tacGiaListBB = [];
                    if (typeof updateTacGiaDisplayBB === 'function') {
                        updateTacGiaDisplayBB();
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

    window.BaiBao_Form = {
        loadLoaiBaiBaoOptions,
        loadKhoaOptions: () => NCKH_V2_Utils.loadKhoaOptions("khoaSelectBB"),
        setupFormSubmit,
        submitForm
    };

})(); // End of IIFE
