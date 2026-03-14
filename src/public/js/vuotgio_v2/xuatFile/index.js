/**
 * Xuat File - Frontend JS
 * VuotGio V2
 */

document.addEventListener("DOMContentLoaded", function () {
  loadNamHocOptions();
  loadKhoaOptions();

  const form = document.getElementById("exportForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      exportExcel();
    });
  }

  const khoaSelect = document.getElementById("khoaExport");
  if (khoaSelect) {
    khoaSelect.addEventListener("change", loadGiangVienByKhoa);
  }
});

async function loadNamHocOptions() {
  try {
    const response = await fetch("/api/namhoc");
    const data = await response.json();

    const select = document.getElementById("namHocExport");
    if (!select) return;

    select.innerHTML = "";
    data.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = item.NamHoc;
      option.textContent = item.NamHoc;
      if (item.trangthai === 1 || (index === 0 && !data.some((i) => i.trangthai === 1))) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading nam hoc:", error);
    const currentYear = new Date().getFullYear();
    const select = document.getElementById("namHocExport");
    if (select) {
      select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
  }
}

async function loadKhoaOptions() {
  try {
    const response = await fetch("/api/khoa");
    const data = await response.json();

    const select = document.getElementById("khoaExport");
    if (!select) return;

    select.innerHTML = '<option value="ALL">Tất cả các Khoa</option>';
    data.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept.MaPhongBan;
      option.textContent = dept.TenPhongBan || dept.MaPhongBan;
      select.appendChild(option);
    });

    await loadGiangVienByKhoa();
  } catch (error) {
    console.error("Error loading khoa:", error);
  }
}

async function loadGiangVienByKhoa() {
  const khoa = document.getElementById("khoaExport")?.value || "ALL";
  const select = document.getElementById("giangVienExport");
  if (!select) return;

  try {
    const response = await fetch(`/v2/vuotgio/api/teachers?Khoa=${encodeURIComponent(khoa)}`);
    const data = await response.json();

    select.innerHTML = '<option value="">Tất cả giảng viên</option>';

    data.forEach((gv) => {
      const option = document.createElement("option");
      option.value = gv.HoTen;
      option.textContent = `${gv.HoTen}${gv.Khoa ? ` (${gv.Khoa})` : ""}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading teachers:", error);
    select.innerHTML = '<option value="">Tất cả giảng viên</option>';
  }
}

function buildExportQuery() {
  const namHoc = document.getElementById("namHocExport")?.value;
  const khoa = document.getElementById("khoaExport")?.value || "ALL";
  const giangVien = document.getElementById("giangVienExport")?.value || "";

  if (!namHoc) {
    throw new Error("Vui lòng chọn năm học");
  }

  const includeSummary = document.getElementById("includeSummary")?.checked;
  const includeGiangDay = document.getElementById("includeGiangDay")?.checked;
  const includeLopNgoaiQC = document.getElementById("includeLopNgoaiQC")?.checked;
  const includeKTHP = document.getElementById("includeKTHP")?.checked;
  const includeDoAn = document.getElementById("includeDoAn")?.checked;

  const query = new URLSearchParams();
  query.set("namHoc", namHoc);
  if (khoa && khoa !== "ALL") query.set("khoa", khoa);
  if (giangVien) query.set("giangVien", giangVien);

  // Giữ lại flags để tương thích khi backend bổ sung selective-sheet export.
  query.set("includeSummary", includeSummary ? "1" : "0");
  query.set("includeGiangDay", includeGiangDay ? "1" : "0");
  query.set("includeLopNgoaiQC", includeLopNgoaiQC ? "1" : "0");
  query.set("includeKTHP", includeKTHP ? "1" : "0");
  query.set("includeDoAn", includeDoAn ? "1" : "0");

  return query.toString();
}

async function exportExcel() {
  try {
    const query = buildExportQuery();
    showLoading("Đang tạo file Excel...");

    const response = await fetch(`/v2/vuotgio/xuat-file/excel?${query}`);

    if (!response.ok) {
      let message = "Không thể xuất file";
      try {
        const err = await response.json();
        message = err.message || message;
      } catch (_ignore) {}
      throw new Error(message);
    }

    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "VuotGio_V2.xlsx";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);

    hideLoading();
    Swal.fire({
      icon: "success",
      title: "Thành công",
      text: "File Excel đã được tải xuống",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    hideLoading();
    console.error("Error exporting:", error);
    Swal.fire("Lỗi", error.message || "Không thể xuất file", "error");
  }
}

function showLoading(message) {
  Swal.fire({
    title: message || "Đang xử lý...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

function hideLoading() {
  Swal.close();
}
