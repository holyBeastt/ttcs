/**
 * NCKH V2 - Sách Giáo Trình - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách thành viên
 */

(function () {
    'use strict';

    // =====================================================
    // MEMBER LIST MANAGEMENT
    // =====================================================

    let memberListSGT = [];

    function getMemberList() {
        return memberListSGT;
    }

    function clearMemberList() {
        memberListSGT = [];
        updateMemberListDisplay();
    }

    function updateMemberListDisplay() {
        const display = document.getElementById("memberTagsSGT");
        if (!display) return;

        if (memberListSGT.length === 0) {
            display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
        } else {
            display.innerHTML = memberListSGT.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="SachGiaoTrinh_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
        }
    }

    function removeMember(index) {
        memberListSGT.splice(index, 1);
        updateMemberListDisplay();
    }

    function addMember(member) {
        memberListSGT.push(member);
        updateMemberListDisplay();
    }

    // =====================================================
    // AUTOCOMPLETE SETUP
    // =====================================================

    function initAutocomplete() {
        console.log("Setting up SachGiaoTrinh autocomplete...");

        setupFormAutocomplete();
        setupMemberList();
        setupTacGiaList();

        console.log("SachGiaoTrinh Autocomplete setup complete");
    }

    function setupFormAutocomplete() {
        // Chủ biên/Tác giả chính
        const tacGiaInput = document.getElementById("tacGiaChinhInputSGT");
        const tacGiaSuggestions = document.getElementById("tacGiaChinhSGT-suggestions");

        if (tacGiaInput && tacGiaSuggestions) {
            setupAutocompleteWithNgoai(tacGiaInput, tacGiaSuggestions, "tacGiaNgoaiSGT");
        }

        // Thành viên
        const thanhVienInput = document.getElementById("thanhVienInputSGT");
        const thanhVienSuggestions = document.getElementById("thanhVienSGT-suggestions");

        if (thanhVienInput && thanhVienSuggestions) {
            setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiSGT");
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
                    if (checkboxId === "tacGiaNgoaiSGT") {
                        // Thêm vào danh sách Chủ biên
                        if (window.tacGiaListSGT) {
                            window.tacGiaListSGT.push(item.HoTen);
                            if (typeof updateTacGiaDisplaySGT === 'function') {
                                updateTacGiaDisplaySGT();
                            }
                        }
                    } else if (checkboxId === "thanhVienNgoaiSGT") {
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
        const addMemberBtn = document.getElementById("addMemberBtnSGT");
        const thanhVienInput = document.getElementById("thanhVienInputSGT");
        const thanhVienDonVi = document.getElementById("thanhVienDonViSGT");
        const thanhVienNgoai = document.getElementById("thanhVienNgoaiSGT");

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
                    const isNgoai = document.getElementById("thanhVienNgoaiSGT")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addMemberBtnSGT");
                        if (addBtn) addBtn.click();
                    }
                }
            });
        }
    }

    // =====================================================
    // CHỦ BIÊN LIST SETUP
    // =====================================================

    function setupTacGiaList() {
        const addTacGiaBtn = document.getElementById("addTacGiaBtnSGT");
        const tacGiaInput = document.getElementById("tacGiaChinhInputSGT");
        const tacGiaDonVi = document.getElementById("tacGiaDonViSGT");
        const tacGiaNgoai = document.getElementById("tacGiaNgoaiSGT");

        if (addTacGiaBtn) {
            addTacGiaBtn.addEventListener("click", () => {
                const name = tacGiaInput.value.trim();
                const isNgoai = tacGiaNgoai && tacGiaNgoai.checked;
                const unit = isNgoai ? tacGiaDonVi.value.trim() : "";

                if (!name) return;

                const tacGia = unit ? `${name} - ${unit}` : name;
                if (window.tacGiaListSGT) {
                    window.tacGiaListSGT.push(tacGia);
                    if (typeof updateTacGiaDisplaySGT === 'function') {
                        updateTacGiaDisplaySGT();
                    }
                }
                tacGiaInput.value = "";
                if (tacGiaDonVi) tacGiaDonVi.value = "";
            });
        }

        // Enter key to add chủ biên
        if (tacGiaInput) {
            tacGiaInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    const isNgoai = document.getElementById("tacGiaNgoaiSGT")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addTacGiaBtnSGT");
                        if (addBtn) addBtn.click();
                    }
                }
            });
        }
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.SachGiaoTrinh_Autocomplete = {
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
