/**
 * xem-truoc-hop-dong.js
 * Xu ly xem truoc hop dong
 */

/**
 * Xem truoc hop dong theo giang vien
 * @param {string} teacherName - Ten giang vien (da encode URI)
 */
function previewContract(teacherName) {
    const decodedName = decodeURIComponent(teacherName);
    const teacherData = window.teacherDetailData[decodedName];

    if (!teacherData) {
        showError('Không tìm thấy thông tin giảng viên');
        return;
    }

    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kì và Năm học');
        return;
    }

    console.log(`[MoiGiang Preview] HSL for ${decodedName}:`, { HSL: teacherData.HSL, teacherData });

    const requestData = {
        teacherData: JSON.stringify(teacherData),
        dot, ki, namHoc
    };

    fetch('/api/preview-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
 * Xem truoc hop dong trong he dao tao
 * @param {string} teacherName - Ten giang vien (da encode URI)
 * @param {number} heDaoTaoId - ID he dao tao
 * @param {string} heDaoTaoName - Ten he dao tao
 */
function previewContractInHeDaoTao(teacherName, heDaoTaoId, heDaoTaoName) {
    const decodedTeacherName = decodeURIComponent(teacherName);

    console.log('previewContractInHeDaoTao called with:', {
        teacherName: decodedTeacherName, heDaoTaoId, heDaoTaoName,
        availableData: window.heDaoTaoDetailData.map(item => ({ id: item.id, tenHe: item.tenHe }))
    });

    const trainingProgramData = window.heDaoTaoDetailData.find(tp => parseInt(tp.id) === parseInt(heDaoTaoId));

    if (!trainingProgramData) {
        showError('Không tìm thấy thông tin hệ đào tạo');
        return;
    }

    // Tim du lieu giang vien trong he dao tao - su dung truong GiangVien
    const teacherData = trainingProgramData.chiTietGiangVien.find(gv => gv.GiangVien === decodedTeacherName);

    if (!teacherData) {
        showError('Không tìm thấy thông tin giảng viên trong hệ đào tạo này');
        return;
    }

    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kì và Năm học');
        return;
    }

    // Chuan bi du lieu giang vien mo rong cho preview
    const enhancedTeacherData = {
        ...teacherData,
        GiangVien: teacherData.GiangVien,
        loaiHopDong: heDaoTaoName,
        TongTiet: parseFloat(teacherData.TongTiet) || parseFloat(teacherData.SoTiet) || 0,
        ThanhTien: parseFloat(teacherData.ThanhTien) || 0,
        Thue: parseFloat(teacherData.Thue) || (parseFloat(teacherData.ThanhTien) || 0) * 0.1,
        ThucNhan: parseFloat(teacherData.ThucNhan) || 0,
        HSL: teacherData.HSL || 1.0,
        hasEnhancedData: true,
        trainingPrograms: [{
            id: heDaoTaoId,
            tenHe: heDaoTaoName,
            SoTiet: parseFloat(teacherData.TongTiet) || parseFloat(teacherData.SoTiet) || 0,
            ThanhTien: parseFloat(teacherData.ThanhTien) || 0,
            Thue: parseFloat(teacherData.Thue) || (parseFloat(teacherData.ThanhTien) || 0) * 0.1,
            ThucNhan: parseFloat(teacherData.ThucNhan) || 0,
            TienMoiGiang: parseFloat(teacherData.TienMoiGiang) || 0
        }]
    };

    console.log(`[MoiGiang HeDaoTao Preview] HSL for ${decodedTeacherName}:`, {
        originalHSL: teacherData.HSL, finalHSL: enhancedTeacherData.HSL
    });

    const requestData = {
        teacherData: JSON.stringify(enhancedTeacherData),
        dot, ki, namHoc
    };

    fetch('/api/preview-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
