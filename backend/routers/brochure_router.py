"""Brochure download: capture lead + serve dynamically generated PDF."""
from __future__ import annotations

import io
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional

import db
from models import new_id, now_iso

router = APIRouter(prefix="/api", tags=["brochure"])


class BrochureRequest(BaseModel):
    property_id: str
    name: str
    phone: str
    email: Optional[str] = None


@router.post("/brochure/download")
async def brochure_download(payload: BrochureRequest, request: Request):
    # Fetch property
    prop = await db.properties().find_one({"id": payload.property_id}, {"_id": 0})
    if not prop:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Property not found")

    # Store lead
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    doc = {
        "id": new_id(),
        "property_id": payload.property_id,
        "property_name": prop.get("title", ""),
        "user_name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "email": (payload.email or "").lower().strip() or None,
        "downloaded_at": now_iso(),
        "ip_address": ip,
    }
    await db.brochure_downloads().insert_one(doc)

    # Generate PDF
    pdf_bytes = _generate_pdf(prop, payload.name)
    safe_title = _safe(prop.get("title", "Property"))[:40].replace(" ", "_")
    # Strip any remaining non-ASCII so the HTTP header never crashes
    safe_title = safe_title.encode("ascii", errors="ignore").decode("ascii")
    filename = f"VisitSarva-{safe_title}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _safe(text) -> str:
    """Replace common Unicode chars that FPDF/latin-1 core fonts cannot encode."""
    if not text:
        return ""
    text = str(text)
    _MAP = {
        "\u2014": "-",   # em dash
        "\u2013": "-",   # en dash
        "\u2018": "'",   # left single quote
        "\u2019": "'",   # right single quote
        "\u201c": '"',   # left double quote
        "\u201d": '"',   # right double quote
        "\u2026": "...", # ellipsis
        "\u20b9": "Rs.", # rupee sign
        "\u00b2": "2",
        "\u00b3": "3",
        "\u00ae": "(R)",
        "\u00a9": "(c)",
    }
    for src, dst in _MAP.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _generate_pdf(prop: dict, requester_name: str) -> bytes:
    try:
        from fpdf import FPDF
    except ImportError:
        return _fallback_pdf(prop)

    pdf = FPDF()
    pdf.add_page()

    # ── Header ──────────────────────────────────────────────────────────────
    pdf.set_fill_color(212, 175, 55)  # vs-gold
    pdf.rect(0, 0, 210, 18, "F")
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(10, 5)
    pdf.cell(0, 8, "VisitSarva  |  Zero Brokerage Property Platform", ln=True)

    # ── Title ────────────────────────────────────────────────────────────────
    pdf.set_xy(10, 24)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(190, 9, _safe(prop.get("title", "Property")), align="L")

    # Category chip
    cat = prop.get("category", "").replace("_", " ").title()
    sub = prop.get("sub_category", "")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    chip = f"{cat}  {('· ' + sub) if sub else ''}"
    pdf.cell(0, 6, _safe(chip.strip()), ln=True)

    y = pdf.get_y() + 4

    # ── Key details grid ─────────────────────────────────────────────────────
    def section(title: str):
        nonlocal y
        pdf.set_xy(10, y)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(212, 175, 55)
        pdf.cell(0, 7, title, ln=True)
        y = pdf.get_y()
        pdf.set_draw_color(212, 175, 55)
        pdf.line(10, y, 200, y)
        y += 3

    def kv(label: str, value: str, col: int = 0):
        nonlocal y
        x = 10 + col * 95
        pdf.set_xy(x, y)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(30, 5, _safe(label) + ":", ln=False)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(55, 5, _safe(str(value))[:55], ln=(col == 1 or col == 0))
        if col == 1:
            y += 5

    section("Property Details")

    # Price
    price = prop.get("price", 0)
    def fmt_price(p):
        if p >= 1_00_00_000:
            return f"Rs. {p / 1_00_00_000:.2f} Cr"
        if p >= 1_00_000:
            return f"Rs. {p / 1_00_000:.2f} L"
        return f"Rs. {p:,.0f}"

    loc = prop.get("location") or {}
    area = prop.get("area") or {}
    area_str = f"{area.get('size', '')} {area.get('unit', 'sqft')}".strip()

    pdf.set_xy(10, y)
    details = [
        ("Price",      fmt_price(price) if price else "On Request"),
        ("Location",   _safe(f"{loc.get('city', '')} {loc.get('state', '')}".strip() or loc.get("address", "-"))),
        ("Area",       _safe(area_str or "-")),
        ("Bedrooms",   _safe(str(prop.get("bedrooms", "-")))),
        ("Bathrooms",  _safe(str(prop.get("bathrooms", "-")))),
        ("Facing",     _safe(prop.get("facing", "-"))),
        ("Furnishing", _safe(prop.get("furnishing", "-"))),
        ("Floor(s)",   _safe(str(prop.get("floors", "-")))),
    ]
    for i, (k, v) in enumerate(details):
        col = i % 2
        if col == 0:
            y_start = y
        kv(k, v, col)
        if col == 0 and i == len(details) - 1:
            y += 5

    y = pdf.get_y() + 4

    # ── Address ──────────────────────────────────────────────────────────────
    if loc.get("address"):
        section("Address")
        pdf.set_xy(10, y)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(30, 30, 30)
        addr_parts = [loc.get("address", ""), loc.get("city", ""), loc.get("state", ""), loc.get("pincode", "")]
        pdf.multi_cell(190, 5, _safe(", ".join(p for p in addr_parts if p)))
        y = pdf.get_y() + 4

    # ── Description ──────────────────────────────────────────────────────────
    desc = prop.get("description", "").strip()
    if desc:
        section("About This Property")
        pdf.set_xy(10, y)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(190, 5, _safe(desc[:800]))
        y = pdf.get_y() + 4

    # ── Amenities ────────────────────────────────────────────────────────────
    amenities = prop.get("amenities", [])
    if amenities:
        if y > 240:
            pdf.add_page()
            y = 15
        section("Amenities")
        pdf.set_xy(10, y)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(30, 30, 30)
        # 3-column grid
        for idx, am in enumerate(amenities[:18]):
            col = idx % 3
            row = idx // 3
            px = 10 + col * 63
            py = y + row * 6
            pdf.set_xy(px, py)
            pdf.cell(60, 5, _safe(f"* {am[:25]}"))
        y += (len(amenities[:18]) // 3 + 1) * 6 + 4

    # ── Features ─────────────────────────────────────────────────────────────
    features = prop.get("features", [])
    if features:
        if y > 240:
            pdf.add_page()
            y = 15
        section("Features")
        pdf.set_xy(10, y)
        for idx, ft in enumerate(features[:12]):
            col = idx % 3
            row = idx // 3
            px = 10 + col * 63
            py = y + row * 6
            pdf.set_xy(px, py)
            pdf.cell(60, 5, _safe(f"+ {ft[:25]}"))
        y += (len(features[:12]) // 3 + 1) * 6 + 4

    # ── Contact footer ───────────────────────────────────────────────────────
    if y > 255:
        pdf.add_page()
        y = 255
    pdf.set_xy(0, 267)
    pdf.set_fill_color(30, 30, 30)
    pdf.rect(0, 267, 210, 30, "F")
    pdf.set_xy(10, 272)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(212, 175, 55)
    pdf.cell(90, 6, "VisitSarva - Zero Brokerage", ln=False)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(0, 6, _safe(f"Prepared for: {requester_name}"), ln=True)
    pdf.set_xy(10, 279)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "www.visitsarva.com  |  All information is subject to change without notice.", ln=True)

    return pdf.output()


class ProjectBrochureRequest(BaseModel):
    project_id: str
    name: str
    phone: str
    email: Optional[str] = None


@router.post("/brochure/project-download")
async def project_brochure_download(payload: ProjectBrochureRequest, request: Request):
    import base64, httpx
    # Fetch project
    proj = await db.get_db()["projects"].find_one({"id": payload.project_id}, {"_id": 0})
    if not proj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Project not found")

    # Store lead
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    doc = {
        "id": new_id(),
        "project_id": payload.project_id,
        "project_name": proj.get("title", ""),
        "user_name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "email": (payload.email or "").lower().strip() or None,
        "downloaded_at": now_iso(),
        "ip_address": ip,
        "type": "project",
    }
    await db.brochure_downloads().insert_one(doc)

    safe_title = (proj.get("title", "Project")[:40]
                  .replace(" ", "_")
                  .encode("ascii", errors="ignore").decode("ascii"))
    filename = f"VisitSarva-{safe_title}.pdf"

    # 1. Uploaded brochure stored as base64
    brochure_data = proj.get("brochure_data", "")
    if brochure_data:
        try:
            pdf_bytes = base64.b64decode(brochure_data)
            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        except Exception:
            pass

    # 2. External brochure URL
    brochure_url = proj.get("brochure_url", "")
    if brochure_url:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(brochure_url, follow_redirects=True, timeout=10)
                if resp.status_code == 200:
                    return StreamingResponse(
                        io.BytesIO(resp.content),
                        media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                    )
        except Exception:
            pass

    # 3. Fallback: placeholder PDF
    pdf_bytes = _blank_project_pdf(proj)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _blank_project_pdf(proj: dict) -> bytes:
    """Placeholder PDF when no brochure has been uploaded yet."""
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_fill_color(212, 175, 55)
        pdf.rect(0, 0, 210, 18, "F")
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(10, 5)
        pdf.cell(0, 8, "VisitSarva  |  Zero Brokerage Property Platform", ln=True)
        pdf.set_xy(10, 40)
        pdf.set_font("Helvetica", "B", 20)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(190, 10, _safe(proj.get("title", "Project")))
        pdf.set_xy(10, pdf.get_y() + 12)
        pdf.set_font("Helvetica", "", 12)
        pdf.set_text_color(100, 100, 100)
        pdf.multi_cell(190, 7, "The detailed brochure for this project will be available soon.\nPlease contact us for more information.")
        pdf.set_xy(0, 267)
        pdf.set_fill_color(30, 30, 30)
        pdf.rect(0, 267, 210, 30, "F")
        pdf.set_xy(10, 272)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(212, 175, 55)
        pdf.cell(0, 6, "VisitSarva - Zero Brokerage", ln=True)
        pdf.set_xy(10, 279)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 5, "www.visitsarva.com  |  All information is subject to change without notice.", ln=True)
        return pdf.output()
    except Exception:
        return _fallback_pdf(proj)


