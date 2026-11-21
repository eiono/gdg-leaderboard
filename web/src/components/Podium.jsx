// web/src/components/Podium.jsx
import React, { useEffect, useState } from 'react';
import Confetti from './Confetti';
import { sounds } from '../lib/sounds';
import { useIntroData } from '../hooks/useIntroData';

function PodiumTrack({ title, badge, top3 = [], revealStep, reducedMotion }) {
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  if (!first && !second && !third) return null;

  const slots = [
    { data: second, place: 2, label: '2ND', minStep: 2, medalClass: 'race-podium--silver' },
    { data: first, place: 1, label: '1ST', minStep: 3, medalClass: 'race-podium--gold' },
    { data: third, place: 3, label: '3RD', minStep: 1, medalClass: 'race-podium--bronze' },
  ].filter((s) => Boolean(s.data));

  return (
    <section className="race-podium-section" aria-label={title}>
      <div className="race-track-pill">{badge}</div>
      <h3 className="race-podium-track-title">{title}</h3>

      <div className="race-podium-grid" role="list">
        {slots.map(({ data, place, label, minStep, medalClass }) => {
          const isVisible = reducedMotion || revealStep >= minStep;
          const displayName =
            data.name || data.studentName || data.fullName || `Rank #${place}`;
          const displayPoints = Number(
            data.points ?? data.totalPoints ?? data.score ?? data.pts ?? 0
          );
          const displayLabs = Array.isArray(data.matched)
            ? data.matched.length
            : Number(data.labs ?? data.labsCompleted ?? 0);

          return (
            <div
              key={place}
              role="listitem"
              className={`race-podium-col ${medalClass} ${isVisible ? 'is-risen' : ''}`}
            >
              {place === 1 && isVisible && (
                <>
                  <div className="race-spotlight" aria-hidden="true" />
                  <div className="race-crown" aria-hidden="true">
                    👑
                  </div>
                </>
              )}

              <div className="race-podium-card">
                <div className="race-podium-badge">{label}</div>
                <div className={`race-podium-name ${place === 1 ? 'race-gold-shimmer' : ''}`}>
                  {displayName}
                </div>
                <div className="race-podium-meta">
                  <span>{displayPoints.toLocaleString()} pts</span>
                  <span>•</span>
                  <span>{displayLabs} labs</span>
                </div>
              </div>

              <div className="race-podium-pedestal">
                <span>{place}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Podium({
  track = 'student', // 'student' | 'developer' | 'faculty' | 'both'
  top3 = [],
  studentTop3 = [],
  facultyTop3 = [],
  reducedMotion = false,
}) {
  const [revealStep, setRevealStep] = useState(reducedMotion ? 3 : 0);

  const needsAutoFetch =
    top3.length === 0 && studentTop3.length === 0 && facultyTop3.length === 0;
  const fetched = useIntroData();

  const resolvedStudents =
    studentTop3.length > 0
      ? studentTop3
      : top3.length > 0
      ? top3
      : needsAutoFetch
      ? fetched.student.top3
      : [];

  const resolvedFaculty =
    facultyTop3.length > 0
      ? facultyTop3
      : needsAutoFetch
      ? fetched.faculty.top3
      : [];

  const isFacultyTrack = track === 'developer' || track === 'faculty';
  const isBoth = track === 'both';

  const subtitle = isBoth
    ? 'Congratulations to our Student & Faculty Campaign Leaders!'
    : isFacultyTrack
    ? 'Congratulations to our Top Performing Faculty Leaders!'
    : 'Congratulations to our Top Performing Student Leaders!';

  useEffect(() => {
    if (reducedMotion) {
      setRevealStep(3);
      return undefined;
    }

    const t1 = setTimeout(() => {
      setRevealStep(1);
      sounds.play('whoosh');
    }, 120);

    const t2 = setTimeout(() => {
      setRevealStep(2);
      sounds.play('whoosh');
    }, 550);

    const t3 = setTimeout(() => {
      setRevealStep(3);
      sounds.play('fanfare');
    }, 1050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reducedMotion, track]);

  return (
    <div className="race-podium-stage">
      <Confetti active={revealStep >= 3} reducedMotion={reducedMotion} />

      <div className="race-podium-header">
        <span className="race-podium-kicker">GDG ON CAMPUS MCKV</span>
        <h2 className="race-podium-title">Top Performers</h2>
        <p className="race-podium-subtitle">{subtitle}</p>
      </div>

      <div className="race-dual-podiums">
        {(isBoth || !isFacultyTrack) && (
          <PodiumTrack
            title="Student Leaderboard"
            badge="STUDENTS"
            top3={resolvedStudents}
            revealStep={revealStep}
            reducedMotion={reducedMotion}
          />
        )}

        {(isBoth || isFacultyTrack) && resolvedFaculty.length > 0 && (
          <PodiumTrack
            title="Faculty Leaderboard"
            badge="FACULTY"
            top3={resolvedFaculty}
            revealStep={revealStep}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  );
}