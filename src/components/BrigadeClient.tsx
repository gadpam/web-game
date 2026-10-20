import React, { useState } from 'react';
import {
  MEMBER_ROLES,
  PATCH_SLOTS,
  REFERENCE_CARDS,
} from '../game/constants';
import { validateCardInput } from '../game/engine';
import { GameAction } from '../game/reducer';
import { getWorldPolygonFiles } from '../game/worldPolygons';
import {
  BrigadeId,
  MemberRole,
  PolygonFileId,
  SessionState,
} from '../types/game';
import { PracticeWorkbench } from './PracticeWorkbench';

type CardType = 'атака' | 'защита' | 'контратака';

interface BrigadeClientProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  activeBrigade: BrigadeId;
  activeRole: MemberRole;
  onSelectBrigade: (b: BrigadeId) => void;
  onSelectRole: (r: MemberRole) => void;
}

const EXCEPTION_OPTIONS = [
  'FormatException',
  'DivideByZeroException',
  'IndexOutOfRangeException',
  'NullReferenceException',
  'ArgumentNullException',
  'OverflowException',
  'InvalidOperationException',
  'TicketBookingException',
  'System.Exception',
];

export const BrigadeClient: React.FC<BrigadeClientProps> = ({
  state,
  dispatch,
  activeBrigade,
  activeRole,
  onSelectBrigade,
  onSelectRole,
}) => {
  const activeBattle = state.battles[state.currentBattleNumber];
  const brigadeObj = state.brigades[activeBrigade];
  const roleMeta =
    MEMBER_ROLES.find((r) => r.role === activeRole) || MEMBER_ROLES[0];
  const worldPolygonFiles = getWorldPolygonFiles(state.world);

  const defaultCardType: CardType =
    brigadeObj.battleRole === 'ЗАЩИТА' ? 'защита' : 'атака';

  const [cardType, setCardType] = useState<CardType>(defaultCardType);
  const [lineInput, setLineInput] = useState<number>(activeBattle.targetLine);
  const [exceptionInput, setExceptionInput] = useState<string>(
    activeBattle.targetException
  );
  const [statementInput, setStatementInput] = useState<string>(
    defaultCardType === 'атака'
      ? `На строке ${activeBattle.targetLine} при входных данных пакета возникнет ${activeBattle.targetException}`
      : `Оборачиваем опасный участок в try-catch (${activeBattle.targetException}) с записью в отчёт`
  );
  const [patchSlotInput, setPatchSlotInput] = useState<1 | 2 | 3 | 4>(
    activeBattle.number
  );
  const [feedback, setFeedback] = useState<{
    valid: boolean;
    reason?: string;
  } | null>(null);
  const [showPracticeTab, setShowPracticeTab] = useState(false);

  const currentFileSpec = worldPolygonFiles[state.selectedPolygonFile];

  const handleLoadReference = () => {
    const ref = REFERENCE_CARDS.find(
      (c) =>
        c.battleNumber === activeBattle.number && c.cardType === cardType
    );
    if (!ref) return;
    dispatch({ type: 'SELECT_POLYGON_FILE', file: ref.file });
    setLineInput(ref.line);
    setExceptionInput(ref.exceptionType);
    setStatementInput(ref.statement);
    if (ref.patchSlot) {
      setPatchSlotInput(ref.patchSlot);
    }
    setFeedback({
      valid: true,
      reason: 'Загружен эталонный образец из комплекта материалов (Документ 07).',
    });
  };

  const handleSubmitCard = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateCardInput({
      line: lineInput,
      exceptionType: exceptionInput,
      statement: statementInput,
    });
    setFeedback(check);
    dispatch({
      type: 'SUBMIT_CARD',
      brigade: activeBrigade,
      role: activeRole,
      cardType,
      file: state.selectedPolygonFile,
      line: lineInput,
      exceptionType: exceptionInput,
      statement: statementInput,
      patchSlot: cardType === 'защита' ? patchSlotInput : undefined,
    });
  };

  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Верхняя полоса выбора бригады и роли (6 ролей по Регламенту) */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-caption)',
              fontWeight: 700,
            }}
          >
            БРИГАДА (ФОРМА):
          </span>
          {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
            const b = state.brigades[bId];
            const selected = activeBrigade === bId;
            return (
              <button
                key={bId}
                type="button"
                onClick={() => {
                  onSelectBrigade(bId);
                  setCardType(
                    state.brigades[bId].battleRole === 'ЗАЩИТА'
                      ? 'защита'
                      : 'атака'
                  );
                }}
                className={`instrument-btn ${selected ? 'btn-action' : ''}`}
              >
                <span>{b.shapeSymbol}</span>
                <span>{b.name}</span>
                <span className="mono" style={{ fontSize: '13px' }}>
                  ({b.battleRole} · {b.score} очк.)
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-caption)',
              fontWeight: 700,
            }}
          >
            ВАША РОЛЬ В БРИГАДЕ:
          </span>
          {MEMBER_ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => onSelectRole(r.role)}
              className={`instrument-btn ${
                activeRole === r.role ? 'btn-warning' : ''
              }`}
              title={r.duty}
            >
              {r.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPracticeTab((prev) => !prev)}
            className={`instrument-btn ${
              showPracticeTab || state.phase === 'practice' ? 'btn-stable' : ''
            }`}
          >
            {showPracticeTab ? '← К бою и карте' : '08:05 Конструктор патча'}
          </button>
        </div>
      </div>

      {/* Инструкция для выбранной роли */}
      <div
        className="material-paper"
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
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-caption)',
              fontWeight: 700,
            }}
          >
            ОБЯЗАННОСТЬ РОЛИ «{roleMeta.title.toUpperCase()}» ({brigadeObj.shapeSymbol}{' '}
            {brigadeObj.name}):
          </span>{' '}
          <span style={{ fontSize: '15px', fontWeight: 700 }}>
            {roleMeta.duty}
          </span>
        </div>
        <div className="mono" style={{ fontSize: '14px', color: 'var(--color-warning)' }}>
          Бой {activeBattle.number} «{activeBattle.codeName}» · Вы в роли:{' '}
          <strong>{brigadeObj.battleRole}</strong>
        </div>
      </div>

      {showPracticeTab || state.phase === 'practice' ? (
        <PracticeWorkbench state={state} dispatch={dispatch} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44fr 56fr',
            gap: '16px',
          }}
        >
          {/* ЛЕВАЯ КОЛОНКА: БЛАНК КАРТЫ АТАКИ / ЗАЩИТЫ (ровно 3 поля) */}
          <form
            onSubmit={handleSubmitCard}
            className="material-paper"
            style={{
              padding: '16px 18px',
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
                gap: '8px',
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
                  БЛАНК КАРТЫ · РОВНО 3 ПОЛЯ (ДОКУМЕНТ 01, П. 6)
                </div>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '22px', fontWeight: 900 }}>
                  {cardType === 'атака' ? 'КАРТА АТАКИ' : 'КАРТА ЗАЩИТЫ'} · БРИГАДА{' '}
                  {brigadeObj.shapeSymbol} {brigadeObj.name}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCardType('атака')}
                  className={`instrument-btn ${
                    cardType === 'атака' ? 'btn-incident' : ''
                  }`}
                >
                  Атака
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('защита')}
                  className={`instrument-btn ${
                    cardType === 'защита' ? 'btn-stable' : ''
                  }`}
                >
                  Защита
                </button>
                <button
                  type="button"
                  onClick={handleLoadReference}
                  className="instrument-btn btn-warning"
                  title="Заполнить эталонной картой текущего боя"
                >
                  Образец Боя {activeBattle.number}
                </button>
              </div>
            </div>

            {/* ПОЛЕ 1: НОМЕР СТРОКИ КОДА */}
            <div>
              <label
                htmlFor="card-line-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--text-caption)',
                  marginBottom: '4px',
                }}
              >
                ПОЛЕ 1. НОМЕР СТРОКИ КОДА (В ФАЙЛЕ {state.selectedPolygonFile}):
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="card-line-input"
                  type="number"
                  min={1}
                  max={70}
                  value={lineInput}
                  onChange={(e) => setLineInput(Number(e.target.value))}
                  className="instrument-btn mono"
                  style={{
                    width: '110px',
                    fontSize: '18px',
                    fontWeight: 800,
                    padding: '8px 12px',
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Совет: кликните по строке в коде справа, чтобы подставить её номер
                </span>
              </div>
            </div>

            {/* ПОЛЕ 2: ТОЧНЫЙ ТИП ИСКЛЮЧЕНИЯ */}
            <div>
              <label
                htmlFor="card-exception-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--text-caption)',
                  marginBottom: '4px',
                }}
              >
                ПОЛЕ 2. ТОЧНЫЙ ТИП ИСКЛЮЧЕНИЯ C# («Ошибка» или «Сбой» не принимаются):
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  id="card-exception-input"
                  value={exceptionInput}
                  onChange={(e) => setExceptionInput(e.target.value)}
                  className="instrument-btn mono"
                  style={{ flex: 1, fontSize: '16px', padding: '8px 10px' }}
                >
                  {EXCEPTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={exceptionInput}
                  onChange={(e) => setExceptionInput(e.target.value)}
                  placeholder="Или введите тип вручную"
                  className="instrument-btn mono"
                  style={{ width: '210px', fontSize: '14px' }}
                />
              </div>
            </div>

            {cardType === 'защита' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: 'var(--text-caption)',
                    marginBottom: '4px',
                  }}
                >
                  ВЫБЕРИТЕ СЛОТ ПАТЧА (АКТИВИРУЕТСЯ НА ПОЛИГОНЕ):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {PATCH_SLOTS.map((s) => (
                    <button
                      key={s.slot}
                      type="button"
                      onClick={() => setPatchSlotInput(s.slot)}
                      className={`instrument-btn mono ${
                        patchSlotInput === s.slot ? 'btn-stable' : ''
                      }`}
                      style={{ justifyContent: 'flex-start', fontSize: '13px' }}
                    >
                      #{s.slot}: {s.shortName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ПОЛЕ 3: ОДНО УТВЕРЖДЕНИЕ */}
            <div>
              <label
                htmlFor="card-statement-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--text-caption)',
                  marginBottom: '4px',
                }}
              >
                ПОЛЕ 3. ОДНО УТВЕРЖДЕНИЕ (УСЛОВИЕ ПАДЕНИЯ ИЛИ ДЕЙСТВИЕ ОБРАБОТЧИКА):
              </label>
              <textarea
                id="card-statement-input"
                rows={3}
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
                className="instrument-btn mono"
                style={{
                  width: '100%',
                  fontSize: '15px',
                  padding: '10px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                marginTop: '4px',
              }}
            >
              <button
                type="submit"
                className={`instrument-btn ${
                  cardType === 'атака' ? 'btn-incident' : 'btn-stable'
                }`}
                style={{ fontSize: '16px', padding: '10px 20px', flex: 1 }}
              >
                ОТПРАВИТЬ КАРТУ В ПРОТОКОЛ БОЯ {activeBattle.number}
              </button>
            </div>

            {feedback && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '2px',
                  background: feedback.valid
                    ? 'rgba(53, 208, 160, 0.16)'
                    : 'rgba(255, 93, 93, 0.18)',
                  borderLeft: `4px solid ${
                    feedback.valid ? 'var(--color-stable)' : 'var(--color-incident)'
                  }`,
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {feedback.valid
                  ? feedback.reason ||
                    'Карта принята по Регламенту и выведена на экран зала и арбитра.'
                  : `КАРТА НЕ ПРИНЯТА: ${feedback.reason}`}
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid var(--border-metal)',
                paddingTop: '10px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                ТЕКУЩИЕ КАРТЫ НА СТОЛЕ БОЯ {activeBattle.number}:
              </div>
              <div>
                • Атака ({activeBattle.attacker}):{' '}
                {activeBattle.attackCard ? (
                  <span className="mono" style={{ color: 'var(--color-incident)' }}>
                    стр. {activeBattle.attackCard.line} ·{' '}
                    {activeBattle.attackCard.exceptionType} — «
                    {activeBattle.attackCard.statement}»
                  </span>
                ) : (
                  'ещё не подана'
                )}
              </div>
              <div style={{ marginTop: '3px' }}>
                • Защита ({activeBattle.defender}):{' '}
                {activeBattle.defenseCard ? (
                  <span className="mono" style={{ color: 'var(--color-stable)' }}>
                    стр. {activeBattle.defenseCard.line} ·{' '}
                    {activeBattle.defenseCard.exceptionType} [слот #
                    {activeBattle.defenseCard.patchSlot || '—'}] — «
                    {activeBattle.defenseCard.statement}»
                  </span>
                ) : (
                  'ещё не подана'
                )}
              </div>
            </div>
          </form>

          {/* ПРАВАЯ КОЛОНКА: ПОЛИГОН КОДА И 4 СЛОТА ПАТЧЕЙ */}
          <div
            className="material-screen"
            style={{
              padding: '14px 16px',
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
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(Object.keys(worldPolygonFiles) as PolygonFileId[]).map((fId) => (
                  <button
                    key={fId}
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'SELECT_POLYGON_FILE', file: fId })
                    }
                    className={`instrument-btn mono ${
                      state.selectedPolygonFile === fId ? 'btn-action' : ''
                    }`}
                  >
                    {fId}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => dispatch({ type: 'RUN_POLYGON' })}
                className="instrument-btn btn-action"
              >
                Проверить запуском [Enter]
              </button>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.46)',
                border: '1px solid var(--border-metal)',
                padding: '8px 0',
                overflowX: 'auto',
              }}
            >
              {currentFileSpec.lines.map((lineObj) => {
                const isSelected = lineInput === lineObj.line;
                return (
                  <div
                    key={lineObj.line}
                    className={`code-line-row ${
                      isSelected ? 'selected-line' : ''
                    } ${lineObj.vulnerable ? 'vulnerable-line' : ''}`}
                    style={{ fontSize: '20px' }}
                    onClick={() => {
                      setLineInput(lineObj.line);
                      dispatch({ type: 'SELECT_LINE', line: lineObj.line });
                    }}
                  >
                    <span
                      style={{
                        width: '42px',
                        textAlign: 'right',
                        paddingRight: '12px',
                        color: 'var(--text-caption)',
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
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
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
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
                        marginTop: '2px',
                      }}
                    >
                      {slot.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeBattle.lastRun && (
              <div
                className="material-paper"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div className="mono" style={{ fontSize: '13px' }}>
                  {activeBattle.lastRun.consoleLog.map((l, idx) => (
                    <div key={idx}>{l}</div>
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
        </div>
      )}
    </div>
  );
};
