// Swag tiers. Highest first. To change a threshold, edit it here.
export const TIERS = [
  { level: 'tier2', label: 'Tier 2', reward: 'DevKit + T-shirt', labs: 10 },
  { level: 'tier1', label: 'Tier 1', reward: 'Water Bottle', labs: 5 },
]

const LOWEST = TIERS[TIERS.length - 1]

// Works out a student's tier from the data the scraper already saves.
// A locked student has completed every lab, so they are Tier 2.
export function getTier(student) {
  const done = student?.matched?.length ?? 0

  if (student?.suspended) {
    return {
      level: 'none',
      label: 'Not eligible',
      reward: null,
      labs: LOWEST.labs,
    }
  }

  if (student?.locked) return TIERS[0]

  const reached = TIERS.find((t) => done >= t.labs)
  if (reached) return reached

  return {
    level: 'none',
    label: 'Not eligible',
    reward: null,
    labs: LOWEST.labs,
  }
}

// Total swag spots, shared by students and faculty together.
// Change 250 if the number changes.
export const TOTAL_SPOTS = 250

// Labs needed for the first tier (5), taken from TIERS above
export const FIRST_TIER_LABS = TIERS[0].labs

// How many people in one list have reached the first tier (5+ labs)
export function countQualified(students = []) {
  return students.filter(
    (s) =>
      !s?.suspended &&
      ((s?.matched?.length ?? 0) >= FIRST_TIER_LABS || s?.locked)
  ).length
}