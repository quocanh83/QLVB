import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import io

def set_cell_border(cell, **kwargs):
    """
    Set cell border
    Usage: set_cell_border(cell, top={"sz": 12, "val": "single", "color": "#FF0000", "space": "0"}, ...)
    """
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()

    # check for tag existnace, if none found, then create one
    tcBorders = tcPr.find(qn('w:tcBorders'))
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)

    # list over all available tags
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)

            # check for tag existnace, if none found, then create one
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)

            # assign attributes based on dict
            for key in edge_data:
                element.set(qn('w:{}'.format(key)), str(edge_data[key]))

def generate_mau_10(document, feedbacks):
    doc = docx.Document()
    
    # Set font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(13)
    
    # Header Section
    header_table = doc.add_table(rows=1, cols=2)
    header_table.width = Inches(7)
    
    left_cell = header_table.cell(0, 0)
    left_para = left_cell.paragraphs[0]
    left_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = left_para.add_run("BỘ/CƠ QUAN CHỦ TRÌ\n----------")
    run.bold = True
    run.font.size = Pt(12)
    
    right_cell = header_table.cell(0, 1)
    right_para = right_cell.paragraphs[0]
    right_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = right_para.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n-----------------------")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph()
    
    # Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("BẢN TỔNG HỢP, GIẢI TRÌNH, TIẾP THU Ý KIẾN\n")
    run.bold = True
    run.font.size = Pt(14)
    run = title.add_run(f"Đối với dự thảo: {document.project_name}")
    run.bold = True
    run.font.size = Pt(14)
    
    doc.add_paragraph()
    
    # Table Content
    table = doc.add_table(rows=1, cols=5)
    table.style = 'Table Grid'
    
    hdr_cells = table.rows[0].cells
    headers = ['TT', 'Nội dung dự thảo', 'Nội dung góp ý', 'Đơn vị góp ý', 'Ý kiến giải trình, tiếp thu']
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = hdr_cells[i].paragraphs[0].runs[0]
        run.bold = True
        
    # Populate Table
    for i, fb in enumerate(feedbacks, 1):
        row_cells = table.add_row().cells
        row_cells[0].text = str(i)
        
        # Node context (Label + content)
        node_text = f"{fb.node.node_label}: {fb.node.content[:200]}..."
        row_cells[1].text = node_text
        
        row_cells[2].text = fb.content
        row_cells[3].text = fb.contributing_agency or (fb.agency.name if fb.agency else "Ẩn danh")
        
        # Get first explanation
        explanation = fb.explanations.first()
        row_cells[4].text = explanation.content if explanation else "Chưa có nội dung giải trình."
        
    # Footer
    doc.add_paragraph()
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = footer.add_run("ĐẠI DIỆN CƠ QUAN CHỦ TRÌ\n(Ký tên, đóng dấu)")
    run.bold = True
    
    # Save to memory
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream
