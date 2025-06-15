// Global variables
const currentNoteButton = null
let currentRow = null
let tableRowData = []

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  initializeRoleBasedUI()
  initializeEventListeners()
  setupNavigationHandlers()
  showname()
})

function showname() {
  const tenNhanVien = localStorage.getItem("TenNhanVien")
  const khoa = localStorage.getItem("MaPhongBan")
  const tenHienThi = document.getElementById("hoVaTen")
  const khoaHienThi = document.getElementById("khoa")
  if (tenHienThi) {
    tenHienThi.value = tenNhanVien.trim() || "Khách"
    khoaHienThi.value = khoa.trim() || "Khách"
  }
}

// Initialize role-based UI
function initializeRoleBasedUI() {
  const isKhoa = localStorage.getItem("isKhoa")
  const role = localStorage.getItem("userRole")
  const MaPhongBan = localStorage.getItem("MaPhongBan")

  // Configure UI based on role
  // if (isKhoa === "1") {
  //   // Khoa role - show only Khoa approval column
  //   document.querySelectorAll('[id*="KhaoThi"]').forEach((el) => (el.style.display = "none"))
  //   document.getElementById("MaPhongBan").style.display = "none"
  // } else {
  //   // Khao Thi role - show all columns
  //   document.getElementById("MaPhongBan").style.display = ""
  //   document.querySelectorAll('[id*="select"]').forEach((el) => (el.style.display = "none"))
  // }

  // Show/hide filter for department selection
  if (isKhoa == 0) {
    const filterKhoa = document.getElementById("filterKhoa")
    if (filterKhoa) filterKhoa.style.display = "block"
  }

  // Configure action buttons based on role
  const changeMessageBtn = document.getElementById("changeMessage")
  if (changeMessageBtn) {
    if (role === "Lãnh đạo khoa" || role === "Duyệt") {
      changeMessageBtn.style.display = ""
    } else {
      changeMessageBtn.style.display = "none"
    }
  }
}

// Initialize event listeners
function initializeEventListeners() {
  // Search functionality
  document.getElementById("filterClass").addEventListener("input", filterTables)


  // Display and update buttons
  document.getElementById("infoCuoiKi").addEventListener("click", loadExamData)

  document.getElementById("update-qc").addEventListener("click", saveDataToServer)

  // Tab change events
  document.addEventListener("shown.bs.tab", (event) => {
    calculateTotals()
  })
}

// Setup navigation handlers
function setupNavigationHandlers() {
  // Home navigation
  const homeBtn = document.getElementById("Home")
  if (homeBtn) {
    homeBtn.addEventListener("click", (event) => {
      event.preventDefault()
      const isKhoa = localStorage.getItem("isKhoa")
      window.location.href = isKhoa == 0 ? "/maindt" : "/mainkhoa"
    })
  }

  // Info navigation
  const infoBtn = document.getElementById("ThongTinGD")
  if (infoBtn) {
    infoBtn.addEventListener("click", (event) => {
      event.preventDefault()
      const isKhoa = localStorage.getItem("isKhoa")
      window.location.href = isKhoa == 0 ? "/info2" : "/info"
    })
  }

  // Change password
  const changePasswordBtn = document.getElementById("changePasswordLink")
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", (event) => {
      event.preventDefault()
      const tenDangNhap = localStorage.getItem("TenDangNhap")
      if (tenDangNhap) {
        window.location.href = `/changePassword?tenDangNhap=${encodeURIComponent(tenDangNhap)}`
      } else {
        showAlert("Không tìm thấy TenDangNhap trong localStorage.", "error")
      }
    })
  }

  // Change message
  const changeMessageBtn = document.getElementById("changeMessage")
  if (changeMessageBtn) {
    changeMessageBtn.addEventListener("click", (event) => {
      event.preventDefault()
      const MaPhongBan = localStorage.getItem("MaPhongBan")
      if (MaPhongBan) {
        window.location.href = `/changeMessage/${MaPhongBan}`
      } else {
        showAlert("Không tìm thấy MaPhongBan trong localStorage.", "error")
      }
    })
  }

  // User info
  const infoMeBtn = document.getElementById("infome")
  if (infoMeBtn) {
    infoMeBtn.addEventListener("click", (event) => {
      event.preventDefault()
      const id_User = localStorage.getItem("id_User")
      if (id_User) {
        window.location.href = `/infome/${id_User}`
      } else {
        showAlert("Không tìm thấy id_User trong localStorage.", "error")
      }
    })
  }
}

