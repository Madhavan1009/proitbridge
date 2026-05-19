"""Agent 4: Reviewer — enforces structure, removes filler, verifies numbers."""

import json
from typing import Any, Dict

from .llm_client import generate

PROMPT = """You are a senior marketing consultant doing a final review of a draft client report before delivery.

## YOUR JOB
1. **Verify numbers.** Every figure must match the source analysis JSON. Fix any mismatch.
2. **Enforce structure.** The report MUST have these 6 headings, in order, exactly:
   - ## Highlights This Month
   - ## Performance Snapshot
   - ## Channel Scorecard
   - ## What Worked vs. What Didn't
   - ## Recommended Actions
   - ## Looking Ahead
   If a section is missing, generate it from the analysis. If extra sections exist, remove them.
3. **Format correctness.** A blank line MUST separate every heading from its body, and every paragraph from the next. Highlights and Recommended Actions MUST be markdown bullet lists.
4. **Preserve the Channel Scorecard table EXACTLY.** The markdown table in the Channel Scorecard section is precomputed and authoritative. Do NOT change cell values, columns, row order, formatting, or verdict emojis. Copy it byte-for-byte into your output.
5. **Kill repetition.** Each fact appears once in the report. If the same number shows up in two sections, keep it in the one where it has the most impact and remove it from the other.
6. **Kill filler.** Strike "leverage", "synergize", "robust", "holistic", "going forward", "in today's marketing landscape", "drive growth and revenue", and similar vague phrases. Replace with concrete claims.
7. **Sharpen recommendations.** Each bullet in Recommended Actions must start with a verb, include a specific number/target, and state the expected outcome. Three bullets total.

## OUTPUT
Return ONLY the final polished report in markdown. Start at "## Highlights This Month". No commentary, no preamble, no signature.

## SOURCE OF TRUTH
"""


async def run(report: str, analysis: Dict[str, Any]) -> str:
    prompt = PROMPT + json.dumps(analysis, indent=2) + "\n\n## Draft report to review:\n" + report
    return await generate(prompt, temperature=0.25)
