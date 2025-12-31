/**
 * xem-truoc-hop-dong.js
 * Các hàm xem trước hợp đồng đồ án
 */

/**
 * Xem trước hợp đồng từ view theo giảng viên
 * @param {string} teacherName - Tên giảng viên đã encode
 */
function previewContract(teacherName) {
    const decodedName = decodeURIComponent(teacherName);
    const teacherData = window.teacherDetailData[decodedName];

    console.log('[previewContract] teacherName:', decodedName);
    console.log('[previewContract] teacherData:', teacherData);

    if (!teacherData) {
        showError('Không tìm thấy thông tin giảng viên');
        return;
    }

    // Get current filter parameters
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kì và Năm học');
        return;
    }

    const requestData = {
        teacherData: JSON.stringify(teacherData),
        dot: dot,
        ki: ki,
        namHoc: namHoc
    };

    // Call API to get preview page with teacher data
    fetch('/api/preview-page-do-an', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load preview page');
            }
            return response.text();
        })
        .then(html => {
            // Open preview in new window
            const newWindow = window.open('', '_blank');
            newWindow.document.write(html);
            newWindow.document.close();
        })
        .catch(error => {
            console.error('Preview error:', error);
            showError('Không thể mở trang xem trước hợp đồng');
        });
}

/**
 * Xem trước hợp đồng từ view theo hệ đào tạo
 * @param {string} teacherName - Tên giảng viên đã encode
 * @param {number} heDaoTaoId - ID hệ đào tạo
 * @param {string} heDaoTaoName - Tên hệ đào tạo đã encode
 */
function previewContractInHeDaoTao(teacherName, heDaoTaoId, heDaoTaoName) {
    const decodedName = decodeURIComponent(teacherName);
    const decodedHeDaoTaoName = decodeURIComponent(heDaoTaoName);

    console.log('[Preview HeDaoTao] teacherName:', decodedName, 'heDaoTaoId:', heDaoTaoId);

    // Validate heDaoTaoId
    if (!heDaoTaoId || heDaoTaoId === 0) {
        console.error('[Preview HeDaoTao] Invalid heDaoTaoId:', heDaoTaoId);
        showError('Không tìm thấy mã hệ đào tạo. Vui lòng tải lại dữ liệu.');
        return;
    }

    // Find teacher in heDaoTaoDetailData
    let teacherData = null;
    let foundHeDaoTao = null;
    for (const he of window.heDaoTaoDetailData) {
        if (parseInt(he.he_dao_tao) === parseInt(heDaoTaoId) && he.chiTietGiangVien) {
            teacherData = he.chiTietGiangVien.find(gv => gv.HoTen === decodedName);
            if (teacherData) {
                foundHeDaoTao = he;
                // Add he_dao_tao info to teacherData
                teacherData = {
                    ...teacherData,
                    GiangVien: teacherData.HoTen,
                    loaiHopDong: 'Đồ án',
                    he_dao_tao: decodedHeDaoTaoName,
                    trainingPrograms: [{
                        id: heDaoTaoId,
                        tenHe: decodedHeDaoTaoName,
                        SoTiet: teacherData.SoTiet,
                        TienMoiGiang: teacherData.TienMoiGiang || 100000,
                        ThanhTien: teacherData.ThanhTien,
                        Thue: teacherData.Thue,
                        ThucNhan: teacherData.ThucNhan
                    }],
                    hasEnhancedData: true
                };
                break;
            }
        }
    }

    if (!teacherData) {
        showError('Không tìm thấy thông tin giảng viên');
        return;
    }

    // Get current filter parameters
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kì và Năm học');
        return;
    }

    const requestData = {
        teacherData: JSON.stringify(teacherData),
        dot: dot,
        ki: ki,
        namHoc: namHoc
    };

    // Call API to get preview page with teacher data
    fetch('/api/preview-page-do-an', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to load preview page');
            return response.text();
        })
        .then(html => {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(html);
            newWindow.document.close();
        })
        .catch(error => {
            console.error('Preview error:', error);
            showError('Không thể mở trang xem trước hợp đồng');
        });
}

/**
 * Xem hợp đồng đã có
 * @param {string} contractNumber - Số hợp đồng
 */
function viewContract(contractNumber) {
    window.location.href = `/hop-dong/chi-tiet/${contractNumber}`;
}

/**
 * Sửa hợp đồng
 * @param {string} contractNumber - Số hợp đồng
 */
function editContract(contractNumber) {
    window.location.href = `/hop-dong/sua/${contractNumber}`;
}
