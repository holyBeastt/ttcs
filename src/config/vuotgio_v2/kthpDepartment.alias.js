"use strict";

/**
 * Mã đơn vị do các file sản lượng KTHP của Khảo thí phát hành
 * và mã phòng ban canonical đang lưu trong hồ sơ nhân viên.
 *
 * Chỉ các mapping đã được đối chiếu nhất quán với dữ liệu thực tế mới được
 * khai báo. Mã nguồn không có trong danh sách vẫn phải qua kiểm tra mismatch.
 */
module.exports = Object.freeze({
    KAT: "ATTT",
    KCB: "CB",
    KCN: "CNTT",
    KDV: "ĐTVM",
    KMM: "MM",
    VNC: "NC&HTPT",
});
