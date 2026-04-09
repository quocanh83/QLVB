import docx
import sys
import re

def dump_all_labels(file_path):
    doc = docx.Document(file_path)
    for t_idx, table in enumerate(doc.tables):
        print(f"--- Table {t_idx} ({len(table.rows)} rows) ---")
        for r_idx, row in enumerate(table.rows):
            # Check for merged cells / empty columns
            if not row.cells:
                continue
            c1 = row.cells[0].text.strip().replace('\n', '|')
            print(f"T{t_idx} R{r_idx:02d} | [{c1[:60]}]")

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    dump_all_labels('c:/Users/Quoc Anh/Desktop/QLVB/bangthuyetminh.docx')
