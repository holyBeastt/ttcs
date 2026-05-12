import json

with open('formula_with_context_v2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sheet_name = "TỔNG HỢP 2025"
items = data.get(sheet_name, [])

# Map cell to formula/header
cell_map = {item['cell']: item for item in items}

# Let's pick a representative row, e.g., Row 38
row_num = "38"
cols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
extended_cols = ["AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL"]
all_cols = list(cols) + extended_cols

with open('detailed_results.txt', 'w', encoding='utf-8') as out:
    out.write(f"Detailed Analysis of Sheet: {sheet_name} (Row {row_num})\n")
    out.write("-" * 50 + "\n")

    for col in all_cols:
        cell = f"{col}{row_num}"
        if cell in cell_map:
            item = cell_map[cell]
            header = item.get('column_header', '').split(' > ')[-1] # Get the most specific header
            formula = item['formula']
            out.write(f"Column {col}: {header}\n")
            out.write(f"  Formula: {formula}\n")

    # Also analyze a Department sheet, e.g., Row 14 of CNTT-092025
    out.write("\n" + "="*50 + "\n")
    dept_sheet = "CNTT-092025"
    dept_items = data.get(dept_sheet, [])
    dept_cell_map = {item['cell']: item for item in dept_items}
    row_num_dept = "14"

    out.write(f"Detailed Analysis of Sheet: {dept_sheet} (Row {row_num_dept})\n")
    out.write("-" * 50 + "\n")

    for col in all_cols:
        cell = f"{col}{row_num_dept}"
        if cell in dept_cell_map:
            item = dept_cell_map[cell]
            header = item.get('column_header', '').split(' > ')[-1]
            formula = item['formula']
            out.write(f"Column {col}: {header}\n")
            out.write(f"  Formula: {formula}\n")
