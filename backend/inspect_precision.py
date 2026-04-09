import docx
import sys
import re

def inspect_range(file_path, start, end):
    doc = docx.Document(file_path)
    table = doc.tables[0]
    for i in range(start, min(len(table.rows), end)):
        row = table.rows[i]
        c1 = row.cells[0].text.strip().replace('\n', '|')
        print(f"Row {i:03d} | [{c1}]")

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    inspect_range('c:/Users/Quoc Anh/Desktop/QLVB/bangthuyetminh.docx', 20, 100)
