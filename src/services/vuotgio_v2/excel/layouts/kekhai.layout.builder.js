const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("./excel-global-layout.config");
const { TAGS } = require("./section-tags.constants");
const {
  columnsA1, columnsA2, columnsB, columnsC,
  columnsD1, columnsD2, columnsD3, columnsD4,
  columnsD5, columnsD6, columnsD7, columnsD8, columnsD9,
} = require("./excel-columns.constants");
const {
  filterA1, mapA1Row, filterA2, mapA2Row,
  filterB, bFilterMatMa, bFilterDongHP, mapBRow,
  filterC, cFilterMatMa, cFilterDongHP, mapCRow,
  filterD, mapDRow, ensureRows, numberRows, normDate,
} = require("../utils/sdo-data.helpers");

const buildHeader = (summary) => ({
  leftTop: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
  leftSub: `KHOA: ${summary?.khoa || summary?.maKhoa || ""}`,
  rightTop: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
  rightSub: "Độc lập - Tự do - Hạnh phúc",
  dateLine: `Hà Nội, ngày ...... tháng ...... năm ${new Date().getFullYear()}`,
  title: "KÊ KHAI",
  subtitle: `Khối lượng thực hiện nhiệm vụ đào tạo, khoa học và công nghệ năm học ${summary?.nam_hoc || summary?.namHoc || ""}`,
  legalNote:
    "(Căn cứ theo QĐ 1267/QĐ-HVM ngày 04 tháng 12 năm 2025 về việc ban hành Quy định mức giờ chuẩn giảng dạy và nghiên cứu khoa học đối với nhà giáo và trợ lý nghiên cứu tại Học viện Kỹ thuật mật mã)",
  personalFields: [
    { label: "Họ và tên:", value: summary?.giangVien || "" },
    { label: "Ngày sinh:", value: normDate(summary?.ngaySinh || "") },
    { label: "Học hàm/ Học vị:", value: summary?.hocVi || "", fullWidth: true },
    { label: "Chức vụ hiện nay (Đảng, CQ, đoàn thể):", value: summary?.chucVu || "", fullWidth: true },
    { label: "Hệ số lương:", value: summary?.hsl ? Number(Number(summary.hsl).toFixed(2)).toString() : "", fullWidth: true, highlightValue: true },
    { label: "Thu nhập (lương thực nhận, không tính phụ cấp học hàm, học vị):", value: "", fullWidth: true },
  ],
  totalCols: EXCEL_GLOBAL_BLOCKS_LAYOUT.totalCols,
});

const buildSectionFromFilter = (data, mapFn, label, annotation, subtotalLabel, opts = {}) => ({
  label,
  annotation: annotation || undefined,
  subtotalLabel,
  subtotalColIndexes: opts.subtotalColIndexes,
  metaTag: opts.metaTag,
  rows: ensureRows(numberRows(data.map(mapFn))),
});

