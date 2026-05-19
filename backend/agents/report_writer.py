"""Agent 3: Report Writer — produces the structured client report.

The Channel Scorecard table is built deterministically from the raw metrics
(LLMs are unreliable at copying numbers verbatim from JSON). The LLM writes
all surrounding prose, then the precomputed table is injected directly.
"""

import json
from typing import Any, Dict

from .llm_client import generate

PROMPT = """You are a senior report writer at PROITBRIDGE marketing agency.

Write a {report_type} for {client_name} ({industry}) covering {period}.

## REQUIRED STRUCTURE — follow exactly

Use these section headings in this order, each starting with "## ":

1. **## Highlights This Month** — a markdown bullet list of 3-4 wins. Each bullet must cite a specific number from the analysis JSON and frame it as an achievement. At least ONE bullet MUST reference month-over-month growth using the `mom_growth` data (e.g. "- Revenue jumped 23.5% MoM, the third consecutive month of growth.") Example for ROI: "- Email campaign delivered a 73.5x ROI, generating $22,000 from just $300 of spend."
2. **## Performance Snapshot** — exactly 2 short paragraphs (max 3 sentences each). First paragraph: headline numbers (total spend, total revenue, blended ROI) AND a MoM comparison (e.g. "up from $X last month"). Second paragraph: one standout comparison between channels (e.g. "Email delivered 5x the ROI of paid social").
3. **## Channel Scorecard** — write ONLY the heading on its own line. Do NOT generate a table — it will be inserted automatically.
4. **## What Worked vs. What Didn't** — 2 short paragraphs. First names the winning channel and explains *why* it won using specific metrics (conversion rate, CPA, revenue). Second names the lagging channel and explains *why*.
5. **## Recommended Actions** — a markdown bullet list of exactly 3 actions. Each bullet starts with a verb (Double, Pause, Test, Reallocate, …), includes a specific target ("by 20%", "to $X"), and ends with the expected outcome.
6. **## Looking Ahead** — exactly 1 short paragraph (max 4 sentences) on next month's focus.

## HARD RULES

- ALWAYS leave a blank line between a heading and the body underneath it.
- ALWAYS leave a blank line between paragraphs.
- No paragraph longer than 4 sentences.
- Use ONLY the numbers shown in the analysis JSON below — never invent figures.
- No filler words: "leverage", "synergize", "robust", "holistic", "going forward", "in today's landscape".
- Do NOT repeat the same fact in multiple sections. Each number appears once.
- Do NOT add a title page, signature, intro greeting, or "executive summary" preamble — start at "## Highlights This Month".
- Do NOT include a "Key Insights" or "Strategic Recommendations" section — use the headings above exactly.
- Do NOT generate the Channel Scorecard table; just write the heading and leave the body empty."""


_VERDICTS = {
    "top": "🏆 Top performer",
    "strong": "✅ Strong",
    "weak": "⚠️ Needs work",
    "gem": "💎 Hidden gem",
}


def _verdict_for(roi_value, ranked_paid):
    """Choose a verdict based on ROI value and rank among paid channels."""
    if isinstance(roi_value, str) and roi_value == "infinite":
        return _VERDICTS["gem"]
    try:
        roi = float(roi_value)
    except (TypeError, ValueError):
        return _VERDICTS["strong"]
    if ranked_paid and ranked_paid[0][0] == roi_value:
        return _VERDICTS["top"]
    if roi >= 4:
        return _VERDICTS["strong"]
    if roi >= 2:
        return _VERDICTS["strong"]
    return _VERDICTS["weak"]


def _trend_arrow(history: list) -> str:
    """Return an arrow indicator based on the last 2 ROI values."""
    if not history or len(history) < 2:
        return "→"
    last, prev = history[-1], history[-2]
    if prev == 0:
        return "→"
    delta = (last - prev) / prev
    if delta > 0.05:
        return "📈"
    if delta < -0.05:
        return "📉"
    return "→"


def build_scorecard(metrics: Dict[str, Dict[str, float]], channel_trend: Dict[str, list] = None) -> str:
    """Deterministic markdown table for the Channel Scorecard section."""
    channel_trend = channel_trend or {}
    rows = []
    for channel, m in metrics.items():
        spend = m["spend"]
        revenue = m["revenue"]
        if spend == 0:
            roi_num = float("inf")
            roi_str = "∞"
        else:
            roi_num = revenue / spend
            roi_str = f"{roi_num:.2f}x"
        rows.append({
            "key": channel,
            "name": channel.replace("_", " ").title(),
            "spend": spend,
            "revenue": revenue,
            "roi_num": roi_num,
            "roi_str": roi_str,
            "trend": _trend_arrow(channel_trend.get(channel, [])),
        })

    rows.sort(key=lambda r: r["roi_num"], reverse=True)

    paid = [r for r in rows if r["spend"] > 0]
    top_paid_roi = paid[0]["roi_num"] if paid else None

    def verdict(r):
        if r["spend"] == 0:
            return _VERDICTS["gem"]
        if r["roi_num"] == top_paid_roi:
            return _VERDICTS["top"]
        if r["roi_num"] >= 4:
            return _VERDICTS["strong"]
        return _VERDICTS["weak"]

    lines = [
        "| Channel | Spend | Revenue | ROI | Trend | Verdict |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        lines.append(
            f"| {r['name']} | ${r['spend']:,} | ${r['revenue']:,} | {r['roi_str']} | {r['trend']} | {verdict(r)} |"
        )
    return "\n".join(lines)


def inject_scorecard(report: str, table_md: str) -> str:
    """Insert the precomputed table directly under the Channel Scorecard heading.

    Replaces anything the LLM may have placed between that heading and the next
    heading, guaranteeing the numbers are correct.
    """
    lines = report.splitlines()
    out = []
    i = 0
    injected = False
    while i < len(lines):
        line = lines[i]
        out.append(line)
        if line.strip().lower().startswith("## channel scorecard"):
            out.append("")
            out.append(table_md)
            out.append("")
            i += 1
            # Skip until the next heading (drops any LLM-generated table contents).
            while i < len(lines) and not lines[i].strip().startswith("## "):
                i += 1
            injected = True
            continue
        i += 1
    if not injected:
        # Heading missing — append the scorecard at the end as a safety net.
        out.append("")
        out.append("## Channel Scorecard")
        out.append("")
        out.append(table_md)
    return "\n".join(out)


async def run(insights: str, analysis: Dict[str, Any], client: Dict[str, Any]) -> str:
    prompt = (
        PROMPT.format(
            report_type=client["report_type"],
            client_name=client["name"],
            industry=client["industry"],
            period=client["period"],
        )
        + "\n\n## Analysis JSON (your source of truth for all numbers):\n"
        + json.dumps(analysis, indent=2)
        + "\n\n## Insight paragraphs (reference, do not copy verbatim):\n"
        + insights
    )
    return await generate(prompt, temperature=0.45)