// Load exam data from server
async function loadExamData() {
  const isKhoa = localStorage.getItem("isKhoa")
  const TenNhanVien = localStorage.getItem("TenNhanVien")

  const Ki = document.getElementById("comboboxki").value
  const Nam = document.getElementById("NamHoc").value

  if (!TenNhanVien) {
    showAlert("Tên nhân viên không tồn tại!", "error")
    return
  }

  try {
    showLoading(true)
    const response = await fetch(`/vuotGioDanhSachCuoiKi/getDataCuoiKi/${TenNhanVien}/${Ki}/${Nam}`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()

    if (data.success && data.list && data.list.length > 0) {
      console.log("Dữ liệu bộ môn:", data)
      renderExamTables(data)
    } else {
      showAlert("Không có dữ liệu phù hợp", "error")
    }
  } catch (error) {
    console.error("Có lỗi xảy ra khi lấy dữ liệu:", error)
    showAlert("Có lỗi xảy ra khi tải dữ liệu", "error")
  } finally {
    showLoading(false)
  }
}

// Render exam tables for all three tabs
function renderExamTables(data) {
  const role = localStorage.getItem("userRole")
  const MaPhongBan = localStorage.getItem("MaPhongBan")
  const isKhoa = localStorage.getItem("isKhoa")

  tableRowData = []

  // Clear existing data
  const tableIds = ["tableBodyRaDe", "tableBodyCoiThi", "tableBodyChamThi"]
  tableIds.forEach((id) => {
    const tbody = document.getElementById(id)
    if (tbody) tbody.innerHTML = ""
  })


  // Separate data by exam type (this would typically come from different API endpoints)
  const raDeData = data.list.filter(item => 
    (item.hinhthuc ?? "").toLowerCase() === "ra đề" || !item.hinhthuc
  );

  const coiThiData = data.list.filter(item =>
    (item.hinhthuc ?? "").toLowerCase() === "coi thi"
  );

  const chamThiData = data.list.filter(item =>
    (item.hinhthuc ?? "").toLowerCase() === "chấm thi"
  );


  // Render each table
  renderSingleTable("tableBodyRaDe", raDeData, "RaDe", role, MaPhongBan, isKhoa)
  renderSingleTable("tableBodyCoiThi", coiThiData, "CoiThi", role, MaPhongBan, isKhoa)
  renderSingleTable("tableBodyChamThi", chamThiData, "ChamThi", role, MaPhongBan, isKhoa)

  // Save data to localStorage
  localStorage.setItem("tableData", JSON.stringify(tableRowData))

  // Calculate totals
  calculateTotals()
}

// Render single table
function renderSingleTable(tableBodyId, data, examType, role, MaPhongBan, isKhoa) {
  const tableBody = document.getElementById(tableBodyId)
  if (!tableBody) return

  data.forEach((row, index) => {
    const tableRow = document.createElement("tr")


    // Add id to row data
    const rowWithId = {
      id: index,
      examType: examType,
      ...row,
    }
    tableRowData.push(rowWithId)

    tableRow.setAttribute("data-id", row.id || `${examType}_${index}`)
    tableRow.setAttribute("data-exam-type", examType)

    // Create table cells based on exam type
    createTableCells(tableRow, row, examType, role, MaPhongBan, isKhoa, index)

    tableBody.appendChild(tableRow)
  })
}

// Create table cells based on exam type
function createTableCells(tableRow, row, examType, role, MaPhongBan, isKhoa, index) {
  // Common cells
  const cells = []
  // STT
  const sttCell = document.createElement("td")
  sttCell.textContent = index + 1 // Use the passed index for STT
  cells.push(sttCell)



  // giangVien name
  const giangVienCell = document.createElement("td")
  giangVienCell.textContent = row.giangvien
  cells.push(giangVienCell)

  // khoa
  const khoaCell = document.createElement("td")
  khoaCell.textContent = row.khoa
  cells.push(khoaCell)

  // tenHocPhan name
  cells.push(createCellWithEditSupport(row.tenhocphan, row.khoaduyet === 0, "tenhocphan", row.id))

  //Lớp học phần
    cells.push(createCellWithEditSupport(row.lophocphan, row.khoaduyet === 0, "lophocphan", row.id))

    // Đối tượng
    cells.push(createCellWithEditSupport(row.doituong, row.khoaduyet === 0, "doituong", row.id))

  // Exam type specific cells
  if (examType === "RaDe") {
    //Số đề
    cells.push(createCellWithEditSupport(row.tongso, row.khoaduyet === 0, "tongso", row.id))
  } else if (examType === "CoiThi") {
    //Số ca thi
    cells.push(createCellWithEditSupport(row.tongso, row.khoaduyet === 0, "tongso", row.id))
  } else if (examType === "ChamThi") {
    //Số bài chấm 1
    cells.push(createCellWithEditSupport(row.baicham1, row.khoaduyet === 0, "baicham1", row.id))
    //Số bài chấm 2
    cells.push(createCellWithEditSupport(row.baicham2, row.khoaduyet === 0, "baicham2", row.id))
    //Tổng số bài chấm
    cells.push(createCellWithEditSupport(row.tongso, row.khoaduyet === 0, "tongso", row.id))
  }

  // Số tiết quy chuẩn
  cells.push(createCellWithEditSupport(row.sotietqc, row.khoaduyet === 0, "sotietqc", row.id))

  // Notes
  const noteCell = createNoteCell(row, role, tableRow)
  cells.push(noteCell)

  // Action cell
  const actionCell = document.createElement("td")
  const isDisabled = row.khoaduyet === 1;

  actionCell.innerHTML = `
    <button class="btn btn-sm btn-danger" 
            onclick="deleteRow(${row.id})" 
            ${isDisabled ? 'disabled' : ''}>
      <i class="bi bi-trash"></i>
    </button>
  `;

  cells.push(actionCell)

  // Append all cells to row
  cells.forEach((cell) => tableRow.appendChild(cell))
}

function createCellWithEditSupport(value, editable, fieldName, rowId = null) {
  const td = document.createElement("td")
  if (!editable) {
    td.textContent = value
  } else {
    const input = document.createElement("input")
    input.type = "text"
    input.value = value
    input.name = fieldName
    input.className = "form-control form-control-sm"
    if (rowId) input.dataset.id = rowId // nếu bạn cần track ID dòng
    td.appendChild(input)
  }
  return td
}


// Create note cell
function createNoteCell(row, role, tableRow) {
  const ghiChuTd = document.createElement("td")
  ghiChuTd.classList.add("ghichu")

  const ghiChuValue = row.GhiChu && row.GhiChu.trim() !== "" ? row.GhiChu : false
  const hoanThanh = row.HoanThanh

  if (role === "GV" || role === "Thường") {
    ghiChuTd.innerHTML = "📜"
    ghiChuTd.style.cursor = "not-allowed"
    ghiChuTd.title = "Bạn không có quyền truy cập"
  } else {
    if (ghiChuValue) {
      if (hoanThanh) {
        ghiChuTd.innerHTML = `📜 <span class="bi bi-check2-circle" style="color: green;"></span>`
      } else {
        ghiChuTd.innerHTML = `📜 <span class="bi bi-circle" style="color: red;"></span>`
      }
    } else {
      ghiChuTd.innerHTML = "📜"
    }
    ghiChuTd.style.cursor = "pointer"
    ghiChuTd.onclick = () => openNoteForm(tableRow, ghiChuValue)
  }

  return ghiChuTd
}



// Filter tables based on search inputs
function filterTables() {
  const classFilter = document.getElementById("filterClass").value.toLowerCase()

  const tables = ["tableBodyRaDe", "tableBodyCoiThi", "tableBodyChamThi"]

  tables.forEach((tableId) => {
    const tableRows = document.querySelectorAll(`#${tableId} tr`)

    tableRows.forEach((row) => {
      const classCell = row.querySelector("td:nth-child(2)") // Subject column

      const className = classCell ? classCell.textContent.toLowerCase() : ""

      const matchesClass = className.includes(classFilter)

      if (matchesClass) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })
  })

  calculateTotals()
}




// Calculate totals for each tab
function calculateTotals() {
  const tabs = [
    { id: "tableBodyRaDe", totalId: "totalRaDe" },
    { id: "tableBodyCoiThi", totalId: "totalCoiThi" },
    { id: "tableBodyChamThi", totalId: "totalChamThi" },
  ]

  tabs.forEach((tab) => {
    const tableBody = document.getElementById(tab.id)
    if (!tableBody) return

    const visibleRows = tableBody.querySelectorAll('tr:not([style*="display: none"])')
    let total = 0

    visibleRows.forEach((row) => {
      // Find QC hours column (varies by table structure)
      const qcCell = row.querySelector("td:nth-child(6), td:nth-child(7), td:nth-child(8)")
      if (qcCell && qcCell.textContent.match(/^\d+$/)) {
        const value = Number.parseInt(qcCell.textContent) || 0
        total += value
      }
    })

    const totalElement = document.getElementById(tab.totalId)
    if (totalElement) {
      totalElement.textContent = total
    }
  })
}

document.getElementById('addEntryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const entry = {
    section: document.getElementById('section').value,
    hoVaTen: document.getElementById('hoVaTen').value,
    khoa: document.getElementById('khoa').value,
    tenHocPhan: document.getElementById('tenHocPhan').value,
    lopHocPhan: document.getElementById('lopHocPhan').value,
    doiTuong: document.getElementById('doiTuong').value,
    soDe: document.getElementById('soDe').value || null,
    soCa: document.getElementById('soCa').value || null,
    soBaiCham1: document.getElementById('soBaiCham1').value || null,
    soBaiCham2: document.getElementById('soBaiCham2').value || null,
    tongSoBai: document.getElementById('tongSoBai').value || null,
    soTietQC: document.getElementById('soTietQC').value,
    ki: document.getElementById('comboboxki').value,
    nam: document.getElementById('NamHoc').value,
  };

  if (!entry.hoVaTen || !entry.khoa || !entry.tenHocPhan || !entry.lopHocPhan || !entry.doiTuong || !entry.soTietQC) {
    return showAlert('Vui lòng điền đầy đủ các trường bắt buộc!', 'warning');
  }

  try {
    const response = await fetch('/vuotGioCuoiKi/addmydata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
      });
      if (!response.ok) throw new Error('Thêm dữ liệu thất bại');
      const data = await response.json();
      showAlert('Dữ liệu đã được thêm thành công!', 'success');
      document.getElementById('addEntryForm').reset();
  } catch (error) {
    showAlert(error.message || 'Đã xảy ra lỗi khi thêm dữ liệu.', 'error');
    console.error('Error:', error);
  }
});



