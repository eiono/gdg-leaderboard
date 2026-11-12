// People who are removed from the rankings for breaking the code of conduct.
//
// Each entry needs the person's public profile link, exactly as it appears
// in the leaderboard data. `track` is 'student' or 'developer' (the faculty
// tab). To remove someone from this list, delete their line and push again.
export const SUSPENDED = [
  { track: 'student', profile_url: 'https://www.skills.google/public_profiles/b18c1c53-3705-4085-a0aa-466186f9e4a4' },
  { track: 'student', profile_url: 'https://www.skills.google/public_profiles/d6ed0ea5-a4df-4df1-86ea-2832bafaaf48' },
]

// Swag spots per track (students 246 + faculty 4 = 250).
// Everyone after the cutoff has no lock and no tier, but still has a rank.
export const STUDENT_CUTOFF = 246
export const FACULTY_CUTOFF = 4
const CUTOFFS = { student: STUDENT_CUTOFF, developer: FACULTY_CUTOFF }

// Profile links used to place Rai Bal exactly (names can repeat).
// ATUL_URL is the Atul Kumar Sharma who finished on 11 Nov 2026.
// These only match on the student list; on the faculty list they do nothing.
const ATUL_URL = 'https://www.skills.google/public_profiles/32bf658b-70a9-4ccc-ac93-57f0906e19f3'
const RAI_URL = 'https://www.skills.google/public_profiles/cd84fe06-c58f-44d4-a7c1-8e5b18004bdc'

// The red text shown at the bottom right of their row
export const SUSPENDED_LABEL = 'Suspended'
export const SUSPENDED_REASON = 'Broke the code of conduct'

// Makes two spellings of the same link compare equal
function cleanUrl(url) {
  return String(url || '')
    .trim()
    .toLowerCase()
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '')
}

// Builds the set of suspended profile links for one track
function blockedSet(track) {
  return new Set(
    SUSPENDED.filter((e) => !e.track || e.track === track).map((e) =>
      cleanUrl(e.profile_url)
    )
  )
}

// Runs first (student and faculty tabs).
//  1. Puts Rai Bal directly after Atul Kumar Sharma (matched by link).
//  2. Everyone after the track's cutoff (counted the way the site numbers
//     people, skipping suspended rows) loses the lock and is marked `beyond`.
//     The first of them is marked `firstBeyond` for the divider row.
export function applyUnlock(json, track) {
  if (!json || !Array.isArray(json.students)) return json
  const cutoff = CUTOFFS[track]
  if (!cutoff) return json

  const blocked = blockedSet(track)
  const isBlocked = (s) => blocked.has(cleanUrl(s.profile_url))
  const is = (s, url) => cleanUrl(s.profile_url) === cleanUrl(url)

  const list = [...json.students].sort(
    (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)
  )

  const rIdx = list.findIndex((s) => s.locked && is(s, RAI_URL))
  const aIdx = list.findIndex((s) => is(s, ATUL_URL))
  if (rIdx >= 0 && aIdx >= 0) {
    const [rai] = list.splice(rIdx, 1)
    const a2 = list.findIndex((s) => is(s, ATUL_URL))
    list.splice(a2 + 1, 0, rai)
  }

  let shown = 0
  const students = list.map((s, i) => {
    const row = { ...s, rank: i + 1 }
    if (isBlocked(row)) return row
    shown += 1
    if (shown > cutoff) {
      return {
        ...row,
        locked: null,
        unlocked: true,
        beyond: true,
        firstBeyond: shown === cutoff + 1,
      }
    }
    return row
  })

  return { ...json, students }
}

// Runs second. Renumbers the list:
//  - suspended people: no rank, red label, no lock
//  - everyone else (including people past the cutoff): 1, 2, 3, ...
// `listRank` is the row position, so sorting never moves a row.
export function applySuspensions(json, track) {
  if (!json || !Array.isArray(json.students)) return json

  const blocked = blockedSet(track)
  const ordered = [...json.students].sort(
    (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)
  )

  let next = 0
  const students = ordered.map((s, i) => {
    const listRank = i + 1

    if (blocked.has(cleanUrl(s.profile_url))) {
      return { ...s, listRank, rank: null, suspended: true, locked: null }
    }

    next += 1
    return { ...s, listRank, rank: next, suspended: false }
  })

  return { ...json, students }
}