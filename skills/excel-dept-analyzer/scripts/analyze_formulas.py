import json
import re

with open('formula_with_context_v2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

analysis = {}

for sheet, items in data.items():
    sheet_stats = {
        "total_formulas": len(items),
        "unique_formulas": set(),
        "formula_patterns": {},
        "external_references": 0,
        "internal_references": 0,
        "aggregations": 0
    }
    
    for item in items:
        formula = item['formula']
        sheet_stats["unique_formulas"].add(formula)
        
        # Pattern detection
        if '!' in formula:
            sheet_stats["external_references"] += 1
        elif re.search(r'[A-Z]+\d+', formula):
            sheet_stats["internal_references"] += 1
            
        if 'SUM' in formula.upper():
            sheet_stats["aggregations"] += 1
            
        # Simplified pattern (e.g., =SUM(X:Y) -> =SUM(CELL:CELL))
        pattern = re.sub(r'[A-Z]+\d+', 'CELL', formula)
        sheet_stats["formula_patterns"][pattern] = sheet_stats["formula_patterns"].get(pattern, 0) + 1
        
    sheet_stats["unique_formulas"] = len(sheet_stats["unique_formulas"])
    analysis[sheet] = sheet_stats

# Output analysis to a file
with open('formula_analysis.txt', 'w', encoding='utf-8') as f:
    for sheet, stats in analysis.items():
        f.write(f"Sheet: {sheet}\n")
        f.write(f"  Total Formulas: {stats['total_formulas']}\n")
        f.write(f"  Unique Formulas: {stats['unique_formulas']}\n")
        f.write(f"  External References: {stats['external_references']}\n")
        f.write(f"  Internal References: {stats['internal_references']}\n")
        f.write(f"  Aggregations (SUM): {stats['aggregations']}\n")
        f.write(f"  Top 5 Patterns:\n")
        sorted_patterns = sorted(stats['formula_patterns'].items(), key=lambda x: x[1], reverse=True)
        for pattern, count in sorted_patterns[:5]:
            f.write(f"    {pattern}: {count}\n")
        f.write("-" * 20 + "\n")

print("Analysis complete. Results in formula_analysis.txt")
