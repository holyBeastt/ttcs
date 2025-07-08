// Global variables
const currentNoteButton = null
let currentRow = null
let tableRowData = []

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  initializeRoleBasedUI()
  initializeEventListeners()
  setupNavigationHandlers()
})

// Initialize role-based UI
function initializeRoleBasedUI() {
  const isKhoa = localStorage.getItem("isKhoa")
  const role = localStorage.getItem("userRole")
  const MaPhongBan = localStorage.getItem("MaPhongBan")

  // Configure UI based on role
  if (isKhoa === "1") {
    // Khoa role - show only Khoa approval column
    document.querySelectorAll('[id*="KhaoThi"]').forEach((el) => (el.style.display = "none"))
    document.getElementById("MaPhongBan").style.display = "none"
  } else {
    // Khao Thi role - show all columns
    document.getElementById("MaPhongBan").style.display = ""
    document.querySelectorAll('[id*="select"]').forEach((el) => (el.style.display = "none"))
  }

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

  if (isKhoa == 1) {
    hideTableHeadersByIds(["labelKhaoThiRaDe", "labelKhaoThiCoiThi", "labelKhaoThiChamThi"])
  } else if (MaPhongBan === "KT&DBCL") {
  } else {
    hideTableHeadersByIds([
      "labelKhoaRaDe", "labelKhoaCoiThi", "labelKhoaChamThi",
      "labelKhaoThiRaDe", "labelKhaoThiCoiThi", "labelKhaoThiChamThi"
    ])
    document.getElementById("update-qc").style.display = "none"
  }


}

function hideTableHeadersByIds(idList) {
  idList.forEach(id => {
    const el = document.getElementById(id)
    if (el && el.closest("th")) {
      el.closest("th").style.display = "none"
    }
  })
}

