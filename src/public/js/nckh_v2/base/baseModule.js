/**
 * NCKH V2 - Base Index (Entry Point)
 * Common initialization for all NCKH modules
 * Date: 2026-01-20
 */

(function () {
    'use strict';

    /**
     * Creates a base module initializer
     * @param {Object} config - Configuration object
     * @param {string} config.tabName - Tab name
     * @param {Object} config.form - Form component (from createBaseForm)
     * @param {Object} config.grid - Grid component (from createBaseGrid)
     * @param {Object} config.modal - Modal component (from createBaseModal)
     * @param {Object} config.autocomplete - Autocomplete component (from createBaseAutocomplete)
     * @param {string} config.formPanelId - ID of form panel (for permission check)
     * @param {Function} config.onInit - Custom initialization callback
     */
    function createBaseModule(config) {
        const {
            tabName,
            form,
            grid,
            modal,
            autocomplete,
            formPanelId,
            onInit
        } = config;

        const nckhConfig = NCKH_V2_Utils.getNCKHConfig(tabName);

        // =====================================================
        // INITIALIZATION
        // =====================================================

        async function init() {
            console.log(`[BaseModule] Initializing ${tabName} module...`);

            // Wait for DOM
            if (document.readyState !== 'loading') {
                await doInit();
            } else {
                document.addEventListener('DOMContentLoaded', doInit);
            }
        }

        async function doInit() {
            try {
                // Load giáo viên cơ hữu
                await NCKH_V2_Utils.loadGiangVienCoHuu();

                // Setup year selects
                setupYearSelects();

                // Initialize components
                if (form) {
                    form.init();
                }

                if (autocomplete) {
                    autocomplete.setup();
                }

                // Setup tabs
                setupTabs();

                // Hide form tab if view-only
                if (formPanelId) {
                    NCKH_V2_Utils.hideFormTabIfViewOnly(formPanelId);
                }

                // Load initial data
                if (grid) {
                    await grid.loadTableData();
                }

                // Custom init callback
                if (onInit) {
                    await onInit();
                }

                console.log(`[BaseModule] ${tabName} initialized successfully`);
            } catch (error) {
                console.error(`[BaseModule] Error initializing ${tabName}:`, error);
            }
        }

        // =====================================================
        // YEAR SELECTS SETUP
        // =====================================================

        function setupYearSelects() {
            const namHocForm = document.getElementById('namHocForm');
            const namHocXem = document.getElementById('namHocXem');

            if (namHocForm) {
                NCKH_V2_Utils.populateYearSelect(namHocForm);
            }

            if (namHocXem) {
                NCKH_V2_Utils.populateYearSelect(namHocXem);

                // Add change event to reload data
                namHocXem.addEventListener('change', () => {
                    if (grid) {
                        grid.loadTableData();
                    }
                });
            }
        }

        // =====================================================
        // TABS SETUP
        // =====================================================

        function setupTabs() {
            const subTabBtns = document.querySelectorAll('.sub-tab-btn');

            subTabBtns.forEach(btn => {
                btn.addEventListener('click', function () {
                    const targetPanel = this.dataset.panel;

                    // Remove active from all buttons
                    subTabBtns.forEach(b => b.classList.remove('active'));

                    // Add active to clicked button
                    this.classList.add('active');

                    // Hide all panels
                    document.querySelectorAll('.sub-tab-panel').forEach(panel => {
                        panel.classList.remove('active');
                    });

                    // Show target panel
                    const panel = document.getElementById(targetPanel);
                    if (panel) {
                        panel.classList.add('active');

                        // Reload grid when switching to table panel
                        if (targetPanel.includes('table') && grid) {
                            grid.loadTableData();
                        }
                    }
                });
            });
        }

        // =====================================================
        // SEARCH SETUP
        // =====================================================

        function setupSearch() {
            const searchBtn = document.getElementById('searchBtn');
            const searchBtnIcon = document.getElementById('searchBtnIcon');

            const handleSearch = () => {
                if (grid) {
                    grid.loadTableData();
                }
            };

            if (searchBtn) {
                searchBtn.addEventListener('click', handleSearch);
            }

            if (searchBtnIcon) {
                searchBtnIcon.addEventListener('click', handleSearch);
            }
        }

        // =====================================================
        // PUBLIC API
        // =====================================================

        return {
            init,
            setupYearSelects,
            setupTabs,
            setupSearch,
            getConfig: () => nckhConfig,
            getComponents: () => ({ form, grid, modal, autocomplete })
        };
    }

    // Export
    window.NCKH_V2_BaseModule = {
        createBaseModule
    };

})();
