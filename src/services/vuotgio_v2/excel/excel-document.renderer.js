const { renderDocumentHeader } = require("./excel-header.renderer");
const { renderBlockGroups } = require("./excel-block.renderer");
const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("./excel-global-layout.config");

const renderDocument = (sheet, doc, startRow = 1, startCol = 1, renderOptions = {}) => {
  let row = startRow;

  row = renderDocumentHeader(sheet, doc.header, row, startCol);

  row += 1;

  const results = renderBlockGroups(
    sheet,
    doc.groups,
    row,
    startCol,
    doc.rowGap ?? 0,
    EXCEL_GLOBAL_BLOCKS_LAYOUT,
    renderOptions,
  );
  if (results.length) {
    row = results[results.length - 1].nextRow;
  }

  row += 1;

  return row;
};

module.exports = {
  renderDocument,
};
