import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ARENA_ROUNDS,
  DeviceRole,
  getPatchedCodeLines,
  RoundNumber,
  simulateClash,
} from './arenaData';
import {
  ArenaAction,
  arenaReducer,
  createArenaSyncChannel,
  getTeamsForRound,
  loadArenaState,
  saveArenaState,
} from './arenaSync';
import { CSharpLineSyntax } from './CSharpCodeHighlighter';
import '../styles/arena.css';

// Векторный указатель текущей строки отладчика (Instruction Pointer в стиле Visual Studio / Rider)
const DebuggerPointerIcon: React.FC = () => (
  <svg
    className="arena-ip-arrow"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path d="M2 3.5h6.2L13.5 8l-5.3 4.5H2V3.5z" />
  </svg>
);

export const ExceptionArenaApp: React.FC = () => {
  const [state, rawDispatch] = useReducer(arenaReducer, undefined, loadArenaState);
  const [deviceRole, setDeviceRole] = useState<DeviceRole>('projector');
  const [drumSpinning, setDrumSpinning] = useState(false);
  const [drumDisplaySlot, setDrumDisplaySlot] = useState<number>(
    state.roulettePlayerNum
  );

  const syncRef = useRef<ReturnType<typeof createArenaSyncChannel> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Синхронизация вкладок и окон (Проектор <-> Терминал Альфа <-> Терминал Бета)
  useEffect(() => {
    const channel = createArenaSyncChannel((remoteState) => {
      stateRef.current = remoteState;
      rawDispatch({ type: 'SYNC_FROM_REMOTE', payload: remoteState });
    });
    syncRef.current = channel;
    return () => channel.close();
  }, []);

  const dispatch = (action: ArenaAction) => {
    const next = arenaReducer(stateRef.current, action);
    stateRef.current = next;
    rawDispatch(action);
    saveArenaState(next);
    syncRef.current?.publish(next);
  };

  useEffect(() => {
    const handleStorage = () => {
      const loaded = loadArenaState();
      stateRef.current = loaded;
      rawDispatch({ type: 'SYNC_FROM_REMOTE', payload: loaded });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Секундный таймер раунда
  useEffect(() => {
    if (
      !state.timerRunning ||
      state.stage !== 'round' ||
      state.subPhase !== 'planning'
    ) {
      return;
    }
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.timerRunning, state.stage, state.subPhase]);

  // Живое вращение механического селектора участников (01..06) при входе в фазу блиц-опроса
  const triggerDrumSpin = (targetPlayer?: 1 | 2 | 3 | 4 | 5 | 6) => {
    const finalSlot =
      targetPlayer ??
      (((Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6));
    setDrumSpinning(true);

    const delays = [55, 65, 75, 90, 110, 135, 165, 200, 245];
    let step = 0;
    let current = drumDisplaySlot;

    const tick = () => {
      if (step < delays.length) {
        current = (current % 6) + 1;
        setDrumDisplaySlot(current);
        step += 1;
        window.setTimeout(tick, delays[step - 1]);
      } else {
        setDrumDisplaySlot(finalSlot);
        setDrumSpinning(false);
        dispatch({ type: 'SET_ROULETTE_PLAYER', playerNum: finalSlot });
      }
    };
    tick();
  };

  useEffect(() => {
    setDrumDisplaySlot(state.roulettePlayerNum);
  }, [state.roulettePlayerNum]);

  // Горячие клавиши ведущего на проекторе (F5 / Пробел / Стрелки)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (state.stage === 'round' && state.subPhase === 'planning') {
        if (e.key === 'F5') {
          e.preventDefault();
          dispatch({ type: 'LAUNCH_CLASH' });
        }
      } else if (state.stage === 'round' && state.subPhase === 'tracing') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          const round =
            ARENA_ROUNDS.find((r) => r.number === state.roundNumber) ||
            ARENA_ROUNDS[0];
          const sim = simulateClash(
            round,
            state.selectedAttackId || 'A1',
            state.selectedDefenseId || 'D1'
          );
          if (state.traceStepIdx < sim.steps.length - 1) {
            dispatch({ type: 'STEP_TRACE', stepIdx: state.traceStepIdx + 1 });
          } else {
            dispatch({ type: 'OPEN_ROULETTE' });
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (state.traceStepIdx > 0) {
            dispatch({ type: 'STEP_TRACE', stepIdx: state.traceStepIdx - 1 });
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    state.stage,
    state.subPhase,
    state.roundNumber,
    state.selectedAttackId,
    state.selectedDefenseId,
    state.traceStepIdx,
  ]);

  const currentRound = useMemo(
    () =>
      ARENA_ROUNDS.find((r) => r.number === state.roundNumber) ||
      ARENA_ROUNDS[0],
    [state.roundNumber]
  );

  const { attacker, defender } = useMemo(
    () => getTeamsForRound(state.roundNumber),
    [state.roundNumber]
  );

  const activeAttackId =
    state.subPhase === 'summary' && state.sandboxAttackId
      ? state.sandboxAttackId
      : state.selectedAttackId || 'A1';

  const activeDefenseId =
    state.subPhase === 'summary' && state.sandboxDefenseId
      ? state.sandboxDefenseId
      : state.selectedDefenseId || 'D1';

  const simulation = useMemo(
    () => simulateClash(currentRound, activeAttackId, activeDefenseId),
    [currentRound, activeAttackId, activeDefenseId]
  );

  // Живая вставка выбранного патча try/catch/finally в окно редактора
  const previewDefenseId = useMemo(() => {
    if (state.subPhase === 'planning') {
      const isDefenseLaptop =
        (deviceRole === 'ALPHA' && defender === 'ALPHA') ||
        (deviceRole === 'BETA' && defender === 'BETA');
      if (isDefenseLaptop) return state.selectedDefenseId;
      if (state.attackLocked && state.defenseLocked) return state.selectedDefenseId;
      return null;
    }
    return activeDefenseId;
  }, [
    state.subPhase,
    deviceRole,
    defender,
    state.selectedDefenseId,
    state.attackLocked,
    state.defenseLocked,
    activeDefenseId,
  ]);

  const displayedCodeLines = useMemo(
    () => getPatchedCodeLines(currentRound, previewDefenseId),
    [currentRound, previewDefenseId]
  );

  const activeStep =
    state.subPhase === 'tracing'
      ? simulation.steps[Math.min(state.traceStepIdx, simulation.steps.length - 1)]
      : state.subPhase === 'roulette' || state.subPhase === 'summary'
      ? simulation.steps[simulation.steps.length - 1]
      : null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const laptopTeamId =
    deviceRole === 'ALPHA' ? 'ALPHA' : deviceRole === 'BETA' ? 'BETA' : null;
  const isLaptopAttacker = laptopTeamId === attacker;

  const getStepTraceClass = (stepKind?: string) => {
    if (!stepKind) return '';
    if (stepKind === 'normal' || stepKind === 'done') return 'trace-ok';
    if (stepKind === 'explode' || stepKind === 'leak') return 'trace-throw';
    if (stepKind === 'catch') return 'trace-catch';
    if (stepKind === 'finally') return 'trace-finally';
    if (stepKind === 'compile_error') return 'trace-compile_error';
    return 'trace-ok';
  };

  return (
    <div className={`arena-root ${state.lightTheme ? 'theme-light' : ''}`}>
      {/* ====================================================================
          ВЕРХНЯЯ ИНЖЕНЕРНАЯ ПАНЕЛЬ 52px
          ==================================================================== */}
      <header className="arena-topbar">
        <button
          type="button"
          className="arena-brand"
          onClick={() => dispatch({ type: 'GO_TO_WELCOME' })}
          title="Вернуться к выбору рабочего терминала"
        >
          <span className="arena-brand-badge">CLR .NET 8</span>
          <span>C# Exception Arena</span>
        </button>

        {/* Сегментированный переключатель терминала */}
        <div className="arena-role-pills" role="group" aria-label="Режим терминала">
          <button
            type="button"
            className={`arena-pill-btn ${deviceRole === 'projector' ? 'active' : ''}`}
            onClick={() => setDeviceRole('projector')}
          >
            <span
              className={`arena-led ${deviceRole === 'projector' ? 'ok' : ''}`}
            />
            Экран доски
          </button>
          <button
            type="button"
            className={`arena-pill-btn ${deviceRole === 'ALPHA' ? 'active' : ''}`}
            onClick={() => setDeviceRole('ALPHA')}
          >
            <span
              className={`arena-led ${deviceRole === 'ALPHA' ? 'atk' : ''}`}
            />
            Пульт АЛЬФА
          </button>
          <button
            type="button"
            className={`arena-pill-btn ${deviceRole === 'BETA' ? 'active' : ''}`}
            onClick={() => setDeviceRole('BETA')}
          >
            <span
              className={`arena-led ${deviceRole === 'BETA' ? 'def' : ''}`}
            />
            Пульт БЕТА
          </button>
        </div>

        {/* Быстрая навигация по 4 раундам и Финалу */}
        <div className="arena-round-pills" role="group" aria-label="Раунды">
          {([1, 2, 3, 4] as RoundNumber[]).map((rNum) => {
            const isDone = Boolean(state.roundHistory[rNum]);
            const isCurrent =
              state.stage === 'round' && state.roundNumber === rNum;
            return (
              <button
                key={rNum}
                type="button"
                className={`arena-pill-btn ${isCurrent ? 'active' : ''} ${
                  isDone ? 'done' : ''
                }`}
                onClick={() => dispatch({ type: 'SELECT_ROUND', roundNumber: rNum })}
              >
                R{rNum}
              </button>
            );
          })}
          <button
            type="button"
            className={`arena-pill-btn ${state.stage === 'finale' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'GO_TO_FINALE' })}
          >
            Итог
          </button>
        </div>

        {/* Табло счёта и управление средой */}
        <div className="arena-scoreboard">
          <div
            className={`arena-team-score ${
              attacker === 'ALPHA' ? 'is-attacking' : 'is-defending'
            }`}
          >
            <span
              className={`arena-role-tag ${attacker === 'ALPHA' ? 'atk' : 'def'}`}
            >
              {attacker === 'ALPHA' ? 'ATK' : 'DEF'}
            </span>
            <span>АЛЬФА</span>
            <span className="arena-score-num">{state.alphaScore}</span>
          </div>

          <div
            className={`arena-team-score ${
              attacker === 'BETA' ? 'is-attacking' : 'is-defending'
            }`}
          >
            <span
              className={`arena-role-tag ${attacker === 'BETA' ? 'atk' : 'def'}`}
            >
              {attacker === 'BETA' ? 'ATK' : 'DEF'}
            </span>
            <span>БЕТА</span>
            <span className="arena-score-num">{state.betaScore}</span>
          </div>

          {state.stage === 'round' && (
            <button
              type="button"
              className={`arena-timer-pill ${state.timerSec <= 10 ? 'warning' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
              title="Пауза / запуск таймера раунда"
            >
              <span
                className={`arena-led ${
                  state.timerRunning
                    ? state.timerSec <= 10
                      ? 'bad'
                      : 'ok'
                    : 'warn'
                }`}
              />
              {formatTimer(state.timerSec)}
            </button>
          )}

          <button
            type="button"
            className="arena-icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            title="Переключить контрастную тему для проектора"
          >
            {state.lightTheme ? 'Тёмная схема' : 'Светлая схема'}
          </button>

          <button
            type="button"
            className="arena-icon-btn"
            onClick={() => dispatch({ type: 'RESET_ALL' })}
            title="Сбросить состояние всех раундов"
          >
            Сброс
          </button>
        </div>
      </header>

      {/* ====================================================================
          ЭКРАН 0: ИНЖЕНЕРНЫЙ СТАРТ И ВЫБОР РАБОЧЕГО МЕСТА
          ==================================================================== */}
      {state.stage === 'welcome' && (
        <main className="arena-welcome-wrap">
          <section className="arena-hero-card">
            <div className="arena-hero-top">
              <div>
                <div className="arena-eyebrow">
                  ПРАКТИКУМ ПО ОБРАБОТКЕ ИСКЛЮЧЕНИЙ C# · .NET CLR DEBUGGER
                </div>
                <h1 className="arena-hero-title">
                  C# Exception Arena: Атака и Защита кода
                </h1>
                <p className="arena-hero-sub">
                  Четыре раунда разбора реальных сбоев времени выполнения. Одна
                  команда ищет уязвимую строку метода и подбирает входной вектор,
                  вторая — встраивает конструкцию <code>try / catch / finally</code>{' '}
                  и защищает решение на контрольном блиц-опросе.
                </p>
              </div>
              <button
                type="button"
                className="arena-primary-cta"
                style={{ width: 'auto', padding: '12px 22px' }}
                onClick={() => {
                  setDeviceRole('projector');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                Открыть Раунд 1 на доске
              </button>
            </div>

            {/* 3 строгих терминала выбора роли устройства */}
            <div className="arena-device-grid">
              <button
                type="button"
                className="arena-device-card projector"
                onClick={() => {
                  setDeviceRole('projector');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                <span className="arena-device-badge">
                  <span className="arena-led ok" />
                  ТЕРМИНАЛ 01 · ДОСКА / ПРОЕКТОР
                </span>
                <div>
                  <h3>Центральный отладчик у доски</h3>
                  <p>
                    Окно метода C#, пошаговый указатель выполнения CLR, панель
                    состояния ресурсов БД и стека вызовов, селектор блиц-опроса.
                  </p>
                </div>
                <span className="arena-device-cta">
                  Запустить режим доски →
                </span>
              </button>

              <button
                type="button"
                className="arena-device-card alpha"
                onClick={() => {
                  setDeviceRole('ALPHA');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                <span className="arena-device-badge">
                  <span className="arena-led atk" />
                  ТЕРМИНАЛ 02 · КОМАНДА АЛЬФА
                </span>
                <div>
                  <h3>Рабочий пульт Команды АЛЬФА</h3>
                  <p>
                    Раунды 1 и 3 — выбор уязвимой строки и входного пакета атаки.
                    Раунды 2 и 4 — проектирование защитного блока в коде.
                  </p>
                </div>
                <span className="arena-device-cta">
                  Открыть пульт АЛЬФА →
                </span>
              </button>

              <button
                type="button"
                className="arena-device-card beta"
                onClick={() => {
                  setDeviceRole('BETA');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                <span className="arena-device-badge">
                  <span className="arena-led def" />
                  ТЕРМИНАЛ 03 · КОМАНДА БЕТА
                </span>
                <div>
                  <h3>Рабочий пульт Команды БЕТА</h3>
                  <p>
                    Раунды 1 и 3 — проектирование защитного блока в коде. Раунды 2
                    и 4 — поиск уязвимой строки и атака входными данными.
                  </p>
                </div>
                <span className="arena-device-cta">
                  Открыть пульт БЕТА →
                </span>
              </button>
            </div>

            {/* Спецификация 4 раундов */}
            <div className="arena-rounds-preview">
              {ARENA_ROUNDS.map((r) => (
                <div key={r.number} className="arena-round-mini">
                  <div className="arena-round-mini-top">
                    <span>РАУНД 0{r.number}</span>
                    <span className="arena-round-mini-pts">
                      {r.maxPoints} PTS
                    </span>
                  </div>
                  <h4>{r.title}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                    {r.subtitle}
                  </span>
                  <code>{r.methodSignature}</code>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* ====================================================================
          ЭКРАН 1..4: РАБОЧАЯ СРЕДА РАУНДА (SPLIT-PANE IDE)
          ==================================================================== */}
      {state.stage === 'round' && (
        <main className="arena-stage-main">
          {/* Верхняя полоса контекста раунда */}
          <section className="arena-round-banner">
            <div
              className="arena-timer-bar"
              style={{
                width: `${(state.timerSec / state.timerMaxSec) * 100}%`,
              }}
            />
            <div className="arena-round-title-group">
              <span className="arena-round-num-tag">
                R0{currentRound.number} · {currentRound.maxPoints} ОЧКОВ
              </span>
              <div className="arena-round-heading">
                <h2>
                  {currentRound.title}{' '}
                  <span style={{ color: 'var(--arena-text-muted)', fontWeight: 400 }}>
                    / {currentRound.subtitle}
                  </span>
                </h2>
                <p>{currentRound.engineeringNote}</p>
              </div>
            </div>

            {/* Переключатель 4 последовательных состояний */}
            <div className="arena-subphase-steps">
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'planning' ? 'active' : ''
                }`}
                onClick={() =>
                  dispatch({
                    type: 'SELECT_ROUND',
                    roundNumber: state.roundNumber,
                  })
                }
              >
                01 Постановка хода
              </button>
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'tracing' ? 'active' : ''
                }`}
                onClick={() => dispatch({ type: 'LAUNCH_CLASH' })}
              >
                02 Отладчик CLR
              </button>
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'roulette' ? 'active' : ''
                }`}
                onClick={() => {
                  dispatch({ type: 'OPEN_ROULETTE' });
                  triggerDrumSpin(state.roulettePlayerNum);
                }}
              >
                03 Блиц-опрос
              </button>
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'summary' ? 'active' : ''
                }`}
                onClick={() => dispatch({ type: 'OPEN_SUMMARY' })}
              >
                04 Разбор кода
              </button>
            </div>
          </section>

          {/* Двухколоночная сплит-сетка */}
          <div className="arena-work-grid">
            {/* ==============================================================
                ЛЕВАЯ ПАНЕЛЬ: C# РЕДАКТОР + НИЖНИЙ ДОК ТЕЛЕМЕТРИИ CLR
                ============================================================== */}
            <section className="arena-ide-column">
              <div className="arena-ide-window">
                <div className="arena-ide-header">
                  <div className="arena-ide-file">
                    <span className="arena-ide-tab-indicator" />
                    <span>ArenaService.cs — {currentRound.methodSignature}</span>
                  </div>
                  <span style={{ color: 'var(--arena-text-muted)' }}>
                    {state.subPhase === 'planning'
                      ? 'Шаг 1: выберите строку в коде кликом мыши'
                      : previewDefenseId
                      ? `Активная конфигурация защиты: ${previewDefenseId}`
                      : 'Исходный метод без защиты'}
                  </span>
                </div>

                <div className="arena-ide-body">
                  {displayedCodeLines.map((lineObj) => {
                    const isActiveTrace =
                      activeStep &&
                      activeStep.activeLineNumber === lineObj.lineNumber;
                    const traceClass = isActiveTrace
                      ? getStepTraceClass(activeStep?.stepKind)
                      : '';
                    const isSkipped =
                      state.subPhase !== 'planning' &&
                      Boolean(
                        activeStep?.skippedLineNumbers.includes(
                          lineObj.lineNumber
                        )
                      );

                    const isAtkTarget =
                      state.subPhase === 'planning' &&
                      state.attackTargetLine === lineObj.lineNumber;
                    const isDefTarget =
                      state.subPhase === 'planning' &&
                      state.defenseTargetLine === lineObj.lineNumber;

                    return (
                      <div
                        key={`${lineObj.lineNumber}-${lineObj.code}`}
                        className={`arena-code-line ${
                          lineObj.isAddedPatch ? 'diff-added' : ''
                        } ${traceClass} ${isSkipped ? 'line-skipped' : ''} ${
                          isAtkTarget ? 'target-attack' : ''
                        } ${isDefTarget ? 'target-defense' : ''}`}
                        onClick={() => {
                          if (state.subPhase !== 'planning') return;
                          if (deviceRole === 'ALPHA') {
                            if (attacker === 'ALPHA') {
                              dispatch({
                                type: 'PICK_ATTACK_LINE',
                                line: lineObj.lineNumber,
                              });
                            } else {
                              dispatch({
                                type: 'PICK_DEFENSE_LINE',
                                line: lineObj.lineNumber,
                              });
                            }
                          } else if (deviceRole === 'BETA') {
                            if (attacker === 'BETA') {
                              dispatch({
                                type: 'PICK_ATTACK_LINE',
                                line: lineObj.lineNumber,
                              });
                            } else {
                              dispatch({
                                type: 'PICK_DEFENSE_LINE',
                                line: lineObj.lineNumber,
                              });
                            }
                          } else {
                            dispatch({
                              type: 'PICK_ATTACK_LINE',
                              line: lineObj.lineNumber,
                            });
                            dispatch({
                              type: 'PICK_DEFENSE_LINE',
                              line: lineObj.lineNumber,
                            });
                          }
                        }}
                      >
                        {/* Колонка отладчика: жёлтый указатель инструкции (▶) или точка прицела (●) */}
                        <span className="arena-gutter-marker">
                          {isActiveTrace ? (
                            <DebuggerPointerIcon />
                          ) : isAtkTarget ? (
                            <span className="arena-bp-dot atk" />
                          ) : isDefTarget ? (
                            <span className="arena-bp-dot def" />
                          ) : null}
                        </span>

                        <span className="arena-line-num">
                          {lineObj.isAddedPatch ? '+' : lineObj.lineNumber}
                        </span>

                        <span className="arena-line-text">
                          <CSharpLineSyntax code={lineObj.code} />
                        </span>

                        <span className="arena-line-badges">
                          {isAtkTarget && (
                            <span className="arena-inline-badge target-badge-atk">
                              ATK LINE {lineObj.lineNumber}
                            </span>
                          )}
                          {isDefTarget && (
                            <span className="arena-inline-badge target-badge-def">
                              DEF LINE {lineObj.lineNumber}
                            </span>
                          )}
                          {isActiveTrace && activeStep?.inlineBadge && (
                            <span className="arena-inline-badge var-badge">
                              {activeStep.inlineBadge}
                            </span>
                          )}
                          {isSkipped && (
                            <span className="arena-inline-badge skip-badge">
                              ПРОПУЩЕНО
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* НИЖНИЙ ДОК ТЕЛЕМЕТРИИ СРЕДЫ CLR */}
              <div className="arena-telemetry-dock">
                <div className="arena-telemetry-header">
                  <span>
                    CLR TELEMETRY //{' '}
                    {state.subPhase === 'planning'
                      ? 'Ожидание запуска метода (нажмите F5 или кнопку выполнения)'
                      : activeStep
                      ? activeStep.statusBanner
                      : simulation.headline}
                  </span>
                  <span>.NET 8.0 Runtime</span>
                </div>

                <div className="arena-sensors-row">
                  <div
                    className={`arena-sensor-card ${
                      state.subPhase === 'planning'
                        ? ''
                        : simulation.finalDbState === 'LEAK'
                        ? 'status-bad'
                        : 'status-good'
                    }`}
                  >
                    <div className="arena-sensor-label">
                      <span>01 / DB_CONNECTION</span>
                      <span>IDisposable</span>
                    </div>
                    <div className="arena-sensor-value">
                      <span
                        className={`arena-led ${
                          state.subPhase === 'planning'
                            ? ''
                            : simulation.finalDbState === 'LEAK'
                            ? 'bad'
                            : 'ok'
                        }`}
                      />
                      <span>
                        {state.subPhase === 'planning'
                          ? 'STANDBY (не открыто)'
                          : simulation.finalDbState === 'LEAK'
                          ? 'LEAKED (соединение зависло)'
                          : 'CLOSED (освобождено штатно)'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`arena-sensor-card ${
                      state.subPhase === 'planning'
                        ? ''
                        : simulation.finalLogState === 'SWALLOWED'
                        ? 'status-bad'
                        : simulation.finalLogState === 'LOGGED'
                        ? 'status-good'
                        : ''
                    }`}
                  >
                    <div className="arena-sensor-label">
                      <span>02 / AUDIT_LOG</span>
                      <span>ex.Message</span>
                    </div>
                    <div className="arena-sensor-value">
                      <span
                        className={`arena-led ${
                          state.subPhase === 'planning'
                            ? ''
                            : simulation.finalLogState === 'SWALLOWED'
                            ? 'bad'
                            : simulation.finalLogState === 'LOGGED'
                            ? 'ok'
                            : ''
                        }`}
                      />
                      <span>
                        {state.subPhase === 'planning'
                          ? 'STANDBY (записей: 0)'
                          : simulation.finalLogState === 'SWALLOWED'
                          ? 'SILENT_DROP (ошибка скрыта)'
                          : simulation.finalLogState === 'LOGGED'
                          ? 'WRITTEN (событие записано)'
                          : 'NO_ERROR (штатный возврат)'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`arena-sensor-card ${
                      state.subPhase === 'planning'
                        ? ''
                        : simulation.finalStackState === 'RESET'
                        ? 'status-warn'
                        : simulation.outcome === 'BREACHED'
                        ? 'status-bad'
                        : 'status-good'
                    }`}
                  >
                    <div className="arena-sensor-label">
                      <span>03 / CALL_STACK</span>
                      <span>StackTrace</span>
                    </div>
                    <div className="arena-sensor-value">
                      <span
                        className={`arena-led ${
                          state.subPhase === 'planning'
                            ? ''
                            : simulation.finalStackState === 'RESET'
                            ? 'warn'
                            : simulation.outcome === 'BREACHED'
                            ? 'bad'
                            : 'ok'
                        }`}
                      />
                      <span>
                        {state.subPhase === 'planning'
                          ? 'STANDBY (стек чист)'
                          : simulation.finalStackState === 'RESET'
                          ? 'RESET_CA2200 (стёрт через throw ex)'
                          : simulation.outcome === 'BREACHED'
                          ? 'UNHANDLED_FAULT (аварийный выход)'
                          : 'INTACT (исходная строка сохранена)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==============================================================
                ПРАВАЯ ПАНЕЛЬ: КОНТРОЛЛЕР АКТИВНОЙ ФАЗЫ РАУНДА
                ============================================================== */}
            <section className="arena-phase-column">
              {/* ------------------------------------------------------------
                  ВАРИАНТ 1: ПУЛЬТ КОМАНДНОГО НОУТБУКА (АЛЬФА / БЕТА)
                  ------------------------------------------------------------ */}
              {state.subPhase === 'planning' && laptopTeamId && (
                <div className="arena-phase-panel">
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <span className="arena-device-badge">
                        <span
                          className={`arena-led ${
                            isLaptopAttacker ? 'atk' : 'def'
                          }`}
                        />
                        {isLaptopAttacker
                          ? `КОМАНДА ${
                              laptopTeamId === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'
                            } // РОЛЬ: АТАКА`
                          : `КОМАНДА ${
                              laptopTeamId === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'
                            } // РОЛЬ: ЗАЩИТА`}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--arena-font-mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        Пул раунда: {currentRound.maxPoints} очк.
                      </span>
                    </div>

                    {/* Трёхшаговый регламент для 6 участников за одним ноутбуком */}
                    <div className="arena-role-chain-steps">
                      <div
                        className={`arena-chain-box ${
                          (
                            isLaptopAttacker
                              ? state.attackTargetLine
                              : state.defenseTargetLine
                          )
                            ? 'done'
                            : 'active'
                        }`}
                      >
                        <strong>Шаг 01 · Участники 1–2</strong>
                        <div>
                          {(
                            isLaptopAttacker
                              ? state.attackTargetLine
                              : state.defenseTargetLine
                          )
                            ? `Выбрана строка #${
                                isLaptopAttacker
                                  ? state.attackTargetLine
                                  : state.defenseTargetLine
                              }`
                            : 'Укажите опасную строку в коде слева'}
                        </div>
                      </div>

                      <div
                        className={`arena-chain-box ${
                          (
                            isLaptopAttacker
                              ? state.selectedAttackId
                              : state.selectedDefenseId
                          )
                            ? 'done'
                            : 'active'
                        }`}
                      >
                        <strong>Шаг 02 · Участники 3–4</strong>
                        <div>
                          {(
                            isLaptopAttacker
                              ? state.selectedAttackId
                              : state.selectedDefenseId
                          )
                            ? `Выбран вариант ${
                                isLaptopAttacker
                                  ? state.selectedAttackId
                                  : state.selectedDefenseId
                              }`
                            : isLaptopAttacker
                            ? 'Выберите входной пакет А-1..А-3'
                            : 'Выберите патч защиты З-1..З-4'}
                        </div>
                      </div>

                      <div
                        className={`arena-chain-box ${
                          (
                            isLaptopAttacker
                              ? state.attackLocked
                              : state.defenseLocked
                          )
                            ? 'done'
                            : ''
                        }`}
                      >
                        <strong>Шаг 03 · Участники 5–6</strong>
                        <div>
                          {(
                            isLaptopAttacker
                              ? state.attackLocked
                              : state.defenseLocked
                          )
                            ? 'Решение зафиксировано'
                            : 'Проверьте решение и зафиксируйте ход'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isLaptopAttacker ? (
                    <div className="arena-voice-section">
                      <div className="arena-voice-group-label">
                        <span>Входные данные для вызова метода (Атака)</span>
                        <span>Коды А-1 .. А-3</span>
                      </div>
                      <div className="arena-cards-list">
                        {currentRound.attackOptions.map((atk) => (
                          <button
                            key={atk.id}
                            type="button"
                            className={`arena-option-card ${
                              state.selectedAttackId === atk.id
                                ? 'selected-atk'
                                : ''
                            }`}
                            onClick={() =>
                              dispatch({
                                type: 'PICK_ATTACK_OPTION',
                                optionId: atk.id,
                              })
                            }
                          >
                            <div className="arena-option-left">
                              <span className="arena-voice-code atk">
                                {atk.codeLabel}
                              </span>
                              <div className="arena-option-text">
                                <span className="arena-option-title">
                                  <code>{atk.payloadCode}</code>
                                </span>
                                <span className="arena-option-code">
                                  Строка #{atk.targetLine} · Ожидается:{' '}
                                  {atk.expectedException} ({atk.shortDesc})
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="arena-voice-section">
                      <div className="arena-voice-group-label">
                        <span>Варианты обработки в коде (Защита)</span>
                        <span>Предпросмотр в редакторе слева</span>
                      </div>
                      <div className="arena-cards-list">
                        {currentRound.defenseOptions.map((def) => (
                          <button
                            key={def.id}
                            type="button"
                            className={`arena-option-card ${
                              state.selectedDefenseId === def.id
                                ? 'selected-def'
                                : ''
                            }`}
                            onClick={() =>
                              dispatch({
                                type: 'PICK_DEFENSE_OPTION',
                                optionId: def.id,
                              })
                            }
                          >
                            <div className="arena-option-left">
                              <span className="arena-voice-code def">
                                {def.codeLabel}
                              </span>
                              <div className="arena-option-text">
                                <span className="arena-option-title">
                                  {def.title}
                                </span>
                                <span className="arena-option-code">
                                  {def.shortDesc}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="arena-primary-cta"
                    onClick={() =>
                      dispatch({
                        type: isLaptopAttacker
                          ? 'TOGGLE_ATTACK_LOCK'
                          : 'TOGGLE_DEFENSE_LOCK',
                      })
                    }
                  >
                    {(
                      isLaptopAttacker ? state.attackLocked : state.defenseLocked
                    )
                      ? 'Снять фиксацию (изменить вариант)'
                      : 'Зафиксировать командный ход'}
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ВАРИАНТ 2: ЭКРАН ДОСКИ / ПРОЕКТОРА В ФАЗЕ ПОСТАНОВКИ ХОДА
                  ------------------------------------------------------------ */}
              {state.subPhase === 'planning' && !laptopTeamId && (
                <div className="arena-phase-panel">
                  <div className="arena-envelopes-grid">
                    <div className="arena-envelope-box atk">
                      <div className="arena-envelope-top">
                        <span>
                          АТАКА // {attacker === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'}
                        </span>
                        <span
                          className={`arena-lock-badge ${
                            state.attackLocked ? 'locked' : 'waiting'
                          }`}
                        >
                          <span
                            className={`arena-led ${
                              state.attackLocked ? 'ok' : 'warn'
                            }`}
                          />
                          {state.attackLocked ? 'ГОТОВО' : 'ВЫБОР ХОДА'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                        {state.attackLocked
                          ? 'Вектор атаки зафиксирован и скрыт до запуска'
                          : 'Команда выбирает строку и входной пакет А-1..А-3'}
                      </div>
                    </div>

                    <div className="arena-envelope-box def">
                      <div className="arena-envelope-top">
                        <span>
                          ЗАЩИТА // {defender === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'}
                        </span>
                        <span
                          className={`arena-lock-badge ${
                            state.defenseLocked ? 'locked' : 'waiting'
                          }`}
                        >
                          <span
                            className={`arena-led ${
                              state.defenseLocked ? 'ok' : 'warn'
                            }`}
                          />
                          {state.defenseLocked ? 'ГОТОВО' : 'ВЫБОР ХОДА'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                        {state.defenseLocked
                          ? 'Конструкция защиты готова к компиляции'
                          : 'Команда выбирает блок обработки З-1..З-4'}
                      </div>
                    </div>
                  </div>

                  {/* Ввод кодов А-1..А-3 */}
                  <div className="arena-voice-section">
                    <div className="arena-voice-group-label">
                      <span>Входные данные (Атака)</span>
                      <span>
                        {state.attackTargetLine
                          ? `Цель: строка #${state.attackTargetLine}`
                          : 'Кликните строку в коде или выберите код'}
                      </span>
                    </div>
                    <div className="arena-cards-list">
                      {currentRound.attackOptions.map((atk) => (
                        <button
                          key={atk.id}
                          type="button"
                          className={`arena-option-card ${
                            state.selectedAttackId === atk.id
                              ? 'selected-atk'
                              : ''
                          }`}
                          onClick={() =>
                            dispatch({
                              type: 'PICK_ATTACK_OPTION',
                              optionId: atk.id,
                              lockImmediately: true,
                            })
                          }
                        >
                          <div className="arena-option-left">
                            <span className="arena-voice-code atk">
                              {atk.codeLabel}
                            </span>
                            <div className="arena-option-text">
                              <span className="arena-option-title">
                                <code>{atk.payloadCode}</code>
                              </span>
                              <span className="arena-option-code">
                                Строка #{atk.targetLine} · {atk.expectedException}{' '}
                                ({atk.shortDesc})
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ввод кодов З-1..З-4 */}
                  <div className="arena-voice-section">
                    <div className="arena-voice-group-label">
                      <span>Обработка исключений (Защита)</span>
                      <span>Коды З-1 .. З-4</span>
                    </div>
                    <div className="arena-cards-list">
                      {currentRound.defenseOptions.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          className={`arena-option-card ${
                            state.selectedDefenseId === def.id
                              ? 'selected-def'
                              : ''
                          }`}
                          onClick={() =>
                            dispatch({
                              type: 'PICK_DEFENSE_OPTION',
                              optionId: def.id,
                              lockImmediately: true,
                            })
                          }
                        >
                          <div className="arena-option-left">
                            <span className="arena-voice-code def">
                              {def.codeLabel}
                            </span>
                            <div className="arena-option-text">
                              <span className="arena-option-title">
                                {def.title}
                              </span>
                              <span className="arena-option-code">
                                {def.shortDesc}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="arena-primary-cta"
                    onClick={() => dispatch({ type: 'LAUNCH_CLASH' })}
                  >
                    <kbd className="arena-kbd" style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
                      F5
                    </kbd>
                    <span>Скомпилировать патч и выполнить метод</span>
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ФАЗА 2: ПОШАГОВЫЙ ОТЛАДЧИК CLR (TRACING)
                  ------------------------------------------------------------ */}
              {state.subPhase === 'tracing' && activeStep && (
                <div className="arena-phase-panel">
                  <div className="arena-envelopes-grid">
                    <div className="arena-envelope-box atk">
                      <div className="arena-envelope-top">
                        <span>ПАКЕТ АТАКИ</span>
                        <span className="arena-voice-code atk">
                          {
                            currentRound.attackOptions.find(
                              (a) => a.id === activeAttackId
                            )?.codeLabel
                          }
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--arena-font-mono)',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {
                          currentRound.attackOptions.find(
                            (a) => a.id === activeAttackId
                          )?.payloadCode
                        }
                      </div>
                    </div>

                    <div className="arena-envelope-box def">
                      <div className="arena-envelope-top">
                        <span>ПАТЧ ЗАЩИТЫ</span>
                        <span className="arena-voice-code def">
                          {
                            currentRound.defenseOptions.find(
                              (d) => d.id === activeDefenseId
                            )?.codeLabel
                          }
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>
                        {
                          currentRound.defenseOptions.find(
                            (d) => d.id === activeDefenseId
                          )?.title
                        }
                      </div>
                    </div>
                  </div>

                  <div className="arena-trace-explanation">
                    <div className="arena-trace-step-header">
                      <span>
                        ШАГ ОТЛАДЧИКА {state.traceStepIdx + 1} /{' '}
                        {simulation.steps.length} · СТРОКА #
                        {activeStep.activeLineNumber}
                      </span>
                      <span>{activeStep.inlineBadge}</span>
                    </div>
                    <div className="arena-trace-comment">
                      {activeStep.statusBanner}
                    </div>
                  </div>

                  {activeStep.skippedLineNumbers.length > 0 && (
                    <div className="arena-rule-card">
                      <h4>Невыполненные инструкции внутри блока try</h4>
                      <p>
                        После генерации исключения строки{' '}
                        <code>
                          #{activeStep.skippedLineNumbers.join(', #')}
                        </code>{' '}
                        в блоке <code>try</code> пропускаются: среда CLR сразу
                        разворачивает стек к подходящему блоку <code>catch</code>{' '}
                        и секции <code>finally</code>.
                      </p>
                    </div>
                  )}

                  <div className="arena-trace-controls">
                    <button
                      type="button"
                      className="arena-secondary-btn"
                      disabled={state.traceStepIdx === 0}
                      onClick={() =>
                        dispatch({
                          type: 'STEP_TRACE',
                          stepIdx: Math.max(0, state.traceStepIdx - 1),
                        })
                      }
                    >
                      <kbd className="arena-kbd">←</kbd>
                      <span>Предыдущий шаг</span>
                    </button>
                    <button
                      type="button"
                      className="arena-secondary-btn"
                      disabled={
                        state.traceStepIdx >= simulation.steps.length - 1
                      }
                      onClick={() =>
                        dispatch({
                          type: 'STEP_TRACE',
                          stepIdx: Math.min(
                            simulation.steps.length - 1,
                            state.traceStepIdx + 1
                          ),
                        })
                      }
                    >
                      <span>Следующий шаг (Step Over)</span>
                      <kbd className="arena-kbd">→</kbd>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="arena-primary-cta"
                    onClick={() => {
                      dispatch({ type: 'OPEN_ROULETTE' });
                      triggerDrumSpin(state.roulettePlayerNum);
                    }}
                  >
                    Перейти к контрольному блиц-опросу (+
                    {Math.round(currentRound.maxPoints / 2)} очк.)
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ФАЗА 3: МЕХАНИЧЕСКИЙ СЕЛЕКТОР ОТВЕЧАЮЩЕГО (01..06)
                  ------------------------------------------------------------ */}
              {state.subPhase === 'roulette' && (
                <div className="arena-phase-panel">
                  <div className="arena-roulette-box">
                    <div className="arena-roulette-header">
                      <div>
                        <div className="arena-eyebrow" style={{ marginBottom: '2px' }}>
                          КОНТРОЛЬ ПОНИМАНИЯ КОДА (БЕЗ ПОДСКАЗОК КОМАНДЫ)
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>
                          Отвечает Участник №0{drumDisplaySlot} · На кону вторые 50%
                          очков раунда (+{Math.round(currentRound.maxPoints / 2)}{' '}
                          очк.)
                        </div>
                      </div>
                      <button
                        type="button"
                        className="arena-icon-btn"
                        disabled={drumSpinning}
                        onClick={() => triggerDrumSpin()}
                      >
                        {drumSpinning ? 'Выбор...' : 'Выбрать случайный №'}
                      </button>
                    </div>

                    {/* Живая 6-секционная шкала выбора участника 01..06 */}
                    <div className="arena-drum-strip">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <div
                          key={num}
                          className={`arena-drum-slot ${
                            drumDisplaySlot === num ? 'active-slot' : ''
                          }`}
                        >
                          УЧ. 0{num}
                        </div>
                      ))}
                    </div>

                    <p className="arena-roulette-question">
                      {currentRound.rouletteQuestion.prompt}
                    </p>

                    <div className="arena-roulette-options">
                      {currentRound.rouletteQuestion.options.map((opt) => {
                        const isPicked =
                          state.rouletteSelectedOptionId === opt.id;
                        const showResult = Boolean(
                          state.rouletteSelectedOptionId
                        );
                        const btnClass = showResult
                          ? opt.isCorrect
                            ? 'correct'
                            : isPicked
                            ? 'wrong'
                            : ''
                          : '';

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`arena-roulette-opt-btn ${btnClass}`}
                            onClick={() =>
                              dispatch({
                                type: 'ANSWER_ROULETTE',
                                optionId: opt.id,
                              })
                            }
                          >
                            <span className="arena-voice-code def">
                              {opt.id}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div>{opt.text}</div>
                              {showResult && (isPicked || opt.isCorrect) && (
                                <div
                                  style={{
                                    fontSize: '12px',
                                    marginTop: '4px',
                                    color: 'var(--arena-text-muted)',
                                  }}
                                >
                                  {opt.explanation}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="arena-primary-cta"
                    onClick={() => dispatch({ type: 'OPEN_SUMMARY' })}
                  >
                    Открыть инженерный разбор раунда
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ФАЗА 4: ИТОГ РАУНДА + ПРАВИЛО C# + ПРОВЕРКА СЦЕНАРИЕВ
                  ------------------------------------------------------------ */}
              {state.subPhase === 'summary' && (
                <div className="arena-phase-panel">
                  <div className={`arena-verdict-banner ${simulation.outcome}`}>
                    <div className="arena-verdict-title">
                      {simulation.headline}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.45 }}>
                      {simulation.reasonDetailed}
                    </div>
                  </div>

                  <div className="arena-rule-card">
                    <h4>{currentRound.ruleTitle}</h4>
                    <p>{currentRound.ruleSummary}</p>
                  </div>

                  {/* Живое сравнение альтернативных вариантов прямо в редакторе слева */}
                  <div className="arena-voice-section">
                    <div className="arena-voice-group-label">
                      <span>Проверка других комбинаций в редакторе слева</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {currentRound.attackOptions.map((atk) => (
                        <button
                          key={atk.id}
                          type="button"
                          className={`arena-pill-btn ${
                            activeAttackId === atk.id ? 'active' : ''
                          }`}
                          onClick={() =>
                            dispatch({
                              type: 'SET_SANDBOX_VARIANT',
                              attackId: atk.id,
                            })
                          }
                        >
                          {atk.codeLabel}: {atk.payloadCode}
                        </button>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '5px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {currentRound.defenseOptions.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          className={`arena-pill-btn ${
                            activeDefenseId === def.id ? 'active' : ''
                          }`}
                          onClick={() =>
                            dispatch({
                              type: 'SET_SANDBOX_VARIANT',
                              defenseId: def.id,
                            })
                          }
                        >
                          {def.codeLabel}: {def.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {state.roundNumber < 4 ? (
                    <button
                      type="button"
                      className="arena-primary-cta"
                      onClick={() =>
                        dispatch({
                          type: 'SELECT_ROUND',
                          roundNumber: (state.roundNumber + 1) as RoundNumber,
                        })
                      }
                    >
                      Перейти к Раунду 0{state.roundNumber + 1} (смена ролей
                      команд)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="arena-primary-cta"
                      onClick={() => dispatch({ type: 'GO_TO_FINALE' })}
                    >
                      Открыть итоговую сводку и эталонный код C#
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ====================================================================
          ЭКРАН 5: ФИНАЛЬНАЯ СВОДКА И СПРАВОЧНЫЙ КОД C#
          ==================================================================== */}
      {state.stage === 'finale' && (
        <main className="arena-finale-wrap">
          <section className="arena-podium-card">
            <div>
              <div className="arena-eyebrow">ИТОГОВЫЙ ПРОТОКОЛ ЗАНЯТИЯ</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '22px' }}>
                Результаты команд по 4 раундам
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--arena-text-muted)' }}>
                Сумма баллов складывается из точности технических ходов в коде и
                индивидуальных ответов участников на контрольных блиц-опросах.
              </p>
            </div>

            <div className="arena-podium-scores">
              <div
                className={`arena-podium-team ${
                  state.alphaScore >= state.betaScore ? 'winner' : ''
                }`}
              >
                <div
                  style={{
                    fontFamily: 'var(--arena-font-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  КОМАНДА АЛЬФА
                </div>
                <div className="arena-podium-big-pts">{state.alphaScore}</div>
                <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                  итоговых баллов
                </div>
              </div>

              <div
                className={`arena-podium-team ${
                  state.betaScore >= state.alphaScore ? 'winner' : ''
                }`}
              >
                <div
                  style={{
                    fontFamily: 'var(--arena-font-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  КОМАНДА БЕТА
                </div>
                <div className="arena-podium-big-pts">{state.betaScore}</div>
                <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                  итоговых баллов
                </div>
              </div>
            </div>

            <div className="arena-shield-rules-list">
              {ARENA_ROUNDS.map((r) => (
                <div key={r.number} className="arena-shield-rule-item">
                  <div
                    style={{
                      fontFamily: 'var(--arena-font-mono)',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    0{r.number} // {r.ruleTitle}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--arena-text-muted)',
                      marginTop: '3px',
                    }}
                  >
                    {r.ruleSummary}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="arena-secondary-btn"
                onClick={() => window.print()}
              >
                Печать памятки урока (PDF)
              </button>
              <button
                type="button"
                className="arena-primary-cta"
                style={{ flex: 1 }}
                onClick={() => dispatch({ type: 'START_GAME' })}
              >
                Начать новую серию с Раунда 01
              </button>
            </div>
          </section>

          <section className="arena-shield-card">
            <div>
              <div className="arena-eyebrow">СПРАВОЧНЫЙ ШАБЛОН C# (.NET 8)</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '20px' }}>
                Архитектура защищённого метода C#
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--arena-text-muted)' }}>
                Сводный образец кода, объединяющий правила всех четырёх раундов:
                специфичные фильтры <code>catch</code>, порядок иерархии типов,
                гарантированный блок <code>finally</code> и проброс через{' '}
                <code>throw;</code>.
              </p>
            </div>

            <div
              className="arena-ide-window"
              style={{
                flex: 1,
                border: '1px solid var(--arena-border)',
                borderRadius: '3px',
                background: 'var(--arena-code-bg)',
              }}
            >
              <div className="arena-ide-header">
                <div className="arena-ide-file">
                  <span className="arena-ide-tab-indicator" />
                  <span>ReferenceShield.cs — Образец защищённого метода</span>
                </div>
              </div>
              <div className="arena-ide-body">
                {[
                  'public decimal SafeProcessOrder(DbConnection db, string rawPrice, int count)',
                  '{',
                  '    db.Open();',
                  '    try',
                  '    {',
                  '        // 1. Защищаем потенциально опасные операции парсинга и деления',
                  '        decimal total = decimal.Parse(rawPrice);',
                  '        return total / count;',
                  '    }',
                  '    catch (FormatException ex) // 2. Сначала узкие специализированные типы',
                  '    {',
                  '        auditLog.Write("Ошибка формата цены: " + ex.Message);',
                  '        return 0m;',
                  '    }',
                  '    catch (DivideByZeroException ex)',
                  '    {',
                  '        auditLog.Write("Деление на ноль: " + ex.Message);',
                  '        return 0m;',
                  '    }',
                  '    catch (Exception ex) // 3. Базовый Exception располагается строго в конце',
                  '    {',
                  '        auditLog.Write("Непредвиденный сбой: " + ex.Message);',
                  '        throw; // 4. Пустой throw; сохраняет исходный StackTrace',
                  '    }',
                  '    finally // 5. Гарантированно выполняется при return и при исключениях',
                  '    {',
                  '        db.Close();',
                  '    }',
                  '}',
                ].map((codeLine, idx) => (
                  <div key={idx} className="arena-code-line">
                    <span className="arena-gutter-marker" />
                    <span className="arena-line-num">{idx + 1}</span>
                    <span className="arena-line-text">
                      <CSharpLineSyntax code={codeLine} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
};