// Open note form modal
function openNoteForm(row, GhiChu) {
  currentRow = row
  const noteModal = document.getElementById("noteModal")
  const modal = new bootstrap.Modal(noteModal)

  document.getElementById("noteInput").value = GhiChu || ""
  modal.show()
}

// Save note
async function saveNote() {
  const note = document.getElementById("noteInput").value

  if (currentRow) {
    const id = currentRow.getAttribute("data-id")
    const examType = currentRow.getAttribute("data-exam-type")

    if (id) {
      try {
        const response = await fetch("/savenoteduyet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ghiChu: note, examType }),
        })

        const result = await response.json()
        if (result.success) {
          showAlert("Cập nhật thành công", "success")
          // Update note display
          updateNoteDisplay(currentRow, note, false)
        } else {
          showAlert("Lỗi khi lưu ghi chú: " + result.message, "error")
        }
      } catch (error) {
        showAlert("Lỗi khi gửi yêu cầu đến server: " + error, "error")
      }
    }
  }

  closeNoteModal()
}

// Mark note as done
async function doneNote() {
  const note = document.getElementById("noteInput").value

  if (currentRow) {
    const id = currentRow.getAttribute("data-id")
    const examType = currentRow.getAttribute("data-exam-type")

    if (id) {
      try {
        const response = await fetch("/donenoteduyet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ghiChu: note, examType }),
        })

        const result = await response.json()
        if (result.success) {
          showAlert("Cập nhật thành công", "success")
          // Update note display
          updateNoteDisplay(currentRow, note, true)
        } else {
          showAlert("Lỗi khi lưu ghi chú: " + result.message, "error")
        }
      } catch (error) {
        showAlert("Lỗi khi gửi yêu cầu đến server: " + error, "error")
      }
    }
  }

  closeNoteModal()
}

