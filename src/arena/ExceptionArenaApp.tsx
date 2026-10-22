import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ARENA_ROUNDS,
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
import { soundEngine } from './soundEngine';
import '../styles/arena.css';

// Векторный указатель активной строки кода
const StepPointerIcon: React.FC = () => (
  <svg className="arena-ip-arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 3.5h6.2L13.5 8l-5.3 4.5H2V3.5z" />
  </svg>
);

type SimpleTurnStep =
  | 'defense_turn'
  | 'attack_turn'
  | 'result_view'
  | 'blitz_question';

export const ExceptionArenaApp: React.FC = () => {
  const [state, rawDispatch] = useReducer(arenaReducer, undefined, loadArenaState);
  const [turnStep, setTurnStep] = useState<SimpleTurnStep>('defense_turn');
  const [spinningPlayer, setSpinningPlayer] = useState(false);
  const [displayedPlayer, setDisplayedPlayer] = useState<number>(
    state.roulettePlayerNum
  );
  const [autoStepping, setAutoStepping] = useState(false);

  const syncRef = useRef<ReturnType<typeof createArenaSyncChannel> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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
    if (state.subPhase === 'planning') {
      setTurnStep('defense_turn');
    } else if (state.subPhase === 'tracing' || state.subPhase === 'summary') {
      setTurnStep('result_view');
    } else if (state.subPhase === 'roulette') {
      setTurnStep('blitz_question');
    }
  }, [state.roundNumber, state.subPhase]);

  useEffect(() => {
    setDisplayedPlayer(state.roulettePlayerNum);
  }, [state.roulettePlayerNum]);

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

  const attackerTeamTitle =
    attacker === 'ALPHA' ? 'Команда Альфа' : 'Команда Бета';
  const defenderTeamTitle =
    defender === 'ALPHA' ? 'Команда Альфа' : 'Команда Бета';
  const blitzTeamTitle =
    state.rouletteAnsweringTeam === 'ALPHA' ? 'Команда Альфа' : 'Команда Бета';

  // На Шаге 3 и 4 используем изолированный sandbox-выбор, чтобы переключение «А что если?» не портило боевой счёт
  const activeAttackId =
    turnStep === 'result_view' || turnStep === 'blitz_question'
      ? state.sandboxAttackId || state.selectedAttackId || 'A1'
      : state.selectedAttackId || 'A1';

  const activeDefenseId =
    turnStep === 'result_view' || turnStep === 'blitz_question'
      ? state.sandboxDefenseId || state.selectedDefenseId || 'D1'
      : state.selectedDefenseId || 'D1';

  const selectedAttackObj = useMemo(
    () =>
      currentRound.attackOptions.find((a) => a.id === state.selectedAttackId) ||
      null,
    [currentRound, state.selectedAttackId]
  );

  const simulation = useMemo(
    () => simulateClash(currentRound, activeAttackId, activeDefenseId),
    [currentRound, activeAttackId, activeDefenseId]
  );

  // Зафиксированный боевой исход раунда (для защиты от искажения при просмотре «А что если?»)
  const lockedSimulation = useMemo(
    () =>
      simulateClash(
        currentRound,
        state.selectedAttackId || 'A1',
        state.selectedDefenseId || 'D1'
      ),
    [currentRound, state.selectedAttackId, state.selectedDefenseId]
  );

  const isSandboxPreviewDifferent =
    (turnStep === 'result_view' || turnStep === 'blitz_question') &&
    ((state.sandboxAttackId &&
      state.selectedAttackId &&
      state.sandboxAttackId !== state.selectedAttackId) ||
      (state.sandboxDefenseId &&
        state.selectedDefenseId &&
        state.sandboxDefenseId !== state.selectedDefenseId));

  // Автоматический плавный проход указателя по строкам кода при запуске проверки
  useEffect(() => {
    if (!autoStepping || turnStep !== 'result_view') return;
    if (state.traceStepIdx >= simulation.steps.length - 1) {
      setAutoStepping(false);
      return;
    }
    const timer = window.setTimeout(() => {
      const nextIdx = state.traceStepIdx + 1;
      const nextStep = simulation.steps[nextIdx];
      if (
        nextStep?.stepKind === 'explode' ||
        nextStep?.stepKind === 'compile_error' ||
        nextStep?.stepKind === 'leak'
      ) {
        soundEngine.playExceptionInterrupt(stateRef.current.soundEnabled);
      } else {
        soundEngine.playStepTick(stateRef.current.soundEnabled);
      }
      dispatch({ type: 'STEP_TRACE', stepIdx: nextIdx });
    }, 620);

    return () => window.clearTimeout(timer);
  }, [autoStepping, turnStep, state.traceStepIdx, simulation.steps]);

  // На Шаге 1 (Защита) и Шаге 2 (Атака) показываем выбранный Защитой патч прямо в окне кода
  const previewDefenseId =
    turnStep === 'result_view' || turnStep === 'blitz_question'
      ? activeDefenseId
      : state.selectedDefenseId;

  const displayedCodeLines = useMemo(
    () => getPatchedCodeLines(currentRound, previewDefenseId),
    [currentRound, previewDefenseId]
  );

  const activeStep =
    turnStep === 'result_view' || turnStep === 'blitz_question'
      ? simulation.steps[
          Math.min(state.traceStepIdx, simulation.steps.length - 1)
        ]
      : null;

  // Короткое вращение выбора номера участника (1..6)
  const spinPlayerNumber = () => {
    const nextNum = ((Math.floor(Math.random() * 6) + 1) as
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6);
    setSpinningPlayer(true);
    const delays = [60, 80, 100, 130, 170, 220];
    let idx = 0;
    let cur = displayedPlayer;

    const tick = () => {
      if (idx < delays.length) {
        cur = (cur % 6) + 1;
        setDisplayedPlayer(cur);
        soundEngine.playStepTick(stateRef.current.soundEnabled);
        idx += 1;
        window.setTimeout(tick, delays[idx - 1]);
      } else {
        setDisplayedPlayer(nextNum);
        setSpinningPlayer(false);
        soundEngine.playVerifiedTone(stateRef.current.soundEnabled);
        dispatch({ type: 'SET_ROULETTE_PLAYER', playerNum: nextNum });
      }
    };
    tick();
  };

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
          1. ЧИСТАЯ ШАПКА (ТОЛЬКО РАУНДЫ, СЧЁТ ДВУХ КОМАНД И ТЕМА)
          ==================================================================== */}
      <header className="arena-topbar">
        <div className="arena-topbar-left">
          <button
            type="button"
            className="arena-title-btn"
            onClick={() => dispatch({ type: 'GO_TO_WELCOME' })}
          >
            C# Exception Arena
          </button>

          <nav className="arena-round-nav" aria-label="Раунды">
            {([1, 2, 3, 4] as RoundNumber[]).map((rNum) => {
              const isCurrent =
                state.stage === 'round' && state.roundNumber === rNum;
              const isDone = Boolean(state.roundHistory[rNum]);
              return (
                <button
                  key={rNum}
                  type="button"
                  className={`arena-round-tab ${isCurrent ? 'active' : ''} ${
                    isDone ? 'done' : ''
                  }`}
                  onClick={() => {
                    setAutoStepping(false);
                    setTurnStep('defense_turn');
                    dispatch({ type: 'SELECT_ROUND', roundNumber: rNum });
                  }}
                >
                  Раунд {rNum}
                </button>
              );
            })}
            <button
              type="button"
              className={`arena-round-tab ${
                state.stage === 'finale' ? 'active' : ''
              }`}
              onClick={() => dispatch({ type: 'GO_TO_FINALE' })}
            >
              Итоги
            </button>
          </nav>
        </div>

        <div className="arena-score-strip">
          <div className="arena-score-pill">
            <span>Команда Альфа</span>
            <strong>{state.alphaScore}</strong>
          </div>
          <div className="arena-score-pill">
            <span>Команда Бета</span>
            <strong>{state.betaScore}</strong>
          </div>
        </div>

        <div className="arena-topbar-right">
          <button
            type="button"
            className="arena-quiet-btn"
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
          >
            {state.lightTheme ? 'Тёмная тема' : 'Светлая тема'}
          </button>
          <button
            type="button"
            className="arena-quiet-btn"
            onClick={() => {
              setAutoStepping(false);
              setTurnStep('defense_turn');
              dispatch({ type: 'RESET_ALL' });
            }}
          >
            Сброс
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. СТАРТОВЫЙ ЭКРАН
          ==================================================================== */}
      {state.stage === 'welcome' && (
        <main className="arena-start-screen">
          <section className="arena-start-box">
            <div>
              <h1>Атака и Защита кода на C#</h1>
              <p>
                Учебная игра из 4 раундов. В каждом раунде команда Защиты
                сначала выбирает патч <code>try / catch / finally</code> для
                метода C#, а команда Атаки изучает этот код и ищет входные
                данные, которые обнаружат уязвимость.
              </p>
            </div>

            <div className="arena-start-rounds">
              {ARENA_ROUNDS.map((r) => (
                <div key={r.number} className="arena-start-round-item">
                  <div className="arena-start-round-meta">
                    <span>Раунд {r.number}</span>
                    <span>{r.maxPoints} очков</span>
                  </div>
                  <h3>{r.title}</h3>
                  <span>{r.subtitle}</span>
                </div>
              ))}
            </div>

            <div className="arena-actions-row">
              <button
                type="button"
                className="arena-main-btn"
                onClick={() => {
                  setTurnStep('defense_turn');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                Начать Раунд 1 →
              </button>
            </div>
          </section>
        </main>
      )}

      {/* ====================================================================
          3. РАБОЧИЙ ЭКРАН РАУНДА: ТОЛЬКО 2 БЛОКА (КОД СЛЕВА + 1 ШАГ СПРАВА)
          ==================================================================== */}
      {state.stage === 'round' && (
        <main className="arena-workspace">
          {/* ----------------------------------------------------------------
              ЛЕВЫЙ БЛОК: ЖИВОЙ ИНТЕРАКТИВНЫЙ КОД МЕТОДА C#
              ---------------------------------------------------------------- */}
          <section className="arena-code-panel">
            <div className="arena-code-header">
              <div className="arena-code-header-top">
                <span className="arena-code-title">
                  Раунд {currentRound.number}. {currentRound.title}
                </span>
                <span className="arena-code-points">
                  {currentRound.maxPoints} очков
                </span>
              </div>
              <span className="arena-code-subtitle">
                {currentRound.subtitle}
              </span>
            </div>

            <div className="arena-code-lines">
              {displayedCodeLines.map((lineObj) => {
                const isActiveTrace =
                  activeStep &&
                  activeStep.activeLineNumber === lineObj.lineNumber;
                const traceClass = isActiveTrace
                  ? getStepTraceClass(activeStep?.stepKind)
                  : '';
                const isSkipped =
                  (turnStep === 'result_view' ||
                    turnStep === 'blitz_question') &&
                  Boolean(
                    activeStep?.skippedLineNumbers.includes(lineObj.lineNumber)
                  );

                const isAttackTargetedLine =
                  turnStep === 'attack_turn' &&
                  selectedAttackObj &&
                  selectedAttackObj.targetLine === lineObj.lineNumber;

                return (
                  <div
                    key={`${lineObj.lineNumber}-${lineObj.code}`}
                    className={`arena-line ${
                      turnStep === 'attack_turn' && !lineObj.isAddedPatch
                        ? 'clickable-line'
                        : ''
                    } ${lineObj.isAddedPatch ? 'diff-added' : ''} ${
                      isAttackTargetedLine ? 'attack-targeted' : ''
                    } ${traceClass} ${isSkipped ? 'line-skipped' : ''}`}
                    onClick={() => {
                      if (turnStep === 'attack_turn') {
                        // Клик прямо по строке кода выбирает связанный с этой строкой вариант атаки
                        const matchingAtk = currentRound.attackOptions.find(
                          (a) => a.targetLine === lineObj.lineNumber
                        );
                        if (matchingAtk) {
                          soundEngine.playStepTick(state.soundEnabled);
                          dispatch({
                            type: 'PICK_ATTACK_OPTION',
                            optionId: matchingAtk.id,
                          });
                        }
                      }
                    }}
                  >
                    <span className="arena-line-ptr">
                      {isActiveTrace || isAttackTargetedLine ? (
                        <StepPointerIcon />
                      ) : null}
                    </span>
                    <span className="arena-line-number">
                      {lineObj.isAddedPatch ? '+' : lineObj.lineNumber}
                    </span>
                    <span className="arena-line-code">
                      <CSharpLineSyntax code={lineObj.code} />
                    </span>
                    <span>
                      {isAttackTargetedLine && selectedAttackObj && (
                        <span className="arena-line-tag tag-attack">
                          {selectedAttackObj.payloadCode}
                        </span>
                      )}
                      {isActiveTrace && activeStep?.inlineBadge && (
                        <span className="arena-line-tag tag-step">
                          {activeStep.inlineBadge}
                        </span>
                      )}
                      {isSkipped && (
                        <span className="arena-line-tag tag-skip">
                          пропущено
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="arena-code-footer">
              <span>
                {turnStep === 'defense_turn'
                  ? previewDefenseId
                    ? `В код подставлен патч Защиты ${
                        currentRound.defenseOptions.find(
                          (d) => d.id === previewDefenseId
                        )?.codeLabel || previewDefenseId
                      }`
                    : 'Выберите вариант защиты справа, чтобы увидеть патч прямо в коде'
                  : turnStep === 'attack_turn'
                  ? `В коде установлен патч Защиты ${
                      currentRound.defenseOptions.find(
                        (d) => d.id === state.selectedDefenseId
                      )?.codeLabel || 'З-1'
                    } — найдите входные данные, которые его пробьют`
                  : `Разбор: Защита ${
                      currentRound.defenseOptions.find(
                        (d) => d.id === activeDefenseId
                      )?.codeLabel || activeDefenseId
                    } против Атаки ${
                      currentRound.attackOptions.find(
                        (a) => a.id === activeAttackId
                      )?.codeLabel || activeAttackId
                    }`}
              </span>
              {currentRound.number === 3 &&
                (turnStep === 'result_view' ||
                  turnStep === 'blitz_question') && (
                  <strong>
                    База данных:{' '}
                    {simulation.finalDbState === 'CLOSED'
                      ? 'Закрыта (db.Close выполнен)'
                      : 'Утечка (осталась открытой!)'}
                  </strong>
                )}
            </div>
          </section>

          {/* ----------------------------------------------------------------
              ПРАВЫЙ БЛОК: СТРОГО ОДИН ПРОСТОЙ ШАГ ЗА РАЗ (БЕЗ СПОЙЛЕРОВ)
              ---------------------------------------------------------------- */}
          <section className="arena-step-panel">
            {/* ==============================================================
                ШАГ 1 ИЗ 4: ХОД КОМАНДЫ ЗАЩИТЫ (СТАВИТ ПАТЧ В МЕТОД)
                ============================================================== */}
            {turnStep === 'defense_turn' && (
              <>
                <div>
                  <div className="arena-step-progress">
                    Шаг 1 из 4 · Ход команды Защиты ({defenderTeamTitle})
                  </div>
                  <h2 className="arena-step-heading">
                    Какую конструкцию вставить в метод?
                  </h2>
                  <p className="arena-step-desc">
                    Нажмите на вариант и внимательно проверьте получившийся код
                    в окне слева:
                  </p>
                </div>

                <div className="arena-choices">
                  {currentRound.defenseOptions.map((def) => {
                    const isSelected = state.selectedDefenseId === def.id;
                    return (
                      <button
                        key={def.id}
                        type="button"
                        className={`arena-choice-btn ${
                          isSelected ? 'selected-defense' : ''
                        }`}
                        onClick={() => {
                          soundEngine.playStepTick(state.soundEnabled);
                          dispatch({
                            type: 'PICK_DEFENSE_OPTION',
                            optionId: def.id,
                          });
                        }}
                      >
                        <div className="arena-choice-title">
                          <span className="arena-choice-code">
                            {def.codeLabel}. {def.title}
                          </span>
                        </div>
                        <span className="arena-choice-sub">{def.shortDesc}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="arena-actions-row">
                  <button
                    type="button"
                    className="arena-main-btn"
                    disabled={!state.selectedDefenseId}
                    onClick={() => {
                      soundEngine.playLockClick(state.soundEnabled);
                      setTurnStep('attack_turn');
                    }}
                  >
                    Передать ход команде Атаки →
                  </button>
                </div>
              </>
            )}

            {/* ==============================================================
                ШАГ 2 ИЗ 4: ХОД КОМАНДЫ АТАКИ (ИЗУЧАЕТ ПАТЧ И ИЩЕТ ПРОБОЙ)
                ============================================================== */}
            {turnStep === 'attack_turn' && (
              <>
                <div>
                  <div className="arena-step-progress">
                    Шаг 2 из 4 · Ход команды Атаки ({attackerTeamTitle})
                  </div>
                  <h2 className="arena-step-heading">
                    Какими входными данными проверить этот код?
                  </h2>
                  <p className="arena-step-desc">
                    Изучите выбранный патч Защиты слева и выберите аргументы,
                    которые пробьют оборону или выявят ошибку:
                  </p>
                </div>

                <div className="arena-choices">
                  {currentRound.attackOptions.map((atk) => {
                    const isSelected = state.selectedAttackId === atk.id;
                    return (
                      <button
                        key={atk.id}
                        type="button"
                        className={`arena-choice-btn ${
                          isSelected ? 'selected-attack' : ''
                        }`}
                        onClick={() => {
                          soundEngine.playStepTick(state.soundEnabled);
                          dispatch({
                            type: 'PICK_ATTACK_OPTION',
                            optionId: atk.id,
                          });
                        }}
                      >
                        <div className="arena-choice-title">
                          <span className="arena-choice-code">
                            {atk.codeLabel}. {atk.payloadCode}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Строка {atk.targetLine}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="arena-actions-row">
                  <button
                    type="button"
                    className="arena-back-btn"
                    onClick={() => setTurnStep('defense_turn')}
                  >
                    ← Назад к Защите
                  </button>
                  <button
                    type="button"
                    className="arena-main-btn attack-btn"
                    disabled={!state.selectedAttackId}
                    onClick={() => {
                      soundEngine.playLockClick(state.soundEnabled);
                      dispatch({ type: 'LAUNCH_CLASH' });
                      setTurnStep('result_view');
                      setAutoStepping(true);
                    }}
                  >
                    Запустить проверку кода →
                  </button>
                </div>
              </>
            )}

            {/* ==============================================================
                ШАГ 3 ИЗ 4: РЕЗУЛЬТАТ + АВТОПРОХОД ПО СТРОКАМ + БЫСТРОЕ СРАВНЕНИЕ
                ============================================================== */}
            {turnStep === 'result_view' && activeStep && (
              <>
                <div>
                  <div className="arena-step-progress">
                    Шаг 3 из 4 · Результат выполнения метода
                    {isSandboxPreviewDifferent && (
                      <span>
                        {' '}
                        · Демо-просмотр (в бою: Защита +
                        {lockedSimulation.defensePointsEarned} / Атака +
                        {lockedSimulation.attackPointsEarned})
                      </span>
                    )}
                  </div>
                  <div
                    className={`arena-result-box ${simulation.outcome}`}
                    style={{ marginTop: '10px' }}
                  >
                    <div className="arena-result-title">
                      {simulation.headline}
                    </div>
                    <div className="arena-result-text">
                      {simulation.reasonDetailed}
                    </div>
                  </div>
                </div>

                <div className="arena-trace-box">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>
                      Шаг выполнения {state.traceStepIdx + 1} из{' '}
                      {simulation.steps.length}
                    </span>
                    <span>Строка {activeStep.activeLineNumber}</span>
                  </div>

                  <div className="arena-trace-status">
                    {activeStep.statusBanner}
                  </div>

                  <div className="arena-trace-controls">
                    <button
                      type="button"
                      className="arena-step-btn"
                      disabled={state.traceStepIdx <= 0}
                      onClick={() => {
                        setAutoStepping(false);
                        soundEngine.playStepTick(state.soundEnabled);
                        dispatch({
                          type: 'STEP_TRACE',
                          stepIdx: Math.max(0, state.traceStepIdx - 1),
                        });
                      }}
                    >
                      ← Предыдущий шаг
                    </button>
                    <button
                      type="button"
                      className="arena-step-btn"
                      disabled={
                        state.traceStepIdx >= simulation.steps.length - 1
                      }
                      onClick={() => {
                        setAutoStepping(false);
                        const nextIdx = Math.min(
                          simulation.steps.length - 1,
                          state.traceStepIdx + 1
                        );
                        const nextStep = simulation.steps[nextIdx];
                        if (
                          nextStep?.stepKind === 'explode' ||
                          nextStep?.stepKind === 'compile_error' ||
                          nextStep?.stepKind === 'leak'
                        ) {
                          soundEngine.playExceptionInterrupt(state.soundEnabled);
                        } else {
                          soundEngine.playStepTick(state.soundEnabled);
                        }
                        dispatch({
                          type: 'STEP_TRACE',
                          stepIdx: nextIdx,
                        });
                      }}
                    >
                      Следующий шаг →
                    </button>
                  </div>

                  {/* Компактная 1-строчная панель «А что если?» — изолирована от боевого счёта */}
                  <div className="arena-inline-pills">
                    <span className="arena-inline-pills-label">
                      Проверить другой вариант:
                    </span>
                    <div className="arena-inline-pills-group">
                      {currentRound.defenseOptions.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`arena-mini-pill ${
                            activeDefenseId === d.id ? 'active-def' : ''
                          }`}
                          onClick={() => {
                            soundEngine.playStepTick(state.soundEnabled);
                            dispatch({
                              type: 'SET_SANDBOX_VARIANT',
                              defenseId: d.id,
                            });
                            setAutoStepping(true);
                          }}
                        >
                          {d.codeLabel}
                        </button>
                      ))}
                      <span className="arena-inline-sep">·</span>
                      {currentRound.attackOptions.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`arena-mini-pill ${
                            activeAttackId === a.id ? 'active-atk' : ''
                          }`}
                          onClick={() => {
                            soundEngine.playStepTick(state.soundEnabled);
                            dispatch({
                              type: 'SET_SANDBOX_VARIANT',
                              attackId: a.id,
                            });
                            setAutoStepping(true);
                          }}
                        >
                          {a.codeLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="arena-rule-takeaway">
                  <strong>{currentRound.ruleTitle}:</strong>{' '}
                  {currentRound.ruleSummary}
                </div>

                <div className="arena-actions-row">
                  <button
                    type="button"
                    className="arena-main-btn"
                    onClick={() => {
                      setAutoStepping(false);
                      dispatch({ type: 'OPEN_ROULETTE' });
                      setTurnStep('blitz_question');
                      spinPlayerNumber();
                    }}
                  >
                    Блиц-вопрос игроку (+
                    {Math.round(currentRound.maxPoints / 2)} очк.) →
                  </button>
                </div>
              </>
            )}

            {/* ==============================================================
                ШАГ 4 ИЗ 4: КОНТРОЛЬНЫЙ ВОПРОС СЛУЧАЙНОМУ УЧАСТНИКУ (1..6)
                ============================================================== */}
            {turnStep === 'blitz_question' && (
              <>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span className="arena-step-progress">
                      Шаг 4 из 4 · Блиц для команды: {blitzTeamTitle} (+
                      {Math.round(currentRound.maxPoints / 2)} очков)
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="arena-quiet-btn"
                        disabled={state.roulettePointsAwarded}
                        onClick={() =>
                          dispatch({
                            type: 'SET_ROULETTE_TEAM',
                            team:
                              state.rouletteAnsweringTeam === 'ALPHA'
                                ? 'BETA'
                                : 'ALPHA',
                          })
                        }
                      >
                        Сменить команду
                      </button>
                      <button
                        type="button"
                        className="arena-quiet-btn"
                        disabled={spinningPlayer}
                        onClick={spinPlayerNumber}
                      >
                        {spinningPlayer ? 'Выбор...' : 'Другой номер'}
                      </button>
                    </div>
                  </div>

                  <div className="arena-player-row" style={{ margin: '12px 0' }}>
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <div
                        key={num}
                        className={`arena-player-slot ${
                          displayedPlayer === num ? 'active' : ''
                        }`}
                      >
                        Игрок {num}
                      </div>
                    ))}
                  </div>

                  <h2 className="arena-step-heading" style={{ fontSize: '18px' }}>
                    Отвечает Игрок №{displayedPlayer} ({blitzTeamTitle}):{' '}
                    {currentRound.rouletteQuestion.prompt}
                  </h2>
                </div>

                <div className="arena-choices">
                  {currentRound.rouletteQuestion.options.map((opt) => {
                    const isPicked = state.rouletteSelectedOptionId === opt.id;
                    const answered = Boolean(state.rouletteSelectedOptionId);
                    const statusClass = answered
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
                        className={`arena-choice-btn ${statusClass}`}
                        onClick={() => {
                          if (opt.isCorrect) {
                            soundEngine.playVerifiedTone(state.soundEnabled);
                          } else {
                            soundEngine.playExceptionInterrupt(state.soundEnabled);
                          }
                          dispatch({
                            type: 'ANSWER_ROULETTE',
                            optionId: opt.id,
                          });
                        }}
                      >
                        <div className="arena-choice-title">
                          <span>{opt.text}</span>
                        </div>
                        {answered && (isPicked || opt.isCorrect) && (
                          <span className="arena-choice-sub">
                            {opt.explanation}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="arena-actions-row">
                  <button
                    type="button"
                    className="arena-back-btn"
                    onClick={() => setTurnStep('result_view')}
                  >
                    ← К разбору кода
                  </button>
                  {state.roundNumber < 4 ? (
                    <button
                      type="button"
                      className="arena-main-btn"
                      onClick={() => {
                        setTurnStep('defense_turn');
                        dispatch({
                          type: 'SELECT_ROUND',
                          roundNumber: (state.roundNumber + 1) as RoundNumber,
                        });
                      }}
                    >
                      Перейти к Раунду {state.roundNumber + 1} →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="arena-main-btn"
                      onClick={() => dispatch({ type: 'GO_TO_FINALE' })}
                    >
                      Подвести итоги игры →
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      )}

      {/* ====================================================================
          4. ФИНАЛЬНЫЙ ЭКРАН: ИТОГОВЫЙ СЧЁТ И 4 ГЛАВНЫХ ПРАВИЛА УРОКА
          ==================================================================== */}
      {state.stage === 'finale' && (
        <main className="arena-workspace">
          <section className="arena-step-panel">
            <div>
              <div className="arena-step-progress">Итоги урока</div>
              <h2 className="arena-step-heading">Финальный счёт команд</h2>
              <div
                className="arena-start-rounds"
                style={{ marginTop: '16px', marginBottom: '20px' }}
              >
                <div className="arena-start-round-item">
                  <span className="arena-start-round-meta">Команда Альфа</span>
                  <h3 style={{ fontSize: '36px', fontFamily: 'var(--font-mono)' }}>
                    {state.alphaScore}
                  </h3>
                  <span>очков</span>
                </div>
                <div className="arena-start-round-item">
                  <span className="arena-start-round-meta">Команда Бета</span>
                  <h3 style={{ fontSize: '36px', fontFamily: 'var(--font-mono)' }}>
                    {state.betaScore}
                  </h3>
                  <span>очков</span>
                </div>
              </div>

              <div className="arena-choices">
                {ARENA_ROUNDS.map((r) => (
                  <div key={r.number} className="arena-rule-takeaway">
                    <strong>
                      {r.number}. {r.ruleTitle}
                    </strong>
                    <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                      {r.ruleSummary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="arena-actions-row">
              <button
                type="button"
                className="arena-back-btn"
                onClick={() => window.print()}
              >
                Распечатать памятку
              </button>
              <button
                type="button"
                className="arena-main-btn"
                onClick={() => {
                  setTurnStep('defense_turn');
                  dispatch({ type: 'START_GAME' });
                }}
              >
                Начать заново с Раунда 1
              </button>
            </div>
          </section>

          <section className="arena-code-panel">
            <div className="arena-code-header">
              <span className="arena-code-title">
                Образец защищённого метода C#
              </span>
              <span className="arena-code-subtitle">
                Объединяет все 4 правила, разобранные за занятие
              </span>
            </div>
            <div className="arena-code-lines">
              {[
                'public decimal SafeProcessOrder(DbConnection db, string rawPrice, int count)',
                '{',
                '    db.Open();',
                '    try',
                '    {',
                '        decimal total = decimal.Parse(rawPrice);',
                '        return total / count;',
                '    }',
                '    catch (FormatException ex) // 1. Сначала узкие типы ошибок',
                '    {',
                '        auditLog.Write(ex.Message);',
                '        return 0m;',
                '    }',
                '    catch (DivideByZeroException ex)',
                '    {',
                '        auditLog.Write(ex.Message);',
                '        return 0m;',
                '    }',
                '    catch (Exception ex) // 2. Общий Exception — строго в конце',
                '    {',
                '        auditLog.Write(ex.Message);',
                '        throw; // 3. Пустой throw; сохраняет историю строк (StackTrace)',
                '    }',
                '    finally // 4. Выполняется всегда (даже после return и ошибок)',
                '    {',
                '        db.Close();',
                '    }',
                '}',
              ].map((codeLine, idx) => (
                <div key={idx} className="arena-line">
                  <span className="arena-line-ptr" />
                  <span className="arena-line-number">{idx + 1}</span>
                  <span className="arena-line-code">
                    <CSharpLineSyntax code={codeLine} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
};
