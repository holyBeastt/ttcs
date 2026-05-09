const {
  BORDERS,
  COLOR,
  cellAddr,
  mergeAndStyle,
  richText,
  styleCell,
  sumFormula,
} = require("./excel-style.utils");

const DEFAULT_RENDER_OPTIONS = {
  useFormulas: true,
  codeSeparator: ".",
  sectionNumbering: false,
  sectionSubtotalGap: 1,
};

const numericColIndexes = (columns) => {
  const explicit = columns
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.includeInSubtotal)
    .map((x) => x.i);
  if (explicit.length) return explicit;

  const marked = columns
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.isNumeric)
    .map((x) => x.i);
  return marked.length ? marked : [columns.length - 1];
};

const numericNumFmt = (column) => {
  if (!column || !column.isNumeric) return undefined;
  const decimals = Math.max(0, column.numericFormat?.decimalPlaces ?? 2);
  const useThousands = column.numericFormat?.useThousandsSeparator ?? true;
  const intPart = useThousands ? "#,##0" : "0";
  return decimals === 0 ? intPart : `${intPart}.${"0".repeat(decimals)}`;
};

const columnTextColor = (column, fallback) => (column?.highlightColumn ? COLOR.RED : fallback);

const alphaCode = (index) => {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};

const stripLeadingHierarchyCode = (label) =>
  label.replace(/^\s*(?:[A-Z](?:\.\d+)+\.?|[A-Z]\.|[0-9]+(?:\.\d+)+\.?|[IVXLCDM]+\.)\s+/i, "").trimStart();

const applyGroupOutlineBorder = (sheet, startRow, endRow, startCol, endCol) => {
  const medium = { style: "medium", color: { argb: COLOR.BORDER } };

  for (let col = startCol; col <= endCol; col += 1) {
    const topCell = sheet.getCell(startRow, col);
    topCell.border = { ...(topCell.border ?? {}), top: medium };

    const bottomCell = sheet.getCell(endRow, col);
    bottomCell.border = { ...(bottomCell.border ?? {}), bottom: medium };
  }

  for (let row = startRow; row <= endRow; row += 1) {
    const leftCell = sheet.getCell(row, startCol);
    leftCell.border = { ...(leftCell.border ?? {}), left: medium };

    const rightCell = sheet.getCell(row, endCol);
    rightCell.border = { ...(rightCell.border ?? {}), right: medium };
  }
};

const normalizeColumns = (columns, layout) => {
  const totalCols = Math.max(2, layout.totalCols);
  const normalized = Array.from({ length: totalCols }, () => ({ label: "" }));

  const first = columns[0];
  const last = columns.length > 1 ? columns[columns.length - 1] : undefined;
  const middle = columns.slice(1, -1);

  if (first) normalized[0] = { ...first };
  if (last) normalized[totalCols - 1] = { ...last };

  const middleSlots = Math.max(0, totalCols - 2);
  for (let i = 0; i < Math.min(middle.length, middleSlots); i += 1) {
    normalized[i + 1] = { ...middle[i] };
  }

  normalized.forEach((col, index) => {
    const widthFromConfig = layout.colWidths?.[index];
    if (widthFromConfig !== undefined) {
      col.width = widthFromConfig;
    }
  });

  return normalized;
};

const normalizeRowCells = (cells, totalCols) => {
  const normalized = Array.from({ length: totalCols }, () => "");
  if (!cells.length) return normalized;

  normalized[0] = cells[0] ?? "";
  if (cells.length > 1) {
    normalized[totalCols - 1] = cells[cells.length - 1] ?? "";
  }

  const middleInput = cells.slice(1, -1);
  const middleSlots = Math.max(0, totalCols - 2);
  for (let i = 0; i < Math.min(middleInput.length, middleSlots); i += 1) {
    normalized[i + 1] = middleInput[i] ?? "";
  }

  return normalized;
};

const normalizeSection = (section, totalCols) => ({
  ...section,
  rows: section.rows.map((row) => ({ ...row, cells: normalizeRowCells(row.cells, totalCols) })),
});

