/**
 * NCKH V2 - Đề Xuất Nghiên Cứu - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách thành viên
 * Refactored: Bỏ Tác giả chính, chỉ giữ Thành viên
 */

(function () {
    'use strict';

    // =====================================================
    // MEMBER LIST MANAGEMENT
    // =====================================================

    let memberListDX = [];

    function getMemberList() {
        return memberListDX;
    }

    function clearMemberList() {
        memberListDX = [];
        updateMemberListDisplay();
    }

    function updateMemberListDisplay() {
        const display = document.getElementById("memberTagsDX");
        if (!display) return;

        if (memberListDX.length === 0) {
            display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
        } else {
            display.innerHTML = memberListDX.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="DeXuat_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
        }
    }

    function removeMember(index) {
        memberListDX.splice(index, 1);
        updateMemberListDisplay();
    }

    function addMember(member) {
        memberListDX.push(member);
        updateMemberListDisplay();
    }

    // =====================================================
    // AUTOCOMPLETE SETUP
    // =====================================================

    function initAutocomplete() {
        console.log("Setting up DeXuat autocomplete...");

        setupFormAutocomplete();
        setupMemberList();

        console.log("DeXuat Autocomplete setup complete");
    }

    function setupFormAutocomplete() {
        // Thành viên - chỉ còn autocomplete cho thành viên
        const thanhVienInput = document.getElementById("thanhVienInputDX");
        const thanhVienSuggestions = document.getElementById("thanhVienDX-suggestions");

        if (thanhVienInput && thanhVienSuggestions) {
            setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiDX");
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
                    // Thêm vào danh sách Thành viên
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
        const addMemberBtn = document.getElementById("addMemberBtnDX");
        const thanhVienInput = document.getElementById("thanhVienInputDX");
        const thanhVienDonVi = document.getElementById("thanhVienDonViDX");
        const thanhVienNgoai = document.getElementById("thanhVienNgoaiDX");

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
                    const isNgoai = document.getElementById("thanhVienNgoaiDX")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addMemberBtnDX");
                        if (addBtn) addBtn.click();
                    }
                }
            });
        }
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.DeXuat_Autocomplete = {
        initAutocomplete,
        setupFormAutocomplete,
        setupMemberList,
        getMemberList,
        clearMemberList,
        addMember,
        removeMember,
        updateMemberListDisplay
    };

})(); // End of IIFE
