/**
 * Tong hop theo Khoa - Frontend JS
 * VuotGio V2
 */

let gridApi = null;

const columnDefs = [
  { headerName: "STT", valueGetter: "node.rowIndex + 1", width: 70 },
  { field: "maKhoa", headerName: "Ma khoa", width: 110 },
  { field: "tenKhoa", headerName: "Ten khoa", flex: 1, minWidth: 220 },
  { field: "tongSoGV", headerName: "So GV", width: 100, type: "numericColumn" },
  {
    field: "tongSoTietGiangDay",
    headerName: "Giang day",
    width: 120,
    type: "numericColumn",
    valueFormatter: (params) => formatNumber(params.value),
  },
  {
    field: "tongSoTietNgoaiQC",
    headerName: "Ngoai QC",
    width: 120,
    type: "numericColumn",
    valueFormatter: (params) => formatNumber(params.value),
  },
  {
    field: "tongSoTietKTHP",
    headerName: "KTHP",
    width: 110,
    type: "numericColumn",
    valueFormatter: (params) => formatNumber(params.value),
  },
  {
    field: "tongSoTietDoAn",
    headerName: "Do an",
    width: 110,
    type: "numericColumn",
    valueFormatter: (params) => formatNumber(params.value),
  },
  {
    field: "tongSoTietThucHien",
    headerName: "Tong thuc hien",
    width: 140,
    type: "numericColumn",
    valueFormatter: (params) => formatNumber(params.value),
    cellStyle: { color: "#155724", fontWeight: "bold" },
  },
  {
    headerName: "Thao tac",
    width: 130,
    cellRenderer: (params) => {
      const maKhoa = encodeURIComponent(params.data.maKhoa || "");
      return `<button class="btn btn-sm btn-info" onclick="viewDepartmentDetail('${maKhoa}')"><i class="fas fa-eye"></i> Chi tiet</button>`;
    },
  },
];

const gridOptions = {
  columnDefs,
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
  },
  rowData: [],
  pagination: true,
  paginationPageSize: 20,
  animateRows: true,
  pinnedBottomRowData: [],
  getRowStyle: (params) => {
    if (params.node.rowPinned) {
      return { fontWeight: "bold", backgroundColor: "#e9ecef" };
    }
    return null;
  },
  onGridReady: (params) => {
    gridApi = params.api;
  },
};

document.addEventListener("DOMContentLoaded", function () {
  const gridDiv = document.querySelector("#gridContainer");
  if (gridDiv) {
    new agGrid.Grid(gridDiv, gridOptions);
    gridApi = gridOptions.api;
  }

  loadNamHocOptions();

  const loadBtn = document.getElementById("loadDataBtn");
  if (loadBtn) {
    loadBtn.addEventListener("click", loadData);
  }
});

async function loadNamHocOptions() {
  try {
    const response = await fetch("/api/namhoc");
    const data = await response.json();

    const select = document.getElementById("namHocXem");
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
    const select = document.getElementById("namHocXem");
    if (select) {
      select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
  }
}

function formatNumber(val) {
  if (val === null || val === undefined) return "0";
  return Number(val).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

async function loadData() {
  const namHoc = document.getElementById("namHocXem")?.value;

  if (!namHoc) {
    Swal.fire("Loi", "Vui long chon nam hoc", "warning");
    return;
  }

  try {
    if (gridApi) gridApi.showLoadingOverlay();

    const response = await fetch(`/v2/vuotgio/tong-hop/khoa?namHoc=${encodeURIComponent(namHoc)}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Khong the tai du lieu");
    }

    const data = result.data || [];

    if (gridApi) {
      gridApi.setRowData(data);
    }

    const totals = {
      maKhoa: "",
      tenKhoa: "TONG CONG",
      tongSoGV: data.reduce((sum, r) => sum + (r.tongSoGV || 0), 0),
      tongSoTietGiangDay: data.reduce((sum, r) => sum + (r.tongSoTietGiangDay || 0), 0),
      tongSoTietNgoaiQC: data.reduce((sum, r) => sum + (r.tongSoTietNgoaiQC || 0), 0),
      tongSoTietKTHP: data.reduce((sum, r) => sum + (r.tongSoTietKTHP || 0), 0),
      tongSoTietDoAn: data.reduce((sum, r) => sum + (r.tongSoTietDoAn || 0), 0),
      tongSoTietThucHien: data.reduce((sum, r) => sum + (r.tongSoTietThucHien || 0), 0),
    };

    if (gridApi) {
      gridApi.setPinnedBottomRowData(data.length ? [totals] : []);
      if (!data.length) gridApi.showNoRowsOverlay();
    }

    updateSummary(data, totals);
    renderKhoaCards(data);
  } catch (error) {
    console.error("Error loading data:", error);
    Swal.fire("Loi", error.message || "Khong the tai du lieu", "error");
  }
}

function updateSummary(data, totals) {
  const totalKhoaEl = document.getElementById("totalKhoa");
  const totalGVEl = document.getElementById("totalGVAll");
  const totalSoTietEl = document.getElementById("totalSoTiet");

  if (totalKhoaEl) totalKhoaEl.textContent = data.length;
  if (totalGVEl) totalGVEl.textContent = totals.tongSoGV || 0;
  if (totalSoTietEl) totalSoTietEl.textContent = formatNumber(totals.tongSoTietThucHien || 0);
}

function renderKhoaCards(data) {
  const container = document.getElementById("khoaCardsContainer");
  if (!container) return;

  if (!data.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = data
    .map((dept) => {
      const maKhoa = encodeURIComponent(dept.maKhoa || "");
      return `
        <div class="khoa-card">
          <div class="name">${dept.tenKhoa || dept.maKhoa || ""}</div>
          <div class="stats">
            <div class="stat-item">
              <div class="stat-value">${dept.tongSoGV || 0}</div>
              <div class="stat-label">Giang vien</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${formatNumber(dept.tongSoTietThucHien || 0)}</div>
              <div class="stat-label">Tong tiet</div>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-sm btn-light" onclick="viewDepartmentDetail('${maKhoa}')">Xem chi tiet</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function viewDepartmentDetail(maKhoa) {
  const namHoc = document.getElementById("namHocXem")?.value || "";
  window.location.href = `/v2/vuotgio/tong-hop-giang-vien?namHoc=${encodeURIComponent(namHoc)}&khoa=${maKhoa}`;
}

window.viewDepartmentDetail = viewDepartmentDetail;
