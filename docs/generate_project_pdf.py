#!/usr/bin/env python3
"""Generate the Beam Affiliate project documentation PDF.

Usage:
    .pdf-venv/bin/python docs/generate_project_pdf.py

The script reads BEAM_AFFILIATE_PROJECT_DOCUMENTATION.md and writes
BEAM_AFFILIATE_PROJECT_DOCUMENTATION.pdf in the same directory.
"""

from __future__ import annotations

import re
from datetime import date
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


SOURCE = Path(__file__).with_name("BEAM_AFFILIATE_PROJECT_DOCUMENTATION.md")
OUTPUT = Path(__file__).with_name("BEAM_AFFILIATE_PROJECT_DOCUMENTATION.pdf")
PAGE_WIDTH, PAGE_HEIGHT = A4
PINK = colors.HexColor("#F50057")
INK = colors.HexColor("#16161D")
MUTED = colors.HexColor("#5E6472")
LIGHT = colors.HexColor("#F4F5F7")
LINE = colors.HexColor("#D9DCE2")
WHITE = colors.white


def register_fonts() -> tuple[str, str, str]:
    """Use system fonts when available and safe built-ins otherwise."""
    candidates = [
        (
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Courier New.ttf",
        ),
        (
            "/Library/Fonts/Arial.ttf",
            "/Library/Fonts/Arial Bold.ttf",
            "/Library/Fonts/Courier New.ttf",
        ),
    ]
    for regular, bold, mono in candidates:
        if all(Path(path).exists() for path in (regular, bold, mono)):
            pdfmetrics.registerFont(TTFont("BeamSans", regular))
            pdfmetrics.registerFont(TTFont("BeamSansBold", bold))
            pdfmetrics.registerFont(TTFont("BeamMono", mono))
            return "BeamSans", "BeamSansBold", "BeamMono"
    return "Helvetica", "Helvetica-Bold", "Courier"


FONT, FONT_BOLD, FONT_MONO = register_fonts()


class SectionRule(Flowable):
    """Short Beam-pink rule used beneath major headings."""

    def __init__(self, width: float = 24 * mm, height: float = 1.2 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        self.canv.setFillColor(PINK)
        self.canv.rect(0, 0, self.width, self.height, stroke=0, fill=1)


class BeamDocTemplate(BaseDocTemplate):
    """Document template with bookmarks and table-of-contents notifications."""

    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=21 * mm,
            bottomMargin=19 * mm,
            title="Beam Affiliate Platform — Technical and Operational Documentation",
            author="Beam Affiliate Team",
            subject="Project architecture, features, data model, APIs, setup, deployment, security, and operations",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="content",
        )
        self.addPageTemplates(
            [
                PageTemplate(
                    id="main",
                    frames=[frame],
                    onPage=self._draw_page,
                )
            ]
        )

    def _draw_page(self, canvas, doc) -> None:
        canvas.saveState()
        if doc.page > 1:
            canvas.setStrokeColor(LINE)
            canvas.setLineWidth(0.5)
            canvas.line(18 * mm, PAGE_HEIGHT - 14 * mm, PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 14 * mm)
            canvas.setFont(FONT, 7.5)
            canvas.setFillColor(MUTED)
            canvas.drawString(18 * mm, PAGE_HEIGHT - 11 * mm, "BEAM AFFILIATE PLATFORM")
            canvas.drawRightString(PAGE_WIDTH - 18 * mm, PAGE_HEIGHT - 11 * mm, "TECHNICAL DOCUMENTATION")

            canvas.line(18 * mm, 13 * mm, PAGE_WIDTH - 18 * mm, 13 * mm)
            canvas.drawString(18 * mm, 9 * mm, "Version 1.0 • 21 July 2026")
            canvas.drawRightString(PAGE_WIDTH - 18 * mm, 9 * mm, f"Page {doc.page}")
        canvas.restoreState()

    def afterFlowable(self, flowable) -> None:
        if isinstance(flowable, Paragraph):
            level = getattr(flowable, "_toc_level", None)
            if level is not None:
                text = flowable.getPlainText()
                key = f"section-{self.seq.nextf('section')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(text, key, level=level, closed=False)
                self.notify("TOCEntry", (level, text, self.page, key))


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="BeamBody",
        parent=styles["BodyText"],
        fontName=FONT,
        fontSize=9.2,
        leading=13.2,
        textColor=INK,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamSmall",
        parent=styles["BodyText"],
        fontName=FONT,
        fontSize=7.8,
        leading=10.4,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamH1",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=17,
        leading=21,
        textColor=INK,
        spaceBefore=14,
        spaceAfter=5,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamH2",
        parent=styles["Heading2"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=15,
        textColor=PINK,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamH3",
        parent=styles["Heading3"],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=13,
        textColor=INK,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamBullet",
        parent=styles["BeamBody"],
        leftIndent=5 * mm,
        firstLineIndent=-3.5 * mm,
        bulletIndent=1.5 * mm,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamCode",
        parent=styles["Code"],
        fontName=FONT_MONO,
        fontSize=7.2,
        leading=9.5,
        textColor=INK,
        backColor=LIGHT,
        borderColor=LINE,
        borderWidth=0.5,
        borderPadding=7,
        spaceBefore=3,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="BeamQuote",
        parent=styles["BeamBody"],
        leftIndent=6 * mm,
        rightIndent=3 * mm,
        borderColor=PINK,
        borderWidth=0,
        borderPadding=6,
        backColor=LIGHT,
        textColor=MUTED,
    )
)


