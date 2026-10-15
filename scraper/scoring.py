"""Match a student's earned badges against the syllabus, compute points,
and rank students (with locked positions for completed students).

Usage:
    from scoring import load_syllabus, score_student, rank
    syllabus = load_syllabus("config/syllabus.json")
    result = score_student(badges, syllabus)

`badges` is a list of dicts: {"title": str, "earned_on": "YYYY-MM-DD"}.
"""
import json
import re
from datetime import date, datetime, timezone
from difflib import SequenceMatcher


def normalize(text: str) -> str:
    """Lowercase, drop punctuation, collapse spaces so small formatting
    differences don't break matching."""
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_syllabus(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        syllabus = json.load(f)

    # Lookup: normalized title/alias -> syllabus item
    lookup = {}
    for item in syllabus["items"]:
        for name in [item["title"], *item.get("aliases", [])]:
            lookup[normalize(name)] = item
    syllabus["_lookup"] = lookup
    return syllabus


def match_badge(title: str, syllabus: dict):
    """Return (item, how) where how is 'exact', 'fuzzy' or None."""
    key = normalize(title)
    lookup = syllabus["_lookup"]

    if key in lookup:
        return lookup[key], "exact"

    # Fuzzy fallback for minor wording changes
    best_item, best_score = None, 0.0
    for name, item in lookup.items():
        score = SequenceMatcher(None, key, name).ratio()
        if score > best_score:
            best_item, best_score = item, score
    if best_score >= syllabus.get("fuzzy_threshold", 0.9):
        return best_item, "fuzzy"

    return None, None


def in_window(earned_on: str, syllabus: dict) -> bool:
    """Only count badges earned inside the program dates."""
    try:
        d = date.fromisoformat(earned_on)
    except (TypeError, ValueError):
        return False  # unparseable date: don't award points
    start = date.fromisoformat(syllabus["program"]["start_date"])
    end = date.fromisoformat(syllabus["program"]["end_date"])
    return start <= d <= end


def score_student(badges: list, syllabus: dict) -> dict:
    matched, extras, out_of_window = {}, [], []

    for badge in badges:
        title = badge.get("title", "")
        earned_on = badge.get("earned_on")
        item, how = match_badge(title, syllabus)

        if item is None:
            extras.append(title)
            continue
        if not in_window(earned_on, syllabus):
            out_of_window.append(title)
            continue
        # Each syllabus item counts once, even if the badge shows twice
        if item["id"] not in matched:
            matched[item["id"]] = {
                "id": item["id"],
                "title": item["title"],
                "track": item["track"],
                "points": item["points"],
                "earned_on": earned_on,
                "match": how,
            }

    base_points = sum(m["points"] for m in matched.values())

    # Track bonus: awarded when every item in a track is completed
    track_bonus_total, completed_tracks = 0, []
    for track, bonus in syllabus.get("track_bonuses", {}).items():
        ids = [i["id"] for i in syllabus["items"] if i["track"] == track]
        if ids and all(i in matched for i in ids):
            track_bonus_total += bonus
            completed_tracks.append(track)

    # Milestone bonus: highest milestone reached only
    milestone_bonus = 0
    for m in sorted(syllabus.get("milestone_bonuses", []),
                    key=lambda x: x["min_matched"]):
        if len(matched) >= m["min_matched"]:
            milestone_bonus = m["points"]

    extra_points = len(extras) * syllabus.get("extra_badge_points", 0)
    missing = [i["title"] for i in syllabus["items"] if i["id"] not in matched]

    return {
        "matched": sorted(matched.values(), key=lambda m: m["earned_on"]),
        "missing": missing,
        "extra_badges": extras,
        "out_of_window": out_of_window,
        "completed_tracks": completed_tracks,
        "points": {
            "syllabus": base_points,
            "track_bonus": track_bonus_total,
            "milestone_bonus": milestone_bonus,
            "extra": extra_points,
            "total": base_points + track_bonus_total
                     + milestone_bonus + extra_points,
        },
        "progress": f"{len(matched)}/{len(syllabus['items'])}",
    }


def is_complete(result: dict, syllabus: dict) -> bool:
    """True when every syllabus item has been matched."""
    return len(result["matched"]) == len(syllabus["items"])


def completion_date(result: dict) -> str:
    """Date the final syllabus badge was earned."""
    return max(m["earned_on"] for m in result["matched"])


def _last_earned(result: dict) -> str:
    dates = [m["earned_on"] for m in result["matched"]]
    return max(dates) if dates else "9999-12-31"


def rank(students: list, syllabus: dict, previous_locks: dict = None) -> list:
    """
    students: [{"name", "slug", "sheet_row", "result"}, ...]
    previous_locks: {slug: {"completed_on": "...", "locked_at": "..."}}
                    taken from the previous leaderboard.json
    """
    previous_locks = previous_locks or {}
    now = datetime.now(timezone.utc).isoformat()

    # 1. Decide who is locked. Existing locks are never overwritten.
    for s in students:
        if s["slug"] in previous_locks:
            s["locked"] = previous_locks[s["slug"]]
        elif is_complete(s["result"], syllabus):
            s["locked"] = {
                "completed_on": completion_date(s["result"]),
                "locked_at": now,
            }
        else:
            s["locked"] = None

    locked = [s for s in students if s["locked"]]
    in_progress = [s for s in students if not s["locked"]]

    # 2. Locked students: earliest finisher first
    locked.sort(key=lambda s: (
        s["locked"]["completed_on"],
        s["locked"]["locked_at"],
        s.get("sheet_row", 0),
    ))

    # 3. Everyone else: points, then badges, then earlier progress
    in_progress.sort(key=lambda s: (
        -s["result"]["points"]["total"],
        -len(s["result"]["matched"]),
        _last_earned(s["result"]),
        s.get("sheet_row", 0),
    ))

    ordered = locked + in_progress
    for i, s in enumerate(ordered, start=1):
        s["rank"] = i
    return ordered