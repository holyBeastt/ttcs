/**
 * NCKH V2 - Sáng Kiến - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách thành viên
 */

(function() {
    'use strict';

// =====================================================
// MEMBER LIST MANAGEMENT
// =====================================================

let memberListSK = [];

function getMemberList() {
    return memberListSK;
}

function clearMemberList() {
    memberListSK = [];
    updateMemberListDisplay();
}

function updateMemberListDisplay() {
    const display = document.getElementById("memberTagsSK");
    if (!display) return;

    if (memberListSK.length === 0) {
        display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
    } else {
        display.innerHTML = memberListSK.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="SangKien_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
    }
}

function removeMember(index) {
    memberListSK.splice(index, 1);
    updateMemberListDisplay();
}

function addMember(member) {
    memberListSK.push(member);
    updateMemberListDisplay();
}

// =====================================================
// AUTOCOMPLETE SETUP
// =====================================================

function setupFormAutocomplete() {
    console.log("Setting up SangKien autocomplete...");

    // Tác giả chính
    const tacGiaInput = document.getElementById("tacGiaChinhInput");
    const tacGiaSuggestions = document.getElementById("tacGiaChinh-suggestions");

    if (tacGiaInput && tacGiaSuggestions) {
        setupAutocompleteWithNgoai(tacGiaInput, tacGiaSuggestions, "tacGiaNgoaiSK");
    }

    // Thành viên
    const thanhVienInput = document.getElementById("thanhVienInputSK");
    const thanhVienSuggestions = document.getElementById("thanhVienSK-suggestions");

    if (thanhVienInput && thanhVienSuggestions) {
        setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiSK");
    }

    console.log("SangKien Autocomplete setup complete");
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
                if (checkboxId === "tacGiaNgoaiSK") {
                    // Thêm vào danh sách Tác giả chính
                    if (window.tacGiaListSK) {
                        window.tacGiaListSK.push(item.HoTen);
                        if (typeof updateTacGiaDisplaySK === 'function') {
                            updateTacGiaDisplaySK();
                        }
                    }
                } else if (checkboxId === "thanhVienNgoaiSK") {
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
    const addMemberBtn = document.getElementById("addMemberBtnSK");
    const thanhVienInput = document.getElementById("thanhVienInputSK");
    const thanhVienDonVi = document.getElementById("thanhVienDonViSK");
    const thanhVienNgoai = document.getElementById("thanhVienNgoaiSK");

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
                const isNgoai = document.getElementById("thanhVienNgoaiSK")?.checked;
                if (isNgoai) {
                    const addBtn = document.getElementById("addMemberBtnSK");
                    if (addBtn) addBtn.click();
                }
            }
        });
    }
}

// =====================================================
// EXPORTS
// =====================================================

window.SangKien_Autocomplete = {
    setupFormAutocomplete,
    setupMemberList,
    getMemberList,
    clearMemberList,
    addMember,
    removeMember,
    updateMemberListDisplay
};

})(); // End of IIFE