def inline_markup(text: str) -> str:
    """Convert the small inline-Markdown subset used by the source."""
    text = escape(text)
    text = re.sub(r"`([^`]+)`", rf'<font name="{FONT_MONO}" color="#444750">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text


def heading(text: str, level: int) -> list[Flowable]:
    style = styles["BeamH1"] if level == 1 else styles["BeamH2"] if level == 2 else styles["BeamH3"]
    paragraph = Paragraph(inline_markup(text), style)
    paragraph._toc_level = min(level - 1, 2)
    result: list[Flowable] = [paragraph]
    if level == 1:
        result.extend([SectionRule(), Spacer(1, 3 * mm)])
    return result


def make_table(rows: list[list[str]], available_width: float) -> Table:
    columns = max(len(row) for row in rows)
    normalized = [row + [""] * (columns - len(row)) for row in rows]
    wrapped = [
        [Paragraph(inline_markup(cell), styles["BeamSmall"]) for cell in row]
        for row in normalized
    ]

    if columns == 2:
        widths = [available_width * 0.29, available_width * 0.71]
    elif columns == 3:
        widths = [available_width * 0.23, available_width * 0.29, available_width * 0.48]
    else:
        widths = [available_width / columns] * columns

    table = Table(wrapped, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("FONTNAME", (0, 1), (-1, -1), FONT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def architecture_visual(available_width: float) -> KeepTogether:
    """Compact, print-friendly logical architecture visual."""
    box = ParagraphStyle(
        "DiagramBox",
        parent=styles["BeamSmall"],
        alignment=TA_CENTER,
        fontName=FONT_BOLD,
        textColor=INK,
        leading=10,
    )
    arrow = ParagraphStyle(
        "DiagramArrow",
        parent=styles["BeamSmall"],
        alignment=TA_CENTER,
        fontName=FONT_BOLD,
        textColor=PINK,
        fontSize=12,
    )

    def row(label: str, background=WHITE):
        table = Table([[Paragraph(label, box)]], colWidths=[available_width * 0.72], hAlign="CENTER")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), background),
                    ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        return table

    integration_cells = [
        Paragraph("Stripe", box),
        Paragraph("Resend", box),
        Paragraph("Beam / Bank", box),
        Paragraph("Webhooks", box),
    ]
    integrations = Table(
        [integration_cells],
        colWidths=[available_width * 0.18] * 4,
        hAlign="CENTER",
    )
    integrations.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    items: list[Flowable] = [
        Spacer(1, 2 * mm),
        row("Browsers • Partner sites • Payment providers", LIGHT),
        Paragraph("↓ HTTPS", arrow),
        row("Next.js 16 application • Pages • APIs • Route protection"),
        Paragraph("↓ Prisma", arrow),
        row("PostgreSQL system of record", LIGHT),
        Spacer(1, 2 * mm),
        integrations,
        Spacer(1, 3 * mm),
    ]
    return KeepTogether(items)


def parse_markdown(text: str, available_width: float) -> list[Flowable]:
    """Parse the controlled Markdown source into ReportLab flowables."""
    lines = text.splitlines()
    story: list[Flowable] = []
    index = 0
    in_code = False
    code_lines: list[str] = []
    skip_front_matter = True

    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if stripped.startswith("```"):
            if in_code:
                story.append(Preformatted("\n".join(code_lines), styles["BeamCode"]))
                code_lines = []
                in_code = False
            else:
                in_code = True
            index += 1
            continue
        if in_code:
            code_lines.append(raw)
            index += 1
            continue

        if skip_front_matter:
            if stripped.startswith("## 1."):
                skip_front_matter = False
            else:
                index += 1
                continue

        if not stripped or stripped == "---":
            index += 1
            continue

        if stripped.startswith("|"):
            rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                    rows.append(cells)
                index += 1
            if rows:
                story.extend([make_table(rows, available_width), Spacer(1, 4 * mm)])
            continue

        match = re.match(r"^(#{2,4})\s+(.+)$", stripped)
        if match:
            level = len(match.group(1)) - 1
            title = match.group(2)
            if title == "4. System Architecture":
                story.extend(heading(title, level))
                story.append(architecture_visual(available_width))
            else:
                story.extend(heading(title, level))
            index += 1
            continue

        if stripped.startswith("> "):
            story.append(Paragraph(inline_markup(stripped[2:]), styles["BeamQuote"]))
            index += 1
            continue

        bullet = re.match(r"^[-*]\s+(.+)$", stripped)
        if bullet:
            value = bullet.group(1)
            if value.startswith("[ ] "):
                value = "☐ " + value[4:]
            story.append(Paragraph(inline_markup(value), styles["BeamBullet"], bulletText="•"))
            index += 1
            continue

        numbered = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if numbered:
            story.append(
                Paragraph(
                    inline_markup(numbered.group(2)),
                    styles["BeamBullet"],
                    bulletText=f"{numbered.group(1)}.",
                )
            )
            index += 1
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            nxt = lines[index].strip()
            if (
                not nxt
                or nxt == "---"
                or nxt.startswith("#")
                or nxt.startswith("|")
                or nxt.startswith("```")
                or nxt.startswith("> ")
                or re.match(r"^[-*]\s+", nxt)
                or re.match(r"^\d+\.\s+", nxt)
            ):
                break
            paragraph_lines.append(nxt)
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), styles["BeamBody"]))

    return story