def _fallback_pdf(prop: dict) -> bytes:
    """Minimal text-only PDF without fpdf2 (plain bytes)."""
    lines = [
        f"Property: {prop.get('title', 'N/A')}",
        f"Price: {prop.get('price', 'N/A')}",
        f"Location: {(prop.get('location') or {}).get('city', 'N/A')}",
        f"Description: {prop.get('description', '')[:200]}",
        "",
        "Visit www.visitsarva.com for full details.",
    ]
    content = "\n".join(lines).encode()
    # Minimal valid PDF
    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        b"4 0 obj\n<< /Length " + str(len(content) + 50).encode() + b" >>\nstream\nBT /F1 12 Tf 50 750 Td (" + content[:200] + b") Tj ET\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    header = b"%PDF-1.4\n"
    offsets = []
    body = b""
    for obj in objects:
        offsets.append(len(header) + len(body))
        body += obj
    xref_offset = len(header) + len(body)
    xref = b"xref\n0 " + str(len(objects) + 1).encode() + b"\n0000000000 65535 f \n"
    for off in offsets:
        xref += str(off).zfill(10).encode() + b" 00000 n \n"
    trailer = b"trailer\n<< /Size " + str(len(objects) + 1).encode() + b" /Root 1 0 R >>\nstartxref\n" + str(xref_offset).encode() + b"\n%%EOF"
    return header + body + xref + trailer
