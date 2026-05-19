"""Agent 2: Insight Agent — turns analysis JSON into plain-English insight paragraphs."""

import json
from typing import Any, Dict

from .llm_client import generate

PROMPT = """You are a senior marketing strategist writing for a client report.

Convert the data analysis below into exactly 4 concise insight paragraphs:
1. Overall performance (use total spend, revenue, ROI)
2. Best-performing channel (cite specific ROI and revenue)
3. Underperforming channel (cite specific metrics and likely cause)
4. One strategic recommendation grounded in the data

Tone: confident, professional, specific. No greetings, no headings, no bullet lists — just 4 paragraphs separated by blank lines."""


async def run(analysis: Dict[str, Any], client: Dict[str, Any]) -> str:
    prompt = (
        f"{PROMPT}\n\n"
        f"Client: {client['name']} — {client['industry']}\n"
        f"Period: {client['period']}\n\n"
        f"Analysis JSON:\n{json.dumps(analysis, indent=2)}"
    )
    return await generate(prompt, temperature=0.5)
