"""Fetches one public Skills profile and returns the student's badges.

fetch_profile(url, settings) returns:
  {
    "status": "ok" | "private" | "error",
    "profile_name": "Dirilis Asif" or None,
    "badges": [{"title": "...", "earned_on": "2026-10-13"}, ...],
    "name_match": True/False/None,   # filled in by main.py via names_match()
    "error": None or "message",
  }
"""
import re
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

EARNED_RE = re.compile(r"Earned\s+([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s+(\d{4})")


def parse_earned_date(text: str):
    """'Earned Oct 13, 2026 EDT' -> '2026-10-13' (or None)."""
    m = EARNED_RE.search(text or "")
    if not m:
        return None
    month, day, year = m.groups()
    try:
        d = datetime.strptime(f"{month[:3].title()} {day} {year}", "%b %d %Y")
        return d.date().isoformat()
    except ValueError:
        return None


def parse_profile_html(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")

    # Profile name comes from the page title: "Dirilis Asif | Google Skills"
    profile_name = None
    if soup.title and soup.title.string:
        first = soup.title.string.split("|")[0].strip()
        if first and first.lower() not in ("google skills", "skills"):
            profile_name = first

    badges, seen = [], set()
    for block in soup.select("div.profile-badge"):
        lines = [
            l for l in block.get_text("\n", strip=True).split("\n") if l
        ]
        idx = next(
            (i for i, l in enumerate(lines) if l.startswith("Earned")), None
        )
        if idx is None or idx == 0:
            continue

        title = lines[idx - 1].strip()
        earned_on = parse_earned_date(lines[idx])
        key = (title.lower(), earned_on)
        if title and key not in seen:
            seen.add(key)
            badges.append({"title": title, "earned_on": earned_on})

    return {"profile_name": profile_name, "badges": badges}


def fetch_profile(url: str, settings: dict) -> dict:
    headers = {"User-Agent": settings["user_agent"]}
    last_error = None

    for attempt in range(settings["max_retries"] + 1):
        try:
            res = requests.get(
                url, headers=headers,
                timeout=settings["request_timeout_seconds"],
            )

            if res.status_code in (403, 404):
                # Profile is private, deleted, or the link is wrong
                return {"status": "private", "profile_name": None,
                        "badges": [], "name_match": None,
                        "error": f"HTTP {res.status_code}"}

            if res.status_code == 429 or res.status_code >= 500:
                last_error = f"HTTP {res.status_code}"
                time.sleep(5 * (attempt + 1))  # back off, then retry
                continue

            res.raise_for_status()
            parsed = parse_profile_html(res.text)

            if not parsed["profile_name"]:
                # Page loaded but has no profile on it
                return {"status": "private", "profile_name": None,
                        "badges": [], "name_match": None,
                        "error": "no profile found on page"}

            return {"status": "ok", "profile_name": parsed["profile_name"],
                    "badges": parsed["badges"], "name_match": None,
                    "error": None}

        except requests.RequestException as err:
            last_error = str(err)
            time.sleep(2 * (attempt + 1))

    return {"status": "error", "profile_name": None, "badges": [],
            "name_match": None, "error": last_error}


def _name_tokens(name: str) -> set:
    return set(re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).split())


def names_match(sheet_name: str, profile_name: str) -> bool:
    """Lenient check: at least half of the shorter name's words must appear
    in the other name. Handles middle names, order and small extras."""
    a, b = _name_tokens(sheet_name), _name_tokens(profile_name)
    if not a or not b:
        return True  # can't judge, so don't flag
    return len(a & b) / min(len(a), len(b)) >= 0.5