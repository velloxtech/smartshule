#!/usr/bin/env python3
"""
SmartShule CBC Management System - User Manuals Generator
Generates three professional, comprehensive user manuals:
1. SmartShule_Parent_User_Manual
2. SmartShule_Staff_User_Manual
3. SmartShule_Administrator_Director_Manual

Developed by Vellox Tech for Grace Seeds School.
Tagline: Building a Smarter Tomorrow.
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_DIR = os.path.join(BASE_DIR, 'documentation', 'user-manuals')
SCREENSHOTS_DIR = os.path.join(DOCS_DIR, 'screenshots')
LOGO_PATH = os.path.join(BASE_DIR, 'Frontend', 'smartshule', 'public', 'logo.png')

# Color Palette
COLOR_PRIMARY = RGBColor(123, 28, 53)      # Grace Seeds Burgundy #7B1C35
COLOR_SECONDARY = RGBColor(30, 41, 59)     # Deep Slate #1E293B
COLOR_ACCENT = RGBColor(217, 119, 6)       # Amber Gold #D97706
COLOR_SUCCESS = RGBColor(5, 150, 105)      # Emerald Green #059669
COLOR_TEXT_DARK = RGBColor(31, 41, 55)     # Charcoal #1F2937
COLOR_MUTED = RGBColor(107, 114, 128)      # Gray #6B7280

HEX_PRIMARY = "7B1C35"
HEX_SECONDARY = "1E293B"
HEX_LIGHT_BG = "F8FAFC"
HEX_NOTE_BG = "F1F5F9"
HEX_BORDER = "CBD5E1"
HEX_ALERT_WARN = "FEF3C7"
HEX_ALERT_NOTE = "EFF6FF"
HEX_ALERT_IMP = "FEE2E2"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_base_document(title_short):
    doc = docx.Document()
    
    # Page Setup
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)
    section.header_distance = Inches(0.4)
    section.footer_distance = Inches(0.4)
    section.different_first_page_header_footer = True
    
    # Header
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run(f"Grace Seeds School | {title_short}")
    hrun.font.name = "Arial"
    hrun.font.size = Pt(8.5)
    hrun.font.color.rgb = COLOR_MUTED
    
    # Footer
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    frun1 = fp.add_run("SmartShule CBC Management System • Vellox Tech  |  Page ")
    frun1.font.name = "Arial"
    frun1.font.size = Pt(8.5)
    frun1.font.color.rgb = COLOR_MUTED
    
    # Add page number XML
    fldSimple = OxmlElement('w:fldSimple')
    fldSimple.set(qn('w:instr'), 'PAGE')
    fp._p.append(fldSimple)

    frun2 = fp.add_run(" of ")
    frun2.font.name = "Arial"
    frun2.font.size = Pt(8.5)
    frun2.font.color.rgb = COLOR_MUTED

    fldSimple2 = OxmlElement('w:fldSimple')
    fldSimple2.set(qn('w:instr'), 'NUMPAGES')
    fp._p.append(fldSimple2)

    return doc

def add_cover_page(doc, main_title, subtitle, audience, manual_code):
    # Spacing
    p_top = doc.add_paragraph()
    p_top.paragraph_format.space_before = Pt(30)
    p_top.paragraph_format.space_after = Pt(10)
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Logo
    if os.path.exists(LOGO_PATH):
        doc.add_picture(LOGO_PATH, width=Inches(1.8))
        doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # School Name
    p_school = doc.add_paragraph()
    p_school.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_school.paragraph_format.space_before = Pt(14)
    p_school.paragraph_format.space_after = Pt(2)
    r_school = p_school.add_run("GRACE SEEDS SCHOOL")
    r_school.font.name = "Arial"
    r_school.font.size = Pt(20)
    r_school.bold = True
    r_school.font.color.rgb = COLOR_PRIMARY
    
    p_motto = doc.add_paragraph()
    p_motto.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_motto.paragraph_format.space_after = Pt(24)
    r_motto = p_motto.add_run("“Building a Smarter Tomorrow”")
    r_motto.font.name = "Arial"
    r_motto.font.size = Pt(11)
    r_motto.italic = True
    r_motto.font.color.rgb = COLOR_MUTED
    
    # Title Box (Table with primary border)
    t_box = doc.add_table(rows=1, cols=1)
    t_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = t_box.rows[0].cells[0]
    cell.width = Inches(6.8)
    set_cell_background(cell, "FBF3F4")
    set_cell_margins(cell, top=260, bottom=260, left=300, right=300)
    
    # Border
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="36" w:space="0" w:color="{HEX_PRIMARY}"/>'
        f'<w:top w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p_t = cell.paragraphs[0]
    p_t.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_t.paragraph_format.space_after = Pt(4)
    r_t = p_t.add_run(main_title.upper())
    r_t.font.name = "Arial"
    r_t.font.size = Pt(22)
    r_t.bold = True
    r_t.font.color.rgb = COLOR_PRIMARY
    
    p_sub = cell.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_sub.paragraph_format.space_after = Pt(0)
    r_sub = p_sub.add_run(subtitle)
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = COLOR_SECONDARY
    
    # Metadata Details
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(80)
    p_meta.paragraph_format.space_after = Pt(6)
    
    details_table = doc.add_table(rows=5, cols=2)
    details_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    details = [
        ("Target Audience:", audience),
        ("Software Platform:", "SmartShule CBC Management System (Web, Desktop, Mobile)"),
        ("System Developer:", "Vellox Tech Solutions (https://smartshule.ac.ke)"),
        ("Document Version:", "Version 1.0 (Official Release - 2026)"),
        ("Document Reference:", manual_code)
    ]
    
    col_widths = [Inches(2.0), Inches(4.8)]
    for i, (k, v) in enumerate(details):
        row = details_table.rows[i]
        
        c0 = row.cells[0]
        c0.width = col_widths[0]
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.size = Pt(9.5)
        r0.bold = True
        r0.font.color.rgb = COLOR_SECONDARY
        
        c1 = row.cells[1]
        c1.width = col_widths[1]
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_TEXT_DARK
    
    doc.add_page_break()

def add_heading_1(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.font.name = "Arial"
    r.font.size = Pt(16)
    r.bold = True
    r.font.color.rgb = COLOR_PRIMARY
    return p

def add_heading_2(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.font.name = "Arial"
    r.font.size = Pt(12.5)
    r.bold = True
    r.font.color.rgb = COLOR_SECONDARY
    return p

def add_heading_3(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    r.font.name = "Arial"
    r.font.size = Pt(10.5)
    r.bold = True
    r.font.color.rgb = COLOR_ACCENT
    return p

def add_body_p(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(9.5)
    r.font.color.rgb = COLOR_TEXT_DARK
    return p

def add_bullet_item(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_b = p.add_run(bold_prefix + " ")
        r_b.font.name = "Arial"
        r_b.font.size = Pt(9.5)
        r_b.bold = True
        r_b.font.color.rgb = COLOR_SECONDARY
    r_t = p.add_run(text)
    r_t.font.name = "Arial"
    r_t.font.size = Pt(9.5)
    r_t.font.color.rgb = COLOR_TEXT_DARK
    return p

def add_callout(doc, text, callout_type="NOTE"):
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = t.rows[0].cells[0]
    cell.width = Inches(6.8)
    
    bg_color = HEX_NOTE_BG
    border_color = HEX_SECONDARY
    prefix = "NOTE:"
    prefix_color = COLOR_SECONDARY
    
    if callout_type == "IMPORTANT":
        bg_color = HEX_ALERT_IMP
        border_color = HEX_PRIMARY
        prefix = "IMPORTANT:"
        prefix_color = COLOR_PRIMARY
    elif callout_type == "WARNING":
        bg_color = HEX_ALERT_WARN
        border_color = "B45309"
        prefix = "WARNING:"
        prefix_color = RGBColor(180, 83, 9)
    elif callout_type == "TIP":
        bg_color = "ECFDF5"
        border_color = "059669"
        prefix = "PRO TIP:"
        prefix_color = COLOR_SUCCESS
        
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
        f'<w:top w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    r_pre = p.add_run(prefix + " ")
    r_pre.font.name = "Arial"
    r_pre.font.size = Pt(9.5)
    r_pre.bold = True
    r_pre.font.color.rgb = prefix_color
    
    r_txt = p.add_run(text)
    r_txt.font.name = "Arial"
    r_txt.font.size = Pt(9.5)
    r_txt.font.color.rgb = COLOR_TEXT_DARK
    
    # spacing after table
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(4)

def add_screenshot(doc, filename, figure_num, caption, explanation):
    img_path = os.path.join(SCREENSHOTS_DIR, filename)
    if not os.path.exists(img_path):
        return
        
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(3)
    p_img.paragraph_format.keep_with_next = True
    
    run_img = p_img.add_run()
    run_img.add_picture(img_path, width=Inches(6.4))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(4)
    p_cap.paragraph_format.keep_with_next = True
    
    r_fig = p_cap.add_run(f"Figure {figure_num}: ")
    r_fig.font.name = "Arial"
    r_fig.font.size = Pt(8.5)
    r_fig.bold = True
    r_fig.font.color.rgb = COLOR_PRIMARY
    
    r_cap = p_cap.add_run(caption)
    r_cap.font.name = "Arial"
    r_cap.font.size = Pt(8.5)
    r_cap.font.color.rgb = COLOR_SECONDARY
    r_cap.italic = True
    
    p_exp = doc.add_paragraph()
    p_exp.paragraph_format.space_before = Pt(0)
    p_exp.paragraph_format.space_after = Pt(8)
    r_exp = p_exp.add_run(f"Visual Context: {explanation}")
    r_exp.font.name = "Arial"
    r_exp.font.size = Pt(8.5)
    r_exp.font.color.rgb = COLOR_MUTED
    r_exp.italic = True

def add_styled_table(doc, headers, rows_data, col_widths=None):
    t = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    
    # Header Row
    hdr_row = t.rows[0]
    for idx, heading in enumerate(headers):
        cell = hdr_row.cells[idx]
        if col_widths and idx < len(col_widths):
            cell.width = col_widths[idx]
        set_cell_background(cell, HEX_PRIMARY)
        set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(heading)
        r.font.name = "Arial"
        r.font.size = Pt(9)
        r.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    # Data Rows
    for r_idx, r_data in enumerate(rows_data):
        row = t.rows[r_idx + 1]
        bg = HEX_LIGHT_BG if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            if col_widths and c_idx < len(col_widths):
                cell.width = col_widths[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(val))
            r.font.name = "Arial"
            r.font.size = Pt(8.5)
            r.font.color.rgb = COLOR_TEXT_DARK
            
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

print("Base document engine loaded successfully.")
