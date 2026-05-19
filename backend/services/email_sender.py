"""Email delivery via Resend. Gracefully no-ops in demo mode when keys are missing."""

import asyncio
import base64
import os
from pathlib import Path
from typing import Any, Dict


def _build_email_body(client: Dict[str, Any]) -> str:
    return f"""
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
      <p>Hi {client['contact_name'].split()[0]},</p>
      <p>Your <b>{client['report_type']}</b> for <b>{client['period']}</b> is ready.</p>
      <p>The full report is attached as a PDF. Highlights and recommendations are
         summarised inside — happy to jump on a call if you'd like to discuss next steps.</p>
      <p>Best,<br/>PROITBRIDGE Team</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="font-size:11px;color:#64748b;">
        This report was generated automatically by PROITBRIDGE AI. Reply to this email
        with any questions or feedback.
      </p>
    </div>
    """


async def send_report_email(*, client: Dict[str, Any], pdf_path: str) -> Dict[str, Any]:
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("FROM_EMAIL", "reports@proitbridge.com")

    if not api_key:
        return {
            "status": "skipped",
            "detail": "RESEND_API_KEY not configured — email not sent (demo mode).",
        }

    try:
        import resend  # type: ignore
    except ImportError:
        return {"status": "error", "detail": "resend package not installed"}

    resend.api_key = api_key
    pdf_bytes = Path(pdf_path).read_bytes()
    attachment = {
        "filename": Path(pdf_path).name,
        "content": list(pdf_bytes),
    }

    def _send():
        return resend.Emails.send({
            "from": from_email,
            "to": [client["contact_email"]],
            "subject": f"{client['report_type']} — {client['period']}",
            "html": _build_email_body(client),
            "attachments": [attachment],
        })

    try:
        result = await asyncio.to_thread(_send)
        return {"status": "sent", "detail": result.get("id", "")}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "detail": str(e)}
