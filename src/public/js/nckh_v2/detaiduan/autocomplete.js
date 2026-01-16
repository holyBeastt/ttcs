/**
 * NCKH V2 - Đề Tài Dự Án - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách thành viên
 */

// =====================================================
// MEMBER LIST MANAGEMENT
// =====================================================

let memberList = [];

function getMemberList() {
    return memberList;
}

function clearMemberList() {
    memberList = [];
    updateMemberListDisplay();
}

function updateMemberListDisplay() {
    const display = document.getElementById("memberTags");
    if (!display) return;

    if (memberList.length === 0) {
        display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
    } else {
        display.innerHTML = memberList.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="DeTaiDuAn_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
    }
}

function removeMember(index) {
    memberList.splice(index, 1);
    updateMemberListDisplay();
}

function addMember(member) {
    memberList.push(member);
    updateMemberListDisplay();
}

// =====================================================
// AUTOCOMPLETE SETUP
// =====================================================

function setupFormAutocomplete() {
    console.log("Setting up autocomplete...");
    console.log("giangVienCoHuu from window:", window.giangVienCoHuu?.length || 0, "records");

    // Chủ nhiệm/Tác giả chính
    const chuNhiemInput = document.getElementById("chuNhiemInput");
    const chuNhiemSuggestions = document.getElementById("chuNhiem-suggestions");
    console.log("chuNhiemInput found:", !!chuNhiemInput);
    console.log("chuNhiemSuggestions found:", !!chuNhiemSuggestions);

    if (chuNhiemInput && chuNhiemSuggestions) {
        setupAutocompleteWithNgoai(chuNhiemInput, chuNhiemSuggestions, "chuNhiemNgoai");
    }

    // Thành viên
    const thanhVienInput = document.getElementById("thanhVienInput");
    const thanhVienSuggestions = document.getElementById("thanhVien-suggestions");
    console.log("thanhVienInput found:", !!thanhVienInput);
    console.log("thanhVienSuggestions found:", !!thanhVienSuggestions);

    if (thanhVienInput && thanhVienSuggestions) {
        setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoai");
    }

    console.log("Autocomplete setup complete");
}

// Autocomplete với kiểm tra checkbox "Ngoài học viện"
function setupAutocompleteWithNgoai(inputElement, suggestionContainer, checkboxId) {
    inputElement.addEventListener("input", () => {
        // Kiểm tra nếu check "Ngoài học viện" thì không hiện gợi ý
        const checkbox = document.getElementById(checkboxId);
        if (checkbox && checkbox.checked) {
            suggestionContainer.innerHTML = "";
            suggestionContainer.classList.remove("show");
            return;
        }

        const query = inputElement.value.trim().toLowerCase();
        suggestionContainer.innerHTML = "";

        if (!query || query.length < 2) {
            suggestionContainer.classList.remove("show");
            return;
        }

        const giangVienCoHuu = window.giangVienCoHuu || [];
        const suggestions = giangVienCoHuu.filter(
            item => item.HoTen && item.HoTen.toLowerCase().includes(query)
        );

        if (suggestions.length === 0) {
            suggestionContainer.classList.remove("show");
            return;
        }

        suggestions.slice(0, 10).forEach(item => {
            const suggestionItem = document.createElement("div");
            suggestionItem.className = "suggestion-item";
            suggestionItem.textContent = item.HoTen;
            suggestionItem.addEventListener("click", () => {
                // Khi không check "Ngoài học viện", click = thêm vào danh sách luôn
                if (checkboxId === "chuNhiemNgoai") {
                    // Thêm vào danh sách Chủ nhiệm
                    if (window.chuNhiemList) {
                        window.chuNhiemList.push(item.HoTen);
                        if (typeof updateChuNhiemDisplay === 'function') {
                            updateChuNhiemDisplay();
                        }
                    }
                } else if (checkboxId === "thanhVienNgoai") {
                    // Thêm vào danh sách Thành viên
                    addMember(item.HoTen);
                }

                inputElement.value = "";
                suggestionContainer.innerHTML = "";
                suggestionContainer.classList.remove("show");
            });
            suggestionContainer.appendChild(suggestionItem);
        });

        suggestionContainer.classList.add("show");
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
        if (!inputElement.contains(e.target) && !suggestionContainer.contains(e.target)) {
            suggestionContainer.innerHTML = "";
            suggestionContainer.classList.remove("show");
        }
    });
}

// =====================================================
// MEMBER LIST BUTTON SETUP
// =====================================================

function setupMemberList() {
    const addMemberBtn = document.getElementById("addMemberBtn");
    const thanhVienInput = document.getElementById("thanhVienInput");
    const thanhVienDonVi = document.getElementById("thanhVienDonVi");
    const thanhVienNgoai = document.getElementById("thanhVienNgoai");

    if (addMemberBtn) {
        addMemberBtn.addEventListener("click", () => {
            const name = thanhVienInput.value.trim();
            const isNgoai = thanhVienNgoai && thanhVienNgoai.checked;
            const unit = isNgoai ? thanhVienDonVi.value.trim() : "";

            if (!name) return;

            // Chỉ xử lý khi check "Ngoài học viện" (nút này chỉ hiện khi check)
            const member = unit ? `${name} - ${unit}` : name;
            addMember(member);
            thanhVienInput.value = "";
            if (thanhVienDonVi) thanhVienDonVi.value = "";
        });
    }

    // Enter key to add member - chỉ cho phép khi check "Ngoài học viện"
    if (thanhVienInput) {
        thanhVienInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const isNgoai = document.getElementById("thanhVienNgoai")?.checked;
                if (isNgoai) {
                    const addBtn = document.getElementById("addMemberBtn");
                    if (addBtn) addBtn.click();
                }
            }
        });
    }
}

// =====================================================
// EXPORTS
// =====================================================

window.DeTaiDuAn_Autocomplete = {
    setupFormAutocomplete,
    setupMemberList,
    getMemberList,
    clearMemberList,
    addMember,
    removeMember,
    updateMemberListDisplay
};
