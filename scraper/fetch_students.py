"""Downloads the published Google Sheet (CSV) and returns clean student rows.

Each student gets:
  name, profile_url, slug, sheet_row
Rows that are unusable (missing name, bad link, duplicate) are skipped and
reported in `skipped` so they show up in logs/last_run.json.
"""
import csv
import hashlib
import io
import os
import time
from urllib.parse import urlparse

import requests


def normalize_url(raw: str):
    """Return a clean profile URL, or None if it can't be used."""
    raw = (raw or "").strip()
    if not raw:
        return None
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw

    parsed = urlparse(raw)
    host = (parsed.hostname or "").lower()
    path = parsed.path.rstrip("/")
    # Drop query string and fragment so the same profile always looks the same
    return f"https://{host}{path}"


def is_allowed(url: str, settings: dict) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    return (
        host in settings["allowed_profile_domains"]
        and "/public_profiles/" in parsed.path
    )


def make_slug(url: str) -> str:
    """Stable ID built only from the profile URL, so renaming a student in the
    Sheet never changes their slug (and never loses their locked position)."""
    digest = hashlib.sha1(url.lower().encode("utf-8")).hexdigest()
    return "s-" + digest[:8]


def download_csv(url: str, settings: dict) -> str:
    headers = {"User-Agent": settings["user_agent"]}
    last_error = None

    for attempt in range(settings["max_retries"] + 1):
        try:
            res = requests.get(
                url, headers=headers, timeout=settings["request_timeout_seconds"]
            )
            res.raise_for_status()
            # utf-8-sig removes the invisible marker Google sometimes adds
            return res.content.decode("utf-8-sig")
        except requests.RequestException as err:
            last_error = err
            time.sleep(2 * (attempt + 1))

    raise RuntimeError(f"Could not download the student Sheet: {last_error}")


def fetch_students(settings: dict):
    """Returns (students, skipped)."""
    env_name = settings["sheet_csv_env"]
    csv_url = os.environ.get(env_name, "").strip()
    if not csv_url:
        raise RuntimeError(
            f"Environment variable {env_name} is not set. "
            "Add your published Sheet CSV link there."
        )

    text = download_csv(csv_url, settings)
    reader = csv.DictReader(io.StringIO(text))

    # Match headers ignoring case and extra spaces
    headers = {(h or "").strip().lower(): h for h in (reader.fieldnames or [])}
    name_key = headers.get(settings["name_column"].lower())
    url_key = headers.get(settings["url_column"].lower())

    if not name_key or not url_key:
        raise RuntimeError(
            f"Sheet must have columns '{settings['name_column']}' and "
            f"'{settings['url_column']}'. Found: {list(headers.values())}"
        )

    students, skipped, seen = [], [], set()

    # Row 1 is the header, so data starts at row 2
    for row_number, row in enumerate(reader, start=2):
        name = (row.get(name_key) or "").strip()
        raw_url = row.get(url_key) or ""

        if not name and not raw_url.strip():
            continue  # completely empty row

        if not name:
            skipped.append({"row": row_number, "reason": "missing name"})
            continue

        url = normalize_url(raw_url)
        if not url or not is_allowed(url, settings):
            skipped.append(
                {"row": row_number, "name": name, "reason": "invalid profile link"}
            )
            continue

        if url.lower() in seen:
            skipped.append(
                {"row": row_number, "name": name, "reason": "duplicate profile link"}
            )
            continue
        seen.add(url.lower())

        students.append(
            {
                "name": name,
                "profile_url": url,
                "slug": make_slug(url),
                "sheet_row": row_number,
            }
        )

    return students, skipped