/**
 * NCKH V2 - Giải Thưởng KHCN - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách thành viên
 */

(function() {
    'use strict';

// =====================================================
// MEMBER LIST MANAGEMENT
// =====================================================

let memberListGT = [];

function getMemberList() {
    return memberListGT;
}

function clearMemberList() {
    memberListGT = [];
    updateMemberListDisplay();
}

function updateMemberListDisplay() {
    const display = document.getElementById("memberTagsGT");
    if (!display) return;

    if (memberListGT.length === 0) {
        display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
    } else {
        display.innerHTML = memberListGT.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="GiaiThuong_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
    }
}

function removeMember(index) {
    memberListGT.splice(index, 1);
    updateMemberListDisplay();
}

function addMember(member) {
    memberListGT.push(member);
    updateMemberListDisplay();
}

// =====================================================
// AUTOCOMPLETE SETUP
// =====================================================

function initAutocomplete() {
    console.log("Setting up GiaiThuong autocomplete...");

    setupFormAutocomplete();
    setupMemberList();
    setupTacGiaList();

    console.log("GiaiThuong Autocomplete setup complete");
}

function setupFormAutocomplete() {
    // Tác giả chính
    const tacGiaInput = document.getElementById("tacGiaChinhInputGT");
    const tacGiaSuggestions = document.getElementById("tacGiaChinhGT-suggestions");

    if (tacGiaInput && tacGiaSuggestions) {
        setupAutocompleteWithNgoai(tacGiaInput, tacGiaSuggestions, "tacGiaNgoaiGT");
    }

    // Thành viên
    const thanhVienInput = document.getElementById("thanhVienInputGT");
    const thanhVienSuggestions = document.getElementById("thanhVienGT-suggestions");

    if (thanhVienInput && thanhVienSuggestions) {
        setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiGT");
    }
}

function setupAutocompleteWithNgoai(inputElement, suggestionContainer, checkboxId) {
    inputElement.addEventListener("input", () => {
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
                if (checkboxId === "tacGiaNgoaiGT") {
                    // Thêm vào danh sách Tác giả chính
                    if (window.tacGiaListGT) {
                        window.tacGiaListGT.push(item.HoTen);
                        if (typeof updateTacGiaDisplayGT === 'function') {
                            updateTacGiaDisplayGT();
                        }
                    }
                } else if (checkboxId === "thanhVienNgoaiGT") {
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
    const addMemberBtn = document.getElementById("addMemberBtnGT");
    const thanhVienInput = document.getElementById("thanhVienInputGT");
    const thanhVienDonVi = document.getElementById("thanhVienDonViGT");
    const thanhVienNgoai = document.getElementById("thanhVienNgoaiGT");

    if (addMemberBtn) {
        addMemberBtn.addEventListener("click", () => {
            const name = thanhVienInput.value.trim();
            const isNgoai = thanhVienNgoai && thanhVienNgoai.checked;
            const unit = isNgoai ? thanhVienDonVi.value.trim() : "";

            if (!name) return;

            const member = unit ? `${name} - ${unit}` : name;
            addMember(member);
            thanhVienInput.value = "";
            if (thanhVienDonVi) thanhVienDonVi.value = "";
        });
    }

    // Enter key to add member
    if (thanhVienInput) {
        thanhVienInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const isNgoai = document.getElementById("thanhVienNgoaiGT")?.checked;
                if (isNgoai) {
                    const addBtn = document.getElementById("addMemberBtnGT");
                    if (addBtn) addBtn.click();
                }
            }
        });
    }
}

// =====================================================
// TÁC GIẢ CHÍNH LIST SETUP
// =====================================================

function setupTacGiaList() {
    const addTacGiaBtn = document.getElementById("addTacGiaBtnGT");
    const tacGiaInput = document.getElementById("tacGiaChinhInputGT");
    const tacGiaDonVi = document.getElementById("tacGiaDonViGT");
    const tacGiaNgoai = document.getElementById("tacGiaNgoaiGT");

    if (addTacGiaBtn) {
        addTacGiaBtn.addEventListener("click", () => {
            const name = tacGiaInput.value.trim();
            const isNgoai = tacGiaNgoai && tacGiaNgoai.checked;
            const unit = isNgoai ? tacGiaDonVi.value.trim() : "";

            if (!name) return;

            const tacGia = unit ? `${name} - ${unit}` : name;
            if (window.tacGiaListGT) {
                window.tacGiaListGT.push(tacGia);
                if (typeof updateTacGiaDisplayGT === 'function') {
                    updateTacGiaDisplayGT();
                }
            }
            tacGiaInput.value = "";
            if (tacGiaDonVi) tacGiaDonVi.value = "";
        });
    }

    // Enter key to add tác giả
    if (tacGiaInput) {
        tacGiaInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const isNgoai = document.getElementById("tacGiaNgoaiGT")?.checked;
                if (isNgoai) {
                    const addBtn = document.getElementById("addTacGiaBtnGT");
                    if (addBtn) addBtn.click();
                }
            }
        });
    }
}

// =====================================================
// EXPORTS
// =====================================================

window.GiaiThuong_Autocomplete = {
    initAutocomplete,
    setupFormAutocomplete,
    setupMemberList,
    setupTacGiaList,
    getMemberList,
    clearMemberList,
    addMember,
    removeMember,
    updateMemberListDisplay
};

})(); // End of IIFE
