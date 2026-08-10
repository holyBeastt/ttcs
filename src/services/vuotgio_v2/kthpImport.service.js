"use strict";

const KthpImportOrchestrator = require("./kthp-import/kthpImport.orchestrator");

const orchestrator = new KthpImportOrchestrator();

const preview = (params) => orchestrator.preview(params);
const commit = (params) => orchestrator.commit(params);
const getPreviewContext = (previewToken, actor) =>
    orchestrator.getPreviewContext(previewToken, actor);

module.exports = {
    preview,
    commit,
    getPreviewContext,
    orchestrator,
};
