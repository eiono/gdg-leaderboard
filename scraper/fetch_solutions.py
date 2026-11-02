"""Reads a 'solutions' Google Sheet and finds the video/link for each lab.

Sheet columns (names set in settings.json -> solutions_columns):
  Links | Topic | Required Labs | Solution link
A solution cell can hold a link (YouTube, Drive, ...) or plain text such as
"Use ChatGpt", which is kept as a note.
"""
import csv
import io
import os
import re

from fetch_students import download_csv, pick_header
from scoring import normalize

COURSE_ID_RE = re.compile(r"course_templates/(\d+)")


def course_id(url):
    m = COURSE_ID_RE.search(url or "")
    return m.group(1) if m else None


def split_link(raw):
    """Returns (url, note). Only http(s) links are accepted as links."""
    raw = (raw or "").strip()
    if not raw:
        return None, None
    if raw.lower().startswith(("http://", "https://")):
        return raw, None
    return None, raw[:80]


def fetch_solutions(settings: dict, env_name: str):
    """Returns (solutions, error). On any problem solutions is None, so the
    caller can keep the previous links instead of wiping them."""
    csv_url = os.environ.get(env_name, "").strip()
    if not csv_url:
        return None, f"{env_name} is not set"

    try:
        text = download_csv(csv_url, settings)
    except Exception as err:
        return None, str(err)

    cols = settings["solutions_columns"]
    reader = csv.DictReader(io.StringIO(text))
    headers = {(h or "").strip().lower(): h for h in (reader.fieldnames or [])}
    url_key = pick_header(headers, cols["course_url"])
    title_key = pick_header(headers, cols["title"])
    sol_key = pick_header(headers, cols["solution"])

    if not sol_key or not (url_key or title_key):
        return None, f"columns not found. Found: {list(headers.values())}"

    by_id, by_title = {}, {}
    for row in reader:
        url, note = split_link(row.get(sol_key))
        if not url and not note:
            continue
        entry = {"url": url, "note": note}

        cid = course_id(row.get(url_key)) if url_key else None
        if cid:
            by_id[cid] = entry

        title = normalize(row.get(title_key) or "") if title_key else ""
        if title:
            by_title[title] = entry

    return {"by_id": by_id, "by_title": by_title}, None


def find_solution(item: dict, solutions: dict):
    """item = one syllabus item. Returns {"url", "note"} or None."""
    if not solutions:
        return None
    cid = course_id(item.get("url"))
    if cid and cid in solutions["by_id"]:
        return solutions["by_id"][cid]
    return solutions["by_title"].get(normalize(item["title"]))