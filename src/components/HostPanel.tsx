import React, { useState } from 'react';
import {
  BATTLE_TACTS,
  PHASES,
  TEACHER_SCRIPT_19,
  WORLD_PRESETS,
} from '../game/constants';
import { getUnlockedShieldCount, isShieldComplete } from '../game/engine';
import { GameAction } from '../game/reducer';
import {
  BattleRole,
  BrigadeId,
  SessionState,
  WorldId,
} from '../types/game';
import { RehearsalTrainerPanel } from './RehearsalTrainerPanel';
import {
  AutonomousQueueStrip,
  ManualVoiceCardBar,
} from './ManualAutonomousStrip';
import { DidacticCycleStrip } from './DidacticCycleStrip';

interface HostPanelProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  onOpenProjectorWindow?: () => void;
  syncedWindowCount?: number;
}

type HostDeckTab = 'teleprompter' | 'bkp' | 'lexicon';

export const HostPanel: React.FC<HostPanelProps> = ({
  state,
  dispatch,
  onOpenProjectorWindow,
  syncedWindowCount = 1,
}) => {
  const [scoreReason, setScoreReason] = useState(
    'Ручная корректировка ведущим смены'
  );
  const [deckTab, setDeckTab] = useState<HostDeckTab>('teleprompter');
  const [showAll19Lines, setShowAll19Lines] = useState(false);

  const activeBattle = state.battles[state.currentBattleNumber];
  const shieldReady = isShieldComplete(state);
  const shieldCount = getUnlockedShieldCount(state);

  const totalScriptWords = TEACHER_SCRIPT_19.reduce(
    (acc, l) => acc + l.wordCount,
    0
  );

  const currentSceneNum =
    state.phase === 'prologue_1'
      ? 1
      : state.phase === 'prologue_2'
      ? 2
      : state.phase === 'prologue_3'
      ? 3
      : 4;

  const visibleScriptLines = showAll19Lines
    ? TEACHER_SCRIPT_19
    : TEACHER_SCRIPT_19.filter((l) => l.scene === currentSceneNum);

  return (
    <div
      style={{
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Верхний блок: Режимы проведения, код партии, погасить экраны, мир */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-caption)', fontWeight: 700 }}>
            ПАНЕЛЬ ВЕДУЩЕГО СМЕНЫ · ИСТОЧНИК ИСТИНЫ: СЕРВЕР СОСТОЯНИЯ
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '2px' }}>
            Код партии:{' '}
            <span className="mono" style={{ color: 'var(--color-warning)' }}>
              {state.code}
            </span>{' '}
            · Код ведущего:{' '}
            <span className="mono" style={{ color: 'var(--color-action)' }}>
              {state.hostPin}
            </span>{' '}
            · Часы смены:{' '}
            <span className="mono" style={{ color: 'var(--color-stable)' }}>
              {state.shiftClock}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {onOpenProjectorWindow && (
            <button
              type="button"
              onClick={onOpenProjectorWindow}
              className="instrument-btn btn-action"
              title="Открыть чистый Экран зала во втором окне браузера для вывода на проектор"
            >
              Окно проектора ↗ (Окон: {syncedWindowCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_DIM_SCREENS' })}
            className={`instrument-btn ${
              state.screensDimmedForStandingReport ? 'btn-warning' : ''
            }`}
          >
            {state.screensDimmedForStandingReport
              ? 'Экраны бригад: ПРИГЛУШЕНЫ'
              : 'Приглушить экраны (Доклад стоя)'}
          </button>

          <select
            aria-label="Выбор мира смены"
            value={state.world}
            onChange={(e) =>
              dispatch({ type: 'SET_WORLD', world: e.target.value as WorldId })
            }
            className="instrument-btn"
          >
            {(Object.keys(WORLD_PRESETS) as WorldId[]).map((wId) => (
              <option key={wId} value={wId}>
                Мир: {WORLD_PRESETS[wId].serviceName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => dispatch({ type: 'LOAD_DEMO_1210' })}
            className="instrument-btn btn-stable"
          >
            Эталон 1210/1240
          </button>
        </div>
      </div>

      {/* КОМПАКТНАЯ ПРИБОРНАЯ ЛЕНТА 5 ШАГОВ ОТКРЫТИЯ ПОНЯТИЯ (1. НУЖДА -> 5. ИМЯ) */}
      <DidacticCycleStrip state={state} dispatch={dispatch} compact />

      {/* ПУЛЬТ РЕЖИМОВ «РУЧНОЙ» И «АВТОНОМНЫЙ» (ГОЛОСОВЫЕ КАРТЫ + ПОЛОСА ОЧЕРЕДИ 1 240 ЧЕЛ.) */}
      {(state.mode === 'РУЧНОЙ' || state.mode === 'АВТОНОМНЫЙ') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ManualVoiceCardBar state={state} dispatch={dispatch} />
          <AutonomousQueueStrip state={state} dispatch={dispatch} />
        </div>
      )}

      {/* ОСНОВНОЙ ПУЛЬТ УПРАВЛЕНИЯ: 1. Часы урока и фазы · 2. Счёт бригад и старт 09:00 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56fr 44fr',
          gap: '12px',
        }}
      >
        {/* 1. Управление фазами 90-минутного урока и 6 тактами боя */}
        <div
          className="material-armor screw-corners"
          style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800 }}>
            ЧАСЫ УРОКА (90 МИНУТ · 03:00 → 09:15) · ПЕРЕКЛЮЧЕНИЕ ФАЗ
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
              gap: '6px',
            }}
          >
            {PHASES.map((p) => {
              const active = state.phase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PHASE', phase: p.id })}
                  className={`instrument-btn ${active ? 'btn-action' : ''}`}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '6px 9px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      fontSize: '12px',
                    }}
                  >
                    <span className="mono" style={{ color: 'var(--color-warning)' }}>
                      {p.shiftClock}
                    </span>
                    <span className="mono" style={{ color: 'var(--text-caption)' }}>
                      {p.realTimeSpan}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '1px' }}>
                    {p.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Управление 6 тактами активного боя */}
          <div
            style={{
              marginTop: '4px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-metal)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
              ТАКТЫ БОЯ {activeBattle.number} «{activeBattle.codeName}» (8 МИНУТ):
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {BATTLE_TACTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_TACT', tact: t.id })}
                  className={`instrument-btn ${
                    activeBattle.tact === t.id ? 'btn-warning' : ''
                  }`}
                  style={{ fontSize: '12.5px', padding: '5px 9px' }}
                >
                  {t.title} ({t.durationSec} с)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Ручная правка счёта бригад, штраф за подсказку из зала, ротация Боя 4 */}
        <div
          className="material-armor screw-corners"
          style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800 }}>
            СЧЁТ БРИГАД И ПРАВКА С ЗАПИСЬЮ В ЖУРНАЛ
          </div>

          <input
            type="text"
            value={scoreReason}
            onChange={(e) => setScoreReason(e.target.value)}
            placeholder="Причина корректировки для журнала смены"
            className="instrument-btn mono"
            style={{ width: '100%', fontSize: '12.5px' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
              const b = state.brigades[bId];
              return (
                <div
                  key={bId}
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.32)',
                    border: '1px solid var(--border-metal)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="brass-nameplate" style={{ fontSize: '13px' }}>
                      {b.shapeSymbol} {b.name}
                    </span>
                    <span className="mono" style={{ fontSize: '21px', fontWeight: 900 }}>
                      {b.score} очк.
                    </span>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--text-caption)' }}>
                      [{b.battleRole}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'ADJUST_BRIGADE_SCORE',
                          brigade: bId,
                          delta: 1,
                          reason: scoreReason,
                        })
                      }
                      className="instrument-btn btn-stable"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'ADJUST_BRIGADE_SCORE',
                          brigade: bId,
                          delta: 2,
                          reason: scoreReason,
                        })
                      }
                      className="instrument-btn btn-stable"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      +2
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'ADJUST_BRIGADE_SCORE',
                          brigade: bId,
                          delta: -1,
                          reason: 'Штраф −1: подсказка из зала (раздел 11 Регламента)',
                        })
                      }
                      className="instrument-btn btn-incident"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      −1 Подсказка
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Выбор роли лидером рейтинга для Боя 4 */}
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(255, 176, 32, 0.1)',
              border: '1px solid var(--color-warning)',
            }}
          >
            <div style={{ fontSize: '12.5px', fontWeight: 800 }}>
              БОЙ 4 «ЧЕСТНОСТЬ» — РОЛИ ПО РЕЙТИНГУ (БОИ 1–3)
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
              {(['АТАКА', 'ЗАЩИТА', 'АРБИТР'] as BattleRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'SET_BATTLE4_LEADER_ROLE', role: r })
                  }
                  className="instrument-btn"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  Лидер: {r}
                </button>
              ))}
            </div>
          </div>

          {/* Аварийный переход к старту в 09:00 и режим слабой группы */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingTop: '6px',
              borderTop: '1px solid var(--border-metal)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.queue.slowGroupMode}
                onChange={() => dispatch({ type: 'TOGGLE_SLOW_GROUP_MODE' })}
              />
              <span style={{ fontSize: '12.5px' }}>
                Режим «Слабая группа» (+30 с)
              </span>
            </label>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'UNLOCK_ALL_SHIELD' })}
                className="instrument-btn btn-warning"
                style={{ fontSize: '12px', padding: '5px 9px' }}
              >
                Щит 6/6 ({shieldCount}/6)
              </button>
              <button
                type="button"
                disabled={!shieldReady}
                onClick={() => dispatch({ type: 'TRIGGER_START_0900' })}
                className="instrument-btn btn-stable"
                style={{ fontSize: '12px', padding: '5px 9px' }}
              >
                Аварийный СТАРТ 09:00
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* НИЖНЯЯ КАССЕТА ИНСТРУМЕНТОВ ВЕДУЩЕГО (3 ЧИСТЫЕ ВКЛАДКИ ВМЕСТО НАГРОМОЖДЕНИЯ) */}
      <div className="material-armor screw-corners" style={{ padding: '12px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid var(--border-metal)',
            paddingBottom: '8px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setDeckTab('teleprompter')}
              className={`instrument-btn ${deckTab === 'teleprompter' ? 'btn-action' : ''}`}
            >
              1. Живой суфлёр реплик (Док. 03)
            </button>
            <button
              type="button"
              onClick={() => setDeckTab('bkp')}
              className={`instrument-btn ${deckTab === 'bkp' ? 'btn-warning' : ''}`}
            >
              2. Прогон БКП-1 и Спорные ситуации (Т1–Т8)
            </button>
            <button
              type="button"
              onClick={() => setDeckTab('lexicon')}
              className={`instrument-btn ${deckTab === 'lexicon' ? 'btn-stable' : ''}`}
            >
              3. Язык мира: Запрещённые слова → Замены
            </button>
          </div>
        </div>

        {deckTab === 'teleprompter' && (
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
              <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
                ДОСЛОВНЫЙ СУФЛЁР ВЕДУЩЕГО (ДОКУМЕНТ 03 · 19 РЕПЛИК · {totalScriptWords} СЛОВ ≤ 130)
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowAll19Lines((p) => !p)}
                  className="instrument-btn"
                  style={{ fontSize: '12px', padding: '3px 8px' }}
                >
                  {showAll19Lines
                    ? `Показать только Сцену ${currentSceneNum}`
                    : 'Показать все 19 реплик'}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: showAll19Lines ? '1fr 1fr' : '1fr',
                gap: '6px 16px',
              }}
            >
              {visibleScriptLines.map((line) => (
                <div
                  key={line.number}
                  className="terminal-stream-line"
                  style={{
                    fontSize: showAll19Lines ? '13px' : '16px',
                    padding: showAll19Lines ? '2px 0' : '6px 10px',
                    background: showAll19Lines ? 'transparent' : 'rgba(0,0,0,0.22)',
                    borderLeft: showAll19Lines
                      ? 'none'
                      : '3px solid var(--color-warning)',
                  }}
                >
                  <span className="mono" style={{ color: 'var(--color-warning)' }}>
                    #{line.number} [Сц.{line.scene}]
                  </span>{' '}
                  <strong>«{line.words}»</strong>{' '}
                  <span style={{ color: 'var(--text-caption)', fontSize: '13px' }}>
                    ({line.cue})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {deckTab === 'bkp' && (
          <RehearsalTrainerPanel state={state} dispatch={dispatch} />
        )}

        {deckTab === 'lexicon' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '8px',
              fontSize: '13.5px',
            }}
          >
            {[
              ['калькулятор', 'сервис, служба «Партер»'],
              ['хакер / взломал', 'тот, кто вошёл; атакующий; red team'],
              ['упал (сломался)', 'лежит, вызов, инцидент'],
              ['ребята, дети', '(без обращения — смена уже идёт)'],
              ['команда / поиграем', 'бригада, смена, дежурим, бой'],
              ['задание', 'наряд, тикет #7712'],
              ['правильно / неправильно', 'отбито / пробила'],
              ['молодец', '(без похвалы — только вердикт)'],
            ].map(([bad, good], i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.28)',
                  border: '1px solid var(--border-metal)',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-incident)',
                    textDecoration: 'line-through',
                  }}
                >
                  {bad}
                </span>
                <span
                  className="mono"
                  style={{ color: 'var(--color-stable)', fontWeight: 700 }}
                >
                  → {good}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
