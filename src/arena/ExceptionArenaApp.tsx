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

// Простой векторный указатель активной строки кода
const StepPointerIcon: React.FC = () => (
  <svg className="arena-ip-arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 3.5h6.2L13.5 8l-5.3 4.5H2V3.5z" />
  </svg>
);

type SimpleTurnStep = 'attack_turn' | 'defense_turn' | 'result_view' | 'blitz_question';

export const ExceptionArenaApp: React.FC = () => {
  const [state, rawDispatch] = useReducer(arenaReducer, undefined, loadArenaState);
  const [turnStep, setTurnStep] = useState<SimpleTurnStep>('attack_turn');
  const [spinningPlayer, setSpinningPlayer] = useState(false);
  const [displayedPlayer, setDisplayedPlayer] = useState<number>(
    state.roulettePlayerNum
  );

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

  // При смене раунда всегда начинаем с Шага 1 (Ход Атаки)
  useEffect(() => {
    if (state.subPhase === 'planning') {
      setTurnStep('attack_turn');
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

  const attackerTeamTitle = attacker === 'ALPHA' ? 'Команда Альфа' : 'Команда Бета';
  const defenderTeamTitle = defender === 'ALPHA' ? 'Команда Альфа' : 'Команда Бета';

  const activeAttackId = state.selectedAttackId || 'A1';
  const activeDefenseId = state.selectedDefenseId || 'D1';

  const simulation = useMemo(
    () => simulateClash(currentRound, activeAttackId, activeDefenseId),
    [currentRound, activeAttackId, activeDefenseId]
  );

  // На Шаге 1 (Атака) показываем исходный уязвимый метод;
  // На Шаге 2 (Защита) и далее сразу показываем выбранный патч try/catch прямо в коде!
  const previewDefenseId =
    turnStep === 'attack_turn' ? null : state.selectedDefenseId;

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
    const nextNum = ((Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6);
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
                    setTurnStep('attack_turn');
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
              setTurnStep('attack_turn');
              dispatch({ type: 'RESET_ALL' });
            }}
          >
            Сброс
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. СТАРТОВЫЙ ЭКРАН (ЛАКОНИЧНЫЙ ВХОД В ИГРУ)
          ==================================================================== */}
      {state.stage === 'welcome' && (
        <main className="arena-start-screen">
          <section className="arena-start-box">
            <div>
              <h1>Атака и Защита кода на C#</h1>
              <p>
                Учебная игра из 4 раундов. В каждом раунде одна команда ищет,
                какими входными данными сломать метод C#, а вторая выбирает
                защитную конструкцию <code>try / catch / finally</code>.
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
                  setTurnStep('attack_turn');
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
              ЛЕВЫЙ БЛОК: ТОЛЬКО КРУПНЫЙ ЧИСТЫЙ КОД C# (БЕЗ ТАБЛИЦ И ДАТЧИКОВ)
              ---------------------------------------------------------------- */}
          <section className="arena-code-panel">
            <div className="arena-code-header">
              <div className="arena-code-header-top">
                <span className="arena-code-title">
                  Раунд {currentRound.number}. {currentRound.title}
                </span>
                <span className="arena-code-points">
                  На кону: {currentRound.maxPoints} очков
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

                return (
                  <div
                    key={`${lineObj.lineNumber}-${lineObj.code}`}
                    className={`arena-line ${
                      lineObj.isAddedPatch ? 'diff-added' : ''
                    } ${traceClass} ${isSkipped ? 'line-skipped' : ''}`}
                  >
                    <span className="arena-line-ptr">
                      {isActiveTrace ? <StepPointerIcon /> : null}
                    </span>
                    <span className="arena-line-number">
                      {lineObj.isAddedPatch ? '+' : lineObj.lineNumber}
                    </span>
                    <span className="arena-line-code">
                      <CSharpLineSyntax code={lineObj.code} />
                    </span>
                    <span>
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
                {previewDefenseId
                  ? `В код вставлен вариант защиты (${
                      currentRound.defenseOptions.find(
                        (d) => d.id === previewDefenseId
                      )?.codeLabel || previewDefenseId
                    })`
                  : 'Исходный код метода без защиты'}
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
              ПРАВЫЙ БЛОК: СТРОГО ОДИН ПРОСТОЙ ШАГ ЗА РАЗ
              ---------------------------------------------------------------- */}
          <section className="arena-step-panel">
            {/* ==============================================================
                ШАГ 1 ИЗ 4: ХОД КОМАНДЫ АТАКИ (ТОЛЬКО 3 КНОПКИ)
                ============================================================== */}
            {turnStep === 'attack_turn' && (
              <>
                <div>
                  <div className="arena-step-progress">
                    Шаг 1 из 4 · Ход команды Атаки ({attackerTeamTitle})
                  </div>
                  <h2 className="arena-step-heading">
                    Чем атакуем этот метод?
                  </h2>
                  <p className="arena-step-desc">
                    Выберите входные данные, которые вызовут ошибку или сбой в
                    коде слева:
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
                          <span>Строка {atk.targetLine}</span>
                        </div>
                        <span className="arena-choice-sub">{atk.shortDesc}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="arena-actions-row">
                  <button
                    type="button"
                    className="arena-main-btn attack-btn"
                    disabled={!state.selectedAttackId}
                    onClick={() => {
                      soundEngine.playLockClick(state.soundEnabled);
                      setTurnStep('defense_turn');
                    }}
                  >
                    Запомнить атаку и передать ход Защите →
                  </button>
                </div>
              </>
            )}

            {/* ==============================================================
                ШАГ 2 ИЗ 4: ХОД КОМАНДЫ ЗАЩИТЫ (ТОЛЬКО 4 КНОПКИ + ПРЕВЬЮ В КОДЕ)
                ============================================================== */}
            {turnStep === 'defense_turn' && (
              <>
                <div>
                  <div className="arena-step-progress">
                    Шаг 2 из 4 · Ход команды Защиты ({defenderTeamTitle})
                  </div>
                  <h2 className="arena-step-heading">
                    Как защитить метод от сбоя?
                  </h2>
                  <p className="arena-step-desc">
                    Нажмите на вариант, чтобы сразу увидеть его в коде слева, и
                    запустите проверку:
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
                          <span>
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
                    className="arena-back-btn"
                    onClick={() => setTurnStep('attack_turn')}
                  >
                    ← Назад к Атаке
                  </button>
                  <button
                    type="button"
                    className="arena-main-btn"
                    disabled={!state.selectedDefenseId}
                    onClick={() => {
                      soundEngine.playLockClick(state.soundEnabled);
                      dispatch({ type: 'LAUNCH_CLASH' });
                      setTurnStep('result_view');
                    }}
                  >
                    Запустить проверку кода →
                  </button>
                </div>
              </>
            )}

            {/* ==============================================================
                ШАГ 3 ИЗ 4: РЕЗУЛЬТАТ И ПОШАГОВЫЙ ПРОСМОТР СТРОК
                ============================================================== */}
            {turnStep === 'result_view' && activeStep && (
              <>
                <div>
                  <div className="arena-step-progress">
                    Шаг 3 из 4 · Результат выполнения метода
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
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Пошаговый ход по строкам ({state.traceStepIdx + 1} из{' '}
                    {simulation.steps.length} · строка #
                    {activeStep.activeLineNumber})
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>
                    {activeStep.statusBanner}
                  </div>
                  <div className="arena-actions-row" style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      className="arena-back-btn"
                      style={{ flex: 1, padding: '10px' }}
                      disabled={state.traceStepIdx === 0}
                      onClick={() => {
                        soundEngine.playStepTick(state.soundEnabled);
                        dispatch({
                          type: 'STEP_TRACE',
                          stepIdx: Math.max(0, state.traceStepIdx - 1),
                        });
                      }}
                    >
                      ← Предыдущая строка
                    </button>
                    <button
                      type="button"
                      className="arena-back-btn"
                      style={{ flex: 1, padding: '10px' }}
                      disabled={
                        state.traceStepIdx >= simulation.steps.length - 1
                      }
                      onClick={() => {
                        soundEngine.playStepTick(state.soundEnabled);
                        dispatch({
                          type: 'STEP_TRACE',
                          stepIdx: Math.min(
                            simulation.steps.length - 1,
                            state.traceStepIdx + 1
                          ),
                        });
                      }}
                    >
                      Следующая строка →
                    </button>
                  </div>
                </div>

                <div className="arena-rule-takeaway">
                  <strong>{currentRound.ruleTitle}:</strong>{' '}
                  {currentRound.ruleSummary}
                </div>

                <div className="arena-actions-row">
                  <button
                    type="button"
                    className="arena-back-btn"
                    onClick={() => setTurnStep('defense_turn')}
                  >
                    ← Другой вариант
                  </button>
                  <button
                    type="button"
                    className="arena-main-btn"
                    onClick={() => {
                      dispatch({ type: 'OPEN_ROULETTE' });
                      setTurnStep('blitz_question');
                      spinPlayerNumber();
                    }}
                  >
                    Блиц-вопрос игроку (+{Math.round(currentRound.maxPoints / 2)}{' '}
                    очк.) →
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
                    }}
                  >
                    <span className="arena-step-progress">
                      Шаг 4 из 4 · Контрольный вопрос (+
                      {Math.round(currentRound.maxPoints / 2)} очков)
                    </span>
                    <button
                      type="button"
                      className="arena-quiet-btn"
                      disabled={spinningPlayer}
                      onClick={spinPlayerNumber}
                    >
                      {spinningPlayer ? 'Выбор...' : 'Выбрать другой номер'}
                    </button>
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
                    Отвечает Игрок №{displayedPlayer}:{' '}
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
                        setTurnStep('attack_turn');
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
                  setTurnStep('attack_turn');
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
