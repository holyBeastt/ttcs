const ExcelJS = require("exceljs");

const COLOR = {
  WHITE: "FFFFFFFF",
  BLACK: "FF000000",
  RED: "FFFF0000",
  DARK_RED: "FFC00000",
  BLUE: "FF0070C0",
  BLUE_DARK: "FF17375E",
  HEADER_BG: "FFD9D9D9",
  SUBTOTAL_BG: "FFFFF2CC",
  GRAND_TOTAL_BG: "FFFFE699",
  FINAL_TOTAL_BG: "FFFFD966",
  SUMMARY_BG: "FFDCE6F1",
  STATS_HEADER_BG: "FFD9E1F2",
  BORDER: "FF000000",
};

const thin = () => ({ style: "thin", color: { argb: COLOR.BORDER } });
const medium = () => ({ style: "medium", color: { argb: COLOR.BORDER } });

const BORDERS = {
  allThin: () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() }),
  allMedium: () => ({ top: medium(), bottom: medium(), left: medium(), right: medium() }),
  topBottomMedium: () => ({ top: medium(), bottom: medium(), left: thin(), right: thin() }),
  noBorder: () => ({}),
  bottomOnly: () => ({ bottom: thin() }),
  bottomMedium: () => ({ bottom: medium() }),
};

const styleCell = (cell, opts = {}) => {
  const {
    bgColor,
    fontColor = COLOR.BLACK,
    bold = false,
    italic = false,
    fontSize = 12,
    hAlign = "center",
    vAlign = "middle",
    wrapText = true,
    borders = BORDERS.allThin(),
    fontName = "Times New Roman",
    underline = false,
  } = opts;

  if (bgColor) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  }
  cell.font = {
    name: fontName,
    size: fontSize,
    bold,
    italic,
    color: { argb: fontColor },
    underline,
  };
  cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText };
  cell.border = borders;
};

const mergeAndStyle = (sheet, r1, c1, r2, c2, value, opts = {}) => {
  if (r1 !== r2 || c1 !== c2) sheet.mergeCells(r1, c1, r2, c2);
  const cell = sheet.getCell(r1, c1);
  cell.value = value;
  styleCell(cell, opts);
  return cell;
};

const colLetter = (col) => {
  let r = "";
  let current = col;
  while (current > 0) {
    const rem = (current - 1) % 26;
    r = String.fromCharCode(65 + rem) + r;
    current = Math.floor((current - 1) / 26);
  }
  return r;
};

const cellAddr = (row, col) => `${colLetter(col)}${row}`;

const sumFormula = (cells) => `SUM(${cells.join(",")})`;

const richText = (parts) => ({
  richText: parts.map((p) => ({
    text: p.text,
    font: {
      name: "Times New Roman",
      size: p.fontSize ?? 12,
      bold: p.bold ?? false,
      italic: p.italic ?? false,
      color: { argb: p.color ?? COLOR.BLACK },
    },
  })),
});

module.exports = {
  COLOR,
  BORDERS,
  styleCell,
  mergeAndStyle,
  colLetter,
  cellAddr,
  sumFormula,
  richText,
  ExcelJS,
};
