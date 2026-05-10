const { BORDERS, COLOR, mergeAndStyle, richText } = require("./excel-style.utils");

const estimateWrappedRowHeight = (text, charsPerLine, lineHeight = 16) => {
  const normalized = text.replace(/\r\n/g, "\n");
  const explicitLines = normalized.split("\n");
  const visualLines = explicitLines.reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );
  return Math.max(lineHeight, visualLines * lineHeight);
};

const renderDocumentHeader = (sheet, header, startRow = 1, startCol = 1) => {
  const { totalCols } = header;
  const endCol = startCol + totalCols - 1;
  const midCol = Math.ceil(totalCols / 2);

  let row = startRow;

  mergeAndStyle(sheet, row, startCol, row, midCol - 1, header.leftTop, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
    fontSize: 12,
  });
  mergeAndStyle(sheet, row, midCol, row, endCol, header.rightTop, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
    fontSize: 12,
  });
  row += 1;

  mergeAndStyle(sheet, row, startCol, row, midCol - 1, header.leftSub, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
  });
  mergeAndStyle(sheet, row, midCol, row, endCol, header.rightSub, {
    bold: true,
    hAlign: "center",
    borders: BORDERS.noBorder(),
  });
  row += 1;

  if (header.dateLine) {
    mergeAndStyle(sheet, row, midCol, row, endCol, header.dateLine, {
      italic: true,
      hAlign: "center",
      borders: BORDERS.noBorder(),
    });
  }
  row += 1;

  row += 1;

  mergeAndStyle(sheet, row, startCol, row, endCol, header.title, {
    bold: true,
    hAlign: "center",
    wrapText: true,
    borders: BORDERS.noBorder(),
    fontSize: 14,
  });
  row += 1;

  mergeAndStyle(sheet, row, startCol, row, endCol, header.subtitle, {
    bold: true,
    hAlign: "center",
    wrapText: true,
    borders: BORDERS.noBorder(),
  });
  row += 1;

  if (header.legalNote) {
    sheet.getRow(row).height = estimateWrappedRowHeight(header.legalNote, 52, 18);
    mergeAndStyle(sheet, row, startCol, row, endCol, header.legalNote, {
      italic: true,
      fontColor: COLOR.RED,
      hAlign: "center",
      vAlign: "middle",
      wrapText: true,
      borders: BORDERS.noBorder(),
    });
    row += 1;
  }

  row += 1;

  if (header.personalFields?.length) {
    let i = 0;
    while (i < header.personalFields.length) {
      const field = header.personalFields[i];
      const isFieldHighlighted = field.highlightValue ?? false;

      if (field.fullWidth) {
        const cellValue = richText([
          { text: `${field.label} ` },
          { text: field.value, color: isFieldHighlighted ? COLOR.RED : COLOR.BLACK },
        ]);
        mergeAndStyle(sheet, row, startCol, row, endCol, cellValue, {
          hAlign: "left",
          borders: BORDERS.noBorder(),
        });
        i += 1;
      } else {
        const leftVal = richText([
          { text: `${field.label} ` },
          { text: field.value, color: isFieldHighlighted ? COLOR.RED : COLOR.BLACK },
        ]);
        mergeAndStyle(sheet, row, startCol, row, midCol - 1, leftVal, {
          hAlign: "left",
          borders: BORDERS.noBorder(),
        });

        const next = header.personalFields[i + 1];
        if (next && !next.fullWidth) {
          const isNextHighlighted = next.highlightValue ?? false;
          const rightVal = richText([
            { text: `${next.label} ` },
            { text: next.value, color: isNextHighlighted ? COLOR.RED : COLOR.BLACK },
          ]);
          mergeAndStyle(sheet, row, midCol, row, endCol, rightVal, {
            hAlign: "left",
            borders: BORDERS.noBorder(),
          });
          i += 2;
        } else {
          i += 1;
        }
      }
      row += 1;
    }
  }

  return row;
};

module.exports = {
  renderDocumentHeader,
};
