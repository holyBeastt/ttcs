window.NCKH_V3_DeTaiDuAn = window.NCKH_V3_DeTaiDuAn || {};

window.NCKH_V3_DeTaiDuAn.mapper = {
  formToPayload() {
    const tenCongTrinh = document.getElementById("tenCongTrinh").value.trim();
    const phanLoai = document.getElementById("phanLoai").value.trim();
    const namHoc = document.getElementById("namHoc").value.trim();
    const tongSoTiet = Number(document.getElementById("tongSoTiet").value);
    const khoaId = Number(document.getElementById("khoaId").value);

    const tacGiaIds = Array.from(document.getElementById("tacGiaIds").selectedOptions).map((opt) => Number(opt.value));
    const thanhVienIds = Array.from(document.getElementById("thanhVienIds").selectedOptions).map((opt) => Number(opt.value));

    return {
      tenCongTrinh,
      loaiNckh: "DETAI_DUAN",
      phanLoai,
      namHoc,
      tongSoTiet,
      khoaId,
      tacGiaIds,
      thanhVienIds,
    };
  },

  detailToForm(data) {
    document.getElementById("tenCongTrinh").value = data.tenCongTrinh || "";
    document.getElementById("phanLoai").value = data.phanLoai || "";
    document.getElementById("namHoc").value = data.namHoc || "";
    document.getElementById("tongSoTiet").value = data.tongSoTiet || "";
    document.getElementById("khoaId").value = data.khoaId || "";

    const tacGiaSet = new Set(
      (data.participants || [])
        .filter((item) => item.vaiTro === "tac_gia")
        .map((item) => Number(item.nhanvienId))
    );

    const thanhVienSet = new Set(
      (data.participants || [])
        .filter((item) => item.vaiTro === "thanh_vien")
        .map((item) => Number(item.nhanvienId))
    );

    const tacGiaSelect = document.getElementById("tacGiaIds");
    const thanhVienSelect = document.getElementById("thanhVienIds");

    Array.from(tacGiaSelect.options).forEach((opt) => {
      opt.selected = tacGiaSet.has(Number(opt.value));
    });

    Array.from(thanhVienSelect.options).forEach((opt) => {
      opt.selected = thanhVienSet.has(Number(opt.value));
    });
  },
};
