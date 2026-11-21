// web/src/components/RaceIntro.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIntroData } from '../hooks/useIntroData';
import Podium from './Podium';
import { sounds } from '../lib/sounds';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Crisp GTA VI Vice City Sunset + Palm Trees vector backdrop
function ViceCityBackdrop() {
  return (
    <div className="race-vice-backdrop" aria-hidden="true">
      <div className="race-vice-sun" />
      <div className="race-vice-grid" />
      <svg
        className="race-vice-palms"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        {/* Distant Miami Skyline */}
        <path
          fill="rgba(16, 7, 34, 0.85)"
          d="M0,320 L0,250 L45,250 L45,210 L85,210 L85,245 L130,245 L130,185 L175,185 L175,235 L230,235 L230,200 L270,200 L270,260 L1160,260 L1160,195 L1205,195 L1205,230 L1250,230 L1250,175 L1300,175 L1300,225 L1355,225 L1355,205 L1400,205 L1400,245 L1440,245 L1440,320 Z"
        />
        {/* Left Palm Tree Silhouette */}
        <g fill="#090414">
          <path d="M95,320 Q108,220 126,135 L136,137 Q120,222 110,320 Z" />
          <path d="M130,136 Q85,112 48,142 Q84,126 128,142 Z" />
          <path d="M130,136 Q78,136 52,175 Q85,148 129,144 Z" />
          <path d="M132,135 Q115,88 76,96 Q110,104 128,138 Z" />
          <path d="M133,135 Q165,92 204,114 Q168,108 135,140 Z" />
          <path d="M134,137 Q182,124 212,158 Q176,138 134,144 Z" />
          <path d="M133,139 Q170,156 184,194 Q160,164 132,145 Z" />
        </g>
        {/* Right Palm Tree Silhouette */}
        <g fill="#090414">
          <path d="M1345,320 Q1332,215 1312,125 L1302,127 Q1318,217 1330,320 Z" />
          <path d="M1308,126 Q1355,102 1392,132 Q1356,116 1310,132 Z" />
          <path d="M1308,126 Q1362,128 1388,168 Q1354,140 1309,134 Z" />
          <path d="M1306,125 Q1324,78 1364,86 Q1330,94 1310,128 Z" />
          <path d="M1305,125 Q1272,82 1232,104 Q1268,98 1303,130 Z" />
          <path d="M1304,127 Q1256,114 1224,148 Q1262,128 1304,134 Z" />
          <path d="M1305,129 Q1268,146 1254,184 Q1278,154 1306,135 Z" />
        </g>
      </svg>
    </div>
  );
}