// Update note display in table
function updateNoteDisplay(row, note, isCompleted) {
  const noteCell = row.querySelector(".ghichu")
  if (noteCell) {
    if (note.trim()) {
      if (isCompleted) {
        noteCell.innerHTML = `📜 <span class="bi bi-check2-circle" style="color: green;"></span>`
      } else {
        noteCell.innerHTML = `📜 <span class="bi bi-circle" style="color: red;"></span>`
      }
    } else {
      noteCell.innerHTML = "📜"
    }
  }
}

// Close note modal
function closeNoteModal() {
  const modalElement = document.getElementById("noteModal")
  const modal = bootstrap.Modal.getInstance(modalElement)
  if (modal) {
    modal.hide()
  }
}

// Utility functions
function showAlert(message, type) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "Thông báo",
      text: message,
      icon: type,
      confirmButtonText: "Đồng ý",
    })
  } else {
    alert(message)
  }
}

function showLoading(show) {
  const loadingElement = document.getElementById("loading")
  if (loadingElement) {
    loadingElement.style.display = show ? "block" : "none"
  }
}

// Legacy function for compatibility
function calculateTotalSoTietKT() {
  calculateTotals()
}

const columnDefs = {
  raDe: ['stt','hoVaTen', 'khoa', 'tenHocPhan', 'lopHocPhan', 'doiTuong', 'soDe', 'soTietQC'],
  coiThi: ['stt','hoVaTen', 'khoa', 'tenHocPhan', 'lopHocPhan', 'doiTuong', 'soCa', 'soTietQC'],
  chamThi: ['stt','hoVaTen', 'khoa', 'tenHocPhan', 'lopHocPhan', 'doiTuong', 'soBaiCham1', 'soBaiCham2', 'tongSoBai', 'soTietQC']
};

