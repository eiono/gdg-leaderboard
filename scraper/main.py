"""Refreshes the leaderboard.

Run from the project root:   python scraper/main.py
Needs the environment variable named in settings.json (SHEET_CSV_URL).
"""
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from fetch_students import fetch_students          # noqa: E402
from parse_profile import fetch_profile, names_match  # noqa: E402
from scoring import load_syllabus, score_student, rank  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path, data, compact=False):
    """Write to a temp file first so a crash never leaves a half-written file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if compact:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def recently_checked(prev, window: timedelta) -> bool:
    try:
        t = datetime.fromisoformat(prev["last_checked"])
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - t < window
    except Exception:
        return False


def result_from_previous(prev, syllabus):
    """Rebuild a scoring result from last run's saved student record."""
    if not prev or "points" not in prev:
        return score_student([], syllabus)
    return {
        "matched": prev.get("matched", []),
        "missing": prev.get("missing", []),
        "extra_badges": [],
        "out_of_window": [],
        "completed_tracks": [],
        "points": prev["points"],
        "progress": prev.get("progress", f"0/{len(syllabus['items'])}"),
    }


def main():
    started = datetime.now(timezone.utc)
    settings = load_json(os.path.join(ROOT, "config", "settings.json"), None)
    if settings is None:
        raise SystemExit("config/settings.json is missing or invalid")

    paths = {k: os.path.join(ROOT, *v.split("/"))
             for k, v in settings["paths"].items()}
    syllabus = load_syllabus(paths["syllabus"])

    # Last run's data: used for locks and as a fallback for failed profiles
    prev_data = load_json(paths["output"], {})
    prev = {s["slug"]: s for s in prev_data.get("students", []) if "slug" in s}
    previous_locks = {slug: s["locked"] for slug, s in prev.items()
                      if s.get("locked")}

    students, skipped = fetch_students(settings)

    limit = os.environ.get("LIMIT")  # testing only: LIMIT=10
    if limit:
        students = students[: int(limit)]
        print(f"TEST MODE: only the first {limit} students")

    # Decide who needs a fresh scrape
    recheck = timedelta(hours=settings.get("recheck_failed_every_hours", 24))
    for s in students:
        p = prev.get(s["slug"])
        s["_prev"] = p
        if p and settings.get("skip_completed_students") and p.get("locked"):
            s["_action"] = "reuse_locked"
        elif (p and p.get("status") in ("private", "error")
              and recently_checked(p, recheck)):
            s["_action"] = "reuse_failed"
        else:
            s["_action"] = "scrape"

    targets = [s for s in students if s["_action"] == "scrape"]
    print(f"{len(students)} students: {len(targets)} to scrape, "
          f"{sum(s['_action'] == 'reuse_locked' for s in students)} locked, "
          f"{sum(s['_action'] == 'reuse_failed' for s in students)} "
          f"failed-recently")

    def work(s):
        try:
            r = fetch_profile(s["profile_url"], settings)
        except Exception as err:  # never let one profile stop the run
            r = {"status": "error", "profile_name": None, "badges": [],
                 "name_match": None, "error": f"unexpected: {err}"}
        time.sleep(settings["request_delay_seconds"])
        return s["slug"], r

    results = {}
    with ThreadPoolExecutor(max_workers=settings["max_workers"]) as pool:
        for i, (slug, r) in enumerate(pool.map(work, targets), start=1):
            results[slug] = r
            if i % 25 == 0 or i == len(targets):
                print(f"  scraped {i}/{len(targets)}")

    # Safety: if most profiles failed, the site is probably blocking or down.
    # Keep the old leaderboard instead of publishing a broken one.
    hard_errors = sum(r["status"] == "error" for r in results.values())
    if len(results) >= 20 and hard_errors / len(results) > 0.6:
        print("Too many profile errors; leaving the existing leaderboard as is.")
        write_json(paths["log"], {
            "run_at": now_iso(), "aborted": True,
            "reason": f"{hard_errors}/{len(results)} profiles returned errors",
        })
        raise SystemExit(1)

    # Build one record per student
    run_time = now_iso()
    records, failures = [], []
    for s in students:
        p = s["_prev"]
        if s["_action"] in ("reuse_locked", "reuse_failed"):
            result = result_from_previous(p, syllabus)
            status = p.get("status", "ok")
            if status == "mismatch":  # old runs used this status; it is gone now
                status = "ok"
            last_checked = p.get("last_checked")
            profile_name = p.get("profile_name")
        else:
            r = results[s["slug"]]
            last_checked = run_time
            if r["status"] == "ok":
                result = score_student(r["badges"], syllabus)
                status = "ok"
                profile_name = r["profile_name"]
            else:
                status = r["status"]
                result = result_from_previous(p, syllabus)  # keep old points
                profile_name = p.get("profile_name") if p else None
                failures.append({"row": s["sheet_row"], "status": status,
                                 "error": r.get("error")})
        # Show "Sheet Name / Profile Name" only when the two names differ
        if profile_name and not names_match(s["name"], profile_name):
            display_name = f"{s['name']} / {profile_name}"
        else:
            display_name = s["name"]
        records.append({
            "name": display_name, "profile_name": profile_name,
            "slug": s["slug"],
            "profile_url": s["profile_url"], "sheet_row": s["sheet_row"],
            "status": status, "last_checked": last_checked, "result": result,
        })

    ranked = rank(records, syllabus, previous_locks)

    # Flatten for the website
    students_out = []
    for s in ranked:
        r = s["result"]
        students_out.append({
            "rank": s["rank"],
            "slug": s["slug"],
            "name": s["name"],
            "profile_name": s["profile_name"],
            "profile_url": s["profile_url"],
            "status": s["status"],
            "progress": r["progress"],
            "points": r["points"],
            "matched": [{k: m[k] for k in
                         ("id", "title", "track", "points", "earned_on")}
                        for m in r["matched"]],
            "missing": r["missing"],
            "locked": s["locked"],
            "last_checked": s["last_checked"],
        })

    output = {
        "last_updated": run_time,
        "syllabus": {
            "program": syllabus["program"],
            "items": [{k: i.get(k) for k in ("id", "title", "track", "points", "url")}
                      for i in syllabus["items"]],
            "track_bonuses": syllabus.get("track_bonuses", {}),
            "milestone_bonuses": syllabus.get("milestone_bonuses", []),
        },
        "students": students_out,
    }
    write_json(paths["output"], output, compact=True)

    status_counts = {}
    for s in students_out:
        status_counts[s["status"]] = status_counts.get(s["status"], 0) + 1

    duration = round((datetime.now(timezone.utc) - started).total_seconds())
    write_json(paths["log"], {
        "run_at": run_time,
        "duration_seconds": duration,
        "students": len(students_out),
        "scraped_this_run": len(targets),
        "locked_students": sum(1 for s in students_out if s["locked"]),
        "status_counts": status_counts,
        "skipped_sheet_rows": [{"row": x["row"], "reason": x["reason"]}
                               for x in skipped][:50],
        "failures": failures[:50],
    })

    print(f"Done in {duration}s. Status counts: {status_counts}. "
          f"Locked: {sum(1 for s in students_out if s['locked'])}")


if __name__ == "__main__":
    main()