"""Agent 5: Delivery — generates the PDF and (optionally) emails it to the client."""

from typing import Any, Dict

from services.pdf_generator import build_pdf
from services.email_sender import send_report_email


async def run(final_report: str, client: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
    pdf_path = build_pdf(
        client=client,
        report_text=final_report,
        analysis=analysis,
    )
    email_result = await send_report_email(client=client, pdf_path=pdf_path)
    return {
        "pdf_path": pdf_path,
        "email_status": email_result["status"],
        "email_detail": email_result.get("detail", ""),
    }
