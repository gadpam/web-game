import React from 'react';
import { GameAction } from '../game/reducer';
import {
  DIDACTIC_CYCLE_STEPS,
  evaluateSubjectOutcomes,
  getDidacticCycleStepForState,
  LESSON_PASSPORT,
  SELF_ANALYSIS_CHALLENGES,
  TECH_MAP_STAGES,
} from '../game/techMap';
import { SessionState } from '../types/game';

interface TechMapSelfAnalysisPanelProps {
  state: SessionState;
  dispatch?: (action: GameAction) => void;
}

export const TechMapSelfAnalysisPanel: React.FC<TechMapSelfAnalysisPanelProps> = ({
  state,
  dispatch,
}) => {
  const activeDidacticStep = getDidacticCycleStepForState(state);
  const subjectOutcomes = evaluateSubjectOutcomes(state);
  const achievedCount = subjectOutcomes.filter((o) => o.achieved).length;
  const totalMinutes = TECH_MAP_STAGES.reduce((acc, s) => acc + s.durationMin, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ================= 1. ПАСПОРТ УРОКА И 5-ШАГОВЫЙ ДИДАКТИЧЕСКИЙ ЦИКЛ ================= */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <span className="brass-nameplate">
              ДОКУМЕНТЫ 09–10 · ТЕХНОЛОГИЧЕСКАЯ КАРТА ({totalMinutes} МИН) И САМОАНАЛИЗ УРОКА
            </span>
            <h2 style={{ margin: '8px 0 4px 0', fontSize: '24px', fontWeight: 900 }}>
              {LESSON_PASSPORT.topic}
            </h2>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              <strong>Цель урока:</strong> {LESSON_PASSPORT.goal}
            </div>
          </div>

          <div
            className="mono"
            style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.38)',
              border: '1px solid var(--border-metal)',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            <div>
              Специальность: <strong>{LESSON_PASSPORT.specialty}</strong>
            </div>
            <div>
              Длительность: <strong>{LESSON_PASSPORT.duration}</strong>
            </div>
            <div>
              Тип: <strong>{LESSON_PASSPORT.lessonType}</strong>
            </div>
          </div>
        </div>

        {/* Триединая задача урока */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          {LESSON_PASSPORT.tasks.map((t) => (
            <div
              key={t.kind}
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.28)',
                borderLeft: '3px solid var(--color-action)',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--color-action)',
                  textTransform: 'uppercase',
                }}
              >
                {t.kind} задача
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>{t.text}</div>
            </div>
          ))}
        </div>

        {/* 5-шаговый цикл открытия понятия (Документ 00 п. 5, Документ 10 п. 2) */}
        <div className="material-paper" style={{ padding: '12px 16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-caption)' }}>
              ПРИБОРНЫЙ ИНДИКАТОР 5 ШАГОВ ОТКРЫТИЯ ПОНЯТИЯ (ДОКУМЕНТ 10, П. 2 — «НУЖДА ДО
              ТЕРМИНА»):
            </span>
            <span
              className="mono"
              style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-warning)' }}
            >
              Сейчас на уроке: Шаг {activeDidacticStep.step} «{activeDidacticStep.code}»
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
            }}
          >
            {DIDACTIC_CYCLE_STEPS.map((st) => {
              const isActive = st.step === activeDidacticStep.step;
              return (
                <div
                  key={st.step}
                  style={{
                    padding: '8px 10px',
                    background: isActive
                      ? 'rgba(79, 195, 247, 0.16)'
                      : 'rgba(0, 0, 0, 0.2)',
                    border: `2px solid ${
                      isActive ? 'var(--color-action)' : 'var(--border-metal)'
                    }`,
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: isActive ? 'var(--color-action)' : 'var(--text-main)',
                    }}
                  >
                    {st.title}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    {st.happensOnLesson}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                    }}
                  >
                    → {st.formedSkill}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= 2. ЖИВАЯ ТАБЛИЦА ХОДА УРОКА (90 МИНУТ · 14 ФАЗ) ================= */}
      <div className="material-paper" style={{ padding: '18px 22px', overflowX: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 800 }}>
              РАЗДЕЛ 4 ТЕХНОЛОГИЧЕСКОЙ КАРТЫ (ДОКУМЕНТ 09) · СИНХРОНИЗИРОВАН С ЧАСАМИ СМЕНЫ
            </div>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 900 }}>
              Ход 90-минутного урока (активный этап подсвечен, клик переключает сцену)
            </h3>
          </div>
          <span className="mono" style={{ fontSize: '14px', fontWeight: 800 }}>
            Текущая фаза: {state.phase} ({state.shiftClock})
          </span>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--border-metal)',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '6px 8px' }}>Время (Часы)</th>
              <th style={{ padding: '6px 8px' }}>Этап урока</th>
              <th style={{ padding: '6px 8px' }}>Деятельность преподавателя</th>
              <th style={{ padding: '6px 8px' }}>Деятельность обучающихся</th>
              <th style={{ padding: '6px 8px' }}>Формируемый результат</th>
              {dispatch && <th className="no-print" style={{ padding: '6px 8px' }}>Стенд</th>}
            </tr>
          </thead>
          <tbody>
            {TECH_MAP_STAGES.map((stage) => {
              const isCurrent = state.phase === stage.phaseId;
              return (
                <tr
                  key={stage.phaseId}
                  style={{
                    borderBottom: '1px solid var(--border-metal)',
                    background: isCurrent
                      ? 'rgba(79, 195, 247, 0.15)'
                      : 'transparent',
                  }}
                >
                  <td className="mono" style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                    <strong>{stage.realTimeSpan}</strong>
                    <div style={{ color: 'var(--color-warning)' }}>
                      смена {stage.shiftClock} ({stage.durationMin}м)
                    </div>
                  </td>
                  <td style={{ padding: '8px', fontWeight: 800 }}>
                    {stage.stageTitle}
                    {isCurrent && (
                      <div
                        className="mono"
                        style={{ fontSize: '13px', color: 'var(--color-action)' }}
                      >
                        ● ИДЁТ СЕЙЧАС
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>{stage.teacherActivity}</td>
                  <td style={{ padding: '8px' }}>{stage.studentActivity}</td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                    {stage.plannedResult}
                  </td>
                  {dispatch && (
                    <td className="no-print" style={{ padding: '8px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({ type: 'SET_PHASE', phase: stage.phaseId })
                        }
                        className={`instrument-btn mono ${
                          isCurrent ? 'btn-action' : ''
                        }`}
                        style={{ fontSize: '13px', padding: '4px 8px' }}
                      >
                        {isCurrent ? 'Активен' : 'Открыть'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= 3. ДОСТИЖЕНИЕ ПРЕДМЕТНЫХ РЕЗУЛЬТАТОВ И САМОАНАЛИЗ (ДОК. 10) ================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        {/* Левая колонка: 6 предметных результатов ФГОС / ПОИТ */}
        <div
          className="material-armor"
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="brass-nameplate">
              ПРЕДМЕТНЫЕ РЕЗУЛЬТАТЫ (ДОК. 09, П. 2)
            </span>
            <span
              className="mono"
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color:
                  achievedCount === 6 ? 'var(--color-stable)' : 'var(--color-warning)',
              }}
            >
              Подтверждено в смене: {achievedCount} / 6
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {subjectOutcomes.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.28)',
                  borderLeft: `4px solid ${
                    item.achieved ? 'var(--color-stable)' : 'var(--border-metal)'
                  }`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                >
                  <span>
                    {item.id}. {item.title}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '13px',
                      color: item.achieved
                        ? 'var(--color-stable)'
                        : 'var(--text-caption)',
                    }}
                  >
                    {item.achieved ? '✓ ОСВОЕНО' : 'В ХОДЕ СМЕНЫ'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  Проверка: {item.verificationMethod}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Правая колонка: Самоанализ — 5 проектных трудностей и их решения (Документ 10, п. 5) */}
        <div
          className="material-armor"
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span className="brass-nameplate">
            САМОАНАЛИЗ УРОКА · 5 ТРУДНОСТЕЙ И РЕШЕНИЯ (ДОК. 10, П. 5)
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SELF_ANALYSIS_CHALLENGES.map((c, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.28)',
                  borderLeft: '4px solid var(--color-warning)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800 }}>{c.challenge}</div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  <strong>Решение в проекте:</strong> {c.solution}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
