import React, { useMemo, useState } from 'react';
import {
  BATTLE_TACTS,
  PATCH_SLOTS,
  PHASES,
  PROLOGUE_MINES,
  PROLOGUE_SECOND_WAVE_LOGS,
  TEACHER_SCRIPT_19,
  WORLD_PRESETS,
} from '../game/constants';
import { getUnlockedShieldCount, isShieldComplete } from '../game/engine';
import { GameAction } from '../game/reducer';
import { getWorldPolygonFiles, getWorldPrologueLogs } from '../game/worldPolygons';
import {
  BrigadeId,
  PolygonFileId,
  ScreenView,
  SessionState,
} from '../types/game';
import { PracticeWorkbench } from './PracticeWorkbench';
import { FinalPhasesPanel } from './FinalPhasesPanel';

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

export const HallScreen: React.FC<HallScreenProps> = ({
  state,
  dispatch,
  onNavigateScreen,
}) => {
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(false);

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

  const currentPolygonSpec = worldPolygonFiles[state.selectedPolygonFile];

  const sceneNumber =
    state.phase === 'prologue_1'
      ? 1
      : state.phase === 'prologue_2'
      ? 2
      : state.phase === 'prologue_3'
      ? 3
      : 4;

  const sceneTeacherLines = TEACHER_SCRIPT_19.filter(
    (l) => l.scene === sceneNumber
  );

  return (
    <div>
      {/* Сигнал Стоп-крана Арбитра на спорной карте (Документ 10, п. 7) */}
      {activeBattle.arbiterStopActive && (
        <div
          className="material-armor no-print"
          style={{
            margin: '10px 16px 0 16px',
            padding: '12px 18px',
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
                fontSize: '18px',
                fontWeight: 900,
                color: 'var(--color-warning)',
              }}
            >
              СТОП-КРАН АРБИТРА ({activeBattle.arbiter}) · БОЙ ПРИОСТАНОВЛЕН НА СПОРНОЙ КАРТЕ
            </div>
            <div className="mono" style={{ fontSize: '14px' }}>
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
          className="material-armor no-print"
          style={{
            margin: '10px 16px 0 16px',
            padding: '12px 18px',
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
                fontSize: '18px',
                fontWeight: 900,
                color: 'var(--color-action)',
              }}
            >
              АПЕЛЛЯЦИЯ ДОКЛАДЧИКА ({activeBattle.defender}) · ОДНА НА БОЙ · 30 СЕКУНД
            </div>
            <div className="mono" style={{ fontSize: '14px' }}>
              Разбирается арбитром ({activeBattle.arbiter}) немедленно. Решение арбитра окончательное.
            </div>
          </div>
          <div className="seven-segment-window amber-zone" style={{ fontSize: '28px' }}>
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
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          {/* Верхняя кромка монитора: фаза, часы, переключение вкладок */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              borderBottom: '1px solid var(--border-metal)',
              paddingBottom: '10px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                МОНИТОР · {worldMeta.serviceName.toUpperCase()} · РЕЖИМ: {state.mode} · КОД:{' '}
                <span className="mono" style={{ color: 'var(--color-warning)' }}>
                  {state.code}
                </span>
              </div>
              <h1
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                }}
              >
                {currentPhaseMeta.title}
              </h1>
            </div>

            {/* Быстрый переход по 4 сценам завязки / боям / практике / табло 09:00 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'prologue_1' })}
                className={`instrument-btn ${isPrologue ? 'btn-action' : ''}`}
              >
                03:00 Завязка
              </button>
              {([1, 2, 3, 4] as const).map((bNum) => (
                <button
                  key={bNum}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_PHASE',
                      phase: `battle_${bNum}` as any,
                    })
                  }
                  className={`instrument-btn ${
                    state.phase === `battle_${bNum}` ? 'btn-action' : ''
                  }`}
                >
                  Бой {bNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'practice' })}
                className={`instrument-btn ${
                  isPracticePhase ? 'btn-action' : ''
                }`}
              >
                08:05 Практика
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'five_min' })}
                className={`instrument-btn ${
                  state.phase === 'five_min' ? 'btn-warning' : ''
                }`}
              >
                08:55 Отсчёт
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'start_0900' })}
                className={`instrument-btn ${
                  isQueueBoardPhase ? 'btn-stable' : ''
                }`}
              >
                09:00 Табло (1240)
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'closed' })}
                className={`instrument-btn ${
                  state.phase === 'closed' ? 'btn-action' : ''
                }`}
              >
                09:07 Рефлексия
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'homework' })}
                className={`instrument-btn ${
                  state.phase === 'homework' ? 'btn-action' : ''
                }`}
              >
                09:15 ДЗ
              </button>
            </div>
          </div>

          {/* ================= СОДЕРЖИМОЕ МОНИТОРА ПО ФАЗЕ ================= */}
          {isPrologue && (
            <div
              className="gesture-plate-rise"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
            >
              {/* Переключатель 4 сцен завязки */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                    onClick={() => dispatch({ type: 'SET_PHASE', phase: sc.id })}
                    className={`instrument-btn ${
                      state.phase === sc.id ? 'btn-action' : ''
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {/* СЦЕНА 1: ВХОД */}
              {state.phase === 'prologue_1' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    <div className="material-armor" style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                        СЕССИЯ / АДРЕС
                      </div>
                      <div className="mono" style={{ fontSize: '20px', fontWeight: 800 }}>
                        test/test · 91.42.117.6
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        02:07:44 → 02:48:57 (41 мин)
                      </div>
                    </div>
                    <div className="material-armor" style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
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
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        ничего не похищено, удалено: 0
                      </div>
                    </div>
                    <div className="material-armor" style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
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
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        не проходят контроль целостности
                      </div>
                    </div>
                    <div className="material-armor" style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
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
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        до старта 06:11 · отв.: не назначен
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0,0,0,0.42)',
                      border: '1px solid var(--border-metal)',
                      padding: '12px 14px',
                      borderRadius: '3px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-caption)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      ЛЕНТА ДИСПЕТЧЕРСКОЙ · {worldMeta.serviceName.toUpperCase()}
                    </div>
                    {worldPrologueLogs.map((item, idx) => (
                      <div
                        key={idx}
                        className="code-line-row"
                        style={{
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
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="material-paper" style={{ padding: '14px 16px' }}>
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
                            fontSize: '13px',
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
                          marginTop: '12px',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>
                        Пакет очереди: 1 240 записей · Четыре мины подсвечены
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Шаг 1 «Нужда»: запустите обработку пакета и прочитайте имя и адрес падения.
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
                        Сопоставить все 4 типа (Открыть Правило №1)
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
                        <div style={{ fontSize: '15px', color: 'var(--text-main)' }}>
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
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '10px',
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
                            padding: '12px',
                            borderColor: isCorrect
                              ? 'var(--color-stable)'
                              : 'var(--border-metal)',
                          }}
                        >
                          <div
                            className="mono"
                            style={{
                              fontSize: '14px',
                              color: 'var(--color-warning)',
                              fontWeight: 700,
                            }}
                          >
                            Запись {mine.recordHex} · {mine.fileLine}
                          </div>
                          <div
                            className="mono"
                            style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0' }}
                          >
                            поле {mine.field} = {mine.badValue}
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              marginBottom: '8px',
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
                            style={{ width: '100%', fontSize: '14px' }}
                          >
                            <option value="">— Выберите тип исключения —</option>
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

                  <div className="material-paper" style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-caption)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      ИЕРАРХИЯ ТИПОВ · «Все типы — родня. Общий предок — Exception»
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '16px',
                        marginTop: '6px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255,176,32,0.18)',
                          border: '1px solid var(--color-warning)',
                        }}
                      >
                        System.Exception
                      </span>
                      <span>→</span>
                      <span
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(79,195,247,0.16)',
                          border: '1px solid var(--color-action)',
                        }}
                      >
                        SystemException
                      </span>
                      <span>→</span>
                      <span style={{ color: 'var(--color-stable)', fontWeight: 700 }}>
                        [ FormatException · DivideByZeroException ·
                        IndexOutOfRangeException · NullReferenceException ]
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* СЦЕНА 3: ОТБИТО */}
              {state.phase === 'prologue_3' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                    }}
                  >
                    «В смене три инструмента: TRY, CATCH, FINALLY. Соберите механизм и
                    прогоните пакет заново.»
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
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
                            padding: '14px',
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
                                fontSize: '13px',
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
                              fontSize: '16px',
                              fontWeight: 700,
                              marginTop: '10px',
                            }}
                          >
                            {part.role}
                          </div>
                          <div
                            className="mono"
                            style={{
                              fontSize: '14px',
                              color: 'var(--text-secondary)',
                              marginTop: '6px',
                            }}
                          >
                            {part.code}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'PROLOGUE_REPEL_BATCH' })}
                      className="instrument-btn btn-stable"
                      style={{ fontSize: '16px', padding: '10px 18px' }}
                    >
                      Запустить пакет с механизмом TRY-CATCH-FINALLY
                    </button>
                  </div>

                  {state.prologue.batchRepelled && (
                    <div
                      className="material-paper"
                      style={{
                        padding: '16px 20px',
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
                            fontSize: '21px',
                            fontWeight: 800,
                            color: 'var(--color-stable)',
                          }}
                        >
                          прошло: 1214 · в отчёт: 26 · остановок: 0 · статус ОК · до старта
                          05:46
                        </div>
                        <div style={{ fontSize: '15px', marginTop: '4px' }}>
                          «Двадцать шесть — в отчёт. Тысяча двести четырнадцать — билеты.»
                          Правило щита №2 (МЕХАНИЗМ) открыто.
                        </div>
                      </div>
                      <span className="heavy-stamp stamp-repelled">ОТБИТО</span>
                    </div>
                  )}
                </div>
              )}

              {/* СЦЕНА 4: ПРОДОЛЖЕНИЕ */}
              {state.phase === 'prologue_4' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.48)',
                      border: '1px solid var(--color-incident)',
                      padding: '12px 16px',
                      borderRadius: '3px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
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
                        className="code-line-row"
                        style={{ fontSize: '19px', color: 'var(--color-incident)' }}
                      >
                        <span style={{ width: '95px', color: 'var(--text-caption)' }}>
                          {l.time}
                        </span>
                        <span style={{ width: '100px', color: 'var(--color-warning)' }}>
                          {l.unit}
                        </span>
                        <span>{l.text}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    className="material-armor"
                    style={{
                      padding: '18px 22px',
                      borderLeft: '6px solid var(--color-incident)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '40px',
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
                        fontSize: '18px',
                        color: 'var(--text-main)',
                        marginTop: '6px',
                      }}
                    >
                      ДО СТАРТА 05:43 · ПРОГОНОВ: 4 · БРИГАД: 3 · КОД ПАРТИИ:{' '}
                      <strong style={{ color: 'var(--color-warning)' }}>{state.code}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        color: 'var(--text-secondary)',
                        marginTop: '6px',
                      }}
                    >
                      «Вы закрыли одну дверь. Он пойдёт в те три, что остались открытыми.
                      Защита от атаки не равна защите от класса атак.»
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '10px',
                        marginTop: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {['1. формат (▲ TRY)', '2. порядок (⬡ CATCH)', '3. ресурс (■ FINALLY)', '4. след (Арбитр)'].map(
                        (dir) => (
                          <span
                            key={dir}
                            className="mono"
                            style={{
                              padding: '5px 12px',
                              background: 'rgba(255, 176, 32, 0.15)',
                              border: '1px solid var(--color-warning)',
                              fontSize: '14px',
                              fontWeight: 700,
                            }}
                          >
                            {dir}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Дословный суфлёр ведущего */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed var(--border-metal)',
                  borderRadius: '3px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-caption)',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  РЕПЛИКИ ВЕДУЩЕГО (СЦЕНА {sceneNumber} · СЦЕНАРИЙ 130 СЛОВ):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sceneTeacherLines.map((line) => (
                    <div key={line.number} style={{ fontSize: '14px' }}>
                      <span className="mono" style={{ color: 'var(--color-warning)' }}>
                        [{line.number}]
                      </span>{' '}
                      <span style={{ color: 'var(--text-caption)' }}>({line.cue}):</span>{' '}
                      <strong>«{line.words}»</strong>
                    </div>
                  ))}
                </div>
              </div>
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
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}
            >
              {state.phase === 'lull' && (
                <div
                  className="material-paper"
                  style={{
                    padding: '12px 16px',
                    borderLeftColor: 'var(--color-warning)',
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>
                    06:00 · ЗАТИШЬЕ · «Пока тихо. Это и есть худшее.»
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Две минуты без атак между Боем 2 и Боем 3. Группа переводит дух,
                    ведущий показывает комиссии состояние приборной панели и щита.
                  </div>
                </div>
              )}

              {/* Вкладки 5 файлов полигона */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(Object.keys(worldPolygonFiles) as PolygonFileId[]).map((fileId) => {
                    const spec = worldPolygonFiles[fileId];
                    const active = state.selectedPolygonFile === fileId;
                    return (
                      <button
                        key={fileId}
                        type="button"
                        onClick={() =>
                          dispatch({ type: 'SELECT_POLYGON_FILE', file: fileId })
                        }
                        className={`instrument-btn mono ${active ? 'btn-action' : ''}`}
                      >
                        <span>{fileId}</span>
                        <span
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-caption)',
                          }}
                        >
                          [Бой {spec.battleNumber}]
                        </span>
                      </button>
                    );
                  })}
                </div>

                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {currentPolygonSpec.subtitle}
                </span>
              </div>

              {/* Монитор кода */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--border-metal)',
                  borderRadius: '3px',
                  padding: '10px 0',
                  overflowX: 'auto',
                }}
              >
                {currentPolygonSpec.lines.map((lineObj) => {
                  const isSelected = state.selectedLine === lineObj.line;
                  const isPatched =
                    lineObj.battleTag &&
                    activeBattle.activeSlots.includes(lineObj.battleTag);
                  const rowClass = [
                    'code-line-row',
                    isSelected ? 'selected-line' : '',
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
                          width: '46px',
                          flexShrink: 0,
                          color: isSelected
                            ? 'var(--color-action)'
                            : 'var(--text-caption)',
                          fontWeight: isSelected ? 800 : 400,
                          textAlign: 'right',
                          paddingRight: '14px',
                        }}
                      >
                        {lineObj.line}
                      </span>
                      <span style={{ whiteSpace: 'pre' }}>{lineObj.code}</span>
                      {lineObj.humanNote && (
                        <span className="human-annotation">{lineObj.humanNote}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Слоты патчей полигона (клавиши 1–4) + кнопка ЖИВОЙ ЗАПУСК (Enter) */}
              <div
                className="material-armor"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
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
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>
                    СЛОТЫ ПАТЧЕЙ ПОЛИГОНА (КЛАВИШИ 1–4) · АКТИВНЫЙ БОЙ:{' '}
                    {activeBattle.number} «{activeBattle.codeName}»
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
                      >
                        Контратака: count = 0 (строка 14)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'RUN_POLYGON' })}
                      className="instrument-btn btn-action"
                      style={{ fontSize: '15px', padding: '8px 16px' }}
                    >
                      ЖИВОЙ ЗАПУСК [Enter]
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '8px',
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
                          padding: '8px 10px',
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
                          <span>
                            Слот [{slot.hotkey}]: {slot.shortName}
                          </span>
                          <span className="mono">{active ? 'ВКЛ' : 'ВЫКЛ'}</span>
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            marginTop: '4px',
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
                    padding: '14px 16px',
                    borderLeftColor:
                      activeBattle.lastRun.outcome === 'ПРОБИЛА'
                        ? 'var(--color-incident)'
                        : 'var(--color-stable)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-caption)',
                        fontWeight: 700,
                      }}
                    >
                      ВЫВОД ПОЛИГОНА · {activeBattle.lastRun.file}:
                      {activeBattle.lastRun.targetLine} · {activeBattle.lastRun.durationMs}{' '}
                      мс
                    </div>
                    {activeBattle.lastRun.consoleLog.map((line, i) => (
                      <div
                        key={i}
                        className="mono"
                        style={{
                          fontSize: '14px',
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
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        marginTop: '6px',
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
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
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
                      fontSize: '13px',
                      color: 'var(--text-caption)',
                      fontWeight: 700,
                    }}
                  >
                    09:00 · СТАРТ ПРОДАЖ · ОДНА ПОПЫТКА · КАЖДАЯ ПРОБИТАЯ ВОЛНА = −30
                    ЧЕЛОВЕК
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '36px',
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
                        fontSize: '16px',
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
                    style={{ fontSize: '16px', padding: '10px 20px' }}
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
                    Открыть Протокол смены (A4)
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
                  gap: '10px',
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
                        padding: '10px 12px',
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
                          fontSize: '13px',
                          color: 'var(--text-caption)',
                        }}
                      >
                        <span>ДЕРЖИТ: {wave.holder}</span>
                        <span>ЦЕНА: {wave.rewardCoins} КОИНА</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                        {wave.title}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                      >
                        {wave.file}:{wave.line} · {wave.exceptionType}
                      </div>

                      <div
                        style={{
                          marginTop: '8px',
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
                          style={{ fontSize: '13px', padding: '4px 8px' }}
                        >
                          <option value={1}>Патч #1 (try вокруг вызова)</option>
                          <option value={2}>Патч #2 (порядок catch)</option>
                          <option value={3}>Патч #3 (finally ресурс)</option>
                          <option value={4}>Патч #4 (отчёт + throw;)</option>
                        </select>
                        <span
                          className="mono"
                          style={{
                            fontSize: '13px',
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

              {state.mode !== 'ПОЛНЫЙ' && (
                <div className="material-paper" style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                    ПОЛОСА ОЧЕРЕДИ ({state.mode} РЕЖИМ):{' '}
                    {state.queue.started ? state.queue.issued : 0} / 1240
                  </div>
                  <div
                    style={{
                      height: '18px',
                      background: '#050d16',
                      border: '1px solid var(--border-metal)',
                      marginTop: '6px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          ((state.queue.started ? state.queue.issued : 0) / 1240) * 100
                        }%`,
                        height: '100%',
                        background: 'var(--color-stable)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
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
            gap: '12px',
          }}
        >
          {/* 1. ТРИ ПЛАСТИНЫ БРИГАД (TRY ▲, CATCH ⬡, FINALLY ■ — различаются ФОРМОЙ, очки 56px) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
              const b = state.brigades[bId];
              return (
                <div
                  key={b.id}
                  className="material-armor screw-corners"
                  style={{
                    padding: '12px 12px 10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
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
                      <span style={{ fontSize: '18px' }}>{b.shapeSymbol}</span>
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
                      style={{ display: 'flex', gap: '5px', paddingBottom: '6px' }}
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
                      paddingTop: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: 'var(--text-caption)' }}>РОЛЬ:</span>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 800,
                        padding: '2px 7px',
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
          <div className="material-paper" style={{ padding: '14px 16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                НАРЯД-ЗАДАНИЕ · БОЙ {activeBattle.number} «{activeBattle.codeName.toUpperCase()}»
              </span>
              <span
                className="mono"
                style={{ fontSize: '13px', color: 'var(--color-warning)' }}
              >
                {activeBattle.defaultFile}
              </span>
            </div>

            <div className="dot-matrix-cta">ВЫБЕРИ ПАТЧ</div>

            <div className="attack-line-21" style={{ marginTop: '8px' }}>
              {activeBattle.attackLineCode}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '8px',
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
                style={{ fontSize: '14px', color: 'var(--text-secondary)' }}
              >
                тип: {activeBattle.targetException}
              </div>
            </div>

            <div
              className="mono"
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-metal)',
                fontSize: '14px',
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

          {/* 3. ЩИТ СМЕНЫ (6 ПРАВИЛ) */}
          <div className="material-armor screw-corners" style={{ padding: '12px 14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                }}
              >
                ЩИТ СМЕНЫ: {shieldUnlockedCount} / 6
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: shieldReady
                    ? 'var(--color-stable)'
                    : 'var(--color-warning)',
                }}
              >
                {shieldReady ? 'СТАРТ 09:00 РАЗРЕШЁН' : 'СТАРТ ЗАБЛОКИРОВАН'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
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
                    padding: '6px 9px',
                    borderColor: rule.unlocked
                      ? 'var(--color-stable)'
                      : 'var(--border-metal)',
                    background: rule.unlocked
                      ? 'rgba(53, 208, 160, 0.14)'
                      : 'var(--bg-card)',
                  }}
                  title={`${rule.text} (${rule.source})`}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    {rule.id}. {rule.code}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '13px',
                      color: rule.unlocked
                        ? 'var(--color-stable)'
                        : 'var(--text-caption)',
                    }}
                  >
                    {rule.unlocked ? 'ГОТОВО' : 'НЕТ'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. БЛОК ВРЕМЕНИ БВ-1 */}
          <div className="material-armor screw-corners" style={{ padding: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                БЛОК ВРЕМЕНИ БВ-1 · ЧАСЫ СМЕНЫ
              </span>
              <span
                className="mono"
                style={{ fontSize: '13px', color: 'var(--color-action)' }}
              >
                {currentPhaseMeta.realTimeSpan} (урок 90 мин)
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                  ЧАСЫ СМЕНЫ
                </div>
                <div
                  className={`seven-segment-window ${
                    state.phase === 'five_min' ? 'amber-zone' : ''
                  }`}
                >
                  {state.shiftClock}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                  ТАЙМЕР ТАКТА / ФАЗЫ
                </div>
                <div
                  className={`seven-segment-window ${
                    activeBattle.tactRemainingSec <= 15 ? 'red-zone' : ''
                  }`}
                >
                  {state.phase.startsWith('battle_')
                    ? formatSec(activeBattle.tactRemainingSec)
                    : formatSec(state.phaseRemainingSec)}
                </div>
              </div>
            </div>

            <div
              style={{
                height: '8px',
                background: '#030810',
                border: '1px solid var(--border-metal)',
                marginTop: '10px',
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
                marginTop: '10px',
                padding: '8px 10px',
                background: 'rgba(0,0,0,0.32)',
                border: '1px solid var(--border-metal)',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <span>ТАКТ БОЯ: {activeTactMeta.title.toUpperCase()}</span>
                <span style={{ color: 'var(--color-warning)' }}>
                  {activeTactMeta.actor}
                </span>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                }}
              >
                {activeTactMeta.instruction}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
                className={`instrument-btn ${
                  state.timerRunning ? 'btn-warning' : 'btn-stable'
                }`}
              >
                {state.timerRunning ? 'Пауза [Пробел]' : 'Пуск [Пробел]'}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_TIME_30S' })}
                className="instrument-btn"
              >
                +30 с
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'NEXT_TACT' })}
                className="instrument-btn"
              >
                След. такт [R]
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'NEXT_PHASE' })}
                className="instrument-btn btn-action"
              >
                След. фаза →
              </button>

              {!safetyCoverOpen ? (
                <button
                  type="button"
                  onClick={() => setSafetyCoverOpen(true)}
                  className="instrument-btn"
                  style={{
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
          margin: '0 16px 14px 16px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
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
            style={{ fontSize: '13px', padding: '2px 8px' }}
          >
            ЛЕНТА СМЕНЫ
          </span>
          {state.journal.slice(0, 2).map((entry) => (
            <div
              key={entry.id}
              className="mono"
              style={{
                fontSize: '14px',
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
          style={{ fontSize: '13px', color: 'var(--text-caption)' }}
        >
          Горячие клавиши: [Пробел] таймер · [1–4] слот · [Enter] запуск · [Y/N]
          вердикт · [Q] пропуск · [R] такт · [Esc] меню
        </div>
      </footer>
    </div>
  );
};