const normalizeBlock = (block, layout) => {
  const columns = normalizeColumns(block.columns, layout);
  const totalCols = columns.length;
  const lastColIndex = totalCols - 1;

  return {
    ...block,
    columns,
    sections: block.sections.map((section) => {
      const normalizedSection = normalizeSection(section, totalCols);
      if (normalizedSection.subtotalColIndex !== undefined && normalizedSection.subtotalColIndex >= totalCols) {
        normalizedSection.subtotalColIndex = lastColIndex;
      }
      if (normalizedSection.subtotalColIndexes?.length) {
        normalizedSection.subtotalColIndexes = normalizedSection.subtotalColIndexes.filter(
          (index) => index >= 0 && index < totalCols,
        );
        if (!normalizedSection.subtotalColIndexes.length) {
          normalizedSection.subtotalColIndexes = [lastColIndex];
        }
      }
      return normalizedSection;
    }),
    grandTotal: block.grandTotal
      ? {
          ...block.grandTotal,
          colIndex:
            block.grandTotal.colIndex !== undefined && block.grandTotal.colIndex < totalCols
              ? block.grandTotal.colIndex
              : lastColIndex,
          colIndexes: block.grandTotal.colIndexes?.filter((index) => index >= 0 && index < totalCols),
        }
      : undefined,
    finalTotal: block.finalTotal
      ? {
          ...block.finalTotal,
          colIndex:
            block.finalTotal.colIndex !== undefined && block.finalTotal.colIndex < totalCols
              ? block.finalTotal.colIndex
              : lastColIndex,
          colIndexes: block.finalTotal.colIndexes?.filter((index) => index >= 0 && index < totalCols),
        }
      : undefined,
  };
};

const applyColumnWidths = (sheet, columns, startCol = 1) => {
  columns.forEach((col, i) => {
    sheet.getColumn(startCol + i).width = col.width ?? 20;
  });
};

const renderBlockTitle = (ctx, block, startCol = 1) => {
  const { title } = block;
  if (!title) return;
  const { sheet, colCount } = ctx;
  const endCol = startCol + colCount - 1;

  let cellValue;
  if (title.annotation) {
    cellValue = richText([
      { text: `${title.label} `, bold: true, italic: true },
      { text: title.annotation, italic: true, color: COLOR.RED },
    ]);
  } else {
    cellValue = title.label;
  }

  sheet.getRow(ctx.currentRow);
  mergeAndStyle(sheet, ctx.currentRow, startCol, ctx.currentRow, endCol, cellValue, {
    bold: true,
    italic: true,
    hAlign: "left",
    borders: BORDERS.noBorder(),
  });
  ctx.currentRow += 1;

  if (title.bulletLines) {
    for (const line of title.bulletLines) {
      mergeAndStyle(sheet, ctx.currentRow, startCol, ctx.currentRow, endCol, line.text, {
        fontColor: line.color ?? COLOR.RED,
        italic: true,
        hAlign: "left",
        borders: BORDERS.noBorder(),
      });
      ctx.currentRow += 1;
    }
  }
};

const renderGroupTitle = (ctx, title, startCol = 1) => {
  const { sheet, colCount } = ctx;
  const endCol = startCol + colCount - 1;

  let cellValue;
  if (title.annotation) {
    cellValue = richText([
      { text: `${title.label} `, bold: true },
      { text: title.annotation, italic: true, color: COLOR.RED },
    ]);
  } else {
    cellValue = title.label;
  }

  sheet.getRow(ctx.currentRow);
  mergeAndStyle(sheet, ctx.currentRow, startCol, ctx.currentRow, endCol, cellValue, {
    bold: true,
    hAlign: "left",
    borders: BORDERS.noBorder(),
    fontSize: 12,
  });
  ctx.currentRow += 1;
};

