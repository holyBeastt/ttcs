import json
with open('formula_with_context_v2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
with open('keys_utf8.txt', 'w', encoding='utf-8') as out:
    for key in data.keys():
        out.write(key + '\n')
