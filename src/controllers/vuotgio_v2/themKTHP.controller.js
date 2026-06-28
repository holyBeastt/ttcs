/**
 * VUOT GIO V2 - KTHP Controller
 * Date: 2026-06-23
 *
 * BUG #13 fix: Tạo controller thực sự với các methods được wrap rõ ràng.
 * Trước đây file này chỉ là: `module.exports = require("../../services/vuotgio_v2/kthp.service");`
 * → coupling chặt với service, khó test/mocking.
 *
 * Giờ controller này import service và delegate từng method, giữ nguyên
 * chữ ký (req, res) → express middleware sử dụng được.
 */

const kthpService = require("../../services/vuotgio_v2/kthp.service");

module.exports = {
    save: kthpService.save,
    saveBatch: kthpService.saveBatch,
    getTable: kthpService.getTable,
    getTableData: kthpService.getTableData,
    edit: kthpService.edit,
    delete: kthpService.delete,
    batchApprove: kthpService.batchApprove,
    approve: kthpService.approve,
    getList: kthpService.getList,
    getMyList: kthpService.getMyList,
    deleteByFilter: kthpService.deleteByFilter,
    checkExistence: kthpService.checkExistence,
    updateBatch: kthpService.updateBatch,
};