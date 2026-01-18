/**
 * NCKH V2 - Bài Báo Khoa Học - Autocomplete Module
 * Xử lý autocomplete và quản lý danh sách tác giả/thành viên
 */

(function () {
    'use strict';

    // =====================================================
    // MEMBER LIST MANAGEMENT
    // =====================================================

    let memberListBB = [];

    function getMemberList() {
        return memberListBB;
    }

    function clearMemberList() {
        memberListBB = [];
        updateMemberListDisplay();
    }

    function updateMemberListDisplay() {
        const display = document.getElementById("memberTagsBB");
        if (!display) return;

        if (memberListBB.length === 0) {
            display.innerHTML = '<span style="color: #999; font-style: italic;">Chưa có thành viên</span>';
        } else {
            display.innerHTML = memberListBB.map((member, index) => `
            <span class="member-tag">
                ${member}
                <button type="button" onclick="BaiBao_Autocomplete.removeMember(${index})" class="member-tag-remove">&times;</button>
            </span>
        `).join("");
        }
    }

    function removeMember(index) {
        memberListBB.splice(index, 1);
        updateMemberListDisplay();
    }

    function addMember(member) {
        memberListBB.push(member);
        updateMemberListDisplay();
    }

    // =====================================================
    // AUTOCOMPLETE SETUP
    // =====================================================

    function initAutocomplete() {
        console.log("Setting up BaiBaoKhoaHoc autocomplete...");

        setupFormAutocomplete();
        setupMemberList();
        setupTacGiaList();

        console.log("BaiBaoKhoaHoc Autocomplete setup complete");
    }

    function setupFormAutocomplete() {
        // Tác giả chính
        const tacGiaInput = document.getElementById("tacGiaChinhInputBB");
        const tacGiaSuggestions = document.getElementById("tacGiaChinhBB-suggestions");

        if (tacGiaInput && tacGiaSuggestions) {
            setupAutocompleteWithNgoai(tacGiaInput, tacGiaSuggestions, "tacGiaNgoaiBB");
        }

        // Thành viên
        const thanhVienInput = document.getElementById("thanhVienInputBB");
        const thanhVienSuggestions = document.getElementById("thanhVienBB-suggestions");

        if (thanhVienInput && thanhVienSuggestions) {
            setupAutocompleteWithNgoai(thanhVienInput, thanhVienSuggestions, "thanhVienNgoaiBB");
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
                    if (checkboxId === "tacGiaNgoaiBB") {
                        // Thêm vào danh sách Tác giả chính
                        if (window.tacGiaListBB) {
                            window.tacGiaListBB.push(item.HoTen);
                            if (typeof updateTacGiaDisplayBB === 'function') {
                                updateTacGiaDisplayBB();
                            }
                        }
                    } else if (checkboxId === "thanhVienNgoaiBB") {
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
        const addMemberBtn = document.getElementById("addMemberBtnBB");
        const thanhVienInput = document.getElementById("thanhVienInputBB");
        const thanhVienDonVi = document.getElementById("thanhVienDonViBB");
        const thanhVienNgoai = document.getElementById("thanhVienNgoaiBB");

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
                    const isNgoai = document.getElementById("thanhVienNgoaiBB")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addMemberBtnBB");
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
        const addTacGiaBtn = document.getElementById("addTacGiaBtnBB");
        const tacGiaInput = document.getElementById("tacGiaChinhInputBB");
        const tacGiaDonVi = document.getElementById("tacGiaDonViBB");
        const tacGiaNgoai = document.getElementById("tacGiaNgoaiBB");

        if (addTacGiaBtn) {
            addTacGiaBtn.addEventListener("click", () => {
                const name = tacGiaInput.value.trim();
                const isNgoai = tacGiaNgoai && tacGiaNgoai.checked;
                const unit = isNgoai ? tacGiaDonVi.value.trim() : "";

                if (!name) return;

                const tacGia = unit ? `${name} - ${unit}` : name;
                if (window.tacGiaListBB) {
                    window.tacGiaListBB.push(tacGia);
                    if (typeof updateTacGiaDisplayBB === 'function') {
                        updateTacGiaDisplayBB();
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
                    const isNgoai = document.getElementById("tacGiaNgoaiBB")?.checked;
                    if (isNgoai) {
                        const addBtn = document.getElementById("addTacGiaBtnBB");
                        if (addBtn) addBtn.click();
                    }
                }
            });
        }
    }

    // =====================================================
    // EXPORTS
    // =====================================================

    window.BaiBao_Autocomplete = {
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