export default function RaceIntro({ onComplete }) {
  const { student, faculty, loaded } = useIntroData();

  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // State machine: 'counters' | 'hold' | 'podium' | 'done'
  const [stage, setStage] = useState('counters');
  const [displayStats, setDisplayStats] = useState({
    studentAll: 0,
    student5Plus: 0,
    studentTotal: 0,
    facultyAll: 0,
    faculty5Plus: 0,
    facultyTotal: 0,
  });
  const [muted, setMuted] = useState(() => sounds.isMuted());
  const [exiting, setExiting] = useState(false);

  const completedRef = useRef(false);
  const lastTickStepRef = useRef(0);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sounds.stopAll();
    setExiting(true);
    setStage('done');

    setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 380);
  }, [onComplete]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishIntro]);

  useEffect(() => {
    return () => {
      sounds.stopAll();
    };
  }, []);

  // STAGE 1: INCREMENT COUNTERS (Students + Faculty) once JSON data is loaded
  useEffect(() => {
    if (stage !== 'counters' || !loaded) return undefined;

    sounds.play('whoosh');
    const COUNT_DURATION_MS = 2800;
    const startTime = performance.now();
    let rafId = null;

    const tick = (now) => {
      const elapsed = now - startTime;
      const linearT = Math.min(1, elapsed / COUNT_DURATION_MS);
      const easedT = easeOutCubic(linearT);

      setDisplayStats({
        studentAll: Math.round(student.completedAll * easedT),
        student5Plus: Math.round(student.completed5Plus * easedT),
        studentTotal: Math.round(student.total * easedT),
        facultyAll: Math.round(faculty.completedAll * easedT),
        faculty5Plus: Math.round(faculty.completed5Plus * easedT),
        facultyTotal: Math.round(faculty.total * easedT),
      });

      const tickStep = Math.floor(easedT * 10);
      if (tickStep > lastTickStepRef.current) {
        lastTickStepRef.current = tickStep;
        sounds.play('tick');
      }

      if (linearT < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplayStats({
          studentAll: student.completedAll,
          student5Plus: student.completed5Plus,
          studentTotal: student.total,
          facultyAll: faculty.completedAll,
          faculty5Plus: faculty.completed5Plus,
          facultyTotal: faculty.total,
        });
        sounds.play('cheer');
        setStage('hold');
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [stage, loaded, student, faculty]);

  // STAGE 2: HOLD COMPLETED COUNTERS FOR 5 SECONDS
  useEffect(() => {
    if (stage !== 'hold') return undefined;

    const holdTimer = setTimeout(() => {
      setStage('podium');
    }, 5000);

    return () => clearTimeout(holdTimer);
  }, [stage]);

  // STAGE 3: SHOW STUDENT & FACULTY TOP 3 PODIUMS
  useEffect(() => {
    if (stage !== 'podium') return undefined;

    const podiumTimer = setTimeout(() => {
      finishIntro();
    }, 4500);

    return () => clearTimeout(podiumTimer);
  }, [stage, finishIntro]);

  const handleToggleMute = () => {
    const nextMuted = !muted;
    sounds.setMuted(nextMuted);
    setMuted(nextMuted);
  };

  return (
    <div
      className={`race-overlay ${exiting ? 'race-overlay--exit' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="GDG on Campus MCKV Leaderboard Stats & Top Performers"
    >
      <ViceCityBackdrop />

      {/* Top Controls */}
      <div className="race-topbar">
        <div className="race-brand">
          <span className="race-brand-dots" aria-hidden="true">
            <i style={{ background: '#4285f4' }} />
            <i style={{ background: '#ea4335' }} />
            <i style={{ background: '#fbbc04' }} />
            <i style={{ background: '#34a853' }} />
          </span>
          <span>GDG on Campus MCKV</span>
        </div>

        <div className="race-controls">
          <button
            type="button"
            className="race-btn race-btn--ghost"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute intro sound' : 'Mute intro sound'}
          >
            {muted ? '🔇 Unmute' : '🔊 Sound On'}
          </button>
          <button
            type="button"
            className="race-btn race-btn--skip"
            onClick={finishIntro}
          >
            Skip Intro ⏭
          </button>
        </div>
      </div>

      {/* STAGE 1 & 2: LARGE INCREMENT COUNTERS (STUDENTS + FACULTY) + 5S HOLD */}
      {(stage === 'counters' || stage === 'hold') && (
        <div className="race-stage-container">
          <div className="race-counters-header">
            <span className="race-podium-kicker">Designed and Maintained By SK ASIF</span>
            <h2 className="race-counters-title">Campaign Milestones</h2>
          </div>

          {/* Student Leaderboard Counters */}
          <div className="race-track-group">
            <div className="race-group-label">🎓 Student Leaderboard</div>
            <div className="race-counters" aria-live="polite">
              <div className="race-stat-card race-stat--green">
                <span className="race-stat-value">{displayStats.studentAll}</span>
                <span className="race-stat-label">All 10 Labs (Locked)</span>
              </div>
              <div className="race-stat-card race-stat--cyan">
                <span className="race-stat-value">{displayStats.student5Plus}</span>
                <span className="race-stat-label">5+ Labs Completed</span>
              </div>
              <div className="race-stat-card race-stat--pink">
                <span className="race-stat-value">{displayStats.studentTotal}</span>
                <span className="race-stat-label">Total Students</span>
              </div>
            </div>
          </div>

          {/* Faculty Leaderboard Counters */}
          {faculty.total > 0 && (
            <div className="race-track-group">
              <div className="race-group-label">👨‍🏫 Faculty Leaderboard</div>
              <div className="race-counters" aria-live="polite">
                <div className="race-stat-card race-stat--green">
                  <span className="race-stat-value">{displayStats.facultyAll}</span>
                  <span className="race-stat-label">All 10 Labs (Locked)</span>
                </div>
                <div className="race-stat-card race-stat--cyan">
                  <span className="race-stat-value">{displayStats.faculty5Plus}</span>
                  <span className="race-stat-label">5+ Labs Completed</span>
                </div>
                <div className="race-stat-card race-stat--sunset">
                  <span className="race-stat-value">{displayStats.facultyTotal}</span>
                  <span className="race-stat-label">Total Faculty</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 3: PODIUM TRIBUTE (BOTH STUDENT & FACULTY) */}
      {stage === 'podium' && loaded && (
        <Podium
          track="both"
          studentTop3={student.top3}
          facultyTop3={faculty.top3}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}