def cover_story() -> list[Flowable]:
    title = ParagraphStyle(
        "CoverTitle",
        fontName=FONT_BOLD,
        fontSize=28,
        leading=32,
        textColor=INK,
        alignment=TA_LEFT,
    )
    subtitle = ParagraphStyle(
        "CoverSubtitle",
        fontName=FONT,
        fontSize=14,
        leading=19,
        textColor=MUTED,
        alignment=TA_LEFT,
    )
    label = ParagraphStyle(
        "CoverLabel",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10,
        textColor=PINK,
        alignment=TA_LEFT,
    )

    story: list[Flowable] = [
        Spacer(1, 42 * mm),
        SectionRule(width=32 * mm, height=2 * mm),
        Spacer(1, 15 * mm),
    ]

    story.extend(
        [
            Paragraph("BEAM AFFILIATE", label),
            Spacer(1, 4 * mm),
            Paragraph("Technical and Operational<br/>Project Documentation", title),
            Spacer(1, 8 * mm),
            Paragraph(
                "Architecture, product scope, data model, APIs, configuration, "
                "deployment, security, testing, and maintenance.",
                subtitle,
            ),
            Spacer(1, 42 * mm),
            SectionRule(width=48 * mm, height=1.3 * mm),
            Spacer(1, 8 * mm),
            Paragraph("<b>Document version</b> 1.0", styles["BeamBody"]),
            Paragraph("<b>Application version</b> 1.1.0", styles["BeamBody"]),
            Paragraph("<b>Prepared</b> 21 July 2026", styles["BeamBody"]),
            Paragraph("<b>Classification</b> Internal project documentation", styles["BeamBody"]),
            PageBreak(),
        ]
    )
    return story


def toc_story() -> list[Flowable]:
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            name="TOC1",
            fontName=FONT_BOLD,
            fontSize=9.5,
            leading=15,
            leftIndent=0,
            firstLineIndent=0,
            textColor=INK,
            spaceBefore=2,
        ),
        ParagraphStyle(
            name="TOC2",
            fontName=FONT,
            fontSize=8.2,
            leading=12,
            leftIndent=6 * mm,
            firstLineIndent=0,
            textColor=MUTED,
        ),
        ParagraphStyle(
            name="TOC3",
            fontName=FONT,
            fontSize=7.5,
            leading=10,
            leftIndent=12 * mm,
            firstLineIndent=0,
            textColor=MUTED,
        ),
    ]
    return [
        Paragraph("Contents", styles["BeamH1"]),
        SectionRule(),
        Spacer(1, 7 * mm),
        toc,
        PageBreak(),
    ]


def main() -> None:
    source_text = SOURCE.read_text(encoding="utf-8")
    doc = BeamDocTemplate(str(OUTPUT))
    story = cover_story() + toc_story()
    story += parse_markdown(source_text, doc.width)
    doc.multiBuild(story)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
