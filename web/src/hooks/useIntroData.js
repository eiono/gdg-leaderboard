// web/src/hooks/useIntroData.js
import { useState, useEffect } from 'react';

const EMPTY_TRACK = {
  completedAll: 0,
  completed5Plus: 0,
  total: 0,
  top3: [],
};

const DEFAULT_STATE = {
  student: EMPTY_TRACK,
  faculty: EMPTY_TRACK,
  loaded: false,
};

function parseLabCount(entry) {
  if (Array.isArray(entry.matched)) {
    return entry.matched.length;
  }
  if (typeof entry.progress === 'string' && entry.progress.includes('/')) {
    const num = parseInt(entry.progress.split('/')[0], 10);
    return Number.isNaN(num) ? 0 : num;
  }
  const numeric =
    entry.labsCompleted ??
    entry.labs_completed ??
    entry.completedLabs ??
    entry.labs ??
    entry.badges;
  return typeof numeric === 'number' ? numeric : 0;
}

function parsePoints(entry, labs) {
  const candidates = [
    entry.points,
    entry.totalPoints,
    entry.total_points,
    entry.pts,
    entry.score,
    entry.totalScore,
    entry.xp,
    entry.credits,
  ];

  for (const val of candidates) {
    if (val !== undefined && val !== null && !Number.isNaN(Number(val))) {
      return Number(val);
    }
  }

  if (Array.isArray(entry.matched) && entry.matched.length > 0) {
    const sum = entry.matched.reduce(
      (acc, item) => acc + (Number(item?.points ?? item?.pts ?? item?.score) || 0),
      0
    );
    if (sum > 0) return sum;
  }

  return labs * 10;
}

function buildTrackStats(rawList, fallbackLabel) {
  const list = Array.isArray(rawList)
    ? rawList
    : rawList?.leaderboard || rawList?.developers || rawList?.students || rawList?.data || [];

  let completedAll = 0;
  let completed5Plus = 0;

  const normalized = list.map((item, idx) => {
    const labs = parseLabCount(item);
    const isLocked = item.locked !== null && item.locked !== undefined;

    if (isLocked || labs >= 10) {
      completedAll += 1;
    }
    if (labs >= 5) {
      completed5Plus += 1;
    }

    const name =
      item.name ||
      item.studentName ||
      item.facultyName ||
      item.fullName ||
      item.displayName ||
      `${fallbackLabel} #${idx + 1}`;

    return {
      ...item,
      name,
      points: parsePoints(item, labs),
      labs,
      rank: Number(item.rank) || idx + 1,
    };
  });

  const sorted = [...normalized].sort((a, b) => a.rank - b.rank);
  const top3 = [1, 2, 3]
    .map((r) => sorted.find((s) => s.rank === r) || sorted[r - 1])
    .filter(Boolean);

  return {
    completedAll,
    completed5Plus,
    total: list.length,
    top3,
  };
}

export function useIntroData() {
  const [data, setData] = useState(DEFAULT_STATE);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const baseUrl = import.meta.env.BASE_URL || '/';

    async function loadBothTracks() {
      try {
        const [studentRes, facultyRes] = await Promise.all([
          fetch(`${baseUrl}data/leaderboard.json`, { signal: controller.signal }).catch(() => null),
          fetch(`${baseUrl}data/developers.json`, { signal: controller.signal }).catch(() => null),
        ]);

        const studentJson = studentRes && studentRes.ok ? await studentRes.json() : [];
        const facultyJson = facultyRes && facultyRes.ok ? await facultyRes.json() : [];

        if (isMounted) {
          setData({
            student: buildTrackStats(studentJson, 'Student'),
            faculty: buildTrackStats(facultyJson, 'Faculty'),
            loaded: true,
          });
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (isMounted) {
          setData({ ...DEFAULT_STATE, loaded: true });
        }
      }
    }

    loadBothTracks();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return data;
}