import React, { useState } from 'react';
import { REFERENCE_CARDS } from '../game/constants';
import { GameAction } from '../game/reducer';
import { BrigadeId, SessionState } from '../types/game';

interface ManualAutonomousProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
}

export const ManualVoiceCardBar: React.FC<ManualAutonomousProps> = ({
  state,
  dispatch,
}) => {
  const activeBattle = state.battles[state.currentBattleNumber];
  const [customLine, setCustomLine] = useState<number>(activeBattle.targetLine);
  const [customType, setCustomType] = useState<string>(activeBattle.targetException);
  const [customStatement, setCustomStatement] = useState<string>(
    `На строке ${activeBattle.targetLine} входные данные вызывают ${activeBattle.targetException}`
  );
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);

  const handleVoiceAttack = () => {
    const ref = REFERENCE_CARDS.find(
      (c) => c.battleNumber === activeBattle.number && c.cardType === 'атака'
    );
    dispatch({
      type: 'SUBMIT_CARD',
      brigade: activeBattle.attacker,
      role: 'чтец',
      cardType: 'атака',
      file: ref ? ref.file : activeBattle.defaultFile,
      line: ref ? ref.line : activeBattle.targetLine,
      exceptionType: ref ? ref.exceptionType : activeBattle.targetException,
      statement: ref
        ? ref.statement
        : `Строка ${activeBattle.targetLine}: возникает ${activeBattle.targetException}`,
    });
    dispatch({ type: 'RUN_POLYGON' });
  };

  const handleVoiceDefense = () => {
    const ref = REFERENCE_CARDS.find(
      (c) => c.battleNumber === activeBattle.number && c.cardType === 'защита'
    );
    const slot = ref?.patchSlot || activeBattle.number;
    if (!activeBattle.activeSlots.includes(slot)) {
      dispatch({ type: 'TOGGLE_PATCH_SLOT', slot });
    }
    dispatch({
      type: 'SUBMIT_CARD',
      brigade: activeBattle.defender,
      role: 'чтец',
      cardType: 'защита',
      file: ref ? ref.file : activeBattle.defaultFile,
      line: ref ? ref.line : activeBattle.targetLine,
      exceptionType: ref ? ref.exceptionType : activeBattle.targetException,
      statement: ref
        ? ref.statement
        : `Ставим обработчик ${activeBattle.targetException} (слот #${slot})`,
      patchSlot: slot,
    });
    dispatch({ type: 'RUN_POLYGON' });
  };

  const handleCustomVoiceSubmit = (cardType: 'атака' | 'защита') => {
    const brigade =
      cardType === 'атака' ? activeBattle.attacker : activeBattle.defender;
    if (cardType === 'защита' && !activeBattle.activeSlots.includes(activeBattle.number)) {
      dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: activeBattle.number });
    }
    dispatch({
      type: 'SUBMIT_CARD',
      brigade,
      role: 'чтец',
      cardType,
      file: state.selectedPolygonFile,
      line: customLine,
      exceptionType: customType,
      statement: customStatement,
      patchSlot: cardType === 'защита' ? activeBattle.number : undefined,
    });
    dispatch({ type: 'RUN_POLYGON' });
  };

  return (
    <div
      className="material-armor screw-corners no-print"
      style={{
        padding: '12px 16px',
        borderLeft: '6px solid var(--color-warning)',
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
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="brass-nameplate">
              ПУЛЬТ РЕЖИМА «{state.mode}» · КАРТЫ ГОЛОСОМ (ДОКУМЕНТ 06, П. 9)
            </span>
            <span className="mono" style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
              Бой {activeBattle.number} «{activeBattle.codeName}» · Атака: {activeBattle.attacker}{' '}
              · Защита: {activeBattle.defender} · Арбитр: {activeBattle.arbiter}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Клиенты бригад не требуются: ведущий принимает карту на слух и проверяет её живым
            запуском на экране.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleVoiceAttack}
            className="instrument-btn btn-incident"
          >
            Карта АТАКИ с голоса ({activeBattle.attacker}) + Запуск
          </button>
          <button
            type="button"
            onClick={handleVoiceDefense}
            className="instrument-btn btn-stable"
          >
            Карта ЗАЩИТЫ с голоса ({activeBattle.defender}) + Запуск
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'SUBMIT_VERDICT',
                result: 'ПРОБИЛА',
                legalAttackBonus: true,
                journalLine: `Режим ${state.mode}: Бой ${activeBattle.number} — атака ${activeBattle.attacker} ПРОБИЛА.`,
              })
            }
            className="instrument-btn"
          >
            Вердикт: ПРОБИЛА [Y]
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'SUBMIT_VERDICT',
                result: 'ОТБИТА',
                legalAttackBonus: true,
                counterHeldBonus: true,
                journalLine: `Режим ${state.mode}: Бой ${activeBattle.number} — защита ${activeBattle.defender} ОТБИТА.`,
              })
            }
            className="instrument-btn"
          >
            Вердикт: ОТБИТА [N]
          </button>
          <button
            type="button"
            onClick={() => setShowCustomForm((p) => !p)}
            className="instrument-btn"
          >
            {showCustomForm ? 'Скрыть ручной ввод' : 'Своя формулировка с голоса'}
          </button>
        </div>
      </div>

      {showCustomForm && (
        <div
          className="material-paper"
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 800 }}>Строка:</span>
          <input
            type="number"
            value={customLine}
            onChange={(e) => setCustomLine(Number(e.target.value) || 12)}
            className="instrument-btn mono"
            style={{ width: '72px' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 800 }}>Тип:</span>
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            className="instrument-btn mono"
            style={{ width: '210px' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 800 }}>Утверждение:</span>
          <input
            type="text"
            value={customStatement}
            onChange={(e) => setCustomStatement(e.target.value)}
            className="instrument-btn"
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button
            type="button"
            onClick={() => handleCustomVoiceSubmit('атака')}
            className="instrument-btn btn-incident"
          >
            Внести как Атаку
          </button>
          <button
            type="button"
            onClick={() => handleCustomVoiceSubmit('защита')}
            className="instrument-btn btn-stable"
          >
            Внести как Защиту
          </button>
        </div>
      )}

      {/* Строка дисциплины из Регламента п. 11: «Кто-то подсказывает из зала -> −1 бригаде, эпизод в журнал» */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '6px',
          borderTop: '1px dashed var(--border-metal)',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
          ДИСЦИПЛИНА СМЕНЫ (РЕГЛАМЕНТ, П. 11 — «ПОДСКАЗКА ИЗ ЗАЛА: −1 БРИГАДЕ И ЗАПИСЬ В ЖУРНАЛ»):
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => (
            <button
              key={bId}
              type="button"
              onClick={() =>
                dispatch({
                  type: 'ADJUST_BRIGADE_SCORE',
                  brigade: bId,
                  delta: -1,
                  reason: `Подсказка из зала во время устного ответа (Регламент, п. 11)`,
                })
              }
              className="instrument-btn mono"
              style={{ fontSize: '13px', padding: '4px 10px' }}
            >
              Подсказка из зала: −1 {bId}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AutonomousQueueStrip: React.FC<ManualAutonomousProps> = ({
  state,
  dispatch,
}) => {
  return (
    <div
      className="material-armor screw-corners"
      style={{
        padding: '14px 18px',
        borderLeft: '6px solid var(--color-action)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="brass-nameplate">
              ПОЛОСА ОЧЕРЕДИ ВЕДУЩЕГО · 1 240 ЧЕЛОВЕК (ДОКУМЕНТ 05, П. 8 · ДОКУМЕНТ 06, П. 9)
            </span>
            <span className="mono" style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
              Режим: {state.mode} · «Очередь — одна полоса, ведущий ведёт её по списку бригад»
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Отмечайте результат каждой из 4 волн устного прогона: удержанная волна сохраняет 310
            человек, пробитая волна отнимает 30 человек из очереди.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              ([1, 2, 3, 4] as const).forEach((wId) =>
                dispatch({
                  type: 'SET_WAVE_MANUAL_OUTCOME',
                  waveId: wId,
                  outcome: 'отбита',
                })
              );
            }}
            className="instrument-btn btn-stable"
          >
            Все 4 волны удержаны (1240/1240)
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'LOAD_DEMO_1210' })}
            className="instrument-btn btn-warning"
          >
            Эталон: Волна 2 пробила (1210/1240)
          </button>
        </div>
      </div>

      {/* Горизонтальная 4-сегментная полоса 0 ... 1240 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        {state.waves.map((wave, idx) => {
          const isProbed = wave.status === 'пробила';
          const isRepelled = wave.status === 'отбита';
          const segmentStart = idx * 310 + 1;
          const segmentEnd = (idx + 1) * 310;
          return (
            <div
              key={wave.id}
              style={{
                padding: '10px 12px',
                background: isProbed
                  ? 'rgba(255, 93, 93, 0.16)'
                  : isRepelled
                  ? 'rgba(53, 208, 160, 0.14)'
                  : 'rgba(0, 0, 0, 0.35)',
                border: `2px solid ${
                  isProbed
                    ? 'var(--color-incident)'
                    : isRepelled
                    ? 'var(--color-stable)'
                    : 'var(--border-metal)'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                className="mono"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  fontWeight: 800,
                }}
              >
                <span>
                  ВОЛНА {wave.id} · {wave.direction.toUpperCase()}
                </span>
                <span style={{ color: 'var(--color-warning)' }}>Держит: {wave.holder}</span>
              </div>

              {/* Визуальная полоса сегмента (310 человек) */}
              <div
                style={{
                  height: '18px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-metal)',
                  display: 'flex',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: isProbed ? '90%' : '100%',
                    background: isRepelled
                      ? 'var(--color-stable)'
                      : isProbed
                      ? 'var(--color-stable)'
                      : 'rgba(143, 176, 198, 0.3)',
                  }}
                />
                {isProbed && (
                  <div
                    style={{
                      width: '10%',
                      background: 'var(--color-incident)',
                    }}
                    title="Дыра в очереди: −30 человек без билета"
                  />
                )}
              </div>

              <div
                className="mono"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>
                  Клетки {segmentStart}–{segmentEnd}
                </span>
                <strong
                  style={{
                    color: isProbed
                      ? 'var(--color-incident)'
                      : isRepelled
                      ? 'var(--color-stable)'
                      : 'var(--text-caption)',
                  }}
                >
                  {isProbed ? '−30 ЧЕЛ. (280/310)' : isRepelled ? '310 / 310 ОК' : 'ОЖИДАНИЕ'}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_WAVE_MANUAL_OUTCOME',
                      waveId: wave.id,
                      outcome: 'отбита',
                    })
                  }
                  className={`instrument-btn ${isRepelled ? 'btn-stable' : ''}`}
                  style={{ flex: 1, fontSize: '13px', padding: '5px 8px' }}
                >
                  Удержана (0)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'SET_WAVE_MANUAL_OUTCOME',
                      waveId: wave.id,
                      outcome: 'пробила',
                    })
                  }
                  className={`instrument-btn ${isProbed ? 'btn-incident' : ''}`}
                  style={{ flex: 1, fontSize: '13px', padding: '5px 8px' }}
                >
                  Пробила (−30)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
