import React, { useEffect, useMemo, useState } from 'react';
import {
  BATTLE_TACTS,
  PATCH_SLOTS,
  PHASES,
  PROLOGUE_MINES,
  PROLOGUE_SECOND_WAVE_LOGS,
  WORLD_PRESETS,
} from '../game/constants';
import { getUnlockedShieldCount, isShieldComplete } from '../game/engine';
import { GameAction } from '../game/reducer';
import { getWorldPolygonFiles, getWorldPrologueLogs } from '../game/worldPolygons';
import {
  BrigadeId,
  PhaseId,
  ScreenView,
  SessionState,
} from '../types/game';
import { PracticeWorkbench } from './PracticeWorkbench';
import { FinalPhasesPanel } from './FinalPhasesPanel';
import { REHEARSAL_CHECKPOINTS } from '../game/rehearsal';
import { PolygonFileTreeBar } from './PolygonFileTreeBar';
import {
  AutonomousQueueStrip,
  ManualVoiceCardBar,
} from './ManualAutonomousStrip';
import { DidacticCycleStrip } from './DidacticCycleStrip';
import { PrologueWorkbench } from './PrologueWorkbench';

interface HallScreenProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  onNavigateScreen: (screen: ScreenView) => void;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderClockWithLiveColon(clockStr: string, running: boolean): React.ReactNode {
  const parts = clockStr.split(':');
  if (parts.length !== 2) return clockStr;
  return (
    <>
      <span>{parts[0]}</span>
      <span className={running ? 'live-colon' : ''}>:</span>
      <span>{parts[1]}</span>
    </>
  );
}

const COMPACT_PHASE_TABS: { id: PhaseId; label: string; group?: string }[] = [
  { id: 'prologue_1', label: '03:00 Завязка' },
  { id: 'battle_1', label: 'Бой 1' },
  { id: 'battle_2', label: 'Бой 2' },
  { id: 'battle_3', label: 'Бой 3' },
  { id: 'battle_4', label: 'Бой 4' },
  { id: 'practice', label: '08:05 Практика' },
  { id: 'five_min', label: '08:55 Отсчёт' },
  { id: 'start_0900', label: '09:00 Старт' },
  { id: 'closed', label: '09:07 Итог' },
  { id: 'homework', label: '09:15 ДЗ' },
];

