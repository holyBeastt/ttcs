const createPoolConnection = require('../config/databasePool');

/**
 * Service for logging changes to database in lichsunhaplieu table
 */
class LogService {
    /**
     * Log a change to the database
     * @param {number} userId - ID of the user making the change
     * @param {string} userName - Name of the user making the change
     * @param {string} logType - Type of information being logged (e.g., 'Thay đổi thông tin NCKH')
     * @param {string} changeContent - Description of the change
     * @param {Date} [changeTime=null] - Time of the change (defaults to current time)
     * @returns {Promise<Object>} - Result of the insert operation
     */
    static async logChange(userId, userName, logType, changeContent, changeTime = null) {
        let connection;
        try {
            // Use current time if no specific time provided
            const timestamp = changeTime || new Date();
            
            // Get connection from pool
            connection = await createPoolConnection();
            
            // Insert log entry into lichsunhaplieu table
            const query = `
                INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(query, [
                userId,
                userName,
                logType,
                changeContent,
                timestamp
            ]);
            
            console.log(`Log entry created: ${changeContent}`);
            return result;
        } catch (error) {
            console.error('Error logging change to database:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
    
    /**
     * Generate log message for scientific article approval changes
     * @param {Object} oldData - Previous state of the data
     * @param {Object} newData - New state of the data
     * @param {string} entityType - Type of entity (e.g., 'bài báo', 'đề tài')
     * @returns {string} - Generated change message or empty string if no changes
     */
    static generateNCKHChangeMessage(oldData, newData, entityType = '') {
        let changeMessage = '';
        
        // Determine entity type and name based on data structure
        let entityName = '';
        if (!entityType) {
            // Try to determine entity type based on available fields
            if (newData.TenBaiBao) {
                entityType = 'bài báo';
                entityName = newData.TenBaiBao;
            } else if (newData.TenDeTai) {
                entityType = 'đề tài';
                entityName = newData.TenDeTai;
            } else if (newData.TenBangSangCheVaGiaiThuong) {
                entityType = 'bằng sáng chế/giải thưởng';
                entityName = newData.TenBangSangCheVaGiaiThuong;
            } else if (newData.TenGiaoTrinhBaiGiang) {
                entityType = 'giáo trình/bài giảng';
                entityName = newData.TenGiaoTrinhBaiGiang;
            } else if (newData.TenSachVaGiaoTrinh) {
                entityType = 'sách/giáo trình';
                entityName = newData.TenSachVaGiaoTrinh;
            } else if (newData.TenChuongTrinh) {
                entityType = 'chương trình đào tạo';
                entityName = newData.TenChuongTrinh;
            } else if (newData.TenNhiemVu) {
                entityType = 'nhiệm vụ khoa học';
                entityName = newData.TenNhiemVu;
            } else {
                entityType = 'công trình NCKH';
                entityName = 'ID:' + (newData.ID || 'Không xác định');
            }
        }
        
        // Check DaoTaoDuyet status changes (similar to the SQL trigger)
        if (oldData.DaoTaoDuyet !== newData.DaoTaoDuyet) {
            if (oldData.DaoTaoDuyet === 0 && newData.DaoTaoDuyet === 1) {
                changeMessage = `Đào tạo thay đổi duyệt ${entityType} "${entityName}": Đã duyệt.`;
            } else if (oldData.DaoTaoDuyet === 1 && newData.DaoTaoDuyet === 0) {
                changeMessage = `Đào tạo thay đổi duyệt ${entityType} "${entityName}": Hủy duyệt.`;
            } 
        }
        
        // Can add more change detection logic here as needed
        
        return changeMessage;
    }
    
    /**
     * Log changes to a scientific article (NCKH)
     * @param {Object} oldData - Previous state of the article
     * @param {Object} newData - New state of the article
     * @param {Object} user - User information {id, name}
     * @returns {Promise<Object|null>} - Result of the log operation or null if no changes
     */
    static async logNCKHChange(oldData, newData, user) {
        const changeMessage = this.generateNCKHChangeMessage(oldData, newData);
        
        if (changeMessage) {
            return await this.logChange(
                user.id, 
                user.name,
                'Thay đổi thông tin NCKH',
                changeMessage
            );
        }
        
        return null; // No changes to log
    }
}

module.exports = LogService;
