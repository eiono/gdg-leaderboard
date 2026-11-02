"""Refreshes the leaderboards (students and developers).

Run from the project root:   python scraper/main.py
Needs the environment variables named in config/settings.json -> tracks.
Testing: set LIMIT=5 first. Test runs write to *.test files and never touch
the real leaderboard files.
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

from fetch_students import fetch_students, normalize_url, make_slug  # noqa: E402
from fetch_solutions import fetch_solutions, find_solution           # noqa: E402
from parse_profile import fetch_profile, names_match                 # noqa: E402
from scoring import load_syllabus, score_student, rank               # noqa: E402

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


def run_track(settings, track, limit):
    started = datetime.now(timezone.utc)
    tag = f"[{track['id']}]"

    syllabus = load_syllabus(os.path.join(ROOT, *track["syllabus"].split("/")))
    out_path = os.path.join(ROOT, *track["output"].split("/"))
    write_path = out_path + ".test" if limit else out_path

    # Last run's data: used for locks and as a fallback for failed profiles
    prev_data = load_json(out_path, {})
    prev = {s["slug"]: s for s in prev_data.get("students", []) if "slug" in s}
    previous_locks = {slug: s["locked"] for slug, s in prev.items()
                      if s.get("locked")}

    students, skipped = fetch_students(settings, track["sheet_csv_env"])
    if limit:
        students = students[:limit]
        print(f"{tag} TEST MODE: first {limit} students -> {write_path}")

    # Flagged entries (config/flagged.json): label them, and keep the ones
    # that are not in the sheet
    flags = load_json(os.path.join(ROOT, "config", "flagged.json"), {})
    flag_message = flags.get("message", "Abnormal Activity Detected")
    flag_by_slug = {}
    for e in flags.get("entries", []):
        if e.get("track", track["id"]) != track["id"]:
            continue
        url = normalize_url(e["profile_url"])
        if url:
            flag_by_slug[make_slug(url)] = {**e, "profile_url": url}

    in_sheet = {s["slug"] for s in students}
    for slug, e in flag_by_slug.items():
        if e.get("keep_if_missing") and slug not in in_sheet:
            students.append({
                "name": e.get("name") or "Unknown",
                "profile_url": e["profile_url"],
                "slug": slug,
                "sheet_row": 10**6,   # sorts last among ties
            })

    # Solution links. If the sheet can't be read, keep last run's links.
    solutions, sol_error = fetch_solutions(settings, track["solutions_csv_env"])
    if sol_error:
        print(f"{tag} solution links not refreshed: {sol_error}")
    prev_solutions = {i["id"]: i.get("solution")
                      for i in prev_data.get("syllabus", {}).get("items", [])
                      if i.get("id")}
    item_solution = {}
    for item in syllabus["items"]:
        if solutions is not None:
            item_solution[item["id"]] = find_solution(item, solutions)
        else:
            item_solution[item["id"]] = prev_solutions.get(item["id"])
    item_by_title = {i["title"]: i for i in syllabus["items"]}

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
    print(f"{tag} {len(students)} students: {len(targets)} to scrape, "
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
                print(f"{tag}   scraped {i}/{len(targets)}")

    # Safety: if most profiles failed, the site is probably blocking or down.
    # Keep the old leaderboard instead of publishing a broken one.
    hard_errors = sum(r["status"] == "error" for r in results.values())
    if len(results) >= 20 and hard_errors / len(results) > 0.6:
        print(f"{tag} Too many profile errors; leaving the old data as is.")
        return {"aborted": True,
                "reason": f"{hard_errors}/{len(results)} profiles errored"}

    # Build one record per student
    run_time = now_iso()
    records, failures = [], []
    for s in students:
        p = s["_prev"]
        if s["_action"] in ("reuse_locked", "reuse_failed"):
            result = result_from_previous(p, syllabus)
            status = p.get("status", "ok")
            if status == "mismatch":  # old runs used this; it is gone now
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
            "slug": s["slug"], "profile_url": s["profile_url"],
            "sheet_row": s["sheet_row"], "status": status,
            "last_checked": last_checked, "result": result,
        })

    ranked = rank(records, syllabus, previous_locks)

    # Flatten for the website
    students_out = []
    for s in ranked:
        r = s["result"]
        matched = []
        for m in r["matched"]:
            entry = {k: m.get(k) for k in
                     ("id", "title", "track", "points", "earned_on")}
            entry["solution"] = item_solution.get(m.get("id"))
            matched.append(entry)

        # `missing` stays a list of titles (older pages read it);
        # `missing_items` adds the lab link and solution video.
        missing_items = []
        for title in r["missing"]:
            item = item_by_title.get(title)
            missing_items.append({
                "id": item["id"] if item else None,
                "title": title,
                "url": item.get("url") if item else None,
                "solution": item_solution.get(item["id"]) if item else None,
            })

        students_out.append({
            "rank": s["rank"],
            "slug": s["slug"],
            "name": s["name"],
            "profile_name": s["profile_name"],
            "profile_url": s["profile_url"],
            "status": s["status"],
            "progress": r["progress"],
            "points": r["points"],
            "matched": matched,
            "missing": r["missing"],
            "missing_items": missing_items,
            "locked": s["locked"],
            "flag": flag_message if s["slug"] in flag_by_slug else None,
            "last_checked": s["last_checked"],
        })

    output = {
        "track": track["id"],
        "label": track.get("label", track["id"]),
        "last_updated": run_time,
        "syllabus": {
            "program": syllabus["program"],
            "items": [{"id": i["id"], "title": i["title"],
                       "track": i.get("track"), "points": i.get("points"),
                       "url": i.get("url"),
                       "solution": item_solution.get(i["id"])}
                      for i in syllabus["items"]],
            "track_bonuses": syllabus.get("track_bonuses", {}),
            "milestone_bonuses": syllabus.get("milestone_bonuses", []),
        },
        "students": students_out,
    }
    write_json(write_path, output, compact=True)

    status_counts = {}
    for s in students_out:
        status_counts[s["status"]] = status_counts.get(s["status"], 0) + 1
    locked_count = sum(1 for s in students_out if s["locked"])
    duration = round((datetime.now(timezone.utc) - started).total_seconds())
    print(f"{tag} Done in {duration}s. Status: {status_counts}. "
          f"Locked: {locked_count}")

    return {
        "duration_seconds": duration,
        "students": len(students_out),
        "scraped_this_run": len(targets),
        "locked_students": locked_count,
        "status_counts": status_counts,
        "solutions_error": sol_error,
        "skipped_sheet_rows": [{"row": x["row"], "reason": x["reason"]}
                               for x in skipped][:50],
        "failures": failures[:50],
    }


def main():
    settings = load_json(os.path.join(ROOT, "config", "settings.json"), None)
    if settings is None:
        raise SystemExit("config/settings.json is missing or invalid")

    limit = int(os.environ.get("LIMIT") or 0)  # testing only, e.g. LIMIT=5
    summaries = {}
    for track in settings["tracks"]:
        try:
            summaries[track["id"]] = run_track(settings, track, limit)
        except Exception as err:  # one track failing must not stop the other
            print(f"[{track['id']}] FAILED: {err}")
            summaries[track["id"]] = {"aborted": True, "reason": str(err)}

    if not limit:
        log_path = os.path.join(ROOT, *settings["paths"]["log"].split("/"))
        write_json(log_path, {"run_at": now_iso(), "tracks": summaries})

    if any(s.get("aborted") for s in summaries.values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()