const renderHeaderRow = (ctx, columns, startCol = 1) => {
  const { sheet, currentRow } = ctx;
  sheet.getRow(currentRow);
  columns.forEach((col, i) => {
    const cell = sheet.getCell(currentRow, startCol + i);
    cell.value = col.label;
    styleCell(cell, {
      bgColor: COLOR.HEADER_BG,
      fontColor: columnTextColor(col, COLOR.BLACK),
      bold: true,
      hAlign: "center",
      vAlign: "middle",
      wrapText: true,
    });
  });
  ctx.currentRow += 1;
};

const renderSectionHeader = (ctx, section, startCol = 1) => {
  if (!section.label) {
    return;
  }
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;

  let cellValue;
  if (section.annotation) {
    cellValue = richText([
      { text: `${section.label} `, italic: true },
      { text: section.annotation, italic: true, color: COLOR.RED },
    ]);
  } else {
    cellValue = section.label;
  }

  mergeAndStyle(sheet, currentRow, startCol, currentRow, endCol, cellValue, {
    bgColor: COLOR.WHITE,
    italic: true,
    hAlign: "left",
    vAlign: "middle",
  });
  ctx.currentRow += 1;
};

const renderDataRows = (ctx, rows, columns, startCol = 1) => {
  const { sheet } = ctx;
  const renderedRows = [];

  const safeRows = rows.length
    ? rows
    : [
        {
          cells: Array.from({ length: columns.length }, () => ""),
        },
      ];

  safeRows.forEach((row) => {
    const excelRow = ctx.currentRow;
    renderedRows.push(excelRow);

    columns.forEach((colDef, i) => {
      const col = startCol + i;
      const cell = sheet.getCell(excelRow, col);
      cell.value = row.cells[i] ?? null;

      const colNumFmt = numericNumFmt(colDef);
      if (colNumFmt) {
        cell.numFmt = colNumFmt;
      }

      styleCell(cell, {
        bgColor: COLOR.WHITE,
        fontColor: columnTextColor(colDef, row.fontColor ?? COLOR.BLACK),
        hAlign: colDef.align ?? "center",
      });

      if (colDef.validation?.length) {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`\"${colDef.validation.join(",")}\"`],
          showErrorMessage: true,
          errorTitle: "Giá trị không hợp lệ",
          error: `Chỉ được chọn: ${colDef.validation.join(", ")}`,
        };
      }
    });

    ctx.currentRow += 1;
  });

  return renderedRows;
};

const sumValues = (sheet, rowNumbers, colNumber) => {
  let total = 0;
  rowNumbers.forEach((row) => {
    const value = sheet.getCell(row, colNumber).value;
    if (typeof value === "number") {
      total += value;
    } else if (value && typeof value === "object" && typeof value.result === "number") {
      total += value.result;
    }
  });
  return total;
};

const evalFormula = (sheet, formula) => {
  if (!formula || typeof formula !== "string") return 0;
  const trimmed = formula.trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("SUM(")) {
    const inner = trimmed.slice(4, -1);
    const refs = inner.split(",").map((s) => s.trim()).filter(Boolean);
    return refs.reduce((sum, ref) => sum + evalFormula(sheet, ref), 0);
  }
  const cell = sheet.getCell(trimmed);
  const value = cell.value;
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.result === "number") return value.result;
  return 0;
};

