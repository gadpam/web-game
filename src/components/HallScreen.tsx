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
  BattleTactId,
  BrigadeId,
  PhaseId,
  PolygonFileId,
  ScreenView,
  SessionState,
} from '../types/game';
import { PracticeWorkbench } from './PracticeWorkbench';
import { FinalPhasesPanel } from './FinalPhasesPanel';
import { REHEARSAL_CHECKPOINTS } from '../game/rehearsal';
import {
  AutonomousQueueStrip,
  ManualVoiceCardBar,
} from './ManualAutonomousStrip';
import { DidacticCycleStrip } from './DidacticCycleStrip';

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

interface StepGuideInfo {
  stepBadge: string;
  headline: string;
  subline: string;
  ctaLabel: string;
  onCta: () => void;
}

export const HallScreen: React.FC<HallScreenProps> = ({
  state,
  dispatch,
  onNavigateScreen,
}) => {
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(false);
  const [juryToolsOpen, setJuryToolsOpen] = useState(false);
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
  const isBattle = state.phase.startsWith('battle_') || state.phase === 'lull';
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
    }, 45);
  };

  useEffect(() => {
    setTracingLine(null);
  }, [state.selectedPolygonFile, state.phase]);

  // Понятный человеку путеводитель: что сейчас происходит и какая одна кнопка ведёт дальше
  const stepGuide: StepGuideInfo = useMemo(() => {
    if (state.phase === 'prologue_1') {
      if (!state.prologue.pollRevealed) {
        return {
          stepBadge: 'ШАГ 1 ИЗ 5 · ЗАВЯЗКА (СЦЕНА 1)',
          headline: 'Ночью кто-то вошёл в систему под тестовой учёткой test/test',
          subline:
            'Прочитайте 5 строк лога ниже и выберите один из трёх вариантов ответа на вопрос.',
          ctaLabel: 'Показать верный диагноз →',
          onCta: () => {
            dispatch({ type: 'PROLOGUE_VOTE', option: 'intrusion' });
            dispatch({ type: 'PROLOGUE_REVEAL_POLL' });
          },
        };
      }
      return {
        stepBadge: 'ШАГ 1 ИЗ 5 · ЗАВЯЗКА (СЦЕНА 1 ЗАВЕРШЕНА)',
        headline: 'Диагноз установлен: в очередь из 1 240 человек подброшено 26 битых записей',
        subline: 'Теперь проверим, что произойдёт с очередью при запуске обработки.',
        ctaLabel: 'Перейти к Сцене 2 (Вскрытие) →',
        onCta: () => dispatch({ type: 'SET_PHASE', phase: 'prologue_2' }),
      };
    }

    if (state.phase === 'prologue_2') {
      if (!state.prologue.batchCrashed) {
        return {
          stepBadge: 'ШАГ 1 ИЗ 5 · ЗАВЯЗКА (СЦЕНА 2)',
          headline: 'Запустите обработку пакета из 1 240 билетов',
          subline:
            'Посмотрим, сможет ли незащищённый сервис пройти через 26 испорченных записей.',
          ctaLabel: '▶ Запустить пакет (без защиты)',
          onCta: () => dispatch({ type: 'PROLOGUE_CRASH_BATCH' }),
        };
      }
      return {
        stepBadge: 'ШАГ 1 ИЗ 5 · ЗАВЯЗКА (СЦЕНА 2)',
        headline: 'Сервис упал на первой же мине: FormatException на Booking.cs:12',
        subline:
          'У каждого падения есть имя (тип исключения) и адрес (строка). Переходим к сборке защиты.',
        ctaLabel: 'Перейти к Сцене 3 (Механизм защиты) →',
        onCta: () => {
          PROLOGUE_MINES.forEach((m) =>
            dispatch({
              type: 'PROLOGUE_MATCH_MINE',
              mineId: m.id,
              exceptionType: m.expectedType,
            })
          );
          dispatch({ type: 'SET_PHASE', phase: 'prologue_3' });
        },
      };
    }

    if (state.phase === 'prologue_3') {
      if (!state.prologue.batchRepelled) {
        return {
          stepBadge: 'ШАГ 1 ИЗ 5 · ЗАВЯЗКА (СЦЕНА 3)',
          headline: 'Соберите защитный контур TRY → CATCH → FINALLY',
          subline:
            'TRY очерчивает опасную зону, CATCH перехватывает сбой, FINALLY гарантирует очистку.',
          ctaLabel: '▶ Включить защиту и прогнать пакет',
          onCta: () => dispatch({ type: 'PROLOGUE_REPEL_BATCH' }),
        };
      }
      return {
        stepBadge: 'ШАГ 1 ИЗ 5 · ЗАВЯЗКА (СЦЕНА 3 · ОТБИТО!)',
        headline: 'Первая волна отбита: 1 214 человек получили билеты, 26 записей в отчёте',
        subline: 'Но ночная атака была только разведкой. Посмотрим, что происходит в логе дальше.',
        ctaLabel: 'Перейти к Сцене 4 (Поворот) →',
        onCta: () => dispatch({ type: 'SET_PHASE', phase: 'prologue_4' }),
      };
    }

    if (state.phase === 'prologue_4') {
      return {
        stepBadge: 'ШАГ 1 ИЗ 5 · ФИНАЛ ЗАВЯЗКИ (СЦЕНА 4)',
        headline: 'Противник сменил способ: открылись 4 направления удара',
        subline:
          'Одна защита не спасает от класса атак. Начинаем 4 боя между бригадами TRY, CATCH и FINALLY.',
        ctaLabel: 'Начать Бой 1 «Прицел» →',
        onCta: () => dispatch({ type: 'SET_PHASE', phase: 'battle_1' }),
      };
    }

    if (state.phase.startsWith('battle_')) {
      return {
        stepBadge: `ШАГ 2 ИЗ 5 · БОЙ ${activeBattle.number} ИЗ 4 «${activeBattle.codeName.toUpperCase()}»`,
        headline: `Такт «${activeTactMeta.title}»: ${activeTactMeta.instruction}`,
        subline: `Узел: ${activeBattle.defaultFile}:${activeBattle.targetLine} · Атакует ${activeBattle.attacker} · Защищается ${activeBattle.defender} · Арбитр ${activeBattle.arbiter}`,
        ctaLabel:
          activeBattle.tact === 'verdict'
            ? activeBattle.number < 4
              ? `Перейти к Бою ${activeBattle.number + 1} →`
              : 'Перейти к Практике 08:05 →'
            : 'Следующий такт боя →',
        onCta: () => {
          if (activeBattle.tact === 'verdict') {
            dispatch({ type: 'NEXT_PHASE' });
          } else {
            dispatch({ type: 'NEXT_TACT' });
          }
        },
      };
    }

    if (state.phase === 'lull') {
      return {
        stepBadge: 'ШАГ 2 ИЗ 5 · ПЕРЕДЫШКА МЕЖДУ БОЯМИ (06:00)',
        headline: 'Две минуты тишины перед Боем 3 «Гарантия (finally)»',
        subline: 'Проверьте промежуточный счёт бригад и открытые правила Щита.',
        ctaLabel: 'Начать Бой 3 «Замок» →',
        onCta: () => dispatch({ type: 'SET_PHASE', phase: 'battle_3' }),
      };
    }

    if (state.phase === 'practice') {
      return {
        stepBadge: 'ШАГ 3 ИЗ 5 · ПРАКТИКА НА ПОЛИГОНЕ (08:05)',
        headline: 'Соберите все 4 рубежа защиты и проверьте пакет перед стартом продаж',
        subline:
          'Отредактируйте код или включите 4 рубежа, затем нажмите «Прогнать комплексный пакет».',
        ctaLabel: 'К обратному отсчёту 08:55 →',
        onCta: () => dispatch({ type: 'SET_PHASE', phase: 'five_min' }),
      };
    }

    if (state.phase === 'five_min') {
      return {
        stepBadge: 'ШАГ 4 ИЗ 5 · ПЯТЬ МИНУТ ДО СТАРТА (08:55)',
        headline: 'Ревизия всех 6 правил Щита перед запуском очереди в 09:00',
        subline:
          'Подтвердите открытие всех 6 правил Щита, чтобы разблокировать кнопку старта продаж.',
        ctaLabel: shieldReady
          ? 'Перейти к Старту 09:00 →'
          : 'Открыть Щит 6/6 и перейти к Старту →',
        onCta: () => {
          if (!shieldReady) {
            dispatch({ type: 'UNLOCK_ALL_SHIELD' });
          }
          dispatch({ type: 'SET_PHASE', phase: 'start_0900' });
        },
      };
    }

    if (state.phase === 'start_0900') {
      return {
        stepBadge: 'ШАГ 4 ИЗ 5 · СТАРТ ПРОДАЖ В 09:00 (1 240 ЧЕЛОВЕК)',
        headline: state.queue.started
          ? `Обработка завершена: выдано ${state.queue.issued} из ${state.queue.total} билетов`
          : 'Очередь из 1 240 человек готова к прогону через 4 волны',
        subline: state.queue.started
          ? 'Зелёные клетки — выданные билеты, красные — потери на неприкрытой волне.'
          : 'Нажмите кнопку запуска, чтобы прогнать все 1 240 заявок через 4 линии обороны.',
        ctaLabel: state.queue.started
          ? 'К подведению итогов (09:07) →'
          : '▶ ЗАПУСТИТЬ СТАРТ 09:00',
        onCta: () => {
          if (!state.queue.started) {
            if (!shieldReady) dispatch({ type: 'UNLOCK_ALL_SHIELD' });
            dispatch({ type: 'TRIGGER_START_0900' });
          } else {
            dispatch({ type: 'SET_PHASE', phase: 'closed' });
          }
        },
      };
    }

    if (state.phase === 'closed') {
      return {
        stepBadge: 'ШАГ 5 ИЗ 5 · СМЕНА ЗАКРЫТА · РЕФЛЕКСИЯ (09:07)',
        headline: 'Разбор полётов от числа спасённых билетов и 3 номинации смены',
        subline:
          'Оценок за игру не ставят — дальше каждый участник выбирает уровень домашнего задания.',
        ctaLabel: 'Перейти к выбору ДЗ (09:15) →',
        onCta: () => dispatch({ type: 'SET_PHASE', phase: 'homework' }),
      };
    }

    return {
      stepBadge: 'ШАГ 5 ИЗ 5 · ДОМАШНЕЕ ЗАДАНИЕ ТРЁХ УРОВНЕЙ (09:15)',
      headline: 'Выберите уровень домашнего задания и проверьте решение в C#-песочнице',
      subline: 'Доступны 3 уровня: на «4» (Разбор боя), на «5» (Свой класс Exception) и на «5+» (Аудит кода).',
      ctaLabel: 'Открыть Протокол смены (A4) →',
      onCta: () => onNavigateScreen('materials'),
    };
  }, [
    state.phase,
    state.prologue.pollRevealed,
    state.prologue.batchCrashed,
    state.prologue.batchRepelled,
    state.queue.started,
    state.queue.issued,
    state.queue.total,
    activeBattle,
    activeTactMeta,
    shieldReady,
    dispatch,
    onNavigateScreen,
  ]);

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
      {/* ================= ВЕРХНИЙ ПУТЕВОДИТЕЛЬ: МАРШРУТ СМЕНЫ + ЧТО ДЕЛАТЬ СЕЙЧАС ================= */}
      <div
        className="material-armor no-print"
        style={{
          margin: '8px 14px 0 14px',
          padding: '10px 16px',
          borderLeft: '5px solid var(--color-action)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Полоса из 5 крупных шагов урока */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid var(--border-metal)',
            paddingBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {themacroStages(isPrologue, isBattle, activeBattle.number, isPracticePhase, state.phase, isQueueBoardPhase).map(
              (st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PHASE', phase: st.targetPhase })}
                  className={`instrument-btn ${st.active ? 'btn-action' : ''}`}
                  style={{
                    padding: '5px 12px',
                    fontSize: '13px',
                    fontWeight: st.active ? 900 : 700,
                  }}
                >
                  {st.label}
                </button>
              )
            )}

            {/* Если мы внутри боёв — компактный переключатель Бой 1..4 рядом */}
            {isBattle && (
              <div
                style={{
                  display: 'inline-flex',
                  gap: '4px',
                  marginLeft: '6px',
                  paddingLeft: '8px',
                  borderLeft: '1px solid var(--border-metal)',
                }}
              >
                {([1, 2, 3, 4] as const).map((bNum) => (
                  <button
                    key={bNum}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'SET_PHASE',
                        phase: `battle_${bNum}` as PhaseId,
                      })
                    }
                    className={`instrument-btn mono ${
                      state.phase === `battle_${bNum}` ? 'btn-warning' : ''
                    }`}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    Бой {bNum}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setJuryToolsOpen((p) => !p)}
            className={`instrument-btn ${juryToolsOpen ? 'btn-warning' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            title="Быстрые точки прогона для комиссии (БКП-1 и Цикл 1→5)"
          >
            Для жюри {juryToolsOpen ? '▴' : '▾'}
          </button>
        </div>

        {/* Главная подсказка текущего действия + ОДНА яркая кнопка «Что нажать дальше» */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div
              className="mono"
              style={{
                fontSize: '11.5px',
                color: 'var(--color-action)',
                fontWeight: 800,
                letterSpacing: '0.06em',
              }}
            >
              {stepGuide.stepBadge}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '1px' }}>
              {stepGuide.headline}
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              {stepGuide.subline}
            </div>
          </div>

          <button
            type="button"
            onClick={stepGuide.onCta}
            className="instrument-btn btn-stable"
            style={{
              fontSize: '15px',
              padding: '10px 20px',
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {stepGuide.ctaLabel}
          </button>
        </div>

        {/* Скрытая по умолчанию полка для жюри (БКП-1 + Цикл 1→5) */}
        {juryToolsOpen && (
          <div
            className="gesture-card-drop"
            style={{
              paddingTop: '8px',
              borderTop: '1px dashed var(--border-metal)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <DidacticCycleStrip state={state} dispatch={dispatch} compact />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span className="brass-nameplate" style={{ fontSize: '11px' }}>
                БКП-1 · БЫСТРЫЙ ПЕРЕХОД ПО 8 ТОЧКАМ УРОКА
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
          </div>
        )}
      </div>

      {/* Сигнал Стоп-крана Арбитра */}
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
              СТОП-КРАН АРБИТРА ({activeBattle.arbiter}) · БОЙ ПРИОСТАНОВЛЕН
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
            Снять стоп-кран
          </button>
        </div>
      )}

      {/* Основная сцена зала: 62% слева (монитор) + 38% справа (приборная панель по контексту фазы) */}
      <div className="hall-layout">
        {/* ================= ЛЕВАЯ ЗОНА (~62%): МОНИТОР СЦЕНЫ ================= */}
        <section
          className="material-screen"
          style={{
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Чистая шапка монитора с живой осциллограммой 55 Гц */}
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
                      (state.phase === 'prologue_2' && state.prologue.batchCrashed) ||
                      state.phase === 'prologue_4'
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
                  МОНИТОР СЕРВИСА «{worldMeta.serviceName.toUpperCase()}» · 55 Гц · ОЧЕРЕДЬ 1 240 ЧЕЛ.
                </div>
                <h1
                  style={{
                    margin: '1px 0 0 0',
                    fontSize: '20px',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                  }}
                >
                  {currentPhaseMeta.title}
                </h1>
              </div>
            </div>

            {/* В Завязке показываем только 4 аккуратные кнопки сцен 1..4 */}
            {isPrologue && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'prologue_1', label: '1. Вход (03:00)' },
                    { id: 'prologue_2', label: '2. Вскрытие (03:05)' },
                    { id: 'prologue_3', label: '3. Отбито (03:14)' },
                    { id: 'prologue_4', label: '4. Поворот (03:17)' },
                  ] as const
                ).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_PHASE', phase: sc.id })}
                    className={`instrument-btn ${
                      state.phase === sc.id ? 'btn-action' : ''
                    }`}
                    style={{ padding: '4px 10px', fontSize: '12.5px' }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            )}

            {/* В Боях показываем понятную цепочку 5 тактов боя */}
            {state.phase.startsWith('battle_') && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {BATTLE_TACTS.map((t, idx) => {
                  const isCurrent = activeBattle.tact === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_TACT', tact: t.id as BattleTactId })}
                      className={`instrument-btn ${isCurrent ? 'btn-action' : ''}`}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      title={t.instruction}
                    >
                      {idx + 1}. {t.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= 1. ЗАВЯЗКА (4 ЧИСТЫЕ СЦЕНЫ БЕЗ ПЕРЕГРУЗА) ================= */}
          {isPrologue && (
            <div
              className="gesture-plate-rise"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
            >
              {/* СЦЕНА 1: ВХОД */}
              {state.phase === 'prologue_1' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Живой терминальный лог */}
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid var(--border-metal)',
                      padding: '14px 16px',
                      borderRadius: '3px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: 'var(--text-caption)',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      <span>ТЕРМИНАЛ НОЧНОЙ ДИСПЕТЧЕРСКОЙ · СЕССИЯ 02:07 → 02:48 (41 МИНУТА)</span>
                      <span className="mono" style={{ color: 'var(--color-stable)' }}>
                        ● LIVE
                      </span>
                    </div>
                    {worldPrologueLogs.map((item, idx) => (
                      <div
                        key={idx}
                        className="code-line-row terminal-stream-line"
                        style={{
                          animationDelay: `${idx * 110}ms`,
                          fontSize: '20px',
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

                  {/* Один крупный интерактивный вопрос для зала */}
                  <div className="material-paper" style={{ padding: '16px 18px' }}>
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
                            fontWeight: 800,
                          }}
                        >
                          ВОПРОС СМЕНЕ ПО ТЕРМИНАЛУ:
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
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
                          style={{ fontSize: '14px', padding: '8px 14px' }}
                        >
                          1. «Сервис сломался» ({state.prologue.pollVotes.broken})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'PROLOGUE_VOTE', option: 'intrusion' });
                            dispatch({ type: 'PROLOGUE_REVEAL_POLL' });
                          }}
                          className="instrument-btn btn-action"
                          style={{ fontSize: '14px', padding: '8px 14px' }}
                        >
                          2. «В сервис вошли» ({state.prologue.pollVotes.intrusion})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: 'PROLOGUE_VOTE', option: 'dataLost' })
                          }
                          className="instrument-btn"
                          style={{ fontSize: '14px', padding: '8px 14px' }}
                        >
                          3. «Данные потеряны» ({state.prologue.pollVotes.dataLost})
                        </button>
                      </div>
                    </div>

                    {state.prologue.pollRevealed && (
                      <div
                        className="gesture-card-drop"
                        style={{
                          marginTop: '12px',
                          padding: '12px 16px',
                          background: 'rgba(255, 93, 93, 0.14)',
                          borderLeft: '4px solid var(--color-incident)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div style={{ fontSize: '17px', fontWeight: 800 }}>
                          ВТОРЖЕНИЕ — вошли под забытой учёткой test/test. Выгрузка — 0 байт, но в очередь вставлено 26 битых записей.
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: 'SET_PHASE', phase: 'prologue_2' })
                          }
                          className="instrument-btn btn-stable"
                        >
                          Дальше: Сцена 2 (Вскрытие) →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* СЦЕНА 2: ВСКРЫТИЕ */}
              {state.phase === 'prologue_2' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {!state.prologue.batchCrashed ? (
                    <div
                      className="material-armor"
                      style={{
                        padding: '28px 24px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ fontSize: '22px', fontWeight: 900 }}>
                        Очередь из 1 240 человек ждёт обработки к 09:00
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          color: 'var(--text-secondary)',
                          maxWidth: '580px',
                        }}
                      >
                        Внутри очереди спрятаны 26 битых записей. Нажмите кнопку ниже, чтобы запустить пакет и увидеть, что произойдёт без обработки исключений.
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'PROLOGUE_CRASH_BATCH' })}
                        className="instrument-btn btn-incident"
                        style={{ fontSize: '17px', padding: '12px 26px', marginTop: '4px' }}
                      >
                        ▶ Запустить обработку пакета (1 240 записей)
                      </button>
                    </div>
                  ) : (
                    <div
                      className="gesture-card-drop"
                      style={{
                        padding: '14px 18px',
                        background: 'rgba(255, 93, 93, 0.16)',
                        border: '2px solid var(--color-incident)',
                        borderRadius: '3px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div
                          className="mono"
                          style={{
                            fontSize: '23px',
                            fontWeight: 900,
                            color: 'var(--color-incident)',
                          }}
                        >
                          FormatException · Booking.cs:12 · запись #0x1F3
                        </div>
                        <div style={{ fontSize: '15px', color: 'var(--text-main)', marginTop: '2px' }}>
                          «У падения есть имя (тип) и адрес (строка).» Из-за одной записи остановилась вся очередь из 1 240 человек!
                        </div>
                      </div>
                      <span className="heavy-stamp stamp-probed">ПАКЕТ УПАЛ</span>
                    </div>
                  )}

                  {/* 4 мины в очереди */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                    }}
                  >
                    {PROLOGUE_MINES.map((mine) => {
                      const currentMatch =
                        state.prologue.matchedMines[mine.id] || mine.expectedType;
                      return (
                        <div
                          key={mine.id}
                          className="material-armor"
                          style={{
                            padding: '10px 12px',
                            borderColor: 'var(--color-stable)',
                          }}
                        >
                          <div
                            className="mono"
                            style={{
                              fontSize: '12.5px',
                              color: 'var(--color-warning)',
                              fontWeight: 700,
                            }}
                          >
                            {mine.recordHex} · {mine.fileLine}
                          </div>
                          <div
                            className="mono"
                            style={{ fontSize: '17px', fontWeight: 900, margin: '4px 0' }}
                          >
                            {mine.field} = {mine.badValue}
                          </div>
                          <div
                            className="mono"
                            style={{
                              fontSize: '13px',
                              color: 'var(--color-stable)',
                              fontWeight: 800,
                            }}
                          >
                            → {currentMatch}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* СЦЕНА 3: ОТБИТО */}
              {state.phase === 'prologue_3' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                          role: '1. TRY очерчивает опасную зону',
                          code: 'try { Booking.Parse(req); }',
                        },
                        {
                          id: 'CATCH' as BrigadeId,
                          symbol: '⬡',
                          role: '2. CATCH ловит конкретный тип',
                          code: 'catch (FormatException ex) { report.Add(ex); }',
                        },
                        {
                          id: 'FINALLY' as BrigadeId,
                          symbol: '■',
                          role: '3. FINALLY закрывает ресурс всегда',
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
                                fontSize: '12px',
                                color: active
                                  ? 'var(--color-stable)'
                                  : 'var(--color-warning)',
                                fontWeight: 800,
                              }}
                            >
                              {active ? '✓ ВКЛЮЧЁН' : 'НАЖМИТЕ'}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              marginTop: '10px',
                            }}
                          >
                            {part.role}
                          </div>
                          <div
                            className="mono"
                            style={{
                              fontSize: '13.5px',
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

                  {!state.prologue.batchRepelled ? (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'PROLOGUE_REPEL_BATCH' })}
                      className="instrument-btn btn-stable"
                      style={{
                        fontSize: '16px',
                        padding: '12px 22px',
                        alignSelf: 'flex-start',
                      }}
                    >
                      ▶ Запустить пакет из 1 240 записей под защитой TRY-CATCH-FINALLY
                    </button>
                  ) : (
                    <div
                      className="material-paper gesture-card-drop"
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
                            fontWeight: 900,
                            color: 'var(--color-stable)',
                          }}
                        >
                          прошло: 1214 · в отчёт: 26 · остановок: 0 · статус ОК
                        </div>
                        <div style={{ fontSize: '15px', marginTop: '4px' }}>
                          «Двадцать шесть — в отчёт. Тысяча двести четырнадцать — билеты.»
                        </div>
                      </div>
                      <span className="heavy-stamp stamp-repelled">ОТБИТО</span>
                    </div>
                  )}
                </div>
              )}

              {/* СЦЕНА 4: ПОВОРОТ («АТАКИ ПРОДОЛЖАТСЯ») */}
              {state.phase === 'prologue_4' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid var(--color-incident)',
                      padding: '12px 16px',
                      borderRadius: '3px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-incident)',
                        fontWeight: 800,
                        marginBottom: '6px',
                      }}
                    >
                      03:17:10 · ТЕРМИНАЛ ОЖИВАЕТ САМ: ПРОТИВНИК МЕНЯЕТ СПОСОБ АТАКИ
                    </div>
                    {PROLOGUE_SECOND_WAVE_LOGS.map((l, i) => (
                      <div
                        key={i}
                        className="code-line-row terminal-stream-line"
                        style={{
                          animationDelay: `${i * 120}ms`,
                          fontSize: '18.5px',
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
                      padding: '18px 22px',
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
                      style={{
                        fontSize: '15px',
                        color: 'var(--text-secondary)',
                        marginTop: '6px',
                      }}
                    >
                      «Вы закрыли одну дверь (FormatException). Он пойдёт в три остальные: деление на ноль, незакрытый ресурс и пустой catch.»
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {[
                        'Бой 1 · Прицел (Booking.cs:12)',
                        'Бой 2 · Порядок (Pricing.cs:23)',
                        'Бой 3 · Замок (Seats.cs:41)',
                        'Бой 4 · Честность (Promo.cs:55)',
                      ].map((dir) => (
                        <span
                          key={dir}
                          className="mono"
                          style={{
                            padding: '5px 12px',
                            background: 'rgba(255, 176, 32, 0.15)',
                            border: '1px solid var(--color-warning)',
                            fontSize: '13px',
                            fontWeight: 800,
                          }}
                        >
                          {dir}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 2. ФАЗА 08:05 ПРАКТИКА ================= */}
          {isPracticePhase && (
            <PracticeWorkbench state={state} dispatch={dispatch} />
          )}

          {/* ================= 3. ФАЗЫ 08:55 / 09:07 / 09:15 ================= */}
          {isFinalPhasePanel && (
            <FinalPhasesPanel
              state={state}
              dispatch={dispatch}
              onNavigateScreen={onNavigateScreen}
            />
          )}

          {/* ================= 4. ФАЗА БОЁВ 1–4: ЧИСТЫЙ МОНИТОР КОДА И ПОЛИГОН ================= */}
          {!isPrologue && !isPracticePhase && !isFinalPhasePanel && !isQueueBoardPhase && (
            <div
              className="gesture-plate-rise"
              style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}
            >
              {(state.mode === 'РУЧНОЙ' || state.mode === 'АВТОНОМНЫЙ') && (
                <ManualVoiceCardBar state={state} dispatch={dispatch} />
              )}

              {/* Простая и понятная полоса выбора 5 файлов C# */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
                        style={{ padding: '5px 11px', fontSize: '13px' }}
                      >
                        <span>{fileId}</span>
                        {spec.battleNumber > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: active
                                ? 'var(--color-action)'
                                : 'var(--text-caption)',
                            }}
                          >
                            ·Бой {spec.battleNumber}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="mono" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {currentPolygonSpec.subtitle}
                </span>
              </div>

              {/* Монитор кода с живым лучом трассировки при запуске */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
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

              {/* 4 слота патчей (клавиши 1–4) + кнопка ЖИВОЙ ЗАПУСК (Enter) */}
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
                    ВЫБЕРИТЕ ЗАЩИТНЫЙ ПАТЧ (КЛАВИШИ 1–4) И НАЖМИТЕ «ЖИВОЙ ЗАПУСК»:
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
                        Контрпример: count = 0 (стр. 14)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLivePolygonRun}
                      className="instrument-btn btn-action"
                      style={{ fontSize: '14px', padding: '7px 16px', fontWeight: 900 }}
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
                          padding: '7px 10px',
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
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 5. ФАЗА 09:00 СТАРТ ПРОДАЖ: ТАБЛО ИЗ 1 240 КЛЕТОК ================= */}
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
                    09:00 · СТАРТ ПРОДАЖ · КАЖДАЯ ПРОБИТАЯ ВОЛНА = −30 ЧЕЛОВЕК
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '32px',
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
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!shieldReady && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'UNLOCK_ALL_SHIELD' })}
                      className="instrument-btn btn-warning"
                    >
                      Открыть Щит 6/6
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
                      ? '▶ ЗАПУСТИТЬ СТАРТ 09:00'
                      : `СТАРТ ЗАБЛОКИРОВАН (ЩИТ ${shieldUnlockedCount}/6)`}
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
                        <span>{wave.rewardCoins} ОЧК.</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                        {wave.title}
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

        {/* ================= ПРАВАЯ ЗОНА (~38%): КОНТЕКСТНАЯ ПРИБОРНАЯ СТОЙКА ================= */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* 1. ТРИ ПЛАСТИНЫ БРИГАД (TRY ▲, CATCH ⬡, FINALLY ■ — очки 56px) */}
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
                    <span style={{ color: 'var(--text-caption)' }}>
                      {isPrologue ? 'СТАТУС:' : 'РОЛЬ:'}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '2px',
                        background: isPrologue
                          ? 'rgba(53, 208, 160, 0.16)'
                          : b.battleRole === 'АТАКА'
                          ? 'rgba(255, 93, 93, 0.18)'
                          : b.battleRole === 'ЗАЩИТА'
                          ? 'rgba(53, 208, 160, 0.18)'
                          : 'rgba(255, 176, 32, 0.18)',
                        color: isPrologue
                          ? 'var(--color-stable)'
                          : b.battleRole === 'АТАКА'
                          ? 'var(--color-incident)'
                          : b.battleRole === 'ЗАЩИТА'
                          ? 'var(--color-stable)'
                          : 'var(--color-warning)',
                      }}
                    >
                      {isPrologue ? 'НА СМЕНЕ' : b.battleRole}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. СРЕДНИЙ БЛОК: В ЗАВЯЗКЕ — СВОДКА ИНЦИДЕНТА; В БОЯХ — НАРЯД-ЗАДАНИЕ «ВЫБЕРИ ПАТЧ» */}
          {isPrologue ? (
            <div className="material-paper" style={{ padding: '12px 16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-caption)',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                СВОДКА НОЧНОГО ИНЦИДЕНТА · СЕРВИС «{worldMeta.serviceName.toUpperCase()}»
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginTop: '8px',
                }}
              >
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.28)',
                    border: '1px solid var(--border-metal)',
                  }}
                >
                  <div style={{ fontSize: '11.5px', color: 'var(--text-caption)' }}>
                    ОЧЕРЕДЬ К 09:00
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      color: 'var(--color-warning)',
                    }}
                  >
                    1 240 ЧЕЛ.
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.28)',
                    border: '1px solid var(--border-metal)',
                  }}
                >
                  <div style={{ fontSize: '11.5px', color: 'var(--text-caption)' }}>
                    ПОДБРОШЕНО МИН
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      color: 'var(--color-incident)',
                    }}
                  >
                    26 ЗАПИСЕЙ
                  </div>
                </div>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginTop: '8px',
                }}
              >
                Точка входа: учётная запись <strong>test/test</strong> (02:07–02:48) · Выгрузка: 0 байт
              </div>
            </div>
          ) : (
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
          )}

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
                ЩИТ СМЕНЫ: {shieldUnlockedCount} / 6 ПРАВИЛ
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
                {shieldReady ? '● СТАРТ 09:00 РАЗРЕШЁН' : '○ СОБЕРИТЕ 6 ПРАВИЛ'}
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
                  ТАЙМЕР ЭТАПА
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
                onClick={() => dispatch({ type: 'NEXT_PHASE' })}
                className="instrument-btn btn-action"
                style={{ padding: '5px 10px', fontSize: '12.5px' }}
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
                  Сброс
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
            gap: '10px',
            flex: 1,
            minWidth: '280px',
          }}
        >
          <span
            className="brass-nameplate"
            style={{ fontSize: '12px', padding: '2px 8px' }}
          >
            ЛЕНТА СМЕНЫ
          </span>
          {state.journal.slice(0, 2).map((entry) => (
            <div
              key={entry.id}
              className="mono"
              style={{
                fontSize: '13px',
                color: 'var(--text-main)',
                paddingRight: '12px',
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
          Клавиши: [Пробел] таймер · [1–4] слот патча · [Enter] запуск · [F] чистый проектор
        </div>
      </footer>
    </div>
  );
};

function themacroStages(
  isPrologue: boolean,
  isBattle: boolean,
  battleNumber: number,
  isPracticePhase: boolean,
  phase: PhaseId,
  isQueueBoardPhase: boolean
): { id: string; label: string; active: boolean; targetPhase: PhaseId }[] {
  return [
    {
      id: 'stage_prologue',
      label: '① Завязка (03:00)',
      active: isPrologue,
      targetPhase: 'prologue_1',
    },
    {
      id: 'stage_battles',
      label: `② Четыре боя (${isBattle ? `Бой ${battleNumber}` : '04:10'})`,
      active: isBattle,
      targetPhase: 'battle_1',
    },
    {
      id: 'stage_practice',
      label: '③ Практика (08:05)',
      active: isPracticePhase,
      targetPhase: 'practice',
    },
    {
      id: 'stage_start',
      label: '④ Старт 09:00 (1240)',
      active: phase === 'five_min' || isQueueBoardPhase,
      targetPhase: 'start_0900',
    },
    {
      id: 'stage_finale',
      label: '⑤ Итоги и ДЗ (09:07)',
      active: phase === 'closed' || phase === 'homework',
      targetPhase: 'closed',
    },
  ];
}