async function saveDataToServer() {
  try {
    let dataTam = []

    const kiValue = document.getElementById('comboboxki').value;
    const namValue = document.getElementById('NamHoc').value;
    const raDeData = extractEditedData('raDeTableContainer', columnDefs.raDe, 'Ra Đề');
    const coiThiData = extractEditedData('coiThiTableContainer', columnDefs.coiThi, 'Coi Thi');
    const chamThiData = extractEditedData('chamThiTableContainer', columnDefs.chamThi, 'Chấm Thi');

    // Cập nhật lại dataTam
    dataTam = [...raDeData, ...coiThiData, ...chamThiData];

    console.log('Data to be sent:', dataTam);

    const response = await fetch('/vuotGioCuoiKi/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Ki: kiValue,
        Nam: namValue,
        data: dataTam // Truyền thêm dataTam
      })
    });

    if (!response.ok) throw new Error('Thêm dữ liệu thất bại');
      const data = await response.json();
      showAlert('Dữ liệu đã được thêm thành công!', 'success');

    if (data.success) location.reload();
  } catch (error) {
    showAlert( error.message || messages.error, 'error');
    console.error('Error:', error);
  }
}

function extractEditedData(containerId, columnList, examType) {
  const tbody = document.querySelector(`#${containerId} tbody`);
  if (!tbody) return [];

  const rows = tbody.querySelectorAll('tr');
  console.log(`Extracting data for ${examType}...`, rows);
  const data = [];

  rows.forEach((row) => {
    const rowData = { loai: examType };
    const cells = row.querySelectorAll('td');

    columnList.forEach((colName, index) => {
      const cell = cells[index];
      if (!cell) return;

      const input = cell.querySelector('input');
      if (input) {
        rowData[colName] = input.value.trim();
      } else {
        rowData[colName] = cell.textContent.trim();
      }
    });

    // Nếu có id dòng (gợi ý: <tr data-id="...">)
    const rowId = row.dataset.id || row.getAttribute('data-id');
    if (rowId) rowData.id = rowId;

    data.push(rowData);
  });

  return data;
}

// Delete row
function deleteRow(rowId) {
  try {
    fetch('/vuotGioCuoiKi/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rowId })
    })
    .then(response => {
      if (!response.ok) throw new Error('Xóa dữ liệu thất bại');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        const row = document.querySelector(`tr[data-id="${rowId}"]`);
        if (row) row.remove();
        showAlert("Dòng đã được xóa thành công", "success");
        calculateTotals(); // Cập nhật tổng sau khi xóa
      } else {
        showAlert("Không tìm thấy dòng để xóa", "error");
      }
    });
  } catch (error) {
    showAlert("Lỗi khi xóa dòng: " + error.message, "error");
  }
}