const renderSubtotalRow = (
  ctx,
  label,
  dataRowNumbers,
  sumColIndexes,
  columns,
  startCol = 1,
  renderOptions = DEFAULT_RENDER_OPTIONS,
) => {
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;
  const firstSumColExcel = startCol + Math.min(...sumColIndexes);
  const labelEndCol = firstSumColExcel > startCol ? firstSumColExcel - 1 : startCol;

  mergeAndStyle(sheet, currentRow, startCol, currentRow, labelEndCol, label, {
    bgColor: COLOR.SUBTOTAL_BG,
    hAlign: "center",
  });

  const sumColsExcel = new Set(sumColIndexes.map((i) => startCol + i));
  sumColIndexes.forEach((idx) => {
    const sumColExcel = startCol + idx;
    const cell = sheet.getCell(currentRow, sumColExcel);
    if (renderOptions.useFormulas) {
      const sumCells = dataRowNumbers.map((r) => cellAddr(r, sumColExcel));
      cell.value = { formula: sumFormula(sumCells) };
    } else {
      cell.value = sumValues(sheet, dataRowNumbers, sumColExcel);
    }
    cell.numFmt = numericNumFmt(columns?.[idx]) ?? "#,##0.00";
    styleCell(cell, {
      bgColor: COLOR.SUBTOTAL_BG,
      fontColor: columnTextColor(columns?.[idx], COLOR.BLUE),
      bold: true,
      hAlign: "center",
    });
  });

  for (let c = firstSumColExcel; c <= endCol; c += 1) {
    if (!sumColsExcel.has(c)) {
      styleCell(sheet.getCell(currentRow, c), { bgColor: COLOR.SUBTOTAL_BG });
    }
  }

  const subtotalRow = ctx.currentRow;
  ctx.currentRow += 1;
  return subtotalRow;
};

const renderGrandTotalRow = (
  ctx,
  label,
  subtotalRowNumbers,
  sumColIndexes,
  columns,
  startCol = 1,
  renderOptions = DEFAULT_RENDER_OPTIONS,
) => {
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;
  const firstSumColExcel = startCol + Math.min(...sumColIndexes);
  const labelEndCol = firstSumColExcel > startCol ? firstSumColExcel - 1 : startCol;

  mergeAndStyle(sheet, currentRow, startCol, currentRow, labelEndCol, label, {
    bgColor: COLOR.GRAND_TOTAL_BG,
    bold: true,
    hAlign: "center",
    borders: BORDERS.topBottomMedium(),
  });

  const sumColsExcel = new Set(sumColIndexes.map((i) => startCol + i));
  sumColIndexes.forEach((idx) => {
    const sumColExcel = startCol + idx;
    const cell = sheet.getCell(currentRow, sumColExcel);
    if (renderOptions.useFormulas) {
      const sumCells = subtotalRowNumbers.map((r) => cellAddr(r, sumColExcel));
      cell.value = { formula: sumFormula(sumCells) };
    } else {
      cell.value = sumValues(sheet, subtotalRowNumbers, sumColExcel);
    }
    cell.numFmt = numericNumFmt(columns?.[idx]) ?? "#,##0.00";
    styleCell(cell, {
      bgColor: COLOR.GRAND_TOTAL_BG,
      fontColor: columnTextColor(columns?.[idx], COLOR.BLUE),
      bold: true,
      hAlign: "center",
      borders: BORDERS.topBottomMedium(),
    });
  });

  for (let c = firstSumColExcel; c <= endCol; c += 1) {
    if (!sumColsExcel.has(c)) {
      styleCell(sheet.getCell(currentRow, c), {
        bgColor: COLOR.GRAND_TOTAL_BG,
        borders: BORDERS.topBottomMedium(),
      });
    }
  }

  const row = ctx.currentRow;
  ctx.currentRow += 1;
  return row;
};

