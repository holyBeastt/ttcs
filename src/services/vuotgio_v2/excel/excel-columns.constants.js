const columnsA1 = () => [
  { label: "TT", align: "center" },
  { label: "Tên học phần", align: "center" },
  { label: "Số TC (HT)", align: "center", isNumeric: true },
  { label: "Lớp học phần", align: "center" },
  { label: "Đối tượng", align: "center", highlightColumn: true },
  { label: "Số tiết theo TKB", align: "center", isNumeric: true, includeInSubtotal: true },
  { label: "Số tiết QC", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsA2 = () => [
  { label: "TT", align: "center" },
  { label: "Tên học phần", align: "center" },
  { label: "Ra đề/ Coi thi/ Chấm thi kết thúc học phần", align: "center" },
  { label: "Lớp học phần", align: "center" },
  { label: "Đối tượng", align: "center", highlightColumn: true },
  { label: "Số sinh viên của lớp", align: "center", isNumeric: true },
  {
    label: "Số tiết ra đề/ Coi thi/ Chấm thi",
    align: "center",
    isNumeric: true,
    includeInSubtotal: true,
  },
];

const columnsB = () => [
  { label: "TT", align: "center" },
  { label: "Họ tên NCS, Học viên, Sinh viên", align: "center" },
  { label: "Khóa đào tạo", align: "center" },
  { label: "Số QĐ Giao Luận án, Luận văn, đồ án", align: "center" },
  { label: "Số người HD", align: "center", isNumeric: true },
  { label: "HD chính/ HD hai", align: "center" },
  { label: "Số tiết quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsC = () => [
  { label: "TT", align: "center" },
  { label: "Mô tả hoạt động", align: "center" },
  { label: "Khóa đào tạo", align: "center" },
  { label: "Theo QĐ", align: "center" },
  { label: "Số ngày", align: "center", isNumeric: true },
  { label: "Số ngày", align: "center", isNumeric: true },
  { label: "Số tiết quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD1 = () => [
  { label: "TT", align: "center" },
  { label: "Tên đề tài, dự án (mã số đề tài, dự án)", align: "center" },
  { label: "Chủ trì/ thành viên", align: "center" },
  { label: "Cấp đề tài", align: "center" },
  { label: "Ngày nghiệm thu", align: "center" },
  { label: "Kết quả xếp loại", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD2 = () => [
  { label: "TT", align: "center" },
  { label: "Tên sáng kiến (mã số sáng kiến nếu có)", align: "center" },
  { label: "Chủ trì/ thành viên", align: "center" },
  { label: "Sáng kiến", align: "center" },
  { label: "Ngày nghiệm thu", align: "center" },
  { label: "Kết quả xếp loại", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD3 = () => [
  { label: "TT", align: "center" },
  { label: "Tên giải pháp khoa học, giải thưởng; Bằng sáng chế", align: "center" },
  { label: "Số QĐ công nhận", align: "center" },
  { label: "Ngày QĐ công nhận", align: "center" },
  { label: "Số người", align: "center", isNumeric: true },
  { label: "Tác giả chính/ thành viên", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD4 = () => [
  { label: "TT", align: "center" },
  { label: "Tên đề xuất (mã số nếu có)", align: "center" },
  { label: "Chủ trì/ thành viên", align: "center" },
  { label: "Cấp quốc gia, quốc tế; cấp Bộ và tương đương; cấp cơ sở", align: "center" },
  { label: "Ngày nghiệm thu", align: "center" },
  { label: "Kết quả xếp loại", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD5 = () => [
  { label: "TT", align: "center" },
  { label: "Tên sách, giáo trình", align: "center" },
  { label: "Số xuất bản", align: "center" },
  { label: "Số trang", align: "center" },
  { label: "Số người", align: "center", isNumeric: true },
  { label: "Tác giả chính/ thành viên", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD6 = () => [
  { label: "TT", align: "center" },
  { label: "Tên bài báo", align: "center" },
  { label: "Loại tạp chí/ hội nghị", align: "center" },
  { label: "Chỉ số tạp chí/ hội nghị", align: "center" },
  { label: "Số người", align: "center", isNumeric: true },
  { label: "Tác giả chính/ thành viên", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD7 = () => [
  { label: "TT", align: "center" },
  { label: "Tên đề tài", align: "center" },
  { label: "Số QĐ giao nhiệm vụ", align: "center" },
  { label: "Ngày ký QĐ giao nhiệm vụ", align: "center" },
  { label: "Kết quả bảo vệ cấp Khoa", align: "center" },
  { label: "Kết quả bảo vệ cấp Học viện", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD8 = () => [
  { label: "TT", align: "center" },
  { label: "Tên hội đồng khoa học", align: "center" },
  { label: "Hội đồng cấp", align: "center" },
  { label: "Hội đồng cấp", align: "center" },
  { label: "Chức danh (chủ tịch, phản biện, ủy viên)", align: "center" },
  { label: "Số QĐ giao nhiệm vụ, ngày ký QĐ", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

const columnsD9 = () => [
  { label: "TT", align: "center" },
  { label: "Tên nhiệm vụ", align: "center" },
  { label: "Số QĐ giao nhiệm vụ", align: "center" },
  { label: "Ngày kí QĐ", align: "center" },
  { label: "Nghiệm vụ được phân công theo quyết định", align: "center" },
  { label: "Nghiệm vụ được phân công theo quyết định", align: "center" },
  { label: "Số giờ quy đổi", align: "center", isNumeric: true, includeInSubtotal: true },
];

module.exports = {
  columnsA1,
  columnsA2,
  columnsB,
  columnsC,
  columnsD1,
  columnsD2,
  columnsD3,
  columnsD4,
  columnsD5,
  columnsD6,
  columnsD7,
  columnsD8,
  columnsD9,
};
