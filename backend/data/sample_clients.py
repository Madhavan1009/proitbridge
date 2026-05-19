"""Hardcoded sample client data for PROITBRIDGE demo.

Each client has a `metrics` dict (the *current* month, May 2026) plus a `history`
list of 4 prior months. The history is generated deterministically from the
current month via a seeded backward walk so the demo numbers tell a realistic
growth story while remaining reproducible across restarts.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List

CLIENTS: Dict[str, Dict[str, Any]] = {
    "novaspark": {
        "id": "novaspark",
        "name": "NovaSpark Digital",
        "industry": "E-commerce",
        "contact_name": "Sarah Johnson",
        "contact_email": "proitbridge.manager@gmail.com",
        "logo_color": "#6366f1",
        "report_type": "Monthly Marketing Report",
        "period": "May 2026",
        "metrics": {
            "google_ads": {
                "impressions": 120000, "clicks": 3200, "conversions": 180,
                "spend": 4200, "revenue": 18000,
            },
            "instagram_ads": {
                "impressions": 85000, "clicks": 1100, "conversions": 42,
                "spend": 2100, "revenue": 4800,
            },
            "email_campaign": {
                "impressions": 12000, "clicks": 980, "conversions": 210,
                "spend": 300, "revenue": 22000,
            },
            "seo_organic": {
                "impressions": 45000, "clicks": 2800, "conversions": 95,
                "spend": 0, "revenue": 9500,
            },
        },
    },
    "bluepeak": {
        "id": "bluepeak",
        "name": "BluePeak Finance",
        "industry": "Fintech",
        "contact_name": "James Miller",
        "contact_email": "proitbridge.manager@gmail.com",
        "logo_color": "#0ea5e9",
        "report_type": "Monthly Marketing Report",
        "period": "May 2026",
        "metrics": {
            "google_ads": {
                "impressions": 95000, "clicks": 2800, "conversions": 140,
                "spend": 5500, "revenue": 28000,
            },
            "linkedin_ads": {
                "impressions": 40000, "clicks": 900, "conversions": 65,
                "spend": 3200, "revenue": 19500,
            },
            "email_campaign": {
                "impressions": 8000, "clicks": 620, "conversions": 98,
                "spend": 200, "revenue": 14700,
            },
            "seo_organic": {
                "impressions": 32000, "clicks": 1900, "conversions": 72,
                "spend": 0, "revenue": 10800,
            },
        },
    },
    "greenleaf": {
        "id": "greenleaf",
        "name": "GreenLeaf Health",
        "industry": "Healthcare SaaS",
        "contact_name": "Priya Patel",
        "contact_email": "proitbridge.manager@gmail.com",
        "logo_color": "#10b981",
        "report_type": "Monthly Marketing Report",
        "period": "May 2026",
        "metrics": {
            "google_ads": {
                "impressions": 67000, "clicks": 1800, "conversions": 95,
                "spend": 3100, "revenue": 12400,
            },
            "facebook_ads": {
                "impressions": 54000, "clicks": 1200, "conversions": 48,
                "spend": 1800, "revenue": 6200,
            },
            "email_campaign": {
                "impressions": 9500, "clicks": 740, "conversions": 125,
                "spend": 150, "revenue": 16250,
            },
            "seo_organic": {
                "impressions": 28000, "clicks": 1500, "conversions": 60,
                "spend": 0, "revenue": 7800,
            },
        },
    },
}

# Prior months ordered oldest → newest. The current month is appended at runtime.
_PRIOR_PERIODS = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"]


def _walk_back(metrics: Dict[str, Dict[str, int]], rng: random.Random) -> Dict[str, Dict[str, int]]:
    """Generate a plausible 'previous month': overall smaller, but spend and
    revenue jitter independently so per-channel ROI moves month to month."""
    prev: Dict[str, Dict[str, int]] = {}
    for channel, m in metrics.items():
        base = rng.uniform(0.80, 0.93)
        spend_factor = base * rng.uniform(0.92, 1.08)
        revenue_factor = base * rng.uniform(0.88, 1.10)
        traffic_factor = base * rng.uniform(0.94, 1.05)
        prev[channel] = {
            "impressions": max(1, int(round(m["impressions"] * traffic_factor))),
            "clicks": max(1, int(round(m["clicks"] * traffic_factor))),
            "conversions": max(1, int(round(m["conversions"] * revenue_factor))),
            "spend": int(round(m["spend"] * spend_factor)),
            "revenue": max(1, int(round(m["revenue"] * revenue_factor))),
        }
    return prev


def _build_history(client_id: str, current_metrics: Dict[str, Dict[str, int]]) -> List[Dict[str, Any]]:
    """Build a 4-month history walking backwards from the current month."""
    rng = random.Random(hash(client_id) & 0xFFFFFFFF)
    history: List[Dict[str, Any]] = []
    current = current_metrics
    for period in reversed(_PRIOR_PERIODS):
        prev = _walk_back(current, rng)
        history.insert(0, {"period": period, "metrics": prev})
        current = prev
    return history


# Inject history into each client (idempotent on module import).
for _cid, _client in CLIENTS.items():
    _client["history"] = _build_history(_cid, _client["metrics"])


def list_clients_summary():
    """Lightweight summary list (no metrics, no history) for the dashboard."""
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "industry": c["industry"],
            "contact_name": c["contact_name"],
            "contact_email": c["contact_email"],
            "logo_color": c["logo_color"],
            "report_type": c["report_type"],
            "period": c["period"],
        }
        for c in CLIENTS.values()
    ]


def get_client(client_id: str):
    return CLIENTS.get(client_id)


def get_timeseries(client: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return the full month-by-month series with the current month appended last."""
    series = deepcopy(client.get("history", []))
    series.append({"period": client["period"], "metrics": client["metrics"]})
    return series


def channel_totals_by_month(client: Dict[str, Any]):
    """For trend charts: list of {period, total_spend, total_revenue, overall_roi}."""
    out = []
    for entry in get_timeseries(client):
        spend = sum(m["spend"] for m in entry["metrics"].values())
        revenue = sum(m["revenue"] for m in entry["metrics"].values())
        out.append({
            "period": entry["period"],
            "total_spend": spend,
            "total_revenue": revenue,
            "overall_roi": round(revenue / spend, 2) if spend else 0.0,
        })
    return out


def channel_roi_history(client: Dict[str, Any]):
    """For sparklines: dict of {channel: [roi_per_month_oldest_to_newest]}."""
    series = get_timeseries(client)
    channels = list(client["metrics"].keys())
    out: Dict[str, List[float]] = {}
    for ch in channels:
        roi_list: List[float] = []
        for entry in series:
            m = entry["metrics"].get(ch)
            if not m:
                continue
            roi_list.append(round(m["revenue"] / m["spend"], 2) if m["spend"] else 0.0)
        out[ch] = roi_list
    return out
