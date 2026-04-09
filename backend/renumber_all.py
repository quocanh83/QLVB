import docx
import sys
import re

def renumber_sequential(file_path, output_path):
    doc = docx.Document(file_path)
    total_fixed = 0
    article_counter = 0

    print("--- Starting Sequential Renumbering ---")
    for t_idx, table in enumerate(doc.tables):
        for r_idx, row in enumerate(table.rows):
            if not row.cells:
                continue
            
            c1_text = row.cells[0].text.strip()
            if not c1_text:
                continue
            
            # Match "Điều X" or any word starting with character and then digit
            # Using a regex that captures the suffix after the number
            match = re.match(r'^([^\d]+\s+)(\d+)(.*)', c1_text, re.IGNORECASE | re.DOTALL)
            if match:
                article_counter += 1
                prefix = match.group(1)
                old_num_str = match.group(2)
                suffix = match.group(3)
                
                # We always renumber to ensure perfect sequence
                new_text = f"{prefix}{article_counter}{suffix}"
                
                # Check if it actually changed to log it
                if int(old_num_str) != article_counter:
                    print(f"T{t_idx} R{r_idx:02d} | Fixed: {old_num_str} -> {article_counter}")
                    total_fixed += 1
                
                # Update the cell (maintaining formatting as much as possible by only replacing text)
                row.cells[0].text = new_text

    doc.save(output_path)
    print(f"\nSUCCESS: Sequential renumbering complete. Total articles: {article_counter}. Fixed labels: {total_fixed}.")
    print(f"Fixed file saved to: {output_path}")

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    renumber_sequential('c:/Users/Quoc Anh/Desktop/QLVB/bangthuyetminh.docx', 'c:/Users/Quoc Anh/Desktop/QLVB/bangthuyetminh_fixed.docx')
