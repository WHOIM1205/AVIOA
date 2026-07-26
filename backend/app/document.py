"""
document.py — turn an uploaded file into plain text. Nothing more.

Why this file exists: Phase 4 must accept PDF / TXT / EML uploads, but the AI
workflow must NOT change. So this module's ONLY job is `document -> text`. That
text is then fed into the exact same run_agent() pipeline that pasted text uses,
giving us a single code path:

    document -> extract_text() -> run_agent() (extract -> merge -> assess_risk)

No OCR, no image handling, no alternate parsers — the assignment explicitly says
production-grade document parsing is not required.
"""
import io
from email import policy
from email.parser import BytesParser

from pypdf import PdfReader

SUPPORTED = (".pdf", ".txt", ".eml")


def extract_text(filename: str, content: bytes) -> str:
    """Dispatch on file extension. Raise ValueError for anything unsupported."""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _pdf_to_text(content)
    if name.endswith(".txt"):
        return content.decode("utf-8", errors="ignore").strip()
    if name.endswith(".eml"):
        return _eml_to_text(content)
    raise ValueError(f"Unsupported file type. Please upload one of: {', '.join(SUPPORTED)}.")


def _pdf_to_text(content: bytes) -> str:
    """Pull the text layer out of a PDF. Returns '' for scanned/image-only PDFs (no OCR)."""
    reader = PdfReader(io.BytesIO(content))
    return "\n".join((page.extract_text() or "") for page in reader.pages).strip()


def _eml_to_text(content: bytes) -> str:
    """Read an .eml email: its subject plus the plain-text body."""
    msg = BytesParser(policy=policy.default).parsebytes(content)
    body = msg.get_body(preferencelist=("plain",))
    text = body.get_content() if body else ""
    subject = msg.get("subject", "")
    return f"Subject: {subject}\n\n{text}".strip()
