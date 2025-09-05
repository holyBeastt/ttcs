// Helper functions
const formatNumber = (num) => num.toFixed(2);

const getElement = (id) => document.getElementById(id);

const updateElementText = (id, value) => {
  const element = getElement(id);
  if (element) {
    element.textContent = formatNumber(value);
  }
};

// Tab handling
const initializeTabs = () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active-tab'));

      const tabId = this.dataset.tab;
      getElement(tabId).classList.add('active-tab');
      this.classList.add('active');
    });
  });
};

// Navigation handlers
const initializeNavigation = () => {
  const homeButton = getElement('Home');
  homeButton.addEventListener('click', (event) => {
    event.preventDefault();
    const isKhoa = localStorage.getItem('isKhoa');
    window.location.href = isKhoa == 0 ? '/maindt' : '/mainkhoa';
  });

  getElement('infome').addEventListener('click', (event) => {
    event.preventDefault();
    const id_User = localStorage.getItem('id_User');
    if (id_User) {
      window.location.href = `/infome/${id_User}`;
    } else {
      alert('Không tìm thấy id_User trong localStorage.');
    }
  });
};

// Data loading functions
const loadNamHocData = async () => {
  try {
    const response = await fetch('/getNamHoc');
    const data = await response.json();

    if (data.success) {
      data.NamHoc.forEach(item => {
        $('#NamHoc').append(`<option value="${item.NamHoc}">${item.NamHoc}</option>`);
      });

      data.Ki.forEach(item => {
        $('#comboboxki').append(`<option value="${item.value}">${item.Ki}</option>`);
      });

      loadLopMoiData();
    } else {
      console.error('Không lấy được dữ liệu năm học:', data.message);
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu năm học:', error);
  }
};

const loadPhongBanData = async () => {
  try {
    const response = await fetch('/getPhongBan');
    const data = await response.json();

    if (data.success) {
      data.MaPhongBan.forEach(item => {
        $('#MaPhongBan').append(`<option value="${item.MaPhongBan}">${item.MaPhongBan}</option>`);
      });
    } else {
      console.error('Không lấy được dữ liệu phongBan:', data.message);
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu phongBan:', error);
  }
};

const loadLopMoiData = async () => {
  const MaPhongBan = localStorage.getItem('MaPhongBan');
  const TenNhanVien = localStorage.getItem("TenNhanVien");
  const Nam = getElement('NamHoc').value;

  if (!MaPhongBan) {
    alert("Mã phòng ban không tồn tại!");
    return;
  }

  try {
    const response = await fetch(`/xemttvuotgio/${MaPhongBan}/${Nam}/${TenNhanVien}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      const rowsKeys = [
        'rows11', 'rows12', 'rows13', 'rows14', 
        'rows21', 'rows22', 'rows23', 'rows24',
        'rows31', 'rows32', 'rows33', 'rows34', 'rowsB',
        'rowsC1', 'rowsC2', 'rowsC3', 'rowsC4', 'rowsC5',
        'rowsC6', 'rowsC7', 'rowsC8', 'rowsC9', 'rowsC10'
      ];

      const allRowsEmpty = rowsKeys.every(key => !data[key] || data[key].length === 0);

      if (allRowsEmpty) {
        alert("Tất cả các bảng đều không có dữ liệu!");
      } else {
        console.log('Dữ liệu bộ môn:', data);
        renderTable(data);
        renderTableF(data);
        getData(TenNhanVien);
      }
    } else {
      alert("Không tìm thấy dữ liệu!");
    }
  } catch (error) {
    console.error('Có lỗi xảy ra khi lấy dữ liệu:', error);
  }
};

const loadInfoLopGV = async () => {
  const Nam = getElement('NamHoc').value;
  const isKhoa = localStorage.getItem("isKhoa");
  const TenNhanVien = getElement("TenNhanVien").value;
  
  let MaPhongBan;
  if (isKhoa === "1") {
    MaPhongBan = localStorage.getItem("MaPhongBan");
  } else {
    MaPhongBan = getElement("MaPhongBan").value.trim();
  }

  if (!MaPhongBan) {
    alert("Mã phòng ban không tồn tại!");
    return;
  }

  try {
    const response = await fetch(`/xemttvuotgio/${MaPhongBan}/${Nam}/${TenNhanVien}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      // Clear all tables first
      const tableIds = [
        'tableBodyA11', 'tableBodyA12', 'tableBodyA13', 'tableBodyA14',
        'tableBodyA21', 'tableBodyA22', 'tableBodyA23', 'tableBodyA24',
        'tableBodyA31', 'tableBodyA32', 'tableBodyA33', 'tableBodyA34',
        'tableBodyB1', 'tableBodyB2', 'tableBodyB3', 'tableBodyB4', 'tableBodyB5',
        'tableBodyC1', 'tableBodyC2', 'tableBodyC3', 'tableBodyC4', 'tableBodyC5',
        'tableBodyC6', 'tableBodyC7', 'tableBodyC8', 'tableBodyC9', 'tableBodyC10',
        'tableBodyF'
      ];
      clearTableBodies(tableIds);

      // Render all data
      renderTable(data);
      renderTableF(data);
      getData(TenNhanVien);
    } else {
      alert("Không tìm thấy dữ liệu!");
    }
  } catch (error) {
    console.error('Có lỗi xảy ra khi lấy dữ liệu:', error);
  }
};

const getData = async (TenNhanVien) => {
  try {
    const response = await fetch(`/getSoTietDM/${TenNhanVien}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      fillData(data);
    } else {
      alert("Không tìm thấy dữ liệu!");
    }
  } catch (error) {
    console.error('Có lỗi xảy ra khi lấy dữ liệu:', error);
  }
};

const fillData = (data) => {
  // Cập nhật số tiết phải giảng
  updateElementText('soTietPhaiGiang', data.soTietDM[0].GiangDay);

  // Tính toán số tiết NCKH chưa hoàn thành
  const soTietNCKH = parseFloat(getElement('totalSoTietC').textContent) || 0;
  const soTietChuaHoanThanhNCKH = Math.max(0, data.soTietDM[0].NCKH - soTietNCKH);
  updateElementText('soTietChuaHoanThanhNCKH', soTietChuaHoanThanhNCKH);

  // Tính toán số tiết giảm trừ
  const phanTramMienGiam = data.nhanVien[0].PhanTramMienGiam || 0;
  const soTietGiamTru = (data.soTietDM[0].GiangDay * phanTramMienGiam) / 100;
  updateElementText('soTietGiamTru', soTietGiamTru);

  // Tính tổng số tiết vượt giờ
  const soTietThucHien = parseFloat(getElement('soTietThucHien').textContent) || 0;
  const tongSoTietVuotGio = Math.max(0, 
    soTietThucHien - data.soTietDM[0].GiangDay - soTietChuaHoanThanhNCKH + soTietGiamTru
  );
  updateElementText('tongSoTietVuotGio', tongSoTietVuotGio);

  // Cập nhật lý do
  const LyDoElement = getElement('LyDo');
  if (LyDoElement) {
    LyDoElement.textContent = `${data.nhanVien[0].LyDoMienGiam} - ${data.nhanVien[0].PhanTramMienGiam}%`;
  }
};

// Helper functions for table rendering
const createTableCell = (content) => {
  const td = document.createElement('td');
  td.textContent = content;
  return td;
};

const createTableRow = (rowData, index, columns) => {
  const tr = document.createElement('tr');
  tr.setAttribute('data-id', rowData.MaGiangDay || '');

  // Add index cell
  tr.appendChild(createTableCell(index + 1));

  // Add data cells based on columns configuration
  columns.forEach(col => {
    const td = createTableCell(rowData[col.field] || '');
    if (col.colspan) td.colSpan = col.colspan;
    tr.appendChild(td);
  });

  return tr;
};

const clearTableBodies = (tableIds) => {
  tableIds.forEach(id => {
    const tableBody = getElement(id);
    if (tableBody) tableBody.innerHTML = '';
  });
};

// Table rendering functions
const renderTable = (data) => {
  const tableIds = [
    'tableBodyA11', 'tableBodyA12', 'tableBodyA13', 'tableBodyA14',
    'tableBodyA21', 'tableBodyA22', 'tableBodyA23', 'tableBodyA24',
    'tableBodyA31', 'tableBodyA32', 'tableBodyA33', 'tableBodyA34',
    'tableBodyB1', 'tableBodyB2', 'tableBodyB3', 'tableBodyB4', 'tableBodyB5',
    'tableBodyC1', 'tableBodyC2', 'tableBodyC3', 'tableBodyC4', 'tableBodyC5',
    'tableBodyC6', 'tableBodyC7', 'tableBodyC8', 'tableBodyC9', 'tableBodyC10',
    'tableBodyF'
  ];

  // Clear all table bodies first
  clearTableBodies(tableIds);

  let tableRowData = [];

  // Render A1x tables (Giảng dạy)
  ['rows11', 'rows12', 'rows13', 'rows14'].forEach((key, idx) => {
    if (!data[key]) return;
    
    const tableBody = getElement(`tableBodyA1${idx + 1}`);
    data[key].forEach((row, index) => {
      const tr = document.createElement('tr');
      
      const columns = [
        { value: index + 1 },
        { value: row.TenHocPhan },
        { value: row.SoTC },
        { value: row.Lop },
        { value: row.DoiTuong },
        { value: row.LenLop },
        { value: row.QuyChuan }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  });

  // Render A2x tables (Kiểm tra giữa kỳ)
  ['rows21', 'rows22', 'rows23', 'rows24'].forEach((key, idx) => {
    if (!data[key]) return;
    
    const tableBody = getElement(`tableBodyA2${idx + 1}`);
    data[key].forEach((row, index) => {
      const tr = document.createElement('tr');
      
      const columns = [
        { value: index + 1 },
        { value: row.TenHocPhan },
        { value: row.HinhThucKTGiuaKy },
        { value: row.Lop },
        { value: row.DoiTuong },
        { value: row.SoSV },
        { value: row.SoTietKT }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  });

  // Render A3x tables (Kiểm tra cuối kỳ)
  ['rows31', 'rows32', 'rows33', 'rows34'].forEach((key, idx) => {
    if (!data[key]) return;
    
    const tableBody = getElement(`tableBodyA3${idx + 1}`);
    data[key].forEach((row, index) => {
      const tr = document.createElement('tr');
      
      const columns = [
        { value: index + 1 },
        { value: row.hinhthuc },
        { value: row.tenhocphan },
        { value: row.lophocphan },
        { value: row.doituong },
        { value: "" }, // SoSV column is empty
        { value: row.sotietqc }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  });

  // Render B tables (Đồ án)
  if (data.rowsB) {
    data.rowsB.forEach((row, index) => {
      const tr = document.createElement('tr');
      const soNguoi = row.GiangVien2Real !== null ? 2 : 1;
      let gio = 25;
      if (row.GiangVien2Real !== null) {
        gio = row.VaiTro === "HD hai" ? 10 : 15;
      }

      const columns = [
        { value: index + 1 },
        { value: row.SinhVien },
        { value: row.KhoaDaoTao },
        { value: row.SoQD },
        { value: soNguoi },
        { value: row.VaiTro },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      // Add to appropriate table based on DoiTuong
      const targetTableId = {
        'Việt Nam': 'tableBodyB1',
        'Lào': 'tableBodyB2',
        'Cuba': 'tableBodyB3',
        'Campuchia': 'tableBodyB4'
      }[row.DoiTuong] || 'tableBodyB5';

      getElement(targetTableId).appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C1 table (Đề tài dự án)
  if (data.rowsC1) {
    data.rowsC1.forEach((row, index) => {
      const tr = document.createElement('tr');
      let str = "";
      if (row.VaiTro === "Chủ nhiệm") {
        str = row.ChuNhiem.trim();
      } else if (row.VaiTro === "Thư ký") {
        str = row.ThuKy.trim();
      } else {
        str = row.DanhSachThanhVien.trim();
      }

      const match = str.match(/^(.+)\s\((.+)\s-\s(\d+(\.\d+)?)\s*giờ\)$/);
      const gio = match ? match[3] : "";

      const columns = [
        { value: index + 1 },
        { value: row.TenDeTai },
        { value: row.VaiTro },
        { value: row.CapDeTai },
        { value: row.NgayNghiemThu ? new Date(row.NgayNghiemThu).toLocaleDateString("vi-VN") : "N/A" },
        { value: row.KetQua },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC1').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C2 table (Bài báo khoa học)
  if (data.rowsC2) {
    data.rowsC2.forEach((row, index) => {
      const tr = document.createElement('tr');
      let str = "";
      let VaiTro = "Tác giả chính";
      
      if (row.VaiTro === "Tác giả chính") {
        str = row.TacGia.trim();
      } else if (row.VaiTro === "Tác giả") {
        str = row.TacGiaChiuTrachNhiem.trim();
      } else {
        str = row.DanhSachThanhVien.trim();
        VaiTro = "Thành viên";
      }

      const gio = str.split("-")[1]?.split("giờ")[0]?.trim() || "0";
      const SoNguoi = row.TacGiaChiuTrachNhiem === "null" ? 
        row.DanhSachThanhVien.split(",").length :
        row.DanhSachThanhVien.split(",").length + 1;

      const columns = [
        { value: index + 1 },
        { value: row.TenBaiBao },
        { value: row.LoaiTapChi },
        { value: row.ChiSoTapChi },
        { value: SoNguoi },
        { value: VaiTro },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC2').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C3 table (Bằng sáng chế và giải thưởng)
  if (data.rowsC3) {
    data.rowsC3.forEach((row, index) => {
      const tr = document.createElement('tr');
      let str = row.VaiTro === "Tác giả chính" ? row.TacGia.trim() : row.DanhSachThanhVien.trim();
      const gio = str.split("-")[1]?.split("giờ")[0]?.trim() || "0";
      const SoNguoi = row.DanhSachThanhVien.split(",").length + 1;

      const columns = [
        { value: index + 1 },
        { value: row.TenBangSangCheVaGiaiThuong },
        { value: row.SoQDCongNhan },
        { value: row.NgayQDCongNhan ? new Date(row.NgayQDCongNhan).toLocaleDateString("vi-VN") : "N/A" },
        { value: SoNguoi },
        { value: row.VaiTro },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC3').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C4 table (Sách và giáo trình)
  if (data.rowsC4) {
    data.rowsC4.forEach((row, index) => {
      const tr = document.createElement('tr');
      let str = "";
      let VaiTro = "Tác giả chính";
      
      if (row.VaiTro === "Tác giả chính") {
        str = row.TacGia.trim();
      } else if (row.VaiTro === "Đồng chủ biên") {
        str = row.DongChuBien.trim();
        VaiTro = "Tác giả chính";
      } else {
        str = row.DanhSachThanhVien.trim();
        VaiTro = "Thành viên";
      }

      const gio = str.split("-")[1]?.split("giờ")[0]?.trim() || "0";
      let SoNguoi = 1;
      if (row.DongChuBien !== "null") {
        SoNguoi += row.DongChuBien.split(",").length;
      }
      if (row.DanhSachThanhVien !== "null") {
        SoNguoi += row.DanhSachThanhVien.split(",").length;
      }

      const columns = [
        { value: index + 1 },
        { value: row.TenSachVaGiaoTrinh },
        { value: row.SoXuatBan },
        { value: row.SoTrang },
        { value: SoNguoi },
        { value: VaiTro },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC4').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C5 table (Nhiệm vụ khoa học công nghệ)
  if (data.rowsC5) {
    data.rowsC5.forEach((row, index) => {
      const tr = document.createElement('tr');
      const gio = row.DanhSachThanhVien.split("-")[1]?.split("giờ")[0]?.trim() || "0";

      const columns = [
        { value: index + 1 },
        { value: row.TenDeTai },
        { value: row.SoQDGiaoNhiemVu },
        { value: row.NgayQDGiaoNhiemVu ? new Date(row.NgayQDGiaoNhiemVu).toLocaleDateString("vi-VN") : "N/A" },
        { value: row.KetQuaCapKhoa },
        { value: row.KetQuaCapHocVien },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC5').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C6 table (Xây dựng CTĐT)
  if (data.rowsC6) {
    data.rowsC6.forEach((row, index) => {
      const tr = document.createElement('tr');
      const gio = row.DanhSachThanhVien.split("-")[1]?.split("giờ")[0]?.trim() || "0";
      const SoNguoi = row.DanhSachThanhVien.split(",").length;

      const columns = [
        { value: index + 1 },
        { value: row.TenChuongTrinh },
        { value: row.SoTC },
        { value: `${row.SoQDGiaoNhiemVu || "Không có số QĐ"} - ${row.NgayQDGiaoNhiemVu ? new Date(row.NgayQDGiaoNhiemVu).toLocaleDateString("vi-VN") : "Không có ngày"}` },
        { value: SoNguoi },
        { value: row.HinhThucXayDung },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC6').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C7 table (Biên soạn giáo trình bài giảng)
  if (data.rowsC7) {
    data.rowsC7.forEach((row, index) => {
      const tr = document.createElement('tr');
      let str = "";
      let VaiTro = "Tác giả chính";
      
      if (row.VaiTro === "Tác giả chính") {
        str = row.TacGia.trim();
      } else {
        str = row.DanhSachThanhVien.trim();
        VaiTro = "Thành viên";
      }

      const gio = str.split("-")[1]?.split("giờ")[0]?.trim() || "0";
      const SoNguoi = row.DanhSachThanhVien === "null" ? 1 : row.DanhSachThanhVien.split(",").length + 1;

      const columns = [
        { value: index + 1 },
        { value: row.TenGiaoTrinhBaiGiang },
        { value: `${row.SoQDGiaoNhiemVu || "Không có số QĐ"} - ${row.NgayQDGiaoNhiemVu ? new Date(row.NgayQDGiaoNhiemVu).toLocaleDateString("vi-VN") : "Không có ngày"}` },
        { value: row.SoTC },
        { value: SoNguoi },
        { value: VaiTro },
        { value: gio }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        tr.appendChild(td);
      });

      getElement('tableBodyC7').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Render C10 table (Số tiết bảo lưu sang năm sau)
  if (data.rowsC10) {
    data.rowsC10.forEach((row, index) => {
      const tr = document.createElement('tr');

      const columns = [
        { value: index + 1 },
        { value: row.TenNhiemVu, colspan: 5 },
        { value: row.SoTietBaoLuuSangNamSau }
      ];

      columns.forEach(col => {
        const td = createTableCell(col.value);
        if (col.colspan) td.colSpan = col.colspan;
        tr.appendChild(td);
      });

      getElement('tableBodyC10').appendChild(tr);
      tableRowData.push({ id: index, ...row });
    });
  }

  // Store data for later use
  localStorage.setItem('tableData', JSON.stringify(tableRowData));
  
  // Calculate totals
  calculatetotalGiangDay();
};

const renderTableF = (data) => {
  const totals = {
    vn: { hk1: 0, hk2: 0, total: 0 },
    lao: { hk1: 0, hk2: 0, total: 0 },
    cam: { hk1: 0, hk2: 0, total: 0 },
    cuba: { hk1: 0, hk2: 0, total: 0 },
    dhp: { hk1: 0, hk2: 0, total: 0 }
  };

  // Get B table totals
  const totalB1 = parseFloat(getElement('totalSoTietB1')?.textContent) || 0;
  const totalB2 = parseFloat(getElement('totalSoTietB2')?.textContent) || 0;
  const totalB3 = parseFloat(getElement('totalSoTietB3')?.textContent) || 0;
  const totalB4 = parseFloat(getElement('totalSoTietB4')?.textContent) || 0;
  const totalB5 = parseFloat(getElement('totalSoTietB5')?.textContent) || 0;

  // Calculate HK1 totals
  data.rows11?.forEach(row => {
    switch(row.DoiTuong) {
      case "Việt Nam": totals.vn.hk1 += parseFloat(row.QuyChuan) || 0; break;
      case "Lào": totals.lao.hk1 += parseFloat(row.QuyChuan) || 0; break;
      case "Campuchia": totals.cam.hk1 += parseFloat(row.QuyChuan) || 0; break;
      case "Cuba": totals.cuba.hk1 += parseFloat(row.QuyChuan) || 0; break;
    }
  });

  // Add DHP HK1
  data.rows12?.forEach(row => {
    totals.dhp.hk1 += parseFloat(row.QuyChuan) || 0;
  });

  // Calculate HK2 totals
  data.rows13?.forEach(row => {
    switch(row.DoiTuong) {
      case "Việt Nam": totals.vn.hk2 += parseFloat(row.QuyChuan) || 0; break;
      case "Lào": totals.lao.hk2 += parseFloat(row.QuyChuan) || 0; break;
      case "Campuchia": totals.cam.hk2 += parseFloat(row.QuyChuan) || 0; break;
      case "Cuba": totals.cuba.hk2 += parseFloat(row.QuyChuan) || 0; break;
    }
  });

  // Add DHP HK2
  data.rows14?.forEach(row => {
    totals.dhp.hk2 += parseFloat(row.QuyChuan) || 0;
  });

  // Add exam hours for HK1
  data.rows21?.forEach(row => {
    switch(row.DoiTuong) {
      case "Việt Nam": totals.vn.hk1 += parseFloat(row.SoTietKT) || 0; break;
      case "Lào": totals.lao.hk1 += parseFloat(row.SoTietKT) || 0; break;
      case "Campuchia": totals.cam.hk1 += parseFloat(row.SoTietKT) || 0; break;
      case "Cuba": totals.cuba.hk1 += parseFloat(row.SoTietKT) || 0; break;
    }
  });

  data.rows22?.forEach(row => {
    totals.dhp.hk1 += parseFloat(row.SoTietKT) || 0;
  });

  // Add exam hours for HK2
  data.rows23?.forEach(row => {
    switch(row.DoiTuong) {
      case "Việt Nam": totals.vn.hk2 += parseFloat(row.SoTietKT) || 0; break;
      case "Lào": totals.lao.hk2 += parseFloat(row.SoTietKT) || 0; break;
      case "Campuchia": totals.cam.hk2 += parseFloat(row.SoTietKT) || 0; break;
      case "Cuba": totals.cuba.hk2 += parseFloat(row.SoTietKT) || 0; break;
    }
  });

  data.rows24?.forEach(row => {
    totals.dhp.hk2 += parseFloat(row.SoTietKT) || 0;
  });

  // Add thesis hours to HK2
  totals.vn.hk2 += totalB1;
  totals.lao.hk2 += totalB2;
  totals.cam.hk2 += totalB4;
  totals.cuba.hk2 += totalB3;
  totals.dhp.hk2 += totalB5;

  // Calculate totals
  totals.vn.total = totals.vn.hk1 + totals.vn.hk2;
  totals.lao.total = totals.lao.hk1 + totals.lao.hk2;
  totals.cam.total = totals.cam.hk1 + totals.cam.hk2;
  totals.cuba.total = totals.cuba.hk1 + totals.cuba.hk2;
  totals.dhp.total = totals.dhp.hk1 + totals.dhp.hk2;

  const totalHK1 = totals.vn.hk1 + totals.lao.hk1 + totals.cam.hk1 + totals.cuba.hk1 + totals.dhp.hk1;
  const totalHK2 = totals.vn.hk2 + totals.lao.hk2 + totals.cam.hk2 + totals.cuba.hk2 + totals.dhp.hk2;
  const totalCaNam = totalHK1 + totalHK2;

  // Update UI
  const updates = {
    'totalVNHK1': totals.vn.hk1,
    'totalVNHK2': totals.vn.hk2,
    'totalVN': totals.vn.total,
    'totalLaoHK1': totals.lao.hk1,
    'totalLaoHK2': totals.lao.hk2,
    'totalLao': totals.lao.total,
    'totalCamHK1': totals.cam.hk1,
    'totalCamHK2': totals.cam.hk2,
    'totalCam': totals.cam.total,
    'totalCubaHK1': totals.cuba.hk1,
    'totalCubaHK2': totals.cuba.hk2,
    'totalCuba': totals.cuba.total,
    'totalDHPHK1': totals.dhp.hk1,
    'totalDHPHK2': totals.dhp.hk2,
    'totalDHP': totals.dhp.total,
    'totalHK1': totalHK1,
    'totalHK2': totalHK2,
    'totalCaNam': totalCaNam
  };

  Object.entries(updates).forEach(([id, value]) => {
    updateElementText(id, value);
  });
};

const calculateDoAnHours = (row) => {
  if (!row.GiangVien2Real) return 25;
  return row.VaiTro === "HD hai" ? 10 : 15;
};

const getTargetTableForDoAn = (doiTuong) => {
  const tableMap = {
    'Việt Nam': 'tableBodyB1',
    'Lào': 'tableBodyB2',
    'Cuba': 'tableBodyB3',
    'Campuchia': 'tableBodyB4'
  };
  return getElement(tableMap[doiTuong] || 'tableBodyB5');
};

// Calculation functions
const calculatetotalGiangDay = () => {
  const totals = {
    giangDay: { hk1: 0, hk2: 0, total: 0 },
    kiemTra: { hk1: 0, hk2: 0, total: 0 },
    cuoiKy: { hk1: 0, hk2: 0, total: 0 },
    doAn: { vn: 0, lao: 0, cuba: 0, cam: 0, other: 0, total: 0 }
  };

  // Calculate teaching hours
  ['11', '12', '13', '14'].forEach(suffix => {
    const rows = document.querySelectorAll(`#tableBodyA${suffix} tr`);
    rows.forEach(row => {
      const value = parseFloat(row.querySelector('td:last-child').textContent) || 0;
      if (suffix[0] === '1') totals.giangDay.hk1 += value;
      else totals.giangDay.hk2 += value;
    });
  });

  // Calculate exam hours
  ['21', '22', '23', '24'].forEach(suffix => {
    const rows = document.querySelectorAll(`#tableBodyA${suffix} tr`);
    rows.forEach(row => {
      const value = parseFloat(row.querySelector('td:last-child').textContent) || 0;
      if (suffix[0] === '2') totals.kiemTra.hk1 += value;
      else totals.kiemTra.hk2 += value;
    });
  });

  // Calculate final exam hours
  ['31', '32', '33', '34'].forEach(suffix => {
    const rows = document.querySelectorAll(`#tableBodyA${suffix} tr`);
    rows.forEach(row => {
      const value = parseFloat(row.querySelector('td:last-child').textContent) || 0;
      if (suffix[0] === '3') totals.cuoiKy.hk1 += value;
      else totals.cuoiKy.hk2 += value;
    });
  });

  // Calculate thesis hours
  ['B1', 'B2', 'B3', 'B4', 'B5'].forEach((suffix, index) => {
    const rows = document.querySelectorAll(`#tableBody${suffix} tr`);
    const total = Array.from(rows).reduce((sum, row) => {
      return sum + (parseFloat(row.querySelector('td:last-child').textContent) || 0);
    }, 0);
    
    const keys = ['vn', 'lao', 'cuba', 'cam', 'other'];
    totals.doAn[keys[index]] = total;
  });

  // Calculate totals
  totals.giangDay.total = totals.giangDay.hk1 + totals.giangDay.hk2;
  totals.kiemTra.total = totals.kiemTra.hk1 + totals.kiemTra.hk2;
  totals.cuoiKy.total = totals.cuoiKy.hk1 + totals.cuoiKy.hk2;
  totals.doAn.total = Object.values(totals.doAn).reduce((a, b) => a + b, 0) - totals.doAn.total;

  // Update UI
  updateTotals(totals);
};

const updateTotals = (totals) => {
  const updates = {
    'totalGiangDay1': totals.giangDay.hk1,
    'totalGiangDay2': totals.giangDay.hk2,
    'totalGiangDay': totals.giangDay.total,
    'totalSoTietKT1': totals.kiemTra.hk1,
    'totalSoTietKT2': totals.kiemTra.hk2,
    'totalSoTietKT': totals.kiemTra.total,
    'totalSoTietCK1': totals.cuoiKy.hk1,
    'totalSoTietCK2': totals.cuoiKy.hk2,
    'totalSoTietCK': totals.cuoiKy.total,
    'totalSoTietB1': totals.doAn.vn,
    'totalSoTietB2': totals.doAn.lao,
    'totalSoTietB3': totals.doAn.cuba,
    'totalSoTietB4': totals.doAn.cam,
    'totalSoTietB5': totals.doAn.other,
    'totalSoTietB': totals.doAn.total
  };

  Object.entries(updates).forEach(([id, value]) => {
    updateElementText(id, value);
  });

  // Calculate and update grand totals
  const grandTotal = totals.giangDay.total + totals.kiemTra.total + 
                    totals.cuoiKy.total + totals.doAn.total;
  updateElementText('totalA', grandTotal);
  updateElementText('soTietThucHien', grandTotal);
};

// Suggestion handling
const suggest = async () => {
  const query = getElement('TenNhanVien').value;
  const isKhoa = localStorage.getItem('isKhoa');
  
  if (query.length === 0) {
    getElement('suggestionBox').innerHTML = '';
    return;
  }

  const MaPhongBan = isKhoa === '1' ? 
    localStorage.getItem('MaPhongBan') : 
    getElement('MaPhongBan').value.trim();

  try {
    const response = await fetch(`/suggestPb/${MaPhongBan}/${query}`);
    const data = await response.json();
    
    if (Array.isArray(data[0]) && data[0].length > 0) {
      const suggestions = data[0]
        .map(item => `<div onclick="selectSuggestion('${item.TenNhanVien.trim()}')">${item.TenNhanVien.trim()}</div>`)
        .join('');
      getElement('suggestionBox').innerHTML = suggestions;
    } else {
      getElement('suggestionBox').innerHTML = '<div>No results found</div>';
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error);
  }
};

const selectSuggestion = (value) => {
  getElement('TenNhanVien').value = value;
  getElement('suggestionBox').innerHTML = '';
};

// Initialize everything
const initialize = () => {
  initializeTabs();
  initializeNavigation();
  
  // Remove empty options
  $('#NamHoc option[value=""]').remove();
  $('#comboboxki option[value=""]').remove();
  $('#combobox-dot option[value=""]').remove();
  $('#MaPhongBan option[value=""]').remove();

  // Load initial data
  loadNamHocData();
  loadPhongBanData();

  // Setup event listeners
  getElement('info').addEventListener('click', loadLopMoiData);
  getElement('changeMessage')?.addEventListener('click', (event) => {
    event.preventDefault();
    const MaPhongBan = localStorage.getItem("MaPhongBan");
    if (MaPhongBan) {
      window.location.href = `/changeMessage/${MaPhongBan}`;
    } else {
      alert('Không tìm thấy MaPhongBan trong localStorage.');
    }
  });

  // Setup UI based on user role
  const Quyen = localStorage.getItem('userRole');
  const isKhoa = localStorage.getItem('isKhoa');
  const selectKhoa = getElement('MaPhongBan');
  const find = getElement('TenNhanVien');
  const button = getElement('xemlopgv');
  const actionButton = getElement('changeMessage');

  if (Quyen === window.APP_ROLES.troLy_phong || Quyen === window.APP_ROLES.lanhDao_phong) {
    actionButton.style.display = '';
  } else {
    actionButton.style.display = 'none';
  }

  if (Quyen === window.APP_ROLES.lanhDao_khoa) {
    selectKhoa.style.display = 'none';
    find.style.display = '';
    button.style.display = '';
  } else if (isKhoa === '0') {
    selectKhoa.style.display = '';
    find.style.display = '';
    button.style.display = '';
  } else {
    selectKhoa.style.display = 'none';
    find.style.display = '';
    button.style.display = '';
  }
};

// Export functions that need to be accessed from HTML
window.suggest = suggest;
window.selectSuggestion = selectSuggestion;
window.loadInfoLopGV = loadInfoLopGV;
window.loadLopMoiData = loadLopMoiData; // Export loadLopMoiData

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);