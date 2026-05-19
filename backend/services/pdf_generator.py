"""ReportLab PDF builder. Produces a clean executive-style PDF from the report text."""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from reportlab.graphics.shapes import Circle, Drawing, Ellipse, Line
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

REPORTS_DIR = Path(__file__).resolve().parent.parent / "generated_reports"
REPORTS_DIR.mkdir(exist_ok=True)

# Brand palette — Navy/Cyan to match the company logo.
NAVY_950 = colors.HexColor("#071633")
NAVY_900 = colors.HexColor("#0b1d3f")
BLUE_600 = colors.HexColor("#046bd2")
CYAN_500 = colors.HexColor("#22d3ee")
SLATE_900 = colors.HexColor("#0f172a")
SLATE_500 = colors.HexColor("#64748b")
SLATE_200 = colors.HexColor("#e2e8f0")
# Kept as an alias so existing references (e.g. table fills) keep working.
INDIGO = BLUE_600


def _globe_drawing(size: float = 22):
    """Wireframe globe in cyan — matches the company logo mark."""
    d = Drawing(size, size)
    cx, cy, r = size / 2, size / 2, size / 2 - 1
    cyan = CYAN_500
    d.add(Circle(cx, cy, r, fillColor=None, strokeColor=cyan, strokeWidth=1.2))
    d.add(Ellipse(cx, cy, r, r * 0.32, fillColor=None, strokeColor=cyan, strokeWidth=0.7))
    d.add(Ellipse(cx, cy, r, r * 0.62, fillColor=None, strokeColor=cyan, strokeWidth=0.7))
    d.add(Line(cx - r, cy, cx + r, cy, strokeColor=cyan, strokeWidth=0.7))
    d.add(Ellipse(cx, cy, r * 0.45, r, fillColor=None, strokeColor=cyan, strokeWidth=0.7))
    d.add(Ellipse(cx, cy, r * 0.82, r, fillColor=None, strokeColor=cyan, strokeWidth=0.55))
    d.add(Line(cx, cy - r, cx, cy + r, strokeColor=cyan, strokeWidth=0.6))
    return d


def _brand_header() -> Table:
    """Logo + wordmark + tagline on a navy stripe — top of every PDF."""
    wordmark_style = ParagraphStyle(
        "PBBrand",
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=colors.white,
        leading=15,
        spaceAfter=1,
    )
    tagline_style = ParagraphStyle(
        "PBBrandTag",
        fontName="Helvetica",
        fontSize=7,
        textColor=CYAN_500,
        leading=9,
        spaceAfter=0,
    )
    wordmark = Paragraph(
        f"PRO<font color='{CYAN_500.hexval()}'>IT</font>BRIDGE",
        wordmark_style,
    )
    tagline = Paragraph("STRIVE FOR BETTER FUTURE", tagline_style)

    text_cell = [[wordmark], [tagline]]
    text_table = Table(text_cell, colWidths=[3.2 * inch])
    text_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    header = Table(
        [[_globe_drawing(28), text_table]],
        colWidths=[0.45 * inch, 4.5 * inch],
        hAlign="LEFT",
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY_950),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("LEFTPADDING", (1, 0), (1, 0), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return header


def _styles():
    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "PBTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        textColor=SLATE_900,
        spaceAfter=4,
        alignment=TA_LEFT,
    )
    subtitle = ParagraphStyle(
        "PBSubtitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=11,
        textColor=SLATE_500,
        spaceAfter=18,
    )
    h2 = ParagraphStyle(
        "PBH2",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=INDIGO,
        spaceBefore=14,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "PBBody",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        textColor=SLATE_900,
        leading=15,
        spaceAfter=8,
    )
    return title, subtitle, h2, body


