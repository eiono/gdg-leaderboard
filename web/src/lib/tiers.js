// Swag tiers. Highest first. To change a threshold, edit it here.
export const TIERS = [
  { level: 'tier2', label: 'Tier 2', reward: 'DevKit + T-shirt', labs: 10 },
  { level: 'tier1', label: 'Tier 1', reward: 'Water Bottle', labs: 5 },
]

const LOWEST = TIERS[TIERS.length - 1]

const NOT_ELIGIBLE = {
  level: 'none',
  label: 'Not eligible',
  reward: null,
  labs: LOWEST.labs,
}

// Works out a student's tier from the data the scraper already saves.
// A locked student has completed every lab, so they are Tier 2.
// Suspended or unlocked (closed-spot) students are never eligible.
export function getTier(student) {
  const done = student?.matched?.length ?? 0

  if (student?.suspended || student?.unlocked) return NOT_ELIGIBLE

  if (student?.locked) return TIERS[0]

  const reached = TIERS.find((t) => done >= t.labs)
  if (reached) return reached

  return NOT_ELIGIBLE
}

// Total swag spots, shared by students and faculty together.
// Change 250 if the number changes.
export const TOTAL_SPOTS = 250

// Labs needed for the first tier (5), taken from TIERS above
export const FIRST_TIER_LABS = LOWEST.labs

// True when the person holds a swag spot
export function isQualified(student) {
  if (student?.suspended || student?.unlocked) return false
  return (
    Boolean(student?.locked) ||
    (student?.matched?.length ?? 0) >= FIRST_TIER_LABS
  )
}

// How many people in one list have reached the first tier (5+ labs)
export function countQualified(students = []) {
  return students.filter(isQualified).length
}