const buildAGroup = (summary) => ({
  title: { label: "GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN (không thống kê số giờ đã được thanh toán)" },
  disableTitlePrefix: true,
  blocks: [
    {
      title: { label: "Giảng dạy" },
      columns: columnsA1(),
      sections: [
        buildSectionFromFilter(filterA1(summary, 1, true), mapA1Row, "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (1):", { metaTag: TAGS.A1_HK1_MM }),
        buildSectionFromFilter(filterA1(summary, 1, false), mapA1Row, "Học kỳ I - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (2):", { metaTag: TAGS.A1_HK1_DHP }),
        buildSectionFromFilter(filterA1(summary, 2, true), mapA1Row, "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (3):", { metaTag: TAGS.A1_HK2_MM }),
        buildSectionFromFilter(filterA1(summary, 2, false), mapA1Row, "Học kỳ II - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (4):", { metaTag: TAGS.A1_HK2_DHP }),
      ],
      finalTotal: { label: "Tổng A.1= (1) + (2) + (3) + (4)", colIndexes: [5, 6] },
    },
    {
      title: { label: "Đánh giá kết thúc học phần (theo tổng hợp của phòng Khảo thí và đảm bảo chất lượng)" },
      columns: columnsA2(),
      sections: [
        buildSectionFromFilter(filterA2(summary, 1, true), mapA2Row, "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (5):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK1_MM }),
        buildSectionFromFilter(filterA2(summary, 1, false), mapA2Row, "Học kỳ I - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (6):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK1_DHP }),
        buildSectionFromFilter(filterA2(summary, 2, true), mapA2Row, "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (7):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK2_MM }),
        buildSectionFromFilter(filterA2(summary, 2, false), mapA2Row, "Học kỳ II - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (8):", { subtotalColIndexes: [6], metaTag: TAGS.A2_HK2_DHP }),
      ],
      finalTotal: { label: "Tổng A.2= (5) + (6) + (7) + (8)", colIndexes: [6] },
    },
  ],
  finalTotal: { label: "TỔNG A = A.1 + A.2", colIndexes: [6] },
});

const buildBGroup = (summary) => {
  const makeBlock = (title, filterFn, subtotalLabel, metaTag) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: columnsB(),
    sections: [{ label: "", subtotalLabel, metaTag, rows: ensureRows(numberRows(filterB(summary, filterFn).map(mapBRow))) }],
  });
  return {
    title: { label: "HƯỚNG DẪN LUẬN ÁN, LUẬN VĂN, ĐỒ ÁN TỐT NGHIỆP" },
    blocks: [
      makeBlock("B.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", bFilterMatMa("viet_nam"), "TỔNG B.1:", TAGS.B_VN),
      makeBlock("B.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", bFilterMatMa("lao"), "TỔNG B.2:", TAGS.B_LAO),
      makeBlock("B.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", bFilterMatMa("cuba"), "TỔNG B.3:", TAGS.B_CUBA),
      makeBlock("B.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", bFilterMatMa("campuchia"), "TỔNG B.4:", TAGS.B_CPC),
      makeBlock("B.5. Hướng dẫn cho sinh viên hệ đóng học phí", bFilterDongHP, "TỔNG B.5:", TAGS.B_DONG_HP),
    ],
    finalTotal: { label: "TỔNG B = B.1 + B.2 + B.3 + B.4 + B.5", colIndexes: [6] },
  };
};

const buildCGroup = (summary) => {
  const makeBlock = (title, filterFn, subtotalLabel, metaTag) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: columnsC(),
    sections: [{ label: "", subtotalLabel, metaTag, rows: ensureRows(numberRows(filterC(summary, filterFn).map(mapCRow))) }],
  });
  return {
    title: { label: "HƯỚNG DẪN THAM QUAN THỰC TẾ CỦA HỌC VIÊN, SINH VIÊN" },
    blocks: [
      makeBlock("C.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", cFilterMatMa("viet_nam"), "TỔNG C.1:", TAGS.C_VN),
      makeBlock("C.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", cFilterMatMa("lao"), "TỔNG C.2:", TAGS.C_LAO),
      makeBlock("C.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", cFilterMatMa("cuba"), "TỔNG C.3:", TAGS.C_CUBA),
      makeBlock("C.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", cFilterMatMa("campuchia"), "TỔNG C.4:", TAGS.C_CPC),
      makeBlock("C.5. Hướng dẫn cho sinh viên Đóng học phí", cFilterDongHP, "TỔNG C.5:", TAGS.C_DONG_HP),
    ],
    finalTotal: { label: "TỔNG C = C.1 + C.2 + C.3 + C.4 + C.5", colIndexes: [6] },
  };
};

const buildDGroup = (summary) => {
  const makeBlock = (title, bucketKey, colsFn) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: colsFn(),
    sections: [{
      label: "",
      subtotalLabel: `Tổng ${bucketKey}:`,
      rows: ensureRows(numberRows(filterD(summary, bucketKey).map((r) => mapDRow(bucketKey, r)))),
    }],
  });
  return {
    title: { label: "NGHIÊN CỨU KHOA HỌC" },
    blocks: [
      makeBlock("D.1 Đề tài, dự án", "D1", columnsD1),
      makeBlock("D.2 Sáng kiến", "D2", columnsD2),
      makeBlock("D.3 Giải thưởng khoa học và công nghệ; Bằng sáng chế, giải pháp hữu ích", "D3", columnsD3),
      makeBlock("D.4 Đề xuất nghiên cứu (theo đúng mẫu đề xuất quy định)", "D4", columnsD4),
      makeBlock("D.5 Sách, giáo trình, tài liệu dạy học, tài liệu huấn luyện, điều lệ, điều lệnh", "D5", columnsD5),
      makeBlock("D.6 Bài báo, báo cáo khoa học", "D6", columnsD6),
      makeBlock("D.7 Hướng dẫn học viên, sinh viên NCKH do GĐ Học viện phê duyệt", "D7", columnsD7),
      makeBlock("D.8 Thành viên hội đồng khoa học các cấp", "D8", columnsD8),
      makeBlock("D.9 Các nhiệm vụ khoa học và công nghệ khác", "D9", columnsD9),
    ],
    finalTotal: { label: "Tổng D = D.1+D.2+D.3+D.4+D.5+D.6+D.7+D.8+D.9", colIndexes: [5, 6] },
  };
};

const buildGroups = (summary) => [
  buildAGroup(summary),
  buildBGroup(summary),
  buildCGroup(summary),
  buildDGroup(summary),
];

module.exports = {
  buildHeader,
  buildGroups,
};
