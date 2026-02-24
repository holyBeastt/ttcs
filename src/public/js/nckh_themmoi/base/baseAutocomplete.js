/**
 * NCKH V2 - Base Autocomplete Component
 * Reusable autocomplete handling for all NCKH types
 * Date: 2026-01-20
 */

(function () {
    'use strict';

    /**
     * Creates a base autocomplete handler for NCKH modules
     * @param {Object} config - Configuration object
     * @param {string} config.inputId - ID of main input element
     * @param {string} config.suggestionContainerId - ID of suggestion container
     * @param {string} config.memberListContainerId - ID of member list container
     * @param {string} config.externalCheckboxId - ID of "Ngoài học viện" checkbox
     * @param {string} config.unitInputId - ID of unit input (for external members)
     */
    function createBaseAutocomplete(config) {
        const {
            inputId,
            suggestionContainerId,
            memberListContainerId,
            externalCheckboxId,
            unitInputId
        } = config;

        let memberList = [];

        // =====================================================
        // SETUP AUTOCOMPLETE
        // =====================================================

        function setup() {
            const input = document.getElementById(inputId);
            const suggestionContainer = document.getElementById(suggestionContainerId);

            if (!input || !suggestionContainer) {
                console.warn(`[BaseAutocomplete] Elements not found: ${inputId}, ${suggestionContainerId}`);
                return;
            }

            // Setup autocomplete
            NCKH_V2_Utils.setupAutocomplete(input, suggestionContainer, (selectedItem) => {
                // Callback when item selected
                console.log('[BaseAutocomplete] Selected:', selectedItem);
            });

            // Setup external checkbox if provided
            if (externalCheckboxId) {
                setupExternalCheckbox();
            }
        }

        // =====================================================
        // EXTERNAL CHECKBOX HANDLING
        // =====================================================

        function setupExternalCheckbox() {
            const checkbox = document.getElementById(externalCheckboxId);
            const unitInput = document.getElementById(unitInputId);
            const suggestionContainer = document.getElementById(suggestionContainerId);

            if (!checkbox) return;

            checkbox.addEventListener('change', () => {
                const isExternal = checkbox.checked;

                if (unitInput) {
                    unitInput.disabled = !isExternal;
                    if (isExternal) {
                        unitInput.style.display = 'block';
                    } else {
                        unitInput.style.display = 'none';
                        unitInput.value = '';
                    }
                }

                // Hide suggestions when external is checked
                if (isExternal && suggestionContainer) {
                    suggestionContainer.style.display = 'none';
                } else if (suggestionContainer) {
                    suggestionContainer.style.display = 'block';
                }
            });
        }

        // =====================================================
        // MEMBER LIST MANAGEMENT
        // =====================================================

        function addMember(name, unit = '') {
            if (!name || name.trim() === '') return false;

            const fullName = unit ? `${name.trim()} - ${unit.trim()}` : name.trim();

            // Check duplicate
            if (memberList.includes(fullName)) {
                NCKH_V2_Utils.showErrorToast('Thành viên đã tồn tại trong danh sách');
                return false;
            }

            memberList.push(fullName);
            renderMemberList();
            return true;
        }

        function removeMember(index) {
            if (index >= 0 && index < memberList.length) {
                memberList.splice(index, 1);
                renderMemberList();
            }
        }

        function getMemberList() {
            return [...memberList];
        }

        function clearMemberList() {
            memberList = [];
            renderMemberList();
        }

        function renderMemberList() {
            const container = document.getElementById(memberListContainerId);
            if (!container) return;

            container.innerHTML = '';

            memberList.forEach((member, index) => {
                const tag = document.createElement('div');
                tag.className = 'member-tag';
                tag.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    background: #e9ecef;
                    border-radius: 4px;
                    padding: 4px 8px;
                    margin: 2px 4px 2px 0;
                    font-size: 13px;
                `;

                tag.innerHTML = `
                    <span style="margin-right: 6px;">${member}</span>
                    <button type="button" 
                            class="btn-remove-member" 
                            style="background: none; border: none; cursor: pointer; color: #dc3545; font-size: 14px; padding: 0 2px;"
                            data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                // Attach remove handler
                tag.querySelector('.btn-remove-member').addEventListener('click', () => {
                    removeMember(index);
                });

                container.appendChild(tag);
            });
        }

        // =====================================================
        // ADD MEMBER FROM INPUT
        // =====================================================

        function addMemberFromInput() {
            const input = document.getElementById(inputId);
            const unitInput = document.getElementById(unitInputId);
            const externalCheckbox = document.getElementById(externalCheckboxId);

            if (!input) return false;

            const name = input.value.trim();
            if (!name) {
                NCKH_V2_Utils.showErrorToast('Vui lòng nhập tên thành viên');
                return false;
            }

            const isExternal = externalCheckbox && externalCheckbox.checked;
            const unit = isExternal && unitInput ? unitInput.value.trim() : '';

            if (isExternal && !unit) {
                NCKH_V2_Utils.showErrorToast('Vui lòng nhập đơn vị công tác');
                return false;
            }

            const success = addMember(name, unit);

            if (success) {
                input.value = '';
                if (unitInput) unitInput.value = '';
            }

            return success;
        }

        // =====================================================
        // PUBLIC API
        // =====================================================

        return {
            setup,
            addMember,
            addMemberFromInput,
            removeMember,
            getMemberList,
            clearMemberList,
            renderMemberList
        };
    }

    // Export
    window.NCKH_V2_BaseAutocomplete = {
        createBaseAutocomplete
    };

})();
