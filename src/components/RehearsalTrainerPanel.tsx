import React, { useEffect, useState } from 'react';
import { GameAction } from '../game/reducer';
import {
  DISPUTE_SCENARIOS,
  DisputeScenarioId,
  REHEARSAL_CHECKPOINTS,
} from '../game/rehearsal';
import { SessionState } from '../types/game';

interface RehearsalTrainerPanelProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
}

export const RehearsalTrainerPanel: React.FC<RehearsalTrainerPanelProps> = ({
  dispatch,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [lastScenarioId, setLastScenarioId] =
    useState<DisputeScenarioId | null>(null);

  const selectCheckpoint = (id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => {
    setActiveStep(id);
    dispatch({ type: 'APPLY_REHEARSAL_CHECKPOINT', checkpointId: id });
  };

  useEffect(() => {
    if (!autoPlay) return;
    const t = window.setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev < 8 ? prev + 1 : 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
        dispatch({ type: 'APPLY_REHEARSAL_CHECKPOINT', checkpointId: next });
        if (next === 8) setAutoPlay(false);
        return next;
      });
    }, 6000);
    return () => window.clearInterval(t);
  }, [autoPlay, dispatch]);

  const currentMeta =
    REHEARSAL_CHECKPOINTS.find((c) => c.id === activeStep) ||
    REHEARSAL_CHECKPOINTS[0];

  const activeScenario = DISPUTE_SCENARIOS.find(
    (s) => s.id === lastScenarioId
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '58fr 42fr',
        gap: '14px',
      }}
    >
      {/* ЛЕВАЯ ЧАСТЬ: БЛОК КОНТРОЛЬНОГО ПРОГОНА БКП-1 (8 ТОЧЕК ДЛЯ КОМИССИИ И РЕПЕТИЦИИ) */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span className="brass-nameplate">
              БКП-1 · КОНТРОЛЬНЫЙ ПРОГОН СМЕНЫ (8 ТОЧЕК)
            </span>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
              }}
            >
              Переводит сцену (и второе окно проектора) по 8 узловым точкам урока для
              показа жюри за 90 секунд.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={activeStep <= 1}
              onClick={() =>
                selectCheckpoint(
                  Math.max(1, activeStep - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
                )
              }
              className="instrument-btn"
            >
              ← Пред.
            </button>
            <button
              type="button"
              onClick={() => {
                const next = (activeStep < 8 ? activeStep + 1 : 1) as
                  | 1
                  | 2
                  | 3
                  | 4
                  | 5
                  | 6
                  | 7
                  | 8;
                selectCheckpoint(next);
              }}
              className="instrument-btn btn-action"
            >
              След. точка →
            </button>
            <button
              type="button"
              onClick={() => {
                if (!autoPlay) {
                  selectCheckpoint(activeStep);
                }
                setAutoPlay((p) => !p);
              }}
              className={`instrument-btn ${
                autoPlay ? 'btn-warning' : 'btn-stable'
              }`}
            >
              {autoPlay ? 'Стоп автопрогона' : 'Автопрогон (шаг 6 с)'}
            </button>
          </div>
        </div>

        {/* Сетка 8 кнопок контрольных точек */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
          }}
        >
          {REHEARSAL_CHECKPOINTS.map((cp) => {
            const isActive = cp.id === activeStep;
            return (
              <button
                key={cp.id}
                type="button"
                onClick={() => selectCheckpoint(cp.id)}
                className={`instrument-btn mono ${
                  isActive ? 'btn-action' : ''
                }`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 10px',
                  fontSize: '13px',
                }}
              >
                {cp.shortTitle}
              </button>
            );
          })}
        </div>

        {/* Паспорт активной контрольной точки */}
        <div
          className="material-paper"
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--color-warning)',
              fontWeight: 800,
            }}
          >
            <span>
              ТОЧКА {currentMeta.id} ИЗ 8 · ЧАСЫ СМЕНЫ {currentMeta.shiftClock}
            </span>
            <span>СИНХРОННО С ПРОЕКТОРОМ</span>
          </div>

          <div style={{ fontSize: '17px', fontWeight: 900 }}>
            {currentMeta.title}
          </div>

          <div style={{ fontSize: '14px' }}>
            <strong style={{ color: 'var(--text-caption)' }}>
              На экране зала:
            </strong>{' '}
            {currentMeta.hallVisual}
          </div>

          <div
            className="mono"
            style={{
              fontSize: '14px',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.28)',
              borderLeft: '3px solid var(--color-action)',
            }}
          >
            <strong>Реплика вслух:</strong> {currentMeta.speakerLine}
          </div>

          <div style={{ fontSize: '13px', color: 'var(--color-stable)' }}>
            <strong>Методический акцент для комиссии:</strong>{' '}
            {currentMeta.pedagogicalGoal}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ТРЕНАЖЁР СПОРНЫХ СИТУАЦИЙ (РАЗДЕЛ 11 РЕГЛАМЕНТА) */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div>
          <span className="brass-nameplate">
            ТРЕНАЖЁР СПОРНЫХ СИТУАЦИЙ (РАЗДЕЛ 11 РЕГЛАМЕНТА)
          </span>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            Имитирует 5 реальных ошибок и ловушек бригад на уроке для тренировки
            ведущего и арбитра:
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {DISPUTE_SCENARIOS.map((sc) => {
            const isSelected = lastScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setLastScenarioId(sc.id);
                  dispatch({
                    type: 'SIMULATE_DISPUTE_SCENARIO',
                    scenarioId: sc.id,
                  });
                }}
                className={`instrument-btn ${
                  isSelected ? 'btn-warning' : ''
                }`}
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                >
                  <span>{sc.title}</span>
                  <span
                    className="mono"
                    style={{ fontSize: '12px', color: 'var(--color-warning)' }}
                  >
                    Смоделировать →
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  {sc.description}
                </div>
              </button>
            );
          })}
        </div>

        {activeScenario && (
          <div
            className="material-paper gesture-card-drop"
            style={{
              padding: '10px 12px',
              borderLeftColor: 'var(--color-warning)',
              fontSize: '13px',
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--color-warning)' }}>
              СМОДЕЛИРОВАНО ({activeScenario.regulationRule}):
            </div>
            <div style={{ marginTop: '3px' }}>
              {activeScenario.expectedOutcome}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