// Initialize event listeners
function initializeEventListeners() {
  // Search functionality
  document.getElementById("filterName").addEventListener("input", filterTables)
  document.getElementById("filterClass").addEventListener("input", filterTables)

  // Check all functionality
  setupCheckAllListeners()

  // Display and update buttons
  document.getElementById("infoCuoiKi").addEventListener("click", loadExamData)

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

// Setup check all listeners for each tab
function setupCheckAllListeners() {
  const tabs = ["RaDe", "CoiThi", "ChamThi"]
  const types = ["Khoa", "KhaoThi"]

  tabs.forEach((tab) => {
    types.forEach((type) => {
      const checkAllId = `checkAll${type}${tab}`
      const element = document.getElementById(checkAllId)
      if (element) {
        element.addEventListener("change", () => {
          checkAll(tab, type)
        })
      }
    })
  })
}

// Load exam data from server
async function loadExamData() {
  const isKhoa = localStorage.getItem("isKhoa")
  let MaPhongBan

  if (isKhoa === "1") {
    MaPhongBan = localStorage.getItem("MaPhongBan")
  } else {
    MaPhongBan = document.getElementById("MaPhongBan").value
  }

  const Ki = document.getElementById("comboboxki").value
  const Nam = document.getElementById("NamHoc").value

  if (!MaPhongBan) {
    showAlert("Mã phòng ban không tồn tại!", "error")
    return
  }

  try {
    showLoading(true)
    const response = await fetch(`/vuotGioDanhSachCuoiKi/getDSCuoiKi/${MaPhongBan}/${Ki}/${Nam}`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()

    if (data.success && data.list && data.list.length > 0) {
      console.log("Dữ liệu bộ môn:", data)
      renderExamTables(data)
      document.getElementById("filterName").style.display = "block"
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

    tableRow.setAttribute("data-id", row.MaGiangDay || `${examType}_${index}`)
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
  const tenHocPhanCell = document.createElement("td")
  tenHocPhanCell.textContent = row.tenhocphan
  cells.push(tenHocPhanCell)

  //Lớp học phần
    const lopHocPhanCell = document.createElement("td")
    lopHocPhanCell.textContent = row.lophocphan
    cells.push(lopHocPhanCell)

    // Đối tượng
    const doiTuongCell = document.createElement("td")
    doiTuongCell.textContent = row.doituong 
    cells.push(doiTuongCell)

  // Exam type specific cells
  if (examType === "RaDe") {
    //Số đề
    const soDeCell = document.createElement("td")
    soDeCell.textContent = row.tongso 
    cells.push(soDeCell)
  } else if (examType === "CoiThi") {
    //Số ca thi
    const soCaThiCell = document.createElement("td")
    soCaThiCell.textContent = row.tongso 
    cells.push(soCaThiCell)
  } else if (examType === "ChamThi") {
    //Số bài chấm 1
    const soBaiCham1Cell = document.createElement("td")
    soBaiCham1Cell.textContent = row.baicham1 
    cells.push(soBaiCham1Cell)
    //Số bài chấm 2
    const soBaiCham2Cell = document.createElement("td")
    soBaiCham2Cell.textContent = row.baicham2 
    cells.push(soBaiCham2Cell)
    //Tổng số bài chấm
    const tongSoBaiChamCell = document.createElement("td")
    tongSoBaiChamCell.textContent = row.tongso 
    cells.push(tongSoBaiChamCell)
  }

  // Số tiết quy chuẩn
  const qcCell = document.createElement("td")
  qcCell.textContent = row.sotietqc
  cells.push(qcCell)

  // Notes
  const noteCell = createNoteCell(row, role, tableRow)
  cells.push(noteCell)

  // Checkboxes
  const checkboxCells = createCheckboxCells(examType, row, tableRow, isKhoa, MaPhongBan)
  cells.push(...checkboxCells)

  // Append all cells to row
  cells.forEach((cell) => tableRow.appendChild(cell))
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

// Create checkbox cells
function createCheckboxCells(tab, row, tableRow, isKhoa, MaPhongBan) {
  const cells = []

  // Khoa approval checkbox
  const khoaCell = document.createElement("td")
  const khoaCheckbox = document.createElement("input")
  khoaCheckbox.type = "checkbox"
  khoaCheckbox.className = "form-check-input"
  khoaCheckbox.name = "KhoaDuyet"+ tab
  khoaCheckbox.id = `KhoaDuyet_${row.id}`
  khoaCheckbox.checked = row.khoaduyet || false
  khoaCheckbox.onchange = () => updateCheckAll(tab, "Khoa")
  khoaCell.appendChild(khoaCheckbox)
  cells.push(khoaCell)

  // Khao Thi approval checkbox
  const khaoThiCell = document.createElement("td")
  const khaoThiCheckbox = document.createElement("input")
  khaoThiCheckbox.type = "checkbox"
  khaoThiCheckbox.className = "form-check-input"
  khaoThiCheckbox.name = "KhaoThiDuyet"+ tab
  khaoThiCheckbox.id = `KhaoThiDuyet_${row.id}`
  khaoThiCheckbox.checked = row.khaothiduyet || false
  khaoThiCheckbox.onchange = () => updateCheckAll(tab,"KhaoThi")
  khaoThiCell.appendChild(khaoThiCheckbox)
  cells.push(khaoThiCell)

  // Ẩn ô nếu là khoa
  if (isKhoa === "1") {
    khaoThiCell.style.display = "none"
  } else {
    if (MaPhongBan !== "KT&DBCL") {
      khaoThiCell.style.display = "none"
      khoaCell.style.display = "none"
    }
  }

  // Vô hiệu nếu đã được duyệt
  if (row.KhaoThiDuyet && MaPhongBan !== "KT&DBCL") {
    khoaCheckbox.disabled = true
    khaoThiCheckbox.disabled = true
  }

  updateCheckAll(tab,"KhaoThi")
  updateCheckAll(tab,"Khoa")
  return cells
}


// Filter tables based on search inputs
function filterTables() {
  const nameFilter = document.getElementById("filterName").value.toLowerCase()
  const classFilter = document.getElementById("filterClass").value.toLowerCase()

  const tables = ["tableBodyRaDe", "tableBodyCoiThi", "tableBodyChamThi"]

  tables.forEach((tableId) => {
    const tableRows = document.querySelectorAll(`#${tableId} tr`)

    tableRows.forEach((row) => {
      const nameCell = row.querySelector("td:nth-child(2)") // Subject column
      const classCell = row.querySelector("td:nth-child(4)") // Teacher name column

      const name = nameCell ? nameCell.textContent.toLowerCase() : ""
      const className = classCell ? classCell.textContent.toLowerCase() : ""

      const matchesName = name.includes(nameFilter)
      const matchesClass = className.includes(classFilter)

      if (matchesName && matchesClass) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })
  })

  calculateTotals()
}

// Check all checkboxes in a specific category
function checkAll(tab, type) {
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const checkAllId = `checkAll${capitalize(type)}${capitalize(tab)}`

  const checkAll = document.getElementById(checkAllId)

  if (!checkAll) return

  const tableBodyId = `tableBody${tab.charAt(0).toUpperCase() + tab.slice(1)}`
  const tableBody = document.getElementById(tableBodyId)


  if (!tableBody) return

  const columnIndex = getColumnIndex(tab, type)
  const checkboxes = tableBody.querySelectorAll(
    `tr:not([style*="display: none"]) td:nth-child(${columnIndex}) input[type="checkbox"]`,
  )

  checkboxes.forEach((checkbox) => {
    if (!checkbox.disabled) {
      checkbox.checked = checkAll.checked
    }
  })
}

// Get column index based on type and exam type
function getColumnIndex(tab, type) {
  const columnMap = {
    RaDe: {
      Khoa: 10,
      KhaoThi: 11,
    },
    CoiThi: {
      Khoa: 10,
      KhaoThi: 11,
    },
    ChamThi: {
      Khoa: 12,
      KhaoThi: 13,
    },
  }

  return columnMap[tab]?.[type] ?? -1 // trả -1 nếu không tìm thấy
}


// Update check all status
function updateCheckAll(tab, type) {
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const checkAllId = `checkAll${capitalize(type)}${capitalize(tab)}`
  const checkAllCheckbox = document.getElementById(checkAllId)

  const tableBodyId = `tableBody${capitalize(tab)}`
  const tableBody = document.getElementById(tableBodyId)


  if (!checkAllCheckbox || !tableBody) {
    console.log("Không tìm thấy checkbox tổng hoặc tbody")
    return
  }

  const columnIndex = getColumnIndex(tab, type)
  const checkboxes = tableBody.querySelectorAll(
    `tr:not([style*="display: none"]) td:nth-child(${columnIndex}) input[type="checkbox"]`
  )
  if (checkboxes.length === 0) {
    console.log("Không tìm thấy checkbox nào")
  }

  const visibleCheckboxes = Array.from(checkboxes).filter((cb) => !cb.disabled)

  const allChecked = visibleCheckboxes.every((checkbox) => checkbox.checked)
  
  // visibleCheckboxes.forEach(cb => console.log("checked:", cb.checked, "disabled:", cb.disabled))

  checkAllCheckbox.checked = allChecked
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


async function updateDuyet() {
  try {
    const duyetList = []

    const allCheckboxes = document.querySelectorAll('input[type="checkbox"][name$="DuyetChamThi"], input[type="checkbox"][name$="DuyetRaDe"], input[type="checkbox"][name$="DuyetCoiThi"]')

    if (allCheckboxes.length === 0) {
      showAlert("Không có checkbox nào để cập nhật", "warning")
      return
    }
    allCheckboxes.forEach((checkbox) => {
      // Ví dụ: id="KhoaDuyetChamThi_53"
      const [fullType, id] = checkbox.id.split("_") // ["KhoaDuyetChamThi", "53"]
      if (!id) return

      let row = duyetList.find(item => item.id === id)
      if (!row) {
        row = { id }
        duyetList.push(row)
      }

      // Gán giá trị, chuyển camelCase về lowercase để dễ dùng phía backend nếu cần
      const key = fullType.charAt(0).toLowerCase() + fullType.slice(1) // ví dụ: "khoaDuyetChamThi"
      row[key] = checkbox.checked ? 1 : 0
    })


    // ✅ Kiểm tra ràng buộc: nếu có khảo thí duyệt mà khoa chưa duyệt
    const invalidRows = duyetList.filter(row => {
      const khoaKeys = Object.keys(row).filter(k => k.startsWith("khoaDuyet"))
      const khaoThiKeys = Object.keys(row).filter(k => k.startsWith("khaoThiDuyet"))

      return khaoThiKeys.some(khao => row[khao] === 1) && khoaKeys.every(khoa => row[khoa] !== 1)
    })

    if (invalidRows.length > 0) {
      showAlert("Vui lòng duyệt Khoa trước khi Khảo thí duyệt!", "warning")
      return // Ngưng gửi request
    }

    const response = await fetch("/vuotGioDanhSachCuoiKi/updateDuyet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duyetList }),
    })

    const data = await response.json()
    if (response.ok) {
      showAlert(data.message, "success")
    } else {
      throw new Error(data.message)
    }
  } catch (error) {
    showAlert("Có lỗi xảy ra khi cập nhật dữ liệu", "error")
    console.error(error)
  }
}



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