def _metrics_table(metrics: Dict[str, Dict[str, float]]):
    header = ["Channel", "Impressions", "Clicks", "Conversions", "Spend ($)", "Revenue ($)", "ROI"]
    rows = [header]
    total = {"impressions": 0, "clicks": 0, "conversions": 0, "spend": 0, "revenue": 0}
    for channel, m in metrics.items():
        for k in total:
            total[k] += m[k]
        roi = "∞" if m["spend"] == 0 else f"{m['revenue'] / m['spend']:.2f}x"
        rows.append([
            channel.replace("_", " ").title(),
            f"{m['impressions']:,}",
            f"{m['clicks']:,}",
            f"{m['conversions']:,}",
            f"{m['spend']:,}",
            f"{m['revenue']:,}",
            roi,
        ])
    overall_roi = "∞" if total["spend"] == 0 else f"{total['revenue'] / total['spend']:.2f}x"
    rows.append([
        "Total",
        f"{total['impressions']:,}",
        f"{total['clicks']:,}",
        f"{total['conversions']:,}",
        f"{total['spend']:,}",
        f"{total['revenue']:,}",
        overall_roi,
    ])
    table = Table(rows, hAlign="LEFT", colWidths=[1.4 * inch, 0.95 * inch, 0.8 * inch, 1.0 * inch, 0.85 * inch, 1.0 * inch, 0.6 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
        ("BACKGROUND", (0, -1), (-1, -1), SLATE_200),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.3, SLATE_200),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _inline_html(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<i>\1</i>", text)
    return text


def _build_scorecard(rows, body_style):
    """Render a markdown table (Channel Scorecard) as a ReportLab Table."""
    header = [c.strip() for c in rows[0].strip().strip("|").split("|")]
    body_rows = []
    for r in rows[2:]:
        cells = [c.strip() for c in r.strip().strip("|").split("|")]
        if len(cells) < len(header):
            cells += [""] * (len(header) - len(cells))
        body_rows.append(cells[: len(header)])

    data = [header] + body_rows
    table = Table(data, hAlign="LEFT", repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.3, SLATE_200),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    table.setStyle(TableStyle(style))
    return table


def _parse_markdown_to_flowables(report_text: str, h2_style, body_style):
    """Markdown subset: ## headings, bullet lists, GFM tables, paragraphs, bold/italic."""
    lines = report_text.strip().splitlines()
    flowables = []
    i = 0
    bullet_style = ParagraphStyle(
        "PBBullet", parent=body_style, leftIndent=14, bulletIndent=2, spaceAfter=3
    )

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped.startswith("## "):
            flowables.append(Paragraph(_inline_html(stripped[3:].strip()), h2_style))
            i += 1
            continue
        if stripped.startswith("# "):
            flowables.append(Paragraph(_inline_html(stripped[2:].strip()), h2_style))
            i += 1
            continue

        # GFM table
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?\s*[-:]+", lines[i + 1]):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i])
                i += 1
            flowables.append(_build_scorecard(rows, body_style))
            flowables.append(Spacer(1, 6))
            continue

        # Bullet list
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                text = re.sub(r"^[-*]\s+", "", lines[i].strip())
                items.append(ListItem(Paragraph(_inline_html(text), bullet_style), leftIndent=10))
                i += 1
            flowables.append(
                ListFlowable(items, bulletType="bullet", bulletFontName="Helvetica", bulletFontSize=8, leftIndent=10)
            )
            flowables.append(Spacer(1, 4))
            continue

        # Paragraph
        para_lines = []
        while (
            i < len(lines)
            and lines[i].strip()
            and not lines[i].strip().startswith("## ")
            and not lines[i].strip().startswith("# ")
            and not re.match(r"^[-*]\s+", lines[i].strip())
            and not lines[i].strip().startswith("|")
        ):
            para_lines.append(lines[i].strip())
            i += 1
        flowables.append(Paragraph(_inline_html(" ".join(para_lines)), body_style))

    return flowables


def build_pdf(*, client: Dict[str, Any], report_text: str, analysis: Dict[str, Any]) -> str:
    title_style, subtitle_style, h2_style, body_style = _styles()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{client['id']}_{timestamp}.pdf"
    path = REPORTS_DIR / filename

    doc = SimpleDocTemplate(
        str(path),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=f"{client['name']} — {client['report_type']}",
        author="PROITBRIDGE",
    )

    story = []
    story.append(_brand_header())
    story.append(Spacer(1, 14))
    story.append(Paragraph(f"{client['name']} — {client['report_type']}", title_style))
    story.append(Paragraph(
        f"{client['industry']} · {client['period']} · Prepared for {client['contact_name']}",
        subtitle_style,
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Performance Snapshot", h2_style))
    story.append(_metrics_table(client["metrics"]))
    story.append(Spacer(1, 14))

    story.extend(_parse_markdown_to_flowables(report_text, h2_style, body_style))

    story.append(Spacer(1, 18))
    story.append(Paragraph(
        f"Generated {datetime.utcnow().strftime('%B %d, %Y %H:%M UTC')} by PROITBRIDGE AI.",
        ParagraphStyle("Footer", fontName="Helvetica-Oblique", fontSize=8.5, textColor=SLATE_500),
    ))

    doc.build(story)
    return str(path)
