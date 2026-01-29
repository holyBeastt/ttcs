/**
 * NCKH V2 - Base Form Component
 * Reusable form handling for all NCKH types
 * Date: 2026-01-20
 */

(function () {
    'use strict';

    /**
     * Creates a base form handler for NCKH modules
     * @param {Object} config - Configuration object
     * @param {string} config.tabName - Tab name (detaiduan, baibaokhoahoc, ...)
     * @param {string} config.formId - ID of form element
     * @param {string} config.phanLoaiSelectId - ID of phân loại select
     * @param {Array} config.requiredFields - Array of required field names
     * @param {Function} config.collectFormData - Custom function to collect form data
     * @param {Function} config.onSubmitSuccess - Callback when submit successful
     * @param {Function} config.showConfirmModal - Custom confirmation modal
     */
    function createBaseForm(config) {
        const {
            tabName,
            formId,
            phanLoaiSelectId,
            requiredFields = [],
            collectFormData,
            onSubmitSuccess,
            showConfirmModal
        } = config;

        const nckhConfig = NCKH_V2_Utils.getNCKHConfig(tabName);

        if (!nckhConfig) {
            console.error(`Unknown tab: ${tabName}`);
            return null;
        }

        // =====================================================
        // LOAD PHAN LOAI OPTIONS
        // =====================================================

        async function loadPhanLoaiOptions() {
            const select = document.getElementById(phanLoaiSelectId);
            if (!select) {
                console.warn(`Select element ${phanLoaiSelectId} not found`);
                return;
            }

            await NCKH_V2_Utils.populatePhanLoaiSelectV2(select, nckhConfig.type);
        }

        // =====================================================
        // SETUP FORM SUBMIT
        // =====================================================

        function setupFormSubmit() {
            const form = document.getElementById(formId);

            if (form) {
                form.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    console.log(`[BaseForm] Form ${formId} submit triggered`);
                    await submitForm();
                });
            } else {
                console.error(`Form ${formId} not found!`);
            }
        }

        // =====================================================
        // FORM SUBMISSION
        // =====================================================

        async function submitForm() {
            console.log(`[BaseForm] Submitting form for ${tabName}`);

            // Collect form data using custom function or default
            let formData;
            if (collectFormData) {
                formData = collectFormData();
            } else {
                formData = collectDefaultFormData();
            }

            console.log("[BaseForm] Form data:", formData);

            // Validate
            const validation = NCKH_V2_Utils.validateForm(formData, requiredFields);

            if (!validation.isValid) {
                NCKH_V2_Utils.showErrorToast(`Vui lòng điền đầy đủ: ${validation.missingFields.join(", ")}`);
                return;
            }

            // Show confirmation modal if provided
            if (showConfirmModal) {
                const confirmResult = await showConfirmModal(formData);
                if (!confirmResult || !confirmResult.isConfirmed) {
                    console.log("[BaseForm] User cancelled submission");
                    return;
                }
            }

            // Submit to API
            try {
                console.log(`[BaseForm] Sending POST to /v2/${nckhConfig.apiPath}`);

                const result = await NCKH_V2_Utils.submitFormV2(tabName, formData);
                console.log("[BaseForm] Response:", result);

                if (result.success) {
                    NCKH_V2_Utils.showSuccessToast(result.message);

                    // Reset form
                    const form = document.getElementById(formId);
                    if (form) form.reset();

                    // Call success callback
                    if (onSubmitSuccess) {
                        onSubmitSuccess(result);
                    }
                } else {
                    NCKH_V2_Utils.showErrorToast(result.message);
                }
            } catch (error) {
                console.error("[BaseForm] Error submitting form:", error);
                NCKH_V2_Utils.showErrorToast("Lỗi khi gửi dữ liệu");
            }
        }

        // =====================================================
        // DEFAULT FORM DATA COLLECTION
        // =====================================================

        function collectDefaultFormData() {
            // This is a basic default - should be overridden by collectFormData config
            const phanLoai = document.getElementById(phanLoaiSelectId)?.value || '';
            const namHoc = document.getElementById("namHocForm")?.value || '';
            const khoa = localStorage.getItem("MaPhongBan");

            return {
                phanLoai,
                namHoc,
                khoa
            };
        }

        // =====================================================
        // INITIALIZE
        // =====================================================

        function init() {
            loadPhanLoaiOptions();
            setupFormSubmit();
        }

        // =====================================================
        // PUBLIC API
        // =====================================================

        return {
            init,
            loadPhanLoaiOptions,
            setupFormSubmit,
            submitForm
        };
    }

    // Export
    window.NCKH_V2_BaseForm = {
        createBaseForm
    };

})();