const renderFinalTotalRow = (
  ctx,
  label,
  sumColIndexes,
  values = [],
  externalFormulaCells = [],
  columns,
  startCol = 1,
  renderOptions = DEFAULT_RENDER_OPTIONS,
) => {
  const { sheet, currentRow, colCount } = ctx;
  const endCol = startCol + colCount - 1;
  const firstSumColExcel = startCol + Math.min(...sumColIndexes);
  const labelEndCol = firstSumColExcel > startCol ? firstSumColExcel - 1 : startCol;

  mergeAndStyle(sheet, currentRow, startCol, currentRow, labelEndCol, label, {
    bgColor: COLOR.FINAL_TOTAL_BG,
    bold: true,
    hAlign: "center",
    borders: BORDERS.allMedium(),
  });

  const sumColsExcel = new Set(sumColIndexes.map((i) => startCol + i));
  sumColIndexes.forEach((idx, arrIdx) => {
    const sumColExcel = startCol + idx;
    const cell = sheet.getCell(currentRow, sumColExcel);
    const extCell = externalFormulaCells[arrIdx];
    if (renderOptions.useFormulas) {
      if (extCell) {
        cell.value = { formula: extCell };
      } else {
        cell.value = values[arrIdx] ?? null;
      }
    } else if (extCell) {
      cell.value = evalFormula(sheet, extCell);
    } else {
      cell.value = values[arrIdx] ?? null;
    }
    cell.numFmt = numericNumFmt(columns?.[idx]) ?? "#,##0.00";
    styleCell(cell, {
      bgColor: COLOR.FINAL_TOTAL_BG,
      fontColor: columnTextColor(columns?.[idx], COLOR.DARK_RED),
      bold: true,
      hAlign: "center",
      borders: BORDERS.allMedium(),
    });
  });

  for (let c = firstSumColExcel; c <= endCol; c += 1) {
    if (!sumColsExcel.has(c)) {
      styleCell(sheet.getCell(currentRow, c), { bgColor: COLOR.FINAL_TOTAL_BG, borders: BORDERS.allMedium() });
    }
  }

  const row = ctx.currentRow;
  ctx.currentRow += 1;
  return row;
};

const renderBlock = (sheet, block, startRow = 1, startCol = 1, layout, numbering, renderOptions = {}) => {
  const options = { ...DEFAULT_RENDER_OPTIONS, ...renderOptions };
  const normalizedBlock = normalizeBlock(block, layout);
  const colCount = normalizedBlock.columns.length;
  const ctx = { sheet, currentRow: startRow, colCount };

  const defaultSumCols = numericColIndexes(normalizedBlock.columns);

  const resolvedTitle = (() => {
    if (!numbering || numbering.prefixBlockTitle === false || normalizedBlock.disableTitlePrefix) return normalizedBlock.title;
    const base = normalizedBlock.title ? stripLeadingHierarchyCode(normalizedBlock.title.label) : "";
    const label = base ? `${numbering.blockCode}${options.codeSeparator}${base}` : numbering.blockCode;
    return {
      ...(normalizedBlock.title ?? {}),
      label,
    };
  })();

  applyColumnWidths(sheet, normalizedBlock.columns, startCol);
  renderBlockTitle(ctx, { ...normalizedBlock, title: resolvedTitle }, startCol);
  renderHeaderRow(ctx, normalizedBlock.columns, startCol);

  const subtotalRows = [];
  const sectionCodes = [];

  for (let sectionIndex = 0; sectionIndex < normalizedBlock.sections.length; sectionIndex += 1) {
    const section = normalizedBlock.sections[sectionIndex];
    const sectionCode = numbering && options.sectionNumbering
      ? `${numbering.sectionBaseCode ?? numbering.blockCode}.${sectionIndex + 1}`
      : undefined;
    const resolvedSection = sectionCode
      ? { ...section, label: `${sectionCode}${options.codeSeparator}${stripLeadingHierarchyCode(section.label)}` }
      : section;

    if (sectionCode) {
      sectionCodes.push(sectionCode);
    }

    renderSectionHeader(ctx, resolvedSection, startCol);
    const dataRows = renderDataRows(ctx, section.rows, normalizedBlock.columns, startCol);

    if (options.sectionSubtotalGap > 0) {
      ctx.currentRow += options.sectionSubtotalGap;
    }

    const sumCols =
      section.subtotalColIndexes ??
      (section.subtotalColIndex !== undefined ? [section.subtotalColIndex] : defaultSumCols);
    const subtotalLabel = section.subtotalLabel ?? (sectionCode ? `Tổng ${sectionCode}` : "Tổng cộng");
    const subtotalRow = renderSubtotalRow(
      ctx,
      subtotalLabel,
      dataRows,
      sumCols,
      normalizedBlock.columns,
      startCol,
      options,
    );
    subtotalRows.push(subtotalRow);
  }

  let grandTotalRow;
  if (!numbering?.suppressGrandTotalRow) {
    const blockSumCols =
      normalizedBlock.grandTotal?.colIndexes ??
      (normalizedBlock.grandTotal?.colIndex !== undefined ? [normalizedBlock.grandTotal.colIndex] : defaultSumCols);
    const blockTotalLabel =
      normalizedBlock.grandTotal?.label ??
      (numbering && sectionCodes.length ? `Tổng ${numbering.blockCode} = ${sectionCodes.join(" + ")}` : "Tổng block");
    grandTotalRow = renderGrandTotalRow(
      ctx,
      blockTotalLabel,
      subtotalRows,
      blockSumCols,
      normalizedBlock.columns,
      startCol,
      options,
    );
  }

  let finalTotalRow;
  if (normalizedBlock.finalTotal) {
    const sumCols =
      normalizedBlock.finalTotal.colIndexes ??
      (normalizedBlock.finalTotal.colIndex !== undefined ? [normalizedBlock.finalTotal.colIndex] : defaultSumCols);
    const finalTotalLabel = normalizedBlock.finalTotal.label ?? (numbering ? `Tổng ${numbering.blockCode}` : "Tổng block");
    const hasManualFinal =
      (normalizedBlock.finalTotal.values?.length ?? 0) > 0 ||
      (normalizedBlock.finalTotal.externalFormulaCells?.length ?? 0) > 0;

    let externalFormulaCells = normalizedBlock.finalTotal.externalFormulaCells ?? [];
    if (!hasManualFinal) {
      externalFormulaCells = sumCols.map((idx) => {
        const refs = subtotalRows.map((r) => cellAddr(r, startCol + idx));
        if (!refs.length) return "";
        return refs.length === 1 ? refs[0] : sumFormula(refs);
      });
    }

    finalTotalRow = renderFinalTotalRow(
      ctx,
      finalTotalLabel,
      sumCols,
      normalizedBlock.finalTotal.values ?? [],
      externalFormulaCells,
      normalizedBlock.columns,
      startCol,
      options,
    );
  }

  return {
    subtotalRows,
    grandTotalRow,
    finalTotalRow,
    nextRow: ctx.currentRow,
    blockCode: numbering?.blockCode,
    sectionCodes,
  };
};

