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

export const ExceptionArenaApp: React.FC = () => {
  const [state, rawDispatch] = useReducer(arenaReducer, undefined, loadArenaState);
  const [deviceRole, setDeviceRole] = useState<DeviceRole>('projector');
  const syncRef = useRef<ReturnType<typeof createArenaSyncChannel> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Подключаем мгновенную синхронизацию вкладок/окон (Проектор <-> Ноутбук Альфа <-> Ноутбук Бета)
  useEffect(() => {
    const channel = createArenaSyncChannel((remoteState) => {
      stateRef.current = remoteState;
      rawDispatch({ type: 'SYNC_FROM_REMOTE', payload: remoteState });
    });
    syncRef.current = channel;
    return () => channel.close();
  }, []);

  // Обёртка dispatch с публикацией в localStorage + BroadcastChannel
  const dispatch = (action: ArenaAction) => {
    const next = arenaReducer(stateRef.current, action);
    stateRef.current = next;
    rawDispatch(action);
    saveArenaState(next);
    syncRef.current?.publish(next);
  };

  // Слушаем внешние изменения из других вкладок через storage
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
    if (!state.timerRunning || state.stage !== 'round' || state.subPhase !== 'planning') {
      return;
    }
    const id = window.setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.timerRunning, state.stage, state.subPhase]);

  // Горячие клавиши ведущего на проекторе (Пробел / Стрелки)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (state.stage === 'round' && state.subPhase === 'tracing') {
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

  // Определяем, показывать ли живой патч в окне C#-кода
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

  // Определяем роль текущего ноутбука (если выбран режим ноутбука)
  const laptopTeamId =
    deviceRole === 'ALPHA' ? 'ALPHA' : deviceRole === 'BETA' ? 'BETA' : null;
  const isLaptopAttacker = laptopTeamId === attacker;

  // Маппинг вида шага на CSS-класс подсветки строки
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
          ПРАВИЛО №1: ЕДИНСТВЕННАЯ ВЕРХНЯЯ ПАНЕЛЬ 56px
          ==================================================================== */}
      <header className="arena-topbar">
        <button
          type="button"
          className="arena-brand"
          onClick={() => dispatch({ type: 'GO_TO_WELCOME' })}
          title="Вернуться на стартовый экран выбора роли"
        >
          <span className="arena-brand-badge">C# CLR</span>
          <span>Exception Arena: Атака vs Защита</span>
        </button>

        {/* Сегментированный переключатель роли устройства (Правило №4: никаких <select>!) */}
        <div className="arena-role-pills" role="group" aria-label="Режим экрана">
          <button
            type="button"
            className={`arena-pill-btn ${deviceRole === 'projector' ? 'active' : ''}`}
            onClick={() => setDeviceRole('projector')}
          >
            📽️ Проектор
          </button>
          <button
            type="button"
            className={`arena-pill-btn ${deviceRole === 'ALPHA' ? 'active' : ''}`}
            onClick={() => setDeviceRole('ALPHA')}
          >
            💻 Команда АЛЬФА
          </button>
          <button
            type="button"
            className={`arena-pill-btn ${deviceRole === 'BETA' ? 'active' : ''}`}
            onClick={() => setDeviceRole('BETA')}
          >
            💻 Команда БЕТА
          </button>
        </div>

        {/* Быстрая навигация по 4 раундам и Финалу */}
        <div className="arena-round-pills" role="group" aria-label="Раунды урока">
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
                {isDone ? '✓ ' : ''}Р{rNum}
              </button>
            );
          })}
          <button
            type="button"
            className={`arena-pill-btn ${state.stage === 'finale' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'GO_TO_FINALE' })}
          >
            🏆 Финал
          </button>
        </div>

        {/* Табло счёта команд и таймер */}
        <div className="arena-scoreboard">
          <div
            className={`arena-team-score ${
              attacker === 'ALPHA' ? 'is-attacking' : 'is-defending'
            }`}
          >
            <span>{attacker === 'ALPHA' ? '⚡' : '🛡️'} АЛЬФА</span>
            <span className="arena-score-num">{state.alphaScore}</span>
          </div>

          <div
            className={`arena-team-score ${
              attacker === 'BETA' ? 'is-attacking' : 'is-defending'
            }`}
          >
            <span>{attacker === 'BETA' ? '⚡' : '🛡️'} БЕТА</span>
            <span className="arena-score-num">{state.betaScore}</span>
          </div>

          {state.stage === 'round' && (
            <button
              type="button"
              className={`arena-timer-pill ${state.timerSec <= 10 ? 'warning' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
              title="Нажмите для паузы / запуска таймера раунда"
            >
              ⏱ {formatTimer(state.timerSec)}
            </button>
          )}

          <button
            type="button"
            className="arena-icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            title="Переключить светлую/тёмную тему для проектора"
          >
            {state.lightTheme ? '🌙 Тёмная' : '☀️ Светлая'}
          </button>

          <button
            type="button"
            className="arena-icon-btn"
            onClick={() => dispatch({ type: 'RESET_ALL' })}
            title="Сбросить игру к началу урока"
          >
            ↺ Сброс
          </button>
        </div>
      </header>

      {/* ====================================================================
          ЭКРАН 0: ПРИВЕТСТВИЕ И ВЫБОР УСТРОЙСТВА (WELCOME)
          ==================================================================== */}
      {state.stage === 'welcome' && (
        <main className="arena-welcome-wrap">
          <section className="arena-hero-card">
            <div className="arena-hero-top">
              <div>
                <h1 className="arena-hero-title">
                  C# Exception Arena: Атака vs Защита
                </h1>
                <p className="arena-hero-sub">
                  Командный поединок на 1 открытое занятие (45 мин). Одна команда
                  ищет уязвимую строку C#-метода и бьёт входным снарядом, вторая —
                  конструирует защиту <code>try / catch / finally</code> и держит
                  ответ на слепой блиц-рулетке.
                </p>
              </div>
              <button
                type="button"
                className="arena-primary-cta"
                style={{ width: 'auto', padding: '14px 26px' }}
                onClick={() => {
                  setDeviceRole('projector');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                🚀 Начать Раунд 1 на проекторе
              </button>
            </div>

            {/* 3 карточки выбора роли устройства (Вариант Б) */}
            <div className="arena-device-grid">
              <button
                type="button"
                className="arena-device-card projector"
                onClick={() => {
                  setDeviceRole('projector');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                <span className="arena-device-badge">📽️ ЭКРАН У ДОСКИ</span>
                <div>
                  <h3>Режим Проектора (Ведущий)</h3>
                  <p>
                    Центральное окно C#-кода, статус запечатанных конвертов команд,
                    пошаговая трассировка CLR, 3 датчика системы и слепая рулетка
                    блиц-проверки.
                  </p>
                </div>
                <span className="arena-device-cta">
                  Открыть экран проектора →
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
                <span className="arena-device-badge">💻 ПУЛЬТ КОМАНДЫ №1</span>
                <div>
                  <h3>Ноутбук Команды АЛЬФА</h3>
                  <p>
                    Раунды 1 и 3 — ⚡ Атака исключениями. Раунды 2 и 4 — 🛡️ Защита
                    кода. Трёхшаговая цепочка хода для всех 6 участников команды.
                  </p>
                </div>
                <span className="arena-device-cta">
                  Войти за Команду АЛЬФА →
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
                <span className="arena-device-badge">💻 ПУЛЬТ КОМАНДЫ №2</span>
                <div>
                  <h3>Ноутбук Команды БЕТА</h3>
                  <p>
                    Раунды 1 и 3 — 🛡️ Защита кода. Раунды 2 и 4 — ⚡ Атака
                    исключениями. Живой предпросмотр патча <code>try/catch</code> и
                    голосовые коды.
                  </p>
                </div>
                <span className="arena-device-cta">
                  Войти за Команду БЕТА →
                </span>
              </button>
            </div>

            {/* Прогрессия 4 раундов урока с растущими ставками */}
            <div className="arena-rounds-preview">
              {ARENA_ROUNDS.map((r) => (
                <div key={r.number} className="arena-round-mini">
                  <div className="arena-round-mini-top">
                    <span>РАУНД {r.number}</span>
                    <span className="arena-round-mini-pts">
                      {r.maxPoints} очков
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
          ЭКРАН 1..4: РАБОЧАЯ АРЕНА РАУНДА (ПРОЕКТОР ИЛИ НОУТБУК КОМАНДЫ)
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
                РАУНД {currentRound.number} / 4 · {currentRound.maxPoints} ОЧКОВ
              </span>
              <div className="arena-round-heading">
                <h2>
                  {currentRound.title} —{' '}
                  <span style={{ color: 'var(--arena-text-muted)', fontWeight: 600 }}>
                    {currentRound.subtitle}
                  </span>
                </h2>
                <p>{currentRound.engineeringNote}</p>
              </div>
            </div>

            {/* Переключатель 4 последовательных фаз раунда (Правило №3) */}
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
                1. Ход команд
              </button>
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'tracing' ? 'active' : ''
                }`}
                onClick={() => dispatch({ type: 'LAUNCH_CLASH' })}
              >
                2. Трассировка CLR
              </button>
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'roulette' ? 'active' : ''
                }`}
                onClick={() => dispatch({ type: 'OPEN_ROULETTE' })}
              >
                3. Блиц-рулетка
              </button>
              <button
                type="button"
                className={`arena-step-chip ${
                  state.subPhase === 'summary' ? 'active' : ''
                }`}
                onClick={() => dispatch({ type: 'OPEN_SUMMARY' })}
              >
                4. Разбор и правило
              </button>
            </div>
          </section>

          {/* Рабочая двухколоночная сетка */}
          <div className="arena-work-grid">
            {/* ==============================================================
                ЛЕВАЯ КОЛОНКА: ОКНО C# IDE С ЖИВЫМ DIFF И 3 ДАТЧИКАМИ СИСТЕМЫ
                ============================================================== */}
            <section className="arena-ide-column">
              <div className="arena-ide-window">
                <div className="arena-ide-header">
                  <div className="arena-ide-file">
                    <div className="arena-ide-dots">
                      <span
                        className="arena-ide-dot"
                        style={{ background: '#ef4444' }}
                      />
                      <span
                        className="arena-ide-dot"
                        style={{ background: '#f59e0b' }}
                      />
                      <span
                        className="arena-ide-dot"
                        style={{ background: '#10b981' }}
                      />
                    </div>
                    <span>ArenaService.cs — {currentRound.methodSignature}</span>
                  </div>
                  <span style={{ color: 'var(--arena-text-muted)' }}>
                    {state.subPhase === 'planning'
                      ? 'Шаг 1: кликните по опасной строке кода'
                      : previewDefenseId
                      ? `Патч Защиты: ${previewDefenseId}`
                      : 'Исходный код'}
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
                        <span className="arena-line-num">
                          {lineObj.isAddedPatch ? '+' : lineObj.lineNumber}
                        </span>
                        <span className="arena-line-text">
                          <CSharpLineSyntax code={lineObj.code} />
                        </span>
                        <span className="arena-line-badges">
                          {isAtkTarget && (
                            <span className="arena-inline-badge target-badge-atk">
                              🎯 Строка атаки
                            </span>
                          )}
                          {isDefTarget && (
                            <span className="arena-inline-badge target-badge-def">
                              🛡️ Точка защиты
                            </span>
                          )}
                          {isActiveTrace && activeStep?.inlineBadge && (
                            <span className="arena-inline-badge var-badge">
                              {activeStep.inlineBadge}
                            </span>
                          )}
                          {isSkipped && (
                            <span className="arena-inline-badge skip-badge">
                              ⏭ ПРОПУЩЕНО
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 ФИЗИЧЕСКИХ ДАТЧИКА СИСТЕМЫ ПОД КОДОМ (Правило №11) */}
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
                    <span>🔌 ДАТЧИК 1: Соединение БД</span>
                    <span>IDisposable / finally</span>
                  </div>
                  <div className="arena-sensor-value">
                    {state.subPhase === 'planning'
                      ? '⏳ Ожидание запуска метода'
                      : simulation.finalDbState === 'LEAK'
                      ? '🚨 ЗАВИСЛО В ПАМЯТИ (Утечка!)'
                      : '✅ ЗАКРЫТО (db.Close выполнен)'}
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
                    <span>📋 ДАТЧИК 2: Журнал ошибок</span>
                    <span>ex.Message</span>
                  </div>
                  <div className="arena-sensor-value">
                    {state.subPhase === 'planning'
                      ? '⏳ Журнал чист'
                      : simulation.finalLogState === 'SWALLOWED'
                      ? '🚨 ПУСТО (Ошибка проглочена!)'
                      : simulation.finalLogState === 'LOGGED'
                      ? '✅ ЗАПИСАНО в лог мониторинга'
                      : 'ℹ️ Штатный режим'}
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
                    <span>🧭 ДАТЧИК 3: StackTrace</span>
                    <span>throw; vs throw ex;</span>
                  </div>
                  <div className="arena-sensor-value">
                    {state.subPhase === 'planning'
                      ? '⏳ Стек вызовов CLR'
                      : simulation.finalStackState === 'RESET'
                      ? '⚠️ СТЁРТ (throw ex сбросил строку!)'
                      : simulation.outcome === 'BREACHED'
                      ? '💥 СБОЙ ИЛИ ПРОБИТИЕ ЗАЩИТЫ'
                      : '✅ СОХРАНЕН (строка видна)'}
                  </div>
                </div>
              </div>
            </section>

            {/* ==============================================================
                ПРАВАЯ КОЛОНКА: ПАНЕЛЬ АКТИВНОЙ ФАЗЫ (ПРОЕКТОР ИЛИ НОУТБУК)
                ============================================================== */}
            <section className="arena-phase-column">
              {/* ------------------------------------------------------------
                  ВАРИАНТ 1: ФАЗА ПЛАНИРОВАНИЯ НА КОМАНДНОМ НОУТБУКЕ (АЛЬФА/БЕТА)
                  ------------------------------------------------------------ */}
              {state.subPhase === 'planning' && laptopTeamId && (
                <div className="arena-phase-panel">
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        className="arena-device-badge"
                        style={{
                          background: isLaptopAttacker
                            ? 'var(--arena-attack-bg)'
                            : 'var(--arena-defense-bg)',
                          color: isLaptopAttacker
                            ? 'var(--arena-attack)'
                            : 'var(--arena-defense)',
                        }}
                      >
                        {isLaptopAttacker
                          ? `⚡ ${
                              laptopTeamId === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'
                            } — В АТАКЕ`
                          : `🛡️ ${
                              laptopTeamId === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'
                            } — В ЗАЩИТЕ`}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>
                        Ставка раунда: {currentRound.maxPoints} очков
                      </span>
                    </div>

                    {/* Трёхшаговая цепочка ролей для 6 учеников за ноутбуком */}
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
                        <strong>Шаг 1 (Игроки 1–2):</strong>
                        <div>
                          {(
                            isLaptopAttacker
                              ? state.attackTargetLine
                              : state.defenseTargetLine
                          )
                            ? `✓ Строка #${
                                isLaptopAttacker
                                  ? state.attackTargetLine
                                  : state.defenseTargetLine
                              } выбрана`
                            : 'Кликните опасную строку C#-кода слева'}
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
                        <strong>Шаг 2 (Игроки 3–4):</strong>
                        <div>
                          {(
                            isLaptopAttacker
                              ? state.selectedAttackId
                              : state.selectedDefenseId
                          )
                            ? `✓ Выбран ход ${
                                isLaptopAttacker
                                  ? state.selectedAttackId
                                  : state.selectedDefenseId
                              }`
                            : isLaptopAttacker
                            ? 'Выберите снаряд А-1..А-3'
                            : 'Выберите патч З-1..З-4'}
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
                        <strong>Шаг 3 (Игроки 5–6):</strong>
                        <div>
                          {(
                            isLaptopAttacker
                              ? state.attackLocked
                              : state.defenseLocked
                          )
                            ? '🔒 Конверт запечатан!'
                            : 'Запечатайте ход и готовьтесь к рулетке'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Карточки выбора только для своей роли (Атака ИЛИ Защита) */}
                  {isLaptopAttacker ? (
                    <div className="arena-voice-section">
                      <div className="arena-voice-group-label">
                        <span>
                          ⚡ ВЫБЕРИТЕ ВХОДНОЙ ПАКЕТ АТАКИ (или назовите голосом код
                          А-1..А-3):
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
                                  Бьёт в строку #{atk.targetLine} · Цель:{' '}
                                  {atk.expectedException} — {atk.shortDesc}
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
                        <span>
                          🛡️ ВЫБЕРИТЕ ПАТЧ ЗАЩИТЫ (сразу вставляется в окно C#-кода
                          слева):
                        </span>
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
                      ? '🔓 Разблокировать конверт (изменить ход)'
                      : '🔒 ЗАПЕЧАТАТЬ ХОД КОМАНДЫ'}
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ВАРИАНТ 2: ФАЗА ПЛАНИРОВАНИЯ НА ЭКРАНЕ ПРОЕКТОРА У ДОСКИ
                  ------------------------------------------------------------ */}
              {state.subPhase === 'planning' && !laptopTeamId && (
                <div className="arena-phase-panel">
                  {/* Конверты синхронного хода (Правило №12: защита от подглядывания!) */}
                  <div className="arena-envelopes-grid">
                    <div className="arena-envelope-box atk">
                      <div className="arena-envelope-top">
                        <span>
                          ⚡ АТАКА ({attacker === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'})
                        </span>
                        <span
                          className={`arena-lock-badge ${
                            state.attackLocked ? 'locked' : 'waiting'
                          }`}
                        >
                          {state.attackLocked ? '🔒 ЗАПЕЧАТАН' : '⏳ ВЫБИРАЕТ'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                        {state.attackLocked
                          ? 'Конверт атаки готов к вскрытию на проекторе'
                          : 'Команда выбирает опасную строку и снаряд А-1..А-3'}
                      </div>
                    </div>

                    <div className="arena-envelope-box def">
                      <div className="arena-envelope-top">
                        <span>
                          🛡️ ЗАЩИТА ({defender === 'ALPHA' ? 'АЛЬФА' : 'БЕТА'})
                        </span>
                        <span
                          className={`arena-lock-badge ${
                            state.defenseLocked ? 'locked' : 'waiting'
                          }`}
                        >
                          {state.defenseLocked ? '🔒 ЗАПЕЧАТАН' : '⏳ ВЫБИРАЕТ'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                        {state.defenseLocked
                          ? 'Щит защиты готов к проверке компилятором C#'
                          : 'Команда выбирает конструкцию З-1..З-4'}
                      </div>
                    </div>
                  </div>

                  {/* Быстрый пульт голосовых кодов для ведущего у доски (А-1..А-3 и З-1..З-4) */}
                  <div className="arena-voice-section">
                    <div className="arena-voice-group-label">
                      <span>⚡ СНАРЯДЫ АТАКИ (коды с места А-1..А-3):</span>
                      <span>
                        {state.attackTargetLine
                          ? `Прицел: строка #${state.attackTargetLine}`
                          : 'Кликните строку слева или код ниже'}
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
                                Строка #{atk.targetLine} · Цель:{' '}
                                {atk.expectedException} ({atk.shortDesc})
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="arena-voice-section">
                    <div className="arena-voice-group-label">
                      <span>🛡️ ПАТЧИ ЗАЩИТЫ (коды с места З-1..З-4):</span>
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
                    🚀 ВСКРЫТЬ КОНВЕРТЫ И ЗАПУСТИТЬ CLR-ТРАССИРОВКУ
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ФАЗА 2: ПОШАГОВАЯ ТРАССИРОВКА CLR (TRACING)
                  ------------------------------------------------------------ */}
              {state.subPhase === 'tracing' && activeStep && (
                <div className="arena-phase-panel">
                  <div className="arena-envelopes-grid">
                    <div className="arena-envelope-box atk">
                      <div className="arena-envelope-top">
                        <span>⚡ ВЫБОР АТАКИ</span>
                        <span className="arena-voice-code atk">
                          {
                            currentRound.attackOptions.find(
                              (a) => a.id === activeAttackId
                            )?.codeLabel
                          }
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>
                        {
                          currentRound.attackOptions.find(
                            (a) => a.id === activeAttackId
                          )?.payloadCode
                        }
                      </div>
                    </div>

                    <div className="arena-envelope-box def">
                      <div className="arena-envelope-top">
                        <span>🛡️ ВЫБОР ЗАЩИТЫ</span>
                        <span className="arena-voice-code def">
                          {
                            currentRound.defenseOptions.find(
                              (d) => d.id === activeDefenseId
                            )?.codeLabel
                          }
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>
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
                        ШАГ ТРАССИРОВКИ {state.traceStepIdx + 1} ИЗ{' '}
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
                      <h4>⏭ Правило управления потоком C#</h4>
                      <p>
                        После выброса исключения строки{' '}
                        <code>
                          #{activeStep.skippedLineNumbers.join(', #')}
                        </code>{' '}
                        внутри блока <code>try</code> мгновенно пропускаются —
                        управление летит напрямую в подходящий <code>catch</code>{' '}
                        или <code>finally</code>!
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
                      ◀ Шаг назад
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
                      Шаг вперёд ▶
                    </button>
                  </div>

                  <button
                    type="button"
                    className="arena-primary-cta"
                    onClick={() => dispatch({ type: 'OPEN_ROULETTE' })}
                  >
                    🎰 КРУТИТЬ СЛЕПУЮ РУЛЕТКУ БЛИЦ-ВОПРОСА (+
                    {Math.round(currentRound.maxPoints / 2)} ОЧКОВ)
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ФАЗА 3: СЛЕПАЯ РУЛЕТКА БЛИЦ-ВОПРОСА (ПРОТИВ «ОДНОГО ОТЛИЧНИКА»)
                  ------------------------------------------------------------ */}
              {state.subPhase === 'roulette' && (
                <div className="arena-phase-panel">
                  <div className="arena-roulette-box">
                    <div className="arena-roulette-header">
                      <span className="arena-player-call-badge">
                        🎯 ОТВЕЧАЕТ УЧАСТНИК №{state.roulettePlayerNum} (БЕЗ
                        ПОДСКАЗОК!)
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--arena-font-mono)',
                          fontWeight: 800,
                          fontSize: '13px',
                        }}
                      >
                        На кону вторые 50% очков (+
                        {Math.round(currentRound.maxPoints / 2)} очк.)
                      </span>
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
                    📊 ПОКАЗАТЬ ИТОГ РАУНДА И ОТКРЫТЬ ПРАВИЛО C# →
                  </button>
                </div>
              )}

              {/* ------------------------------------------------------------
                  ФАЗА 4: ИТОГ РАУНДА + ОТКРЫТОЕ ПРАВИЛО + «А ЧТО ЕСЛИ?»
                  ------------------------------------------------------------ */}
              {state.subPhase === 'summary' && (
                <div className="arena-phase-panel">
                  <div className={`arena-verdict-banner ${simulation.outcome}`}>
                    <div className="arena-verdict-title">
                      {simulation.headline}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                      {simulation.reasonDetailed}
                    </div>
                  </div>

                  <div className="arena-rule-card">
                    <h4>{currentRound.ruleTitle}</h4>
                    <p>{currentRound.ruleSummary}</p>
                  </div>

                  {/* Интерактив «А что если бы выбрали другой вариант?» прямо в коде! */}
                  <div className="arena-voice-section">
                    <div className="arena-voice-group-label">
                      <span>
                        🔍 ЖИВОЙ РАЗБОР «А ЧТО ЕСЛИ?»: кликните любой вариант,
                        чтобы увидеть его в коде слева:
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
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
                          ⚡ {atk.codeLabel}: {atk.payloadCode}
                        </button>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
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
                          🛡️ {def.codeLabel}: {def.title}
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
                      ➡️ ПЕРЕЙТИ К РАУНДУ {state.roundNumber + 1} (СМЕНА РОЛЕЙ
                      КОМАНД)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="arena-primary-cta"
                      onClick={() => dispatch({ type: 'GO_TO_FINALE' })}
                    >
                      🏆 ОТКРЫТЬ ФИНАЛ И «ЭТАЛОННЫЙ ЩИТ ИНЖЕНЕРА C#»
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ====================================================================
          ЭКРАН 5: ФИНАЛ УРОКА И «ЭТАЛОННЫЙ ЩИТ ИНЖЕНЕРА C#»
          ==================================================================== */}
      {state.stage === 'finale' && (
        <main className="arena-finale-wrap">
          <section className="arena-podium-card">
            <div>
              <span className="arena-device-badge">🏆 ИТОГИ ПОЕДИНКА</span>
              <h2 style={{ margin: '8px 0 4px', fontSize: '24px' }}>
                Финальный счёт команд
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--arena-text-muted)' }}>
                Все 4 раунда C# Exception Arena пройдены: команды испытали себя и
                в роли атакующих тестировщиков, и в роли архитекторов защиты.
              </p>
            </div>

            <div className="arena-podium-scores">
              <div
                className={`arena-podium-team ${
                  state.alphaScore >= state.betaScore ? 'winner' : ''
                }`}
              >
                <div style={{ fontSize: '13px', fontWeight: 800 }}>
                  КОМАНДА АЛЬФА
                </div>
                <div className="arena-podium-big-pts">{state.alphaScore}</div>
                <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                  очков (бои + блиц-рулетка)
                </div>
              </div>

              <div
                className={`arena-podium-team ${
                  state.betaScore >= state.alphaScore ? 'winner' : ''
                }`}
              >
                <div style={{ fontSize: '13px', fontWeight: 800 }}>
                  КОМАНДА БЕТА
                </div>
                <div className="arena-podium-big-pts">{state.betaScore}</div>
                <div style={{ fontSize: '12px', color: 'var(--arena-text-muted)' }}>
                  очков (бои + блиц-рулетка)
                </div>
              </div>
            </div>

            {/* Сводка 4 открытых правил C# */}
            <div className="arena-shield-rules-list">
              {ARENA_ROUNDS.map((r) => (
                <div key={r.number} className="arena-shield-rule-item">
                  <div style={{ fontWeight: 800, fontSize: '13px' }}>
                    ✓ {r.ruleTitle}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--arena-text-muted)',
                      marginTop: '2px',
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
                🖨️ Распечатать / Сохранить PDF памятку урока
              </button>
              <button
                type="button"
                className="arena-primary-cta"
                style={{ flex: 1 }}
                onClick={() => dispatch({ type: 'START_GAME' })}
              >
                🔄 Сыграть ещё раз с Раунда 1
              </button>
            </div>
          </section>

          {/* Правая карточка: Собранный «Эталонный щит инженера C#» */}
          <section className="arena-shield-card">
            <div>
              <span className="arena-device-badge">
                🛡️ ПАМЯТКА ИНЖЕНЕРА C# (ИТОГ ЗАНЯТИЯ)
              </span>
              <h2 style={{ margin: '8px 0 4px', fontSize: '22px' }}>
                Эталонный шаблон защищённого метода C#
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--arena-text-muted)' }}>
                Объединяет все 4 правила, открытые классом за урок: прицельный
                перехват, верная иерархия от частного к общему, освобождение
                ресурсов в <code>finally</code> и бережное логирование с{' '}
                <code>throw;</code>.
              </p>
            </div>

            <div className="arena-ide-window" style={{ flex: 1 }}>
              <div className="arena-ide-header">
                <span className="arena-ide-file">
                  ReferenceShield.cs — Золотой стандарт C# Exception Handling
                </span>
              </div>
              <div className="arena-ide-body">
                {[
                  'public decimal SafeProcessOrder(DbConnection db, string rawPrice, int count)',
                  '{',
                  '    db.Open();',
                  '    try',
                  '    {',
                  '        // 1. Прицельно защищаем опасные операции парсинга и деления',
                  '        decimal total = decimal.Parse(rawPrice);',
                  '        return total / count;',
                  '    }',
                  '    catch (FormatException ex) // 2. Сначала узкие типы исключений!',
                  '    {',
                  '        auditLog.Write("Ошибка формата цены: " + ex.Message);',
                  '        return 0m;',
                  '    }',
                  '    catch (DivideByZeroException ex)',
                  '    {',
                  '        auditLog.Write("Деление на ноль: " + ex.Message);',
                  '        return 0m;',
                  '    }',
                  '    catch (Exception ex) // 3. Базовый Exception — только в самом конце',
                  '    {',
                  '        auditLog.Write("Критическая ошибка: " + ex.Message);',
                  '        throw; // 4. Только пустой throw; чтобы сохранить StackTrace!',
                  '    }',
                  '    finally // 5. Выполнится ВСЕГДА (даже после return и throw)',
                  '    {',
                  '        db.Close();',
                  '    }',
                  '}',
                ].map((codeLine, idx) => (
                  <div key={idx} className="arena-code-line">
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