export const HallScreen: React.FC<HallScreenProps> = ({
  state,
  dispatch,
  onNavigateScreen,
}) => {
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(false);
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);
  const [didacticStripOpen, setDidacticStripOpen] = useState(false);
  const [prologueLabMode, setPrologueLabMode] = useState(false);
  const [tracingLine, setTracingLine] = useState<number | null>(null);

  const currentPhaseMeta =
    PHASES.find((p) => p.id === state.phase) || PHASES[0];
  const activeBattle = state.battles[state.currentBattleNumber];
  const activeTactMeta =
    BATTLE_TACTS.find((t) => t.id === activeBattle.tact) || BATTLE_TACTS[0];
  const worldMeta = WORLD_PRESETS[state.world];
  const worldPolygonFiles = getWorldPolygonFiles(state.world);
  const worldPrologueLogs = getWorldPrologueLogs(state.world);
  const shieldUnlockedCount = getUnlockedShieldCount(state);
  const shieldReady = isShieldComplete(state);

  const isPrologue = state.phase.startsWith('prologue_');
  const isPracticePhase = state.phase === 'practice';
  const isFinalPhasePanel =
    state.phase === 'five_min' ||
    state.phase === 'closed' ||
    state.phase === 'homework';
  const isQueueBoardPhase = state.phase === 'start_0900';

  const currentPolygonSpec = worldPolygonFiles[state.selectedPolygonFile];

  // Анимация пробежки луча по строкам кода при запуске полигона
  const handleLivePolygonRun = () => {
    dispatch({ type: 'RUN_POLYGON' });
    const lines = currentPolygonSpec.lines.map((l) => l.line);
    if (lines.length === 0) return;
    let idx = 0;
    setTracingLine(lines[0]);
    const interval = window.setInterval(() => {
      idx += 1;
      if (idx < lines.length) {
        setTracingLine(lines[idx]);
      } else {
        window.clearInterval(interval);
        setTracingLine(null);
      }
    }, 38);
  };

  useEffect(() => {
    setTracingLine(null);
  }, [state.selectedPolygonFile, state.phase]);

  const queueCells = useMemo(() => {
    const total = 1240;
    const cells: ('empty' | 'issued' | 'hole' | 'mine')[] = new Array(total).fill(
      'empty'
    );

    if (!state.queue.started && state.phase !== 'closed') {
      return cells;
    }

    state.waves.forEach((wave, waveIdx) => {
      if (wave.status === 'ожидание') return;
      const startIdx = waveIdx * 310;
      const endIdx = startIdx + 310;
      for (let i = startIdx; i < endIdx; i++) {
        if (
          wave.status === 'пробила' &&
          i >= startIdx + 140 &&
          i < startIdx + 170
        ) {
          cells[i] = 'hole';
        } else {
          cells[i] = 'issued';
        }
      }
    });

    return cells;
  }, [state.queue.started, state.phase, state.waves]);

  return (
    <div>
      {/* Сигнал Стоп-крана Арбитра на спорной карте (Документ 10, п. 7) */}
      {activeBattle.arbiterStopActive && (
        <div
          className="material-armor no-print gesture-card-drop"
          style={{
            margin: '8px 14px 0 14px',
            padding: '10px 16px',
            borderLeft: '6px solid var(--color-warning)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-warning)',
              }}
            >
              СТОП-КРАН АРБИТРА ({activeBattle.arbiter}) · БОЙ ПРИОСТАНОВЛЕН НА СПОРНОЙ КАРТЕ
            </div>
            <div className="mono" style={{ fontSize: '13px' }}>
              Причина: {activeBattle.arbiterStopReason}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_ARBITER_STOP' })}
            className="instrument-btn btn-stable"
          >
            Снять стоп-кран и продолжить бой
          </button>
        </div>
      )}

      {/* Сигнал Апелляции Докладчика (30 с, одна на бой — Документ 01, п. 7) */}
      {activeBattle.appealUsed && activeBattle.appealRemainingSec > 0 && (
        <div
          className="material-armor no-print gesture-card-drop"
          style={{
            margin: '8px 14px 0 14px',
            padding: '10px 16px',
            borderLeft: '6px solid var(--color-action)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-action)',
              }}
            >
              АПЕЛЛЯЦИЯ ДОКЛАДЧИКА ({activeBattle.defender}) · ОДНА НА БОЙ · 30 СЕКУНД
            </div>
            <div className="mono" style={{ fontSize: '13px' }}>
              Разбирается арбитром ({activeBattle.arbiter}) немедленно. Решение арбитра окончательное.
            </div>
          </div>
          <div className="seven-segment-window amber-zone" style={{ fontSize: '24px' }}>
            00:{String(activeBattle.appealRemainingSec).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Основная сцена зала: 62% слева (монитор) + 38% справа (приборная панель) */}
      <div className="hall-layout">
        {/* ================= ЛЕВАЯ ЗОНА (~62%): МОНИТОР СЦЕНЫ ================= */}
        <section
          className="material-screen"
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Верхняя кромка монитора: живая осциллограмма 55 Гц + фаза + компактная лента переходов */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              borderBottom: '1px solid var(--border-metal)',
              paddingBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Живая осциллограмма 55 Гц */}
              <div
                style={{
                  width: '54px',
                  height: '32px',
                  background: '#02060b',
                  border: '1px solid var(--border-metal)',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                }}
                title="Несущая частота сервера 55 Гц — телеметрия активна"
              >
                <svg width="48" height="24" viewBox="0 0 48 24">
                  <path
                    className="osc-wave-path"
                    d="M 0 12 L 8 12 L 12 4 L 16 20 L 20 7 L 24 17 L 28 12 L 36 12 L 40 6 L 44 18 L 48 12"
                    fill="none"
                    stroke={
                      state.phase === 'prologue_2' && state.prologue.batchCrashed
                        ? 'var(--color-incident)'
                        : 'var(--color-stable)'
                    }
                    strokeWidth="1.8"
                  />
                </svg>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-caption)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  МОНИТОР · {worldMeta.serviceName.toUpperCase()} · 55 Гц · ОЧЕРЕДЬ 1 240 · КОД{' '}
                  <span className="mono" style={{ color: 'var(--color-warning)' }}>
                    {state.code}
                  </span>
                </div>
                <h1
                  style={{
                    margin: '1px 0 0 0',
                    fontSize: '21px',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                  }}
                >
                  {currentPhaseMeta.title}
                </h1>
              </div>
            </div>

            {/* Компактная лента фаз + выдвижная кнопка «Инструменты ▾» */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              {COMPACT_PHASE_TABS.map((pt) => {
                const isActive =
                  pt.id === 'prologue_1'
                    ? isPrologue
                    : state.phase === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_PHASE', phase: pt.id })}
                    className={`instrument-btn ${isActive ? 'btn-action' : ''}`}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    {pt.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setDidacticStripOpen((p) => !p)}
                className={`instrument-btn ${didacticStripOpen ? 'btn-action' : ''}`}
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title="Показать / скрыть 5-шаговый цикл «Нужда → Имя»"
              >
                Цикл 1→5
              </button>

              <button
                type="button"
                onClick={() => setToolsDrawerOpen((p) => !p)}
                className={`instrument-btn ${toolsDrawerOpen ? 'btn-warning' : ''}`}
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title="Контрольные точки БКП-1 для жюри"
              >
                БКП-1 {toolsDrawerOpen ? '▴' : '▾'}
              </button>
            </div>
          </div>

          {didacticStripOpen && (
            <DidacticCycleStrip state={state} dispatch={dispatch} compact />
          )}

          {toolsDrawerOpen && (
            <div
              className="material-armor no-print gesture-card-drop"
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span className="brass-nameplate" style={{ fontSize: '11px' }}>
                БКП-1 · 8 ТОЧЕК ПРОГОНА
              </span>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {REHEARSAL_CHECKPOINTS.map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'APPLY_REHEARSAL_CHECKPOINT',
                        checkpointId: cp.id,
                      })
                    }
                    className="instrument-btn mono"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    title={`${cp.title} — ${cp.speakerLine}`}
                  >
                    {cp.shortTitle}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= СОДЕРЖИМОЕ МОНИТОРА ПО ФАЗЕ ================= */}
          {isPrologue && (
            <div
              className="gesture-plate-rise"
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}
            >
              {/* Переключатель 4 сцен завязки + тумблер Интерактивной лаборатории */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(
                    [
                      { id: 'prologue_1', label: 'Сцена 1 · Вход (03:00)' },
                      { id: 'prologue_2', label: 'Сцена 2 · Вскрытие (03:05)' },
                      { id: 'prologue_3', label: 'Сцена 3 · Отбито (03:14)' },
                      { id: 'prologue_4', label: 'Сцена 4 · Продолжение (03:17)' },
                    ] as const
                  ).map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        setPrologueLabMode(false);
                        dispatch({ type: 'SET_PHASE', phase: sc.id });
                      }}
                      className={`instrument-btn ${
                        !prologueLabMode && state.phase === sc.id ? 'btn-action' : ''
                      }`}
                      style={{ padding: '5px 10px', fontSize: '13px' }}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPrologueLabMode((p) => !p)}
                  className={`instrument-btn ${prologueLabMode ? 'btn-warning' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '12.5px' }}
                >
                  {prologueLabMode
                    ? '← Вернуться к сцене проектора'
                    : 'Интерактивный стенд пролога (55 Гц)'}
                </button>
              </div>

              {prologueLabMode ? (
                <PrologueWorkbench
                  state={state}
                  dispatch={dispatch}
                  activeBrigade="TRY"
                />
              ) : (
                <>
                  {/* СЦЕНА 1: ВХОД */}
                  {state.phase === 'prologue_1' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '10px',
                        }}
                      >
                        <div className="material-armor" style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-caption)' }}>
                            СЕССИЯ / АДРЕС
                          </div>
                          <div className="mono" style={{ fontSize: '19px', fontWeight: 800 }}>
                            test/test · 91.42.117.6
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            02:07:44 → 02:48:57 (41 мин)
                          </div>
                        </div>
                        <div className="material-armor" style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-caption)' }}>
                            ВЫГРУЗКА ДАННЫХ
                          </div>
                          <div
                            className="mono"
                            style={{
                              fontSize: '24px',
                              fontWeight: 900,
                              color: 'var(--color-stable)',
                            }}
                          >
                            0 БАЙТ
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            ничего не похищено, удалено: 0
                          </div>
                        </div>
                        <div className="material-armor" style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-caption)' }}>
                            ОСТАВЛЕНО В ПАКЕТЕ
                          </div>
                          <div
                            className="mono"
                            style={{
                              fontSize: '24px',
                              fontWeight: 900,
                              color: 'var(--color-incident)',
                            }}
                          >
                            26 ЗАПИСЕЙ
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            не проходят контроль целостности
                          </div>
                        </div>
                        <div className="material-armor" style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-caption)' }}>
                            СТАВКА К 09:00
                          </div>
                          <div
                            className="mono"
                            style={{
                              fontSize: '24px',
                              fontWeight: 900,
                              color: 'var(--color-warning)',
                            }}
                          >
                            1 240 ЧЕЛ.
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            до старта 06:11 · отв.: не назначен
                          </div>
                        </div>
                      </div>

                      {/* Живой терминальный поток диспетчерской с построчным появлением и курсором */}
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.52)',
                          border: '1px solid var(--border-metal)',
                          padding: '12px 14px',
                          borderRadius: '3px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: 'var(--text-caption)',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          <span>ЛЕНТА ДИСПЕТЧЕРСКОЙ · {worldMeta.serviceName.toUpperCase()}</span>
                          <span className="mono" style={{ color: 'var(--color-stable)' }}>
                            ● LIVE STREAM
                          </span>
                        </div>
                        {worldPrologueLogs.map((item, idx) => (
                          <div
                            key={idx}
                            className="code-line-row terminal-stream-line"
                            style={{
                              animationDelay: `${idx * 110}ms`,
                              fontSize: '19px',
                              cursor: 'default',
                              color:
                                item.level === 'danger'
                                  ? 'var(--color-incident)'
                                  : 'var(--text-main)',
                            }}
                          >
                            <span style={{ width: '95px', color: 'var(--text-caption)' }}>
                              {item.time}
                            </span>
                            <span
                              style={{
                                width: '125px',
                                color: 'var(--color-warning)',
                                fontWeight: 700,
                              }}
                            >
                              {item.unit}
                            </span>
                            <span>
                              {item.text}
                              {idx === worldPrologueLogs.length - 1 && (
                                <span className="terminal-cursor" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="material-paper" style={{ padding: '12px 16px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-caption)',
                                fontWeight: 700,
                              }}
                            >
                              ВОПРОС НА КЛИЕНТАХ (18 УЧАСТНИКОВ)
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 800 }}>
                              Что произошло в ночную смену?
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() =>
                                dispatch({ type: 'PROLOGUE_VOTE', option: 'broken' })
                              }
                              className="instrument-btn"
                            >
                              «сервис сломался» ({state.prologue.pollVotes.broken})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                dispatch({ type: 'PROLOGUE_VOTE', option: 'intrusion' })
                              }
                              className="instrument-btn btn-action"
                            >
                              «в сервис вошли» ({state.prologue.pollVotes.intrusion})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                dispatch({ type: 'PROLOGUE_VOTE', option: 'dataLost' })
                              }
                              className="instrument-btn"
                            >
                              «данные потеряны» ({state.prologue.pollVotes.dataLost})
                            </button>
                            <button
                              type="button"
                              onClick={() => dispatch({ type: 'PROLOGUE_REVEAL_POLL' })}
                              className="instrument-btn btn-warning"
                            >
                              Показать верный ответ
                            </button>
                          </div>
                        </div>

                        {state.prologue.pollRevealed && (
                          <div
                            className="gesture-card-drop"
                            style={{
                              marginTop: '10px',
                              padding: '10px 14px',
                              background: 'rgba(255, 93, 93, 0.14)',
                              borderLeft: '4px solid var(--color-incident)',
                              fontSize: '17px',
                              fontWeight: 700,
                            }}
                          >
                            ВТОРЖЕНИЕ — доступ с чужой учётной записи (test/test). Данные не
                            похищены. В очередь вставлено 26 записей.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* СЦЕНА 2: ВСКРЫТИЕ */}
                  {state.phase === 'prologue_2' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>
                            Пакет очереди: 1 240 записей · Четыре мины подсвечены
                          </div>
                          <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                            Запустите обработку пакета и прочитайте имя и адрес падения.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'PROLOGUE_CRASH_BATCH' })}
                            className="instrument-btn btn-incident"
                          >
                            Запустить пакет (без защиты)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              PROLOGUE_MINES.forEach((m) =>
                                dispatch({
                                  type: 'PROLOGUE_MATCH_MINE',
                                  mineId: m.id,
                                  exceptionType: m.expectedType,
                                })
                              );
                            }}
                            className="instrument-btn btn-stable"
                          >
                            Сопоставить все 4 типа (Правило №1)
                          </button>
                        </div>
                      </div>

                      {state.prologue.batchCrashed && (
                        <div
                          className="gesture-card-drop"
                          style={{
                            padding: '12px 16px',
                            background: 'rgba(255, 93, 93, 0.16)',
                            border: '2px solid var(--color-incident)',
                            borderRadius: '3px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <div
                              className="mono"
                              style={{
                                fontSize: '22px',
                                fontWeight: 900,
                                color: 'var(--color-incident)',
                              }}
                            >
                              FormatException · Booking.cs:12 · запись #0x1F3
                            </div>
                            <div style={{ fontSize: '14.5px', color: 'var(--text-main)' }}>
                              «У падения есть имя и адрес. Имя — это тип. Адрес — строка.» Одна
                              запись остановила все 1 240 билетов.
                            </div>
                          </div>
                          <span className="heavy-stamp stamp-probed">ПАКЕТ УПАЛ</span>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '8px',
                        }}
                      >
                        {PROLOGUE_MINES.map((mine) => {
                          const currentMatch = state.prologue.matchedMines[mine.id] || '';
                          const isCorrect = currentMatch === mine.expectedType;
                          return (
                            <div
                              key={mine.id}
                              className="material-armor"
                              style={{
                                padding: '10px',
                                borderColor: isCorrect
                                  ? 'var(--color-stable)'
                                  : 'var(--border-metal)',
                              }}
                            >
                              <div
                                className="mono"
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--color-warning)',
                                  fontWeight: 700,
                                }}
                              >
                                {mine.recordHex} · {mine.fileLine}
                              </div>
                              <div
                                className="mono"
                                style={{ fontSize: '17px', fontWeight: 800, margin: '4px 0' }}
                              >
                                {mine.field} = {mine.badValue}
                              </div>
                              <div
                                style={{
                                  fontSize: '12.5px',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '6px',
                                }}
                              >
                                {mine.message}
                              </div>
                              <select
                                aria-label={`Тип для ${mine.recordHex}`}
                                value={currentMatch}
                                onChange={(e) =>
                                  dispatch({
                                    type: 'PROLOGUE_MATCH_MINE',
                                    mineId: mine.id,
                                    exceptionType: e.target.value,
                                  })
                                }
                                className="instrument-btn mono"
                                style={{ width: '100%', fontSize: '12.5px', padding: '4px 6px' }}
                              >
                                <option value="">— Тип исключения —</option>
                                <option value="FormatException">FormatException</option>
                                <option value="DivideByZeroException">
                                  DivideByZeroException
                                </option>
                                <option value="IndexOutOfRangeException">
                                  IndexOutOfRangeException
                                </option>
                                <option value="NullReferenceException">
                                  NullReferenceException
                                </option>
                              </select>
                            </div>
                          );
                        })}
                      </div>

                      <div className="material-paper" style={{ padding: '10px 14px' }}>
                        <div
                          className="mono"
                          style={{
                            fontSize: '15px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              padding: '3px 9px',
                              background: 'rgba(255,176,32,0.18)',
                              border: '1px solid var(--color-warning)',
                            }}
                          >
                            System.Exception
                          </span>
                          <span>→</span>
                          <span
                            style={{
                              padding: '3px 9px',
                              background: 'rgba(79,195,247,0.16)',
                              border: '1px solid var(--color-action)',
                            }}
                          >
                            SystemException
                          </span>
                          <span>→</span>
                          <span style={{ color: 'var(--color-stable)', fontWeight: 700 }}>
                            [ FormatException · DivideByZeroException · IndexOutOfRangeException · NullReferenceException ]
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* СЦЕНА 3: ОТБИТО */}
                  {state.phase === 'prologue_3' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>
                          «В смене три инструмента: TRY, CATCH, FINALLY. Соберите механизм и прогоните пакет заново.»
                        </div>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'PROLOGUE_REPEL_BATCH' })}
                          className="instrument-btn btn-stable"
                          style={{ fontSize: '15px', padding: '8px 16px' }}
                        >
                          Запустить пакет с TRY-CATCH-FINALLY
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '10px',
                        }}
                      >
                        {(
                          [
                            {
                              id: 'TRY' as BrigadeId,
                              symbol: '▲',
                              role: 'TRY очерчивает опасную зону',
                              code: 'try { Booking.Parse(req); }',
                            },
                            {
                              id: 'CATCH' as BrigadeId,
                              symbol: '⬡',
                              role: 'CATCH ловит конкретный тип',
                              code: 'catch (FormatException ex) { report.Add(ex); }',
                            },
                            {
                              id: 'FINALLY' as BrigadeId,
                              symbol: '■',
                              role: 'FINALLY убирает за собой — всегда',
                              code: 'finally { conn.Close(); }',
                            },
                          ] as const
                        ).map((part) => {
                          const active = state.prologue.mechanismParts[part.id];
                          return (
                            <div
                              key={part.id}
                              onClick={() =>
                                dispatch({
                                  type: 'PROLOGUE_TOGGLE_MECHANISM',
                                  part: part.id,
                                })
                              }
                              className="material-armor"
                              style={{
                                padding: '12px',
                                cursor: 'pointer',
                                borderColor: active
                                  ? 'var(--color-stable)'
                                  : 'var(--border-metal)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <span className="brass-nameplate">
                                  <span>{part.symbol}</span>
                                  <span>{part.id}</span>
                                </span>
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: '12px',
                                    color: active
                                      ? 'var(--color-stable)'
                                      : 'var(--text-caption)',
                                    fontWeight: 700,
                                  }}
                                >
                                  {active ? 'ПОДКЛЮЧЁН' : 'ВКЛЮЧИТЬ'}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: '15px',
                                  fontWeight: 700,
                                  marginTop: '8px',
                                }}
                              >
                                {part.role}
                              </div>
                              <div
                                className="mono"
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--text-secondary)',
                                  marginTop: '4px',
                                }}
                              >
                                {part.code}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {state.prologue.batchRepelled && (
                        <div
                          className="material-paper gesture-card-drop"
                          style={{
                            padding: '14px 18px',
                            borderLeftColor: 'var(--color-stable)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '14px',
                          }}
                        >
                          <div>
                            <div
                              className="mono"
                              style={{
                                fontSize: '20px',
                                fontWeight: 800,
                                color: 'var(--color-stable)',
                              }}
                            >
                              прошло: 1214 · в отчёт: 26 · остановок: 0 · статус ОК · до старта 05:46
                            </div>
                            <div style={{ fontSize: '14px', marginTop: '4px' }}>
                              «Двадцать шесть — в отчёт. Тысяча двести четырнадцать — билеты.» Правило щита №2 (МЕХАНИЗМ) открыто.
                            </div>
                          </div>
                          <span className="heavy-stamp stamp-repelled">ОТБИТО</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* СЦЕНА 4: ПРОДОЛЖЕНИЕ */}
                  {state.phase === 'prologue_4' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.52)',
                          border: '1px solid var(--color-incident)',
                          padding: '12px 16px',
                          borderRadius: '3px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-incident)',
                            fontWeight: 700,
                            marginBottom: '6px',
                          }}
                        >
                          03:17:10 · ЛОГ ОЖИВАЕТ САМ (БЕЗ КОМАНДЫ ВЕДУЩЕГО)
                        </div>
                        {PROLOGUE_SECOND_WAVE_LOGS.map((l, i) => (
                          <div
                            key={i}
                            className="code-line-row terminal-stream-line"
                            style={{
                              animationDelay: `${i * 120}ms`,
                              fontSize: '18px',
                              color: 'var(--color-incident)',
                            }}
                          >
                            <span style={{ width: '95px', color: 'var(--text-caption)' }}>
                              {l.time}
                            </span>
                            <span style={{ width: '100px', color: 'var(--color-warning)' }}>
                              {l.unit}
                            </span>
                            <span>
                              {l.text}
                              {i === PROLOGUE_SECOND_WAVE_LOGS.length - 1 && (
                                <span className="terminal-cursor" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div
                        className="material-armor"
                        style={{
                          padding: '16px 20px',
                          borderLeft: '6px solid var(--color-incident)',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '36px',
                            fontWeight: 900,
                            letterSpacing: '0.14em',
                            color: 'var(--color-incident)',
                          }}
                        >
                          АТАКИ ПРОДОЛЖАТСЯ
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: '17px',
                            color: 'var(--text-main)',
                            marginTop: '4px',
                          }}
                        >
                          ДО СТАРТА 05:43 · ПРОГОНОВ: 4 · БРИГАД: 3 · КОД ПАРТИИ:{' '}
                          <strong style={{ color: 'var(--color-warning)' }}>{state.code}</strong>
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            marginTop: '4px',
                          }}
                        >
                          «Вы закрыли одну дверь. Он пойдёт в те три, что остались открытыми. Защита от атаки не равна защите от класса атак.»
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '10px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {[
                            '1. формат (▲ TRY)',
                            '2. порядок (⬡ CATCH)',
                            '3. ресурс (■ FINALLY)',
                            '4. след (Арбитр)',
                          ].map((dir) => (
                            <span
                              key={dir}
                              className="mono"
                              style={{
                                padding: '4px 10px',
                                background: 'rgba(255, 176, 32, 0.15)',
                                border: '1px solid var(--color-warning)',
                                fontSize: '13px',
                                fontWeight: 700,
                              }}
                            >
                              {dir}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================= ФАЗА 08:05 ПРАКТИКА: КОНСТРУКТОР ПОЛНОГО ПАТЧА ================= */}
          {isPracticePhase && (
            <PracticeWorkbench state={state} dispatch={dispatch} />
          )}

          {/* ================= ФАЗЫ 08:55 ОТСЧЁТ / 09:07 РЕФЛЕКСИЯ / 09:15 ДЗ ================= */}
          {isFinalPhasePanel && (
            <FinalPhasesPanel
              state={state}
              dispatch={dispatch}
              onNavigateScreen={onNavigateScreen}
            />
          )}

          {/* ================= ФАЗА БОЁВ 1–4, ЗАТИШЬЯ: ПОЛИГОН КОДА ================= */}
          {!isPrologue && !isPracticePhase && !isFinalPhasePanel && !isQueueBoardPhase && (
            <div
              className="gesture-plate-rise"
              style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}
            >
              {(state.mode === 'РУЧНОЙ' || state.mode === 'АВТОНОМНЫЙ') && (
                <ManualVoiceCardBar state={state} dispatch={dispatch} />
              )}
              {state.phase === 'lull' && (
                <div
                  className="material-paper"
                  style={{
                    padding: '10px 14px',
                    borderLeftColor: 'var(--color-warning)',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>
                    06:00 · ЗАТИШЬЕ · «Пока тихо. Это и есть худшее.»
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    Две минуты без атак между Боем 2 и Боем 3. Группа переводит дух, ведущий показывает комиссии состояние приборной панели и щита.
                  </div>
                </div>
              )}

              {/* Компактная полоса 5 файлов полигона */}
              <PolygonFileTreeBar state={state} dispatch={dispatch} />

              {/* Монитор кода с живым лучом трассировки при запуске */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.52)',
                  border: '1px solid var(--border-metal)',
                  borderRadius: '3px',
                  padding: '8px 0',
                  overflowX: 'auto',
                  flex: 1,
                }}
              >
                {currentPolygonSpec.lines.map((lineObj) => {
                  const isSelected = state.selectedLine === lineObj.line;
                  const isTracing = tracingLine === lineObj.line;
                  const isPatched =
                    lineObj.battleTag &&
                    activeBattle.activeSlots.includes(lineObj.battleTag);
                  const rowClass = [
                    'code-line-row',
                    isSelected ? 'selected-line' : '',
                    isTracing ? 'tracing-line' : '',
                    lineObj.vulnerable
                      ? isPatched
                        ? 'patched-line'
                        : 'vulnerable-line'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div
                      key={lineObj.line}
                      className={rowClass}
                      onClick={() =>
                        dispatch({ type: 'SELECT_LINE', line: lineObj.line })
                      }
                    >
                      <span
                        style={{
                          width: '44px',
                          flexShrink: 0,
                          color: isSelected
                            ? 'var(--color-action)'
                            : 'var(--text-caption)',
                          fontWeight: isSelected ? 800 : 400,
                          textAlign: 'right',
                          paddingRight: '12px',
                        }}
                      >
                        {lineObj.line}
                      </span>
                      <span style={{ whiteSpace: 'pre' }}>
                        {lineObj.code}
                        {isSelected && <span className="terminal-cursor" />}
                      </span>
                      {lineObj.humanNote && (
                        <span className="human-annotation">{lineObj.humanNote}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Компактная приборная кассета 4 слотов патчей (клавиши 1–4) + кнопка ЖИВОЙ ЗАПУСК (Enter) */}
              <div
                className="material-armor"
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
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
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>
                    СЛОТЫ ПАТЧЕЙ ПОЛИГОНА (КЛАВИШИ 1–4) · БОЙ {activeBattle.number} «{activeBattle.codeName.toUpperCase()}»
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {activeBattle.number === 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_COUNTER_VECTOR',
                            vector:
                              activeBattle.counterAttackMode === 'divide_by_zero'
                                ? null
                                : 'divide_by_zero',
                          })
                        }
                        className={`instrument-btn ${
                          activeBattle.counterAttackMode === 'divide_by_zero'
                            ? 'btn-incident'
                            : ''
                        }`}
                        style={{ fontSize: '12.5px', padding: '5px 10px' }}
                      >
                        Контратака: count = 0 (стр. 14)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLivePolygonRun}
                      className="instrument-btn btn-action"
                      style={{ fontSize: '14px', padding: '6px 14px' }}
                    >
                      ▶ ЖИВОЙ ЗАПУСК [Enter]
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                  }}
                >
                  {PATCH_SLOTS.map((slot) => {
                    const active = activeBattle.activeSlots.includes(slot.slot);
                    return (
                      <button
                        key={slot.slot}
                        type="button"
                        onClick={() =>
                          dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: slot.slot })
                        }
                        className={`instrument-btn ${active ? 'btn-stable' : ''}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          padding: '6px 9px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            fontSize: '12.5px',
                            fontWeight: 800,
                          }}
                        >
                          <span>
                            [{slot.hotkey}] {slot.shortName}
                          </span>
                          <span
                            className={`fuse-lamp ${active ? 'lamp-on' : 'lamp-off'}`}
                            style={{ width: '9px', height: '9px' }}
                          />
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: '100%',
                          }}
                        >
                          {slot.codeSnippet}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeBattle.lastRun && (
                <div
                  className="material-paper gesture-card-drop"
                  style={{
                    padding: '10px 14px',
                    borderLeftColor:
                      activeBattle.lastRun.outcome === 'ПРОБИЛА'
                        ? 'var(--color-incident)'
                        : 'var(--color-stable)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-caption)',
                        fontWeight: 700,
                      }}
                    >
                      ВЫВОД ПОЛИГОНА · {activeBattle.lastRun.file}:
                      {activeBattle.lastRun.targetLine} · {activeBattle.lastRun.durationMs} мс
                    </div>
                    {activeBattle.lastRun.consoleLog.map((line, i) => (
                      <div
                        key={i}
                        className="mono terminal-stream-line"
                        style={{
                          animationDelay: `${i * 70}ms`,
                          fontSize: '13.5px',
                          color:
                            line.includes('НЕОБРАБОТАННОЕ') ||
                            line.includes('ПРОБИЛА') ||
                            line.includes('ОШИБКА CS0160')
                              ? 'var(--color-incident)'
                              : line.includes('ОТБИТА')
                              ? 'var(--color-stable)'
                              : 'var(--text-main)',
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className={`heavy-stamp ${
                        activeBattle.lastRun.outcome === 'ПРОБИЛА'
                          ? 'stamp-probed'
                          : 'stamp-repelled'
                      }`}
                    >
                      {activeBattle.lastRun.outcome}
                    </span>
                    <div
                      className="mono"
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      Билетов: {activeBattle.lastRun.processedRecords}/1240 · В отчёт:{' '}
                      {activeBattle.lastRun.reportedMines}/26
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= ФАЗА 09:00 СТАРТ ПРОДАЖ: ТАБЛО ИЗ 1 240 КЛЕТОК ================= */}
          {isQueueBoardPhase && (
            <div
              className="gesture-plate-rise"
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-caption)',
                      fontWeight: 700,
                    }}
                  >
                    09:00 · СТАРТ ПРОДАЖ · ОДНА ПОПЫТКА · КАЖДАЯ ПРОБИТАЯ ВОЛНА = −30 ЧЕЛОВЕК
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '34px',
                      fontWeight: 900,
                      color:
                        state.queue.lost === 0 && state.queue.started
                          ? 'var(--color-stable)'
                          : state.queue.lost > 0
                          ? 'var(--color-warning)'
                          : 'var(--text-main)',
                    }}
                  >
                    {worldMeta.unitLabel.toUpperCase()}:{' '}
                    {state.queue.started ? state.queue.issued : 0} ИЗ {state.queue.total}
                  </div>
                  {state.queue.lossReasons.length > 0 && (
                    <div
                      className="mono"
                      style={{
                        fontSize: '15px',
                        color: 'var(--color-incident)',
                        fontWeight: 700,
                      }}
                    >
                      Пробито: {state.queue.lossReasons.join(', ')} · Потеряно:{' '}
                      {state.queue.lost} человек
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!shieldReady && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'UNLOCK_ALL_SHIELD' })}
                      className="instrument-btn btn-warning"
                    >
                      Собрать Щит 6/6 (ревизия)
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!shieldReady}
                    onClick={() => dispatch({ type: 'TRIGGER_START_0900' })}
                    className="instrument-btn btn-stable"
                    style={{ fontSize: '15px', padding: '8px 18px' }}
                  >
                    {shieldReady
                      ? 'СТАРТ 09:00 (Запустить 4 волны)'
                      : `СТАРТ ЗАБЛОКИРОВАН (ЩИТ ${shieldUnlockedCount}/6)`}
                  </button>
                  {state.queue.slowGroupMode && state.queue.started && !state.queue.completed && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'STEP_WAVE_0900' })}
                      className="instrument-btn btn-action"
                    >
                      Следующая волна (+30 с)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateScreen('materials')}
                    className="instrument-btn"
                  >
                    Протокол смены (A4)
                  </button>
                </div>
              </div>

              {state.mode !== 'ПОЛНЫЙ' && (
                <AutonomousQueueStrip state={state} dispatch={dispatch} />
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                }}
              >
                {state.waves.map((wave) => {
                  const isProbed = wave.status === 'пробила';
                  const isRepelled = wave.status === 'отбита';
                  return (
                    <div
                      key={wave.id}
                      className="material-armor"
                      style={{
                        padding: '8px 10px',
                        borderColor: isProbed
                          ? 'var(--color-incident)'
                          : isRepelled
                          ? 'var(--color-stable)'
                          : 'var(--border-metal)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: 'var(--text-caption)',
                        }}
                      >
                        <span>ДЕРЖИТ: {wave.holder}</span>
                        <span>{wave.rewardCoins} КОИНА</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                        {wave.title}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                      >
                        {wave.file}:{wave.line} · {wave.exceptionType}
                      </div>

                      <div
                        style={{
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <select
                          aria-label={`Слот патча для волны ${wave.id}`}
                          value={wave.selectedSlot || ''}
                          onChange={(e) =>
                            dispatch({
                              type: 'SET_WAVE_SLOT',
                              waveId: wave.id,
                              slot: e.target.value
                                ? (Number(e.target.value) as 1 | 2 | 3 | 4)
                                : null,
                            })
                          }
                          className="instrument-btn mono"
                          style={{ fontSize: '12px', padding: '3px 6px' }}
                        >
                          <option value={1}>Патч #1 (try)</option>
                          <option value={2}>Патч #2 (порядок)</option>
                          <option value={3}>Патч #3 (finally)</option>
                          <option value={4}>Патч #4 (отчёт)</option>
                        </select>
                        <span
                          className="mono"
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: isProbed
                              ? 'var(--color-incident)'
                              : isRepelled
                              ? 'var(--color-stable)'
                              : 'var(--text-caption)',
                          }}
                        >
                          {wave.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-caption)',
                    marginBottom: '4px',
                  }}
                >
                  <span>ТАБЛО ОЧЕРЕДИ: 1 240 КЛЕТОК (1 КЛЕТКА = 1 ЧЕЛОВЕК С БИЛЕТОМ)</span>
                  <span>
                    Зелёный — билет выдан · Красная дыра — волна пробила (−30 человек)
                  </span>
                </div>
                <div
                  className="queue-grid-1240"
                  aria-label="Табло очереди из 1240 клеток"
                >
                  {queueCells.map((status, idx) => (
                    <div
                      key={idx}
                      className={`queue-cell ${
                        status === 'issued'
                          ? 'cell-issued'
                          : status === 'hole'
                          ? 'cell-hole'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ================= ПРАВАЯ ЗОНА (~38%): ВЕРТИКАЛЬНАЯ ПРИБОРНАЯ ПАНЕЛЬ ================= */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* 1. ТРИ ПЛАСТИНЫ БРИГАД (TRY ▲, CATCH ⬡, FINALLY ■ — различаются ФОРМОЙ, очки 56px) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
              const b = state.brigades[bId];
              return (
                <div
                  key={b.id}
                  className="material-armor screw-corners"
                  style={{
                    padding: '10px 10px 8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span className="brass-nameplate" title={`Клеймо формы: ${b.shape}`}>
                      <span style={{ fontSize: '16px' }}>{b.shapeSymbol}</span>
                      <span>{b.name}</span>
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div
                      className="brigade-score-56"
                      aria-label={`Очки бригады ${b.name}`}
                    >
                      {b.score}
                    </div>
                    <div
                      style={{ display: 'flex', gap: '4px', paddingBottom: '4px' }}
                      title="Лампы-предохранители очереди"
                    >
                      {b.lamps.map((on, idx) => (
                        <span
                          key={idx}
                          className={`fuse-lamp ${on ? 'lamp-on' : 'lamp-off'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border-metal)',
                      paddingTop: '5px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: 'var(--text-caption)' }}>РОЛЬ:</span>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '2px',
                        background:
                          b.battleRole === 'АТАКА'
                            ? 'rgba(255, 93, 93, 0.18)'
                            : b.battleRole === 'ЗАЩИТА'
                            ? 'rgba(53, 208, 160, 0.18)'
                            : 'rgba(255, 176, 32, 0.18)',
                        color:
                          b.battleRole === 'АТАКА'
                            ? 'var(--color-incident)'
                            : b.battleRole === 'ЗАЩИТА'
                            ? 'var(--color-stable)'
                            : 'var(--color-warning)',
                      }}
                    >
                      {b.battleRole}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. НАРЯД-ЗАДАНИЕ */}
          <div className="material-paper" style={{ padding: '10px 14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                НАРЯД-ЗАДАНИЕ · БОЙ {activeBattle.number} «{activeBattle.codeName.toUpperCase()}»
              </span>
              <span
                className="mono"
                style={{ fontSize: '12.5px', color: 'var(--color-warning)' }}
              >
                {activeBattle.defaultFile}
              </span>
            </div>

            <div className="dot-matrix-cta">ВЫБЕРИ ПАТЧ</div>

            <div className="attack-line-21" style={{ marginTop: '6px' }}>
              {activeBattle.attackLineCode}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '6px',
              }}
            >
              <div
                className="reward-value-42"
                style={{ color: 'var(--color-stable)' }}
              >
                {activeBattle.rewardText}
              </div>
              <div
                className="mono"
                style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}
              >
                тип: {activeBattle.targetException}
              </div>
            </div>

            <div
              className="mono"
              style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-metal)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <span>срок {state.remainingToStart}</span>
              <span>· атака {activeBattle.attacker}</span>
              <span>· защита {activeBattle.defender}</span>
              <span>· арбитр {activeBattle.arbiter}</span>
            </div>
          </div>

          {/* 3. КОМПАКТНАЯ СВЕТОВАЯ ШКАЛА «ЩИТ СМЕНЫ 6/6» */}
          <div className="material-armor screw-corners" style={{ padding: '9px 12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                }}
              >
                ЩИТ СМЕНЫ: {shieldUnlockedCount} / 6
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: shieldReady
                    ? 'var(--color-stable)'
                    : 'var(--color-warning)',
                }}
              >
                {shieldReady ? '● СТАРТ 09:00 РАЗРЕШЁН' : '○ СТАРТ ЗАБЛОКИРОВАН'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '5px',
              }}
            >
              {state.shield.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'TOGGLE_SHIELD_RULE', ruleId: rule.id })
                  }
                  className="instrument-btn"
                  style={{
                    justifyContent: 'space-between',
                    padding: '4px 7px',
                    fontSize: '11.5px',
                    borderColor: rule.unlocked
                      ? 'var(--color-stable)'
                      : 'var(--border-metal)',
                    background: rule.unlocked
                      ? 'rgba(53, 208, 160, 0.16)'
                      : 'rgba(0,0,0,0.28)',
                  }}
                  title={`${rule.text} (${rule.source})`}
                >
                  <span style={{ fontWeight: 800 }}>
                    {rule.id}.{rule.code}
                  </span>
                  <span
                    className={`fuse-lamp ${rule.unlocked ? 'lamp-on' : 'lamp-off'}`}
                    style={{ width: '8px', height: '8px' }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 4. БЛОК ВРЕМЕНИ БВ-1 С МИГАЮЩИМ ДВОЕТОЧИЕМ */}
          <div className="material-armor screw-corners" style={{ padding: '10px 12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                }}
              >
                БЛОК ВРЕМЕНИ БВ-1 · ЧАСЫ СМЕНЫ
              </span>
              <span
                className="mono"
                style={{ fontSize: '12px', color: 'var(--color-action)' }}
              >
                {currentPhaseMeta.realTimeSpan}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-caption)' }}>
                  ЧАСЫ СМЕНЫ
                </div>
                <div
                  className={`seven-segment-window ${
                    state.phase === 'five_min' ? 'amber-zone' : ''
                  }`}
                >
                  {renderClockWithLiveColon(state.shiftClock, true)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-caption)' }}>
                  ТАЙМЕР ТАКТА / ФАЗЫ
                </div>
                <div
                  className={`seven-segment-window ${
                    activeBattle.tactRemainingSec <= 15 ? 'red-zone' : ''
                  }`}
                >
                  {renderClockWithLiveColon(
                    state.phase.startsWith('battle_')
                      ? formatSec(activeBattle.tactRemainingSec)
                      : formatSec(state.phaseRemainingSec),
                    state.timerRunning
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                height: '6px',
                background: '#030810',
                border: '1px solid var(--border-metal)',
                marginTop: '8px',
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    100,
                    ((state.phase.startsWith('battle_')
                      ? activeBattle.tactRemainingSec
                      : state.phaseRemainingSec) /
                      (state.phase.startsWith('battle_')
                        ? activeTactMeta.durationSec
                        : currentPhaseMeta.durationSec)) *
                      100
                  )}%`,
                  background:
                    activeBattle.tactRemainingSec <= 15
                      ? 'var(--color-incident)'
                      : 'var(--color-action)',
                  transition: 'width 0.3s linear',
                }}
              />
            </div>

            <div
              style={{
                marginTop: '7px',
                padding: '6px 9px',
                background: 'rgba(0,0,0,0.32)',
                border: '1px solid var(--border-metal)',
                borderRadius: '2px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
              }}
            >
              <span>
                <strong>ТАКТ: {activeTactMeta.title.toUpperCase()}</strong>
              </span>
              <span className="mono" style={{ color: 'var(--color-warning)' }}>
                {activeTactMeta.actor}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
                className={`instrument-btn ${
                  state.timerRunning ? 'btn-warning' : 'btn-stable'
                }`}
                style={{ padding: '5px 10px', fontSize: '12.5px' }}
              >
                {state.timerRunning ? 'Пауза [Пробел]' : 'Пуск [Пробел]'}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_TIME_30S' })}
                className="instrument-btn"
                style={{ padding: '5px 9px', fontSize: '12.5px' }}
              >
                +30 с
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'NEXT_TACT' })}
                className="instrument-btn"
                style={{ padding: '5px 9px', fontSize: '12.5px' }}
              >
                След. такт [R]
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'NEXT_PHASE' })}
                className="instrument-btn btn-action"
                style={{ padding: '5px 9px', fontSize: '12.5px' }}
              >
                След. фаза →
              </button>

              {!safetyCoverOpen ? (
                <button
                  type="button"
                  onClick={() => setSafetyCoverOpen(true)}
                  className="instrument-btn"
                  style={{
                    padding: '5px 8px',
                    fontSize: '12px',
                    borderStyle: 'dashed',
                    borderColor: 'var(--color-warning)',
                  }}
                >
                  Колпак [Сброс]
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'RESET_SESSION' });
                    setSafetyCoverOpen(false);
                  }}
                  className="instrument-btn btn-incident"
                  style={{ padding: '5px 8px', fontSize: '12px' }}
                >
                  ПОДТВЕРДИТЬ СБРОС
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ================= НИЖНЯЯ ЛЕНТА СОБЫТИЙ ================= */}
      <footer
        className="material-armor no-print"
        style={{
          margin: '0 14px 10px 14px',
          padding: '7px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
            minWidth: '280px',
          }}
        >
          <span
            className="brass-nameplate"
            style={{ fontSize: '12px', padding: '2px 7px' }}
          >
            ЛЕНТА СМЕНЫ
          </span>
          {state.journal.slice(0, 2).map((entry) => (
            <div
              key={entry.id}
              className="mono terminal-stream-line"
              style={{
                fontSize: '13.5px',
                color: 'var(--text-main)',
                paddingRight: '14px',
                borderRight: '1px solid var(--border-metal)',
              }}
            >
              <span style={{ color: 'var(--text-caption)' }}>
                [{entry.shiftTime}]
              </span>{' '}
              <strong style={{ color: 'var(--color-warning)' }}>
                {entry.actor}:
              </strong>{' '}
              <span>{entry.claimed}</span>{' '}
              <span
                style={{
                  fontWeight: 800,
                  color:
                    entry.result === 'ПРОБИЛА' || entry.result === 'ВТОРЖЕНИЕ'
                      ? 'var(--color-incident)'
                      : 'var(--color-stable)',
                }}
              >
                → {entry.result}
              </span>
            </div>
          ))}
        </div>

        <div
          className="mono"
          style={{ fontSize: '12px', color: 'var(--text-caption)' }}
        >
          Пробел: таймер · 1–4: патч · Enter: живой запуск · R: такт · Y/N: вердикт
        </div>
      </footer>
    </div>
  );
};