const renderBlocks = (sheet, blocks, startRow = 1, startCol = 1, rowGap = 0, layout, renderOptions = {}) => {
  const results = [];
  let currentRow = startRow;
  for (let i = 0; i < blocks.length; i += 1) {
    const result = renderBlock(sheet, blocks[i], currentRow, startCol, layout, undefined, renderOptions);
    results.push(result);
    currentRow = result.nextRow + (i < blocks.length - 1 ? rowGap : 0);
  }
  return results;
};

const renderBlockGroups = (sheet, groups, startRow = 1, startCol = 1, rowGap = 0, layout, renderOptions = {}) => {
  const options = { ...DEFAULT_RENDER_OPTIONS, ...renderOptions };
  const allResults = [];
  let currentRow = startRow;
  const groupMetas = [];

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const groupCode = alphaCode(i);
    const hasMultipleBlocks = group.blocks.length > 1;
    const groupStartRow = currentRow;

    if (group.title) {
      const groupTitle = group.disableTitlePrefix
        ? group.title
        : {
            ...group.title,
            label: `${groupCode}${options.codeSeparator}${stripLeadingHierarchyCode(group.title.label)}`,
          };
      const groupCtx = { sheet, currentRow, colCount: layout.totalCols };
      renderGroupTitle(groupCtx, groupTitle, startCol);
      currentRow = groupCtx.currentRow;
    } else {
      const groupCtx = { sheet, currentRow, colCount: layout.totalCols };
      renderGroupTitle(groupCtx, { label: `${groupCode}${options.codeSeparator}` }, startCol);
      currentRow = groupCtx.currentRow;
    }

    const blockResults = [];
    for (let blockIndex = 0; blockIndex < group.blocks.length; blockIndex += 1) {
      const blockCode = hasMultipleBlocks ? `${groupCode}.${blockIndex + 1}` : groupCode;
      const block = group.blocks[blockIndex];
      const suppressBlockGrandTotalRow =
        (!hasMultipleBlocks && Boolean(group.finalTotal)) ||
        (block.sections.length === 1 && !block.finalTotal) ||
        Boolean(block.finalTotal);

      const result = renderBlock(
        sheet,
        block,
        currentRow,
        startCol,
        layout,
        {
          blockCode,
          sectionBaseCode: hasMultipleBlocks ? blockCode : groupCode,
          prefixBlockTitle: hasMultipleBlocks,
          suppressGrandTotalRow: suppressBlockGrandTotalRow,
        },
        options,
      );
      blockResults.push(result);
      currentRow = result.nextRow + (blockIndex < group.blocks.length - 1 ? (group.rowGap ?? rowGap) : 0);
    }

    allResults.push(...blockResults);

    if (blockResults.length) {
      currentRow = blockResults[blockResults.length - 1].nextRow;
    }

    const groupFinal = group.finalTotal ?? {};
    let groupFinalRow;
    let groupSumCols = [];
    {
      const sampleBlock = group.blocks[0];
      const normalizedSample = sampleBlock ? normalizeBlock(sampleBlock, layout) : undefined;
      const defaultSumCols = normalizedSample ? numericColIndexes(normalizedSample.columns) : [layout.totalCols - 1];
      const sumCols =
        groupFinal.colIndexes ?? (groupFinal.colIndex !== undefined ? [groupFinal.colIndex] : defaultSumCols);
      groupSumCols = sumCols;

      const blockCodes = blockResults.map((r) => r.blockCode).filter((code) => code !== undefined);
      const firstBlockSections = blockResults[0]?.sectionCodes ?? [];

      const autoGroupFinalLabel = blockCodes.length
        ? blockCodes.length === 1 && firstBlockSections.length
          ? `Tổng ${groupCode} = ${firstBlockSections.join(" + ")}`
          : `Tổng ${groupCode} = ${blockCodes.join(" + ")}`
        : `Tổng ${groupCode}`;
      const finalLabel = groupFinal.label ?? autoGroupFinalLabel;

      const hasManualFinal = (groupFinal.values?.length ?? 0) > 0 || (groupFinal.externalFormulaCells?.length ?? 0) > 0;

      const grandRows = blockResults
        .map((r) => r.grandTotalRow)
        .filter((rowNumber) => rowNumber !== undefined);

      const sourceRows = grandRows.length ? grandRows : blockResults.length === 1 ? blockResults[0].subtotalRows : [];

      const externalFormulaCells = hasManualFinal
        ? (groupFinal.externalFormulaCells ?? [])
        : sumCols.map((idx) => {
            const refs = sourceRows.map((r) => cellAddr(r, startCol + idx));
            if (!refs.length) return "";
            return refs.length === 1 ? refs[0] : sumFormula(refs);
          });

      const ctx = { sheet, currentRow, colCount: layout.totalCols };
      groupFinalRow = renderFinalTotalRow(
        ctx,
        finalLabel,
        sumCols,
        groupFinal.values ?? [],
        externalFormulaCells,
        normalizedSample?.columns,
        startCol,
        options,
      );
      currentRow = ctx.currentRow;
    }

    if (groupFinalRow !== undefined) {
      groupMetas.push({ code: groupCode, tag: group.summaryTag, finalRow: groupFinalRow, sumCols: groupSumCols });
    }

    const groupEndRow = currentRow - 1;
    if (groupEndRow >= groupStartRow) {
      applyGroupOutlineBorder(sheet, groupStartRow, groupEndRow, startCol, startCol + layout.totalCols - 1);
    }

    currentRow += i < groups.length - 1 ? rowGap : 0;
  }

  return allResults;
};

module.exports = {
  renderBlocks,
  renderBlockGroups,
  renderBlock,
  DEFAULT_RENDER_OPTIONS,
  sumValues,
  evalFormula,
};
