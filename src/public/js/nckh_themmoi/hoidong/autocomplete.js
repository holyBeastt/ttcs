/**
 * NCKH V2 - Thành viên Hội đồng - Autocomplete Module
 * Xử lý autocomplete và quản lý DANH SÁCH thành viên (nhiều người)
 * Pattern tham khảo từ: dexuat/autocomplete.js
 */

(function () {
    'use strict';

    // =====================================================
    // MEMBER LIST MANAGEMENT
    // =====================================================

    let memberListHoiDong = [];

    function getMemberList() {
        return memberListHoiDong;
    }

    function clearMemberList() {
        memberListHoiDong = [];
        updateMemberListDisplay();
    }

    function updateMemberListDisplay() {
        const display = document.getElementById("memberTagsHoiDong");
        if (!display) return;

        if (memberListHoiDong.length === 0) {
            display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
        } else {
            display.innerHTML = memberListHoiDong.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="HoiDong_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
        }
    }

    function removeMember(index) {
        memberListHoiDong.splice(index, 1);
        updateMemberListDisplay();
    }

    function addMember(member) {
        memberListHoiDong.push(member);
        updateMemberListDisplay();
    }

    // =====================================================
    // AUTOCOMPLETE SETUP
    // =====================================================

    function initAutocomplete() {
        console.log("Setting up HoiDong autocomplete...");

        setupFormAutocomplete();
        setupMemberList();

        console.log("HoiDong Autocomplete setup complete");
    }

    function setupFormAutocomplete() {
        // Thành viên hội đồng
        const thanhVienInput = document.getElementById("thanhVienInputHoiDong");
        const thanhVienSuggestions = document.getElementById("thanhVienHoiDong-suggestions");

        if (thanhVienInput && thanhVienSuggestions) {
            setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiHoiDong");
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
                    // Thêm vào danh sách thành viên
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
        const addMemberBtn = document.getElementById("addMemberBtnHoiDong");
        const thanhVienInput = document.getElementById("thanhVienInputHoiDong");
        const thanhVienDonVi = document.getElementById("thanhVienDonViHoiDong");
        const thanhVienNgoai = document.getElementById("thanhVienNgoaiHoiDong");

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

        // Enter key to add member (only when Ngoài học viện is checked)
        if (thanhVienInput) {
            thanhVienInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    const isNgoai = document.getElementById("thanhVienNgoaiHoiDong")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addMemberBtnHoiDong");
                        if (addBtn) addBtn.click();
                    }
                }
            });
        }
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.HoiDong_Autocomplete = {
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
