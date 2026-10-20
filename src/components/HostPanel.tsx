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
  AppMode,
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

interface HostPanelProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  onOpenProjectorWindow?: () => void;
  syncedWindowCount?: number;
}

export const HostPanel: React.FC<HostPanelProps> = ({
  state,
  dispatch,
  onOpenProjectorWindow,
  syncedWindowCount = 1,
}) => {
  const [scoreReason, setScoreReason] = useState(
    'Ручная корректировка ведущим смены'
  );
  const activeBattle = state.battles[state.currentBattleNumber];
  const shieldReady = isShieldComplete(state);
  const shieldCount = getUnlockedShieldCount(state);

  const totalScriptWords = TEACHER_SCRIPT_19.reduce(
    (acc, l) => acc + l.wordCount,
    0
  );

  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Верхний блок: Режимы проведения, код партии, погасить экраны, мир */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
            ПАНЕЛЬ ВЕДУЩЕГО СМЕНЫ · ИСТОЧНИК ИСТИНЫ: СЕРВЕР СОСТОЯНИЯ
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
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

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenProjectorWindow && (
            <button
              type="button"
              onClick={onOpenProjectorWindow}
              className="instrument-btn btn-action"
              title="Открыть чистый Экран зала во втором окне браузера для вывода на проектор (синхронизируется через BroadcastChannel даже без сети)"
            >
              Открыть окно проектора ↗ (Окон: {syncedWindowCount})
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
              ? 'Экраны бригад: ПРИГЛУШЕНЫ (Доклад стоя)'
              : 'Приглушить экраны бригад (Доклад стоя)'}
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
            Загрузить эталон 1210/1240
          </button>
        </div>
      </div>

      {/* БЛОК КОНТРОЛЬНОГО ПРОГОНА БКП-1 (8 ТОЧЕК ДЛЯ КОМИССИИ) + ТРЕНАЖЁР СПОРНЫХ СИТУАЦИЙ */}
      <RehearsalTrainerPanel state={state} dispatch={dispatch} />

      {/* ПУЛЬТ РЕЖИМОВ «РУЧНОЙ» И «АВТОНОМНЫЙ» (ГОЛОСОВЫЕ КАРТЫ + ПОЛОСА ОЧЕРЕДИ 1 240 ЧЕЛ.) */}
      {(state.mode === 'РУЧНОЙ' || state.mode === 'АВТОНОМНЫЙ') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ManualVoiceCardBar state={state} dispatch={dispatch} />
          <AutonomousQueueStrip state={state} dispatch={dispatch} />
        </div>
      )}

      {/* СЕТКА УПРАВЛЕНИЯ: 1. Часы урока и фазы · 2. Счёт бригад и Бой 4 по рейтингу */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '55fr 45fr',
          gap: '14px',
        }}
      >
        {/* 1. Управление фазами 90-минутного урока и 6 тактами боя */}
        <div
          className="material-armor screw-corners"
          style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div style={{ fontSize: '15px', fontWeight: 800 }}>
            ЧАСЫ УРОКА (90 МИНУТ · 03:00 → 09:15) · ПЕРЕКЛЮЧЕНИЕ ФАЗ
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
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
                    padding: '7px 10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      fontSize: '13px',
                    }}
                  >
                    <span className="mono" style={{ color: 'var(--color-warning)' }}>
                      {p.shiftClock}
                    </span>
                    <span className="mono" style={{ color: 'var(--text-caption)' }}>
                      {p.realTimeSpan}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                    {p.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Управление 6 тактами активного боя */}
          <div
            style={{
              marginTop: '6px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-metal)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>
              ТАКТЫ БОЯ {activeBattle.number} «{activeBattle.codeName}» (8 МИНУТ):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {BATTLE_TACTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_TACT', tact: t.id })}
                  className={`instrument-btn ${
                    activeBattle.tact === t.id ? 'btn-warning' : ''
                  }`}
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
          style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div style={{ fontSize: '15px', fontWeight: 800 }}>
            СЧЁТ БРИГАД И ПРАВКА С ЗАПИСЬЮ В ЖУРНАЛ
          </div>

          <input
            type="text"
            value={scoreReason}
            onChange={(e) => setScoreReason(e.target.value)}
            placeholder="Причина корректировки для журнала смены"
            className="instrument-btn mono"
            style={{ width: '100%' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
              const b = state.brigades[bId];
              return (
                <div
                  key={bId}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.32)',
                    border: '1px solid var(--border-metal)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="brass-nameplate">
                      {b.shapeSymbol} {b.name}
                    </span>
                    <span className="mono" style={{ fontSize: '24px', fontWeight: 900 }}>
                      {b.score} очк.
                    </span>
                    <span className="mono" style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                      [{b.battleRole}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                    >
                      −1 Подсказка из зала
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Выбор роли лидером рейтинга для Боя 4 */}
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(255, 176, 32, 0.1)',
              border: '1px solid var(--color-warning)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800 }}>
              БОЙ 4 «ЧЕСТНОСТЬ» — РОЛИ ПО РЕЙТИНГУ (СУММА ОЧКОВ ЗА БОИ 1–3)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Первая по рейтингу бригада выбирает себе роль на Бой 4:
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {(['АТАКА', 'ЗАЩИТА', 'АРБИТР'] as BattleRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'SET_BATTLE4_LEADER_ROLE', role: r })
                  }
                  className="instrument-btn"
                >
                  Лидер выбирает: {r}
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={state.queue.slowGroupMode}
                onChange={() => dispatch({ type: 'TOGGLE_SLOW_GROUP_MODE' })}
              />
              <span style={{ fontSize: '13px' }}>
                Режим «Слабая группа» (волны старта по одной с паузой 30 с)
              </span>
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'UNLOCK_ALL_SHIELD' })}
                className="instrument-btn btn-warning"
              >
                Щит 6/6 ({shieldCount}/6)
              </button>
              <button
                type="button"
                disabled={!shieldReady}
                onClick={() => dispatch({ type: 'TRIGGER_START_0900' })}
                className="instrument-btn btn-stable"
              >
                Аварийный СТАРТ 09:00
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ДОСЛОВНЫЙ СЦЕНАРИЙ ВЕДУЩЕГО (19 РЕПЛИК · 124 СЛОВА <= 130 СЛОВ) + ЗАПРЕЩЁННЫЕ СЛОВА */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '64fr 36fr',
          gap: '14px',
        }}
      >
        <div className="material-paper" style={{ padding: '14px 18px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 800 }}>
              ДОСЛОВНЫЙ СУФЛЁР ЗАВЯЗКИ (ДОКУМЕНТ 03 · 19 РЕПЛИК · {totalScriptWords} СЛОВ
              ИЗ 130 МАКС.)
            </span>
            <span className="mono" style={{ fontSize: '13px', color: 'var(--color-stable)' }}>
              ЛИМИТ ВЫДЕРЖАН ({totalScriptWords} ≤ 130)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 16px',
            }}
          >
            {TEACHER_SCRIPT_19.map((line) => (
              <div key={line.number} style={{ fontSize: '13px' }}>
                <span className="mono" style={{ color: 'var(--color-warning)' }}>
                  #{line.number} [Сц.{line.scene}]
                </span>{' '}
                <strong>«{line.words}»</strong>{' '}
                <span style={{ color: 'var(--text-caption)' }}>({line.cue})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Словарь смены: Запрещённые слова и замены (Документ 03, раздел 7) */}
        <div className="material-armor" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>
            ЯЗЫК МИРА: ЗАПРЕЩЁННЫЕ СЛОВА И ЗАМЕНЫ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
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
                  borderBottom: '1px solid var(--border-metal)',
                  paddingBottom: '4px',
                }}
              >
                <span style={{ color: 'var(--color-incident)', textDecoration: 'line-through' }}>
                  {bad}
                </span>
                <span className="mono" style={{ color: 'var(--color-stable)', fontWeight: 700 }}>
                  → {good}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
