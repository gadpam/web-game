import React, { useEffect, useState } from 'react';
import { PATCH_SLOTS, REFERENCE_CARDS } from '../game/constants';
import { buildArbiterOralFormula } from '../game/engine';
import { GameAction } from '../game/reducer';
import { SessionState } from '../types/game';

interface ArbiterPanelProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
}

export const ArbiterPanel: React.FC<ArbiterPanelProps> = ({
  state,
  dispatch,
}) => {
  const activeBattle = state.battles[state.currentBattleNumber];
  const refAttack = REFERENCE_CARDS.find(
    (c) => c.battleNumber === activeBattle.number && c.cardType === 'атака'
  );

  const [legalAttackBonus, setLegalAttackBonus] = useState(true);
  const [counterHeldBonus, setCounterHeldBonus] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    'Карта без номера строки или точного типа не принимается'
  );
  const [journalLine, setJournalLine] = useState(
    'Защита поставила обработчик вокруг опасной строки, пакет прошёл'
  );
  const [missedSpotNote, setMissedSpotNote] = useState(
    refAttack?.arbiterMissedSpotHint ||
      'Пропуск: int.TryParse дешевле исключения на потоке из 1240 запросов'
  );
  const [stopReason, setStopReason] = useState(
    'Спорная карта: сверка номера строки и типа исключения на полигоне'
  );

  useEffect(() => {
    const hint = REFERENCE_CARDS.find(
      (c) => c.battleNumber === activeBattle.number && c.cardType === 'атака'
    )?.arbiterMissedSpotHint;
    if (hint) setMissedSpotNote(hint);
  }, [activeBattle.number]);

  useEffect(() => {
    if (activeBattle.lastRun) {
      if (activeBattle.lastRun.outcome === 'ПРОБИЛА') {
        setJournalLine(
          `Защита не удержала строку ${activeBattle.lastRun.targetLine} (${activeBattle.lastRun.exceptionType})`
        );
      } else {
        setJournalLine(
          `Обработчик ${
            activeBattle.lastRun.handlerTriggered || 'try-catch'
          } сработал, прошло ${activeBattle.lastRun.processedRecords} из 1240`
        );
      }
    }
  }, [activeBattle.lastRun]);

  const previewLine =
    activeBattle.attackCard?.line ||
    activeBattle.lastRun?.targetLine ||
    activeBattle.targetLine;

  const previewFormulaProbed = buildArbiterOralFormula({
    battleNumber: activeBattle.number,
    targetLine: previewLine,
    result: 'ПРОБИЛА',
    attackerDelta: 2 + (legalAttackBonus ? 1 : 0),
    defenderDelta: 0,
    journalLine,
  });

  const previewFormulaRepelled = buildArbiterOralFormula({
    battleNumber: activeBattle.number,
    targetLine: previewLine,
    result: 'ОТБИТА',
    attackerDelta: legalAttackBonus ? 1 : 0,
    defenderDelta: 1 + (counterHeldBonus ? 2 : 0),
    journalLine,
  });

  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Шапка Панели Арбитра + Стоп-кран боя на спорной карте */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
            ПАНЕЛЬ АРБИТРА · ПРОТОКОЛ БОЯ {activeBattle.number} «
            {activeBattle.codeName.toUpperCase()}»
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
            Атакует: {activeBattle.attacker} · Защищается:{' '}
            {activeBattle.defender} · Арбитр (стоя у экрана):{' '}
            <span style={{ color: 'var(--color-warning)' }}>
              {activeBattle.arbiter}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: 'TOGGLE_ARBITER_STOP', reason: stopReason })
            }
            className={`instrument-btn ${
              activeBattle.arbiterStopActive ? 'btn-incident' : 'btn-warning'
            }`}
            title="Право арбитра остановить таймер боя на спорной карте (Документ 10, п. 7)"
          >
            {activeBattle.arbiterStopActive
              ? 'Снять СТОП-БОЙ и продолжить'
              : 'СТОП-БОЙ на спорной карте'}
          </button>

          {([1, 2, 3, 4] as const).map((bNum) => (
            <button
              key={bNum}
              type="button"
              onClick={() =>
                dispatch({ type: 'SET_PHASE', phase: `battle_${bNum}` as any })
              }
              className={`instrument-btn ${
                activeBattle.number === bNum ? 'btn-action' : ''
              }`}
            >
              Бой {bNum}
            </button>
          ))}
        </div>
      </div>

      {/* КАРТЫ ОБЕИХ СТОРОН РЯДОМ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
        }}
      >
        <div
          className="material-paper"
          style={{
            padding: '16px 18px',
            borderLeftColor: 'var(--color-incident)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--text-caption)',
              fontWeight: 700,
            }}
          >
            <span>КАРТА АТАКИ · БРИГАДА {activeBattle.attacker}</span>
            <span>
              {activeBattle.attackCard
                ? activeBattle.attackCard.valid
                  ? 'ПРИНЯТА ПО ПРАВИЛАМ'
                  : 'НАРУШЕНИЕ ПРАВИЛ'
                : 'ОЖИДАНИЕ'}
            </span>
          </div>

          {activeBattle.attackCard ? (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 800 }}>
                СТРОКА: {activeBattle.attackCard.line} ({activeBattle.attackCard.file})
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--color-incident)',
                }}
              >
                ТИП: {activeBattle.attackCard.exceptionType}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '16px',
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.28)',
                }}
              >
                «{activeBattle.attackCard.statement}»
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Карта от бригады {activeBattle.attacker} ещё не поступила. В режиме
                «Ручной» или для проверки можно загрузить эталонную карту:
              </div>
              <button
                type="button"
                onClick={() => {
                  const ref = REFERENCE_CARDS.find(
                    (c) =>
                      c.battleNumber === activeBattle.number &&
                      c.cardType === 'атака'
                  );
                  if (ref) {
                    dispatch({
                      type: 'SUBMIT_CARD',
                      brigade: activeBattle.attacker,
                      role: 'картёр',
                      cardType: 'атака',
                      file: ref.file,
                      line: ref.line,
                      exceptionType: ref.exceptionType,
                      statement: ref.statement,
                    });
                  }
                }}
                className="instrument-btn btn-incident"
              >
                Подставить эталонную карту атаки ({activeBattle.attacker})
              </button>
            </div>
          )}
        </div>

        <div
          className="material-paper"
          style={{
            padding: '16px 18px',
            borderLeftColor: 'var(--color-stable)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--text-caption)',
              fontWeight: 700,
            }}
          >
            <span>КАРТА ЗАЩИТЫ · БРИГАДА {activeBattle.defender}</span>
            <span>
              СЛОТЫ ПАТЧА:{' '}
              {activeBattle.activeSlots.length
                ? activeBattle.activeSlots.join(', ')
                : 'НЕТ'}
            </span>
          </div>

          {activeBattle.defenseCard ? (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 800 }}>
                СТРОКА: {activeBattle.defenseCard.line} ({activeBattle.defenseCard.file})
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--color-stable)',
                }}
              >
                ОБРАБОТЧИК: {activeBattle.defenseCard.exceptionType} [Слот #
                {activeBattle.defenseCard.patchSlot || '—'}]
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '16px',
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.28)',
                }}
              >
                «{activeBattle.defenseCard.statement}»
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Карта от бригады {activeBattle.defender} ещё не поступила. Можно
                подставить эталонную защиту со слотом патча #{activeBattle.number}:
              </div>
              <button
                type="button"
                onClick={() => {
                  const ref = REFERENCE_CARDS.find(
                    (c) =>
                      c.battleNumber === activeBattle.number &&
                      c.cardType === 'защита'
                  );
                  if (ref) {
                    dispatch({
                      type: 'SUBMIT_CARD',
                      brigade: activeBattle.defender,
                      role: 'картёр',
                      cardType: 'защита',
                      file: ref.file,
                      line: ref.line,
                      exceptionType: ref.exceptionType,
                      statement: ref.statement,
                      patchSlot: ref.patchSlot,
                    });
                  }
                }}
                className="instrument-btn btn-stable"
              >
                Подставить эталонную защиту ({activeBattle.defender})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ЖИВОЙ ЗАПУСК ПОЛИГОНА */}
      <div className="material-armor screw-corners" style={{ padding: '14px 18px' }}>
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
            <div style={{ fontSize: '15px', fontWeight: 800 }}>
              ПРОВЕРКА ЗАПУСКОМ НА ПОЛИГОНЕ «ПАРТЕР» · «Код — единственный судья»
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Выберите активные слоты патча и нажмите «Проверить запуском [Enter]».
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PATCH_SLOTS.map((s) => {
              const active = activeBattle.activeSlots.includes(s.slot);
              return (
                <button
                  key={s.slot}
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: s.slot })
                  }
                  className={`instrument-btn mono ${active ? 'btn-stable' : ''}`}
                >
                  Слот #{s.slot}: {active ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => dispatch({ type: 'RUN_POLYGON' })}
              className="instrument-btn btn-action"
              style={{ fontSize: '15px', padding: '8px 18px' }}
            >
              Проверить запуском [Enter]
            </button>
          </div>
        </div>

        {activeBattle.lastRun && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.38)',
              borderLeft: `4px solid ${
                activeBattle.lastRun.outcome === 'ПРОБИЛА'
                  ? 'var(--color-incident)'
                  : 'var(--color-stable)'
              }`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div className="mono" style={{ fontSize: '14px' }}>
              {activeBattle.lastRun.consoleLog.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
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
        )}
      </div>

      {/* ПОЛЕ ВЕРДИКТА АРБИТРА И ЖУРНАЛА */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60fr 40fr',
          gap: '14px',
        }}
      >
        <div className="material-armor screw-corners" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800 }}>
            ВЫНЕСЕНИЕ ВЕРДИКТА РАУНДА (ОБЪЯВЛЯЕТСЯ АРБИТРОМ СТОЯ)
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={legalAttackBonus}
                onChange={(e) => setLegalAttackBonus(e.target.checked)}
              />
              <span>Легальная атака по коду (+1 {activeBattle.attacker})</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={counterHeldBonus}
                onChange={(e) => setCounterHeldBonus(e.target.checked)}
              />
              <span>Защита выдержала контратаку (+2 {activeBattle.defender})</span>
            </label>
          </div>

          <div>
            <label
              htmlFor="arbiter-journal-input"
              style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--text-caption)',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              СТРОКА ЖУРНАЛА (ОДНА СТРОКА ДЛЯ ПРОТОКОЛА)
            </label>
            <input
              id="arbiter-journal-input"
              type="text"
              value={journalLine}
              onChange={(e) => setJournalLine(e.target.value)}
              className="instrument-btn mono"
              style={{ width: '100%', fontSize: '15px', padding: '8px 12px' }}
            />
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.32)',
              border: '1px solid var(--border-metal)',
              fontSize: '14px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              УСТНАЯ ФОРМУЛА АРБИТРА (ЧИТАТЬ СТОЯ):
            </div>
            <div className="mono" style={{ marginTop: '4px', color: 'var(--color-incident)' }}>
              • При ПРОБИЛА: «{previewFormulaProbed}»
            </div>
            <div className="mono" style={{ marginTop: '4px', color: 'var(--color-stable)' }}>
              • При ОТБИТА: «{previewFormulaRepelled}»
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'SUBMIT_VERDICT',
                  result: 'ПРОБИЛА',
                  legalAttackBonus,
                  counterHeldBonus: false,
                  journalLine,
                })
              }
              className="instrument-btn btn-incident"
              style={{ fontSize: '17px', padding: '10px 22px' }}
            >
              ПРОБИЛА [Y] ({activeBattle.attacker} +{2 + (legalAttackBonus ? 1 : 0)},{' '}
              {activeBattle.arbiter} +1)
            </button>

            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'SUBMIT_VERDICT',
                  result: 'ОТБИТА',
                  legalAttackBonus,
                  counterHeldBonus,
                  journalLine,
                })
              }
              className="instrument-btn btn-stable"
              style={{ fontSize: '17px', padding: '10px 22px' }}
            >
              ОТБИТА [N] ({activeBattle.defender} +{1 + (counterHeldBonus ? 2 : 0)},{' '}
              {activeBattle.arbiter} +1)
            </button>

            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'SUBMIT_VERDICT',
                  result: 'НЕ ПРИНЯТА',
                  legalAttackBonus: false,
                  counterHeldBonus: false,
                  rejectReason,
                  journalLine: `Карта не принята: ${rejectReason}`,
                })
              }
              className="instrument-btn btn-warning"
              style={{ fontSize: '15px', padding: '10px 16px' }}
            >
              НЕ ПРИНЯТА
            </button>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--text-caption)',
                marginBottom: '4px',
              }}
            >
              Причина для статуса «НЕ ПРИНЯТА» (раздел 11 Регламента):
            </label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="instrument-btn"
              style={{ width: '100%' }}
            >
              <option value="Атака не указывает номер строки кода">
                Атака не указывает номер строки кода
              </option>
              <option value="Тип исключения не назван точно («Ошибка» — не тип)">
                Тип исключения не назван точно («Ошибка» — не тип)
              </option>
              <option value="Атака «по условиям задачи», а не по коду">
                Атака «по условиям задачи», а не по коду
              </option>
              <option value="Защита «мы бы поставили try» без патча и запуска">
                Защита «мы бы поставили try» без патча и запуска
              </option>
              <option value="Бригада не уложилась в таймер такта">
                Бригада не уложилась в таймер такта
              </option>
            </select>
          </div>
        </div>

        {/* БЛОК «НАЙТИ ПРОПУСК» (+1 ОЧКО АРБИТРУ, КЛАВИША Q) */}
        <div
          className="material-paper"
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
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
              ОСОБОЕ ПРАВО АРБИТРА ({activeBattle.arbiter}) · КЛАВИША [Q]
            </div>
            <div style={{ fontSize: '19px', fontWeight: 900, marginTop: '4px' }}>
              Найти пропуск обеих сторон (+1 очко)
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
              }}
            >
              «Арбитр получает дополнительное очко не за "правильный" вердикт, а за
              найденный пропуск: уязвимое место или инженерное улучшение, которое обе
              стороны не заметили.»
            </div>

            <textarea
              rows={3}
              value={missedSpotNote}
              onChange={(e) => setMissedSpotNote(e.target.value)}
              className="instrument-btn mono"
              style={{
                width: '100%',
                marginTop: '10px',
                fontSize: '14px',
                padding: '8px 10px',
              }}
            />

            <div style={{ marginTop: '10px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  marginBottom: '4px',
                }}
              >
                Формулировка для Стоп-крана на спорной карте:
              </label>
              <input
                type="text"
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                className="instrument-btn mono"
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={activeBattle.missedSpotAwarded}
            onClick={() =>
              dispatch({ type: 'AWARD_MISSED_SPOT', note: missedSpotNote })
            }
            className="instrument-btn btn-warning"
            style={{ fontSize: '15px', padding: '10px 16px', width: '100%', justifyContent: 'center' }}
          >
            {activeBattle.missedSpotAwarded
              ? `Пропуск зафиксирован (+1 бригаде ${activeBattle.arbiter})`
              : `Зафиксировать пропуск [Q] (+1 бригаде ${activeBattle.arbiter})`}
          </button>
        </div>
      </div>
    </div>
  );
};
