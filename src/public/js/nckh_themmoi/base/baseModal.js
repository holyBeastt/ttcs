/**
 * NCKH V2 - Base Modal Component
 * Reusable modal handling for all NCKH types
 * Date: 2026-01-20
 */

(function () {
    'use strict';

    /**
     * Creates a base modal handler for NCKH modules
     * @param {Object} config - Configuration object
     * @param {string} config.tabName - Tab name
     * @param {Array} config.detailFields - Fields to show in detail modal
     */
    function createBaseModal(config) {
        const { tabName, detailFields = [] } = config;
        const nckhConfig = NCKH_V2_Utils.getNCKHConfig(tabName);

        // Default detail fields if not provided
        const defaultDetailFields = [
            { key: 'PhanLoai', label: 'Phân loại' },
            { key: 'TenCongTrinh', label: 'Tên công trình' },
            { key: 'MaSo', label: 'Mã số' },
            { key: 'TacGiaChinh', label: 'Tác giả chính' },
            { key: 'DanhSachThanhVien', label: 'Thành viên' },
            { key: 'NgayNghiemThu', label: 'Ngày nghiệm thu', format: 'date' },
            { key: 'KetQua', label: 'Kết quả' },
            { key: 'DaoTaoDuyet', label: 'Trạng thái duyệt', format: 'approval' }
        ];

        const fieldsToShow = detailFields.length > 0 ? detailFields : defaultDetailFields;

        // =====================================================
        // FORMAT VALUE
        // =====================================================

        function formatValue(value, format) {
            if (value === null || value === undefined || value === '') {
                return '<span class="text-muted">Không có</span>';
            }

            switch (format) {
                case 'date':
                    return NCKH_V2_Utils.formatDate(value);
                case 'approval':
                    return value === 1 || value === '1' || value === true
                        ? '<span class="badge bg-success">Đã duyệt</span>'
                        : '<span class="badge bg-secondary">Chưa duyệt</span>';
                default:
                    return value;
            }
        }

        // =====================================================
        // SHOW DETAIL MODAL
        // =====================================================

        function showDetailModal(data) {
            console.log('[BaseModal] Showing detail modal:', data);

            // Build content HTML
            let contentHtml = '<div class="detail-modal-content" style="text-align: left;">';

            fieldsToShow.forEach(field => {
                // Try multiple key variations
                let value = data[field.key];

                // Handle legacy field names
                if (value === undefined && nckhConfig) {
                    if (field.key === 'PhanLoai') value = data[nckhConfig.phanLoaiField];
                    if (field.key === 'TenCongTrinh') value = data[nckhConfig.tenField];
                    if (field.key === 'TacGiaChinh') value = data[nckhConfig.tacGiaField];
                }

                const formattedValue = formatValue(value, field.format);

                contentHtml += `
                    <div class="detail-row" style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #eee;">
                        <strong style="color: #495057; min-width: 140px; display: inline-block;">${field.label}:</strong>
                        <span style="color: #212529; margin-left: 10px;">${formattedValue}</span>
                    </div>
                `;
            });

            contentHtml += '</div>';

            Swal.fire({
                title: `Chi tiết ${nckhConfig ? nckhConfig.displayName : 'NCKH'}`,
                html: contentHtml,
                width: 700,
                showCloseButton: true,
                showConfirmButton: false,
                customClass: {
                    popup: 'detail-modal-popup'
                }
            });
        }

        // =====================================================
        // SHOW CONFIRMATION MODAL
        // =====================================================

        function showConfirmationModal(formData, additionalInfo = {}) {
            console.log('[BaseModal] Showing confirmation modal:', formData);

            let contentHtml = '<div class="confirm-modal-content" style="text-align: left; font-size: 15px;">';

            // Build summary of form data
            const displayFields = [
                { key: 'phanLoai', label: 'Phân loại' },
                { key: 'tenCongTrinh', label: 'Tên công trình' },
                { key: 'tacGiaChinh', label: 'Tác giả chính' },
                { key: 'thanhVien', label: 'Thành viên', format: 'array' },
                { key: 'namHoc', label: 'Năm học' },
                { key: 'ngayNghiemThu', label: 'Ngày nghiệm thu', format: 'date' },
                { key: 'ketQua', label: 'Kết quả' }
            ];

            displayFields.forEach(field => {
                let value = formData[field.key];

                // Handle different field name conventions
                if (value === undefined) {
                    // Try camelCase variations
                    const altKey = field.key.charAt(0).toUpperCase() + field.key.slice(1);
                    value = formData[altKey];
                }

                if (value !== undefined && value !== null && value !== '') {
                    let displayValue = value;

                    if (field.format === 'array' && Array.isArray(value)) {
                        displayValue = value.length > 0 ? value.join(', ') : 'Không có';
                    } else if (field.format === 'date') {
                        displayValue = NCKH_V2_Utils.formatDate(value);
                    }

                    contentHtml += `
                        <div style="margin-bottom: 10px; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                            <strong style="color: #495057;">${field.label}:</strong>
                            <span style="margin-left: 10px; color: #212529;">${displayValue}</span>
                        </div>
                    `;
                }
            });

            contentHtml += '</div>';

            return Swal.fire({
                title: 'Xác nhận thông tin',
                html: contentHtml,
                width: 600,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Xác nhận',
                cancelButtonText: 'Hủy'
            });
        }

        // =====================================================
        // PUBLIC API
        // =====================================================

        return {
            showDetailModal,
            showConfirmationModal,
            formatValue
        };
    }

    // Export
    window.NCKH_V2_BaseModal = {
        createBaseModal
    };

})();
