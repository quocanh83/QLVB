import docx
import sys
import re

def renumber_sequential(file_path, output_path):
    doc = docx.Document(file_path)
    total_fixed = 0
    article_counter = 0

    print("--- Starting Strict Sequential Renumbering (Điều only) ---")
    for t_idx, table in enumerate(doc.tables):
        for r_idx, row in enumerate(table.rows):
            if not row.cells:
                continue
            
            c1_text = row.cells[0].text.strip()
            if not c1_text:
                continue
            
            # Match ONLY "Điều X" (Case insensitive, but strictly starting with "Điều")
            # Addressing Vietnamese characters explicitly.
            match = re.match(r'^([\u0110\u0111]i\u1ec1u\s+)(\d+)(.*)', c1_text, re.IGNORECASE | re.DOTALL)
            if match:
                article_counter += 1
                prefix = match.group(1)
                old_num_str = match.group(2)
                suffix = match.group(3)
                
                new_text = f"{prefix}{article_counter}{suffix}"
                
                if int(old_num_str) != article_counter:
                    print(f"T{t_idx} R{r_idx:02d} | Fixed: {old_num_str} -> {article_counter}")
                    total_fixed += 1
                
                row.cells[0].text = new_text

    try:
        doc.save(output_path)
        print(f"\nSUCCESS: Sequential renumbering complete. Total articles: {article_counter}. Fixed labels: {total_fixed}.")
        print(f"Fixed file saved to: {output_path}")
    except PermissionError:
        print(f"\nERROR: Permission denied for {output_path}. Please close the file if it's open.")
        # Try a fallback filename
        fallback = output_path.replace('.docx', '_v3.docx')
        doc.save(fallback)
        print(f"Saved to fallback: {fallback}")

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    renumber_sequential('c:/Users/Quoc Anh/Desktop/QLVB/bangthuyetminh.docx', 'c:/Users/Quoc Anh/Desktop/QLVB/bangthuyetminh_fixed_final.docx')
