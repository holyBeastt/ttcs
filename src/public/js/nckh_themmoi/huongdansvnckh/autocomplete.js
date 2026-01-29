/**
 * NCKH V2 - Hướng dẫn SV NCKH - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách thành viên
 */

(function () {
    'use strict';

    // =====================================================
    // MEMBER LIST MANAGEMENT
    // =====================================================

    let memberListHD = [];

    function getMemberList() {
        return memberListHD;
    }

    function clearMemberList() {
        memberListHD = [];
        updateMemberListDisplay();
    }

    function updateMemberListDisplay() {
        const display = document.getElementById("memberTagsHD");
        if (!display) return;

        if (memberListHD.length === 0) {
            display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
        } else {
            display.innerHTML = memberListHD.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="HuongDanSvNckh_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
        }
    }

    function removeMember(index) {
        memberListHD.splice(index, 1);
        updateMemberListDisplay();
    }

    function addMember(member) {
        memberListHD.push(member);
        updateMemberListDisplay();
    }

    // =====================================================
    // AUTOCOMPLETE SETUP
    // =====================================================

    function setupFormAutocomplete() {
        console.log("Setting up HuongDanSvNckh autocomplete...");

        // Thành viên tham gia hướng dẫn
        const thanhVienInput = document.getElementById("thanhVienInputHD");
        const thanhVienSuggestions = document.getElementById("thanhVienHD-suggestions");

        if (thanhVienInput && thanhVienSuggestions) {
            setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiHD");
        }

        console.log("HuongDanSvNckh Autocomplete setup complete");
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
                    // Thêm vào danh sách Thành viên tham gia hướng dẫn
                    addMember(item.HoTen);

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
        const addMemberBtn = document.getElementById("addMemberBtnHD");
        const thanhVienInput = document.getElementById("thanhVienInputHD");
        const thanhVienDonVi = document.getElementById("thanhVienDonViHD");
        const thanhVienNgoai = document.getElementById("thanhVienNgoaiHD");

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
                    const isNgoai = document.getElementById("thanhVienNgoaiHD")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addMemberBtnHD");
                        if (addBtn) addBtn.click();
                    }
                }
            });
        }
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.HuongDanSvNckh_Autocomplete = {
        setupFormAutocomplete,
        setupMemberList,
        getMemberList,
        clearMemberList,
        addMember,
        removeMember,
        updateMemberListDisplay
    };

})(); // End of IIFE
