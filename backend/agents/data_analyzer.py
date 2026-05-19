"""Agent 1: Data Analyzer — converts raw metrics into structured JSON analysis."""

import json
import re
from typing import Any, Dict

from .llm_client import generate

SYSTEM_PROMPT = """You are a senior marketing data analyst.

Analyze the marketing metrics provided and return ONLY a valid JSON object (no markdown, no commentary) with this exact shape:

{
  "top_channel": "<channel name>",
  "underperforming_channel": "<channel name>",
  "total_spend": <number>,
  "total_revenue": <number>,
  "overall_roi": <number, e.g. 4.2 means 4.2x return>,
  "channel_roi": { "<channel>": <roi number>, ... },
  "anomalies": [ "<short string>", ... ],
  "key_findings": [ "<finding 1>", "<finding 2>", "<finding 3>" ]
}

Rules:
- ROI = revenue / spend. For channels with spend=0, report ROI as "infinite" string.
- Round numeric ROI to 2 decimals.
- "anomalies" should flag any channel with unusually low conversion rate, negative ROI, or high spend with low return. Keep each string under 25 words.
- "key_findings" must be exactly 3 items, each under 30 words.
- Output ONLY the JSON object. No prose, no backticks."""


def _extract_json(text: str) -> Dict[str, Any]:
    """Best-effort: strip code fences and pick the first {...} block."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def _compute_fallback(metrics: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    """Deterministic numeric backstop in case the LLM returns broken JSON."""
    total_spend = sum(m["spend"] for m in metrics.values())
    total_revenue = sum(m["revenue"] for m in metrics.values())
    channel_roi: Dict[str, Any] = {}
    for name, m in metrics.items():
        channel_roi[name] = "infinite" if m["spend"] == 0 else round(m["revenue"] / m["spend"], 2)
    paid = {k: v for k, v in channel_roi.items() if isinstance(v, (int, float))}
    top = max(paid, key=paid.get) if paid else next(iter(metrics))
    bottom = min(paid, key=paid.get) if paid else next(iter(metrics))
    return {
        "top_channel": top,
        "underperforming_channel": bottom,
        "total_spend": total_spend,
        "total_revenue": total_revenue,
        "overall_roi": round(total_revenue / total_spend, 2) if total_spend else 0,
        "channel_roi": channel_roi,
        "anomalies": [],
        "key_findings": [
            f"Total revenue ${total_revenue:,} against ${total_spend:,} spend.",
            f"Strongest paid channel: {top}.",
            f"Weakest paid channel: {bottom}.",
        ],
    }


def _compute_mom(client: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
    """Compute month-over-month deltas vs the most recent history entry."""
    history = client.get("history") or []
    if not history:
        return {}
    prev_metrics = history[-1]["metrics"]
    prev_period = history[-1]["period"]
    prev_spend = sum(m["spend"] for m in prev_metrics.values())
    prev_revenue = sum(m["revenue"] for m in prev_metrics.values())
    prev_roi = round(prev_revenue / prev_spend, 2) if prev_spend else 0.0

    def pct(curr, prev):
        if prev == 0:
            return None
        return round((curr - prev) / prev * 100, 1)

    return {
        "previous_period": {
            "period": prev_period,
            "total_spend": prev_spend,
            "total_revenue": prev_revenue,
            "overall_roi": prev_roi,
        },
        "mom_growth": {
            "revenue_pct": pct(current["total_revenue"], prev_revenue),
            "spend_pct": pct(current["total_spend"], prev_spend),
            "roi_change": round(current["overall_roi"] - prev_roi, 2),
        },
    }


def _channel_trend(client: Dict[str, Any]) -> Dict[str, list]:
    """Return per-channel ROI history (oldest → current month)."""
    from data.sample_clients import channel_roi_history  # local import avoids cycle
    return channel_roi_history(client)


async def run(client: Dict[str, Any]) -> Dict[str, Any]:
    metrics = client["metrics"]
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Client: {client['name']} ({client['industry']})\n"
        f"Period: {client['period']}\n"
        f"Metrics JSON:\n{json.dumps(metrics, indent=2)}"
    )
    raw = await generate(prompt, temperature=0.2)
    try:
        analysis = _extract_json(raw)
    except Exception:
        analysis = _compute_fallback(metrics)

    # Always overwrite arithmetic with deterministic values — LLMs hallucinate sums.
    deterministic = _compute_fallback(metrics)
    for numeric_field in ("total_spend", "total_revenue", "overall_roi", "channel_roi"):
        analysis[numeric_field] = deterministic[numeric_field]
    # Keep LLM-derived qualitative fields if present, else fall back.
    for qual_field in ("top_channel", "underperforming_channel", "anomalies", "key_findings"):
        analysis.setdefault(qual_field, deterministic[qual_field])

    # Attach MoM trends and per-channel history.
    analysis.update(_compute_mom(client, analysis))
    analysis["channel_trend"] = _channel_trend(client)

    return analysis
