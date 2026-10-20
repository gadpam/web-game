import React, { useEffect, useState } from 'react';
import {
  BATTLE_TACTS,
  KNOWN_EXCEPTION_TYPES,
  MEMBER_ROLES,
  PATCH_SLOTS,
  POLYGON_FILES,
  REFERENCE_CARDS,
} from '../game/constants';
import { validateCardInput } from '../game/engine';
import { GameAction } from '../game/reducer';
import {
  BrigadeId,
  MemberRole,
  PolygonFileId,
  SessionState,
} from '../types/game';

interface BrigadeClientProps {
  state: SessionState;
  activeBrigade: BrigadeId;
  setActiveBrigade: (b: BrigadeId) => void;
  activeRole: MemberRole;
  setActiveRole: (r: MemberRole) => void;
  dispatch: (action: GameAction) => void;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const BrigadeClient: React.FC<BrigadeClientProps> = ({
  state,
  activeBrigade,
  setActiveBrigade,
  activeRole,
  setActiveRole,
  dispatch,
}) => {
  const activeBattle = state.battles[state.currentBattleNumber];
  const brigadeObj = state.brigades[activeBrigade];
  const roleMeta =
    MEMBER_ROLES.find((r) => r.role === activeRole) || MEMBER_ROLES[0];
  const tactMeta =
    BATTLE_TACTS.find((t) => t.id === activeBattle.tact) || BATTLE_TACTS[0];

  const defaultCardType: 'атака' | 'защита' | 'контратака' =
    brigadeObj.battleRole === 'ЗАЩИТА' ? 'защита' : 'атака';

  const [cardType, setCardType] = useState<'атака' | 'защита' | 'контратака'>(
    defaultCardType
  );
  const [file, setFile] = useState<PolygonFileId>(activeBattle.defaultFile);
  const [line, setLine] = useState<number>(activeBattle.targetLine);
  const [exceptionType, setExceptionType] = useState<string>(
    activeBattle.targetException
  );
  const [statement, setStatement] = useState<string>('');
  const [patchSlot, setPatchSlot] = useState<1 | 2 | 3 | 4 | undefined>(
    activeBattle.number
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittedInTactKey, setSubmittedInTactKey] = useState<string | null>(
    null
  );
  const [localDimOverride, setLocalDimOverride] = useState(false);

  // Поля журнала для Писаря
  const [scribeClaimed, setScribeClaimed] = useState('');
  const [scribeVerified, setScribeVerified] = useState('');
  const [scribeResult, setScribeResult] = useState('ОТБИТА');

  useEffect(() => {
    setFile(activeBattle.defaultFile);
    setLine(activeBattle.targetLine);
    setExceptionType(activeBattle.targetException);
    setCardType(brigadeObj.battleRole === 'ЗАЩИТА' ? 'защита' : 'атака');
    setPatchSlot(activeBattle.number);
    setValidationError(null);
  }, [
    activeBattle.number,
    activeBattle.defaultFile,
    activeBattle.targetLine,
    activeBattle.targetException,
    brigadeObj.battleRole,
  ]);

  const currentTactLockKey = `${activeBattle.number}-${activeBattle.tact}-${activeBrigade}-${cardType}`;
  const isLockedAfterSend = submittedInTactKey === currentTactLockKey;

  const handleFillReference = (type: 'атака' | 'защита' | 'контратака') => {
    const ref = REFERENCE_CARDS.find(
      (c) => c.battleNumber === activeBattle.number && c.cardType === type
    );
    if (!ref) return;
    setCardType(type);
    setFile(ref.file);
    setLine(ref.line);
    setExceptionType(ref.exceptionType);
    setStatement(ref.statement);
    if (ref.patchSlot) setPatchSlot(ref.patchSlot);
    setValidationError(null);
  };

  const handleSubmitCard = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateCardInput({
      line,
      exceptionType,
      statement,
    });
    if (!check.valid) {
      setValidationError(check.reason || 'Карта не прошла проверку регламента');
      return;
    }
    setValidationError(null);
    dispatch({
      type: 'SUBMIT_CARD',
      brigade: activeBrigade,
      role: activeRole,
      cardType,
      file,
      line,
      exceptionType,
      statement,
      patchSlot: cardType === 'защита' ? patchSlot : undefined,
    });
    setSubmittedInTactKey(currentTactLockKey);
  };

  const handleAddScribeEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scribeClaimed.trim()) return;
    dispatch({
      type: 'ADD_JOURNAL_ENTRY',
      actor: `Писарь (${activeBrigade})`,
      claimed: scribeClaimed,
      verified: scribeVerified,
      result: scribeResult,
    });
    setScribeClaimed('');
    setScribeVerified('');
  };

  const latestCardForBrigade =
    cardType === 'защита'
      ? activeBattle.defenseCard
      : cardType === 'контратака'
      ? activeBattle.counterCard
      : activeBattle.attackCard;

  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Экран затемнения при докладе стоя (решение проблемы «18 спин за ноутбуками») */}
      {state.screensDimmedForStandingReport && !localDimOverride && (
        <div
          className="material-armor"
          style={{
            padding: '18px 22px',
            borderLeft: '6px solid var(--color-warning)',
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
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--color-warning)',
              }}
            >
              ВНИМАНИЕ НА СЦЕНУ · ДОКЛАД И ВЕРДИКТ ОБЪЯВЛЯЮТСЯ СТОЯ У ЭКРАНА
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              Сейчас идёт такт «{tactMeta.title}». Докладчик и Арбитр работают стоя у
              большого экрана, ноутбуки бригад приглушены.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocalDimOverride(true)}
            className="instrument-btn"
          >
            Открыть рабочее поле роли
          </button>
        </div>
      )}

      {/* ВЕРХНЯЯ ПАНЕЛЬ КЛИЕНТА БРИГАДЫ: Бригада, Роль, Таймер такта */}
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
          <span style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
            БРИГАДА:
          </span>
          {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
            const b = state.brigades[bId];
            const selected = activeBrigade === bId;
            return (
              <button
                key={bId}
                type="button"
                onClick={() => setActiveBrigade(bId)}
                className={`instrument-btn ${selected ? 'btn-action' : ''}`}
              >
                <span style={{ fontSize: '16px' }}>{b.shapeSymbol}</span>
                <span>{b.name}</span>
                <span
                  className="mono"
                  style={{ fontSize: '13px', color: 'var(--color-warning)' }}
                >
                  [{b.battleRole}]
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
            РОЛЬ В БРИГАДЕ (1 ЧЕЛОВЕК = 1 РОЛЬ):
          </span>
          {MEMBER_ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setActiveRole(r.role)}
              className={`instrument-btn ${activeRole === r.role ? 'btn-warning' : ''}`}
              style={{ fontSize: '13px', padding: '5px 10px' }}
            >
              {r.title}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
              БОЙ {activeBattle.number} · {tactMeta.title.toUpperCase()}
            </div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 700 }}>
              Очки {activeBrigade}: {brigadeObj.score}
            </div>
          </div>
          <div
            className={`seven-segment-window ${
              activeBattle.tactRemainingSec <= 15 ? 'red-zone' : ''
            }`}
            style={{ fontSize: '26px', padding: '4px 12px' }}
          >
            {formatSec(activeBattle.tactRemainingSec)}
          </div>
        </div>
      </div>

      {/* Памятка выбранной роли */}
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
            className="mono"
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--color-warning)',
              textTransform: 'uppercase',
            }}
          >
            РОЛЬ: {roleMeta.title} ({roleMeta.posture})
          </span>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
            {roleMeta.duty}
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Правило регламента: {roleMeta.ruleNote}
        </div>
      </div>

      {/* ОСНОВНАЯ СЕТКА КЛИЕНТА: ЦЕНТР (Поле карты + Ролевой инструмент) и ПРАВО (История боя и код) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56fr 44fr',
          gap: '14px',
        }}
      >
        {/* ================= ЦЕНТР: ПОЛЕ КАРТЫ (Шаблон из Документа 07, п. 1) ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <form
            onSubmit={handleSubmitCard}
            className="material-paper"
            style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* Шапка бланка карты строго по шаблону 07 · Материалы смены */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid var(--border-metal)',
                paddingBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div className="mono" style={{ fontSize: '18px', fontWeight: 900 }}>
                БРИГАДА {brigadeObj.shapeSymbol} {activeBrigade} · РОЛЬ В БОЮ:{' '}
                <span style={{ color: 'var(--color-warning)' }}>
                  {brigadeObj.battleRole}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleFillReference('атака')}
                  className="instrument-btn"
                  style={{ fontSize: '13px' }}
                >
                  Эталон атаки (Бой {activeBattle.number})
                </button>
                <button
                  type="button"
                  onClick={() => handleFillReference('защита')}
                  className="instrument-btn"
                  style={{ fontSize: '13px' }}
                >
                  Эталон защиты (Бой {activeBattle.number})
                </button>
                <button
                  type="button"
                  onClick={() => handleFillReference('контратака')}
                  className="instrument-btn"
                  style={{ fontSize: '13px' }}
                >
                  Эталон контратаки
                </button>
              </div>
            </div>

            {/* Выбор типа хода: Атака / Защита / Контратака + Файл */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--text-caption)',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  ТИП ХОДА КАРТЫ
                </label>
                <select
                  value={cardType}
                  onChange={(e) =>
                    setCardType(
                      e.target.value as 'атака' | 'защита' | 'контратака'
                    )
                  }
                  className="instrument-btn mono"
                  style={{ width: '100%', fontSize: '15px' }}
                >
                  <option value="атака">Карта атаки</option>
                  <option value="защита">Карта защиты (с патчем)</option>
                  <option value="контратака">Карта контратаки (один ход)</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--text-caption)',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  ФАЙЛ ПОЛИГОНА
                </label>
                <select
                  value={file}
                  onChange={(e) => setFile(e.target.value as PolygonFileId)}
                  className="instrument-btn mono"
                  style={{ width: '100%', fontSize: '15px' }}
                >
                  {(Object.keys(POLYGON_FILES) as PolygonFileId[]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ПОЛЕ 1 и ПОЛЕ 2 БЛАНКА КАРТЫ: СТРОКА и ТИП */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: '12px',
              }}
            >
              <div>
                <label
                  htmlFor="card-line-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--text-caption)',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  1. СТРОКА (ОБЯЗ.)
                </label>
                <input
                  id="card-line-input"
                  type="number"
                  min={1}
                  max={99}
                  value={line}
                  onChange={(e) => setLine(Number(e.target.value))}
                  disabled={isLockedAfterSend}
                  className="instrument-btn mono"
                  style={{
                    width: '100%',
                    fontSize: '20px',
                    fontWeight: 800,
                    padding: '6px 10px',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="card-type-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--text-caption)',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  2. ТИП ИСКЛЮЧЕНИЯ / МЕХАНИЗМ (ТОЧНОЕ ИМЯ)
                </label>
                <input
                  id="card-type-input"
                  type="text"
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value)}
                  disabled={isLockedAfterSend}
                  placeholder="Напр.: FormatException, DivideByZeroException, CS0160"
                  className="instrument-btn mono"
                  style={{
                    width: '100%',
                    fontSize: '17px',
                    fontWeight: 700,
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Быстрые чипы точных типов */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {KNOWN_EXCEPTION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isLockedAfterSend}
                  onClick={() => setExceptionType(t)}
                  className="instrument-btn mono"
                  style={{ fontSize: '13px', padding: '3px 8px' }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ПОЛЕ 3 БЛАНКА КАРТЫ: УТВЕРЖДЕНИЕ (одна мысль, без рассуждений) */}
            <div>
              <label
                htmlFor="card-statement-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                3. УТВЕРЖДЕНИЕ (ОДНО УТВЕРЖДЕНИЕ ПО КОДУ, БЕЗ ЛИШНИХ СЛОВ)
              </label>
              <textarea
                id="card-statement-input"
                rows={3}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                disabled={isLockedAfterSend}
                placeholder='Напр.: «Строка 12 разбирает place через int.Parse, place приходит из запроса без проверки»'
                className="instrument-btn mono"
                style={{
                  width: '100%',
                  fontSize: '16px',
                  padding: '10px 12px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Выбор слота патча для карты защиты */}
            {cardType === 'защита' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--text-caption)',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  ПРИКРЕПЛЁННЫЙ СЛОТ ПАТЧА НА ПОЛИГОНЕ (ЗАЩИТА ПРОВЕРЯЕТСЯ ЗАПУСКОМ)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {PATCH_SLOTS.map((s) => (
                    <button
                      key={s.slot}
                      type="button"
                      disabled={isLockedAfterSend}
                      onClick={() => setPatchSlot(s.slot)}
                      className={`instrument-btn mono ${
                        patchSlot === s.slot ? 'btn-stable' : ''
                      }`}
                      style={{ fontSize: '13px', justifyContent: 'flex-start' }}
                    >
                      Слот #{s.slot}: {s.shortName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ошибка валидации правил формулировки (Раздел 5 Документа 01) */}
            {validationError && (
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 93, 93, 0.16)',
                  borderLeft: '4px solid var(--color-incident)',
                  color: 'var(--color-incident)',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {validationError}
              </div>
            )}

            {/* Подвал карты: [ ОТПРАВИТЬ ] и остаток времени такта */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-metal)',
                paddingTop: '10px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={isLockedAfterSend}
                  className="instrument-btn btn-action"
                  style={{ fontSize: '16px', padding: '10px 22px' }}
                >
                  {isLockedAfterSend ? 'КАРТА ОТПРАВЛЕНА (ЗАБЛОКИРОВАНО)' : '[ ОТПРАВИТЬ КАРТУ ]'}
                </button>
                {isLockedAfterSend && (
                  <button
                    type="button"
                    onClick={() => setSubmittedInTactKey(null)}
                    className="instrument-btn"
                    style={{ fontSize: '13px' }}
                  >
                    Новый такт / Разблокировать
                  </button>
                )}
              </div>

              <span className="mono" style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                осталось {formatSec(activeBattle.tactRemainingSec)}
              </span>
            </div>
          </form>

          {/* Блок для Чтеца и Докладчика: Дословное оглашение и Апелляция */}
          <div className="material-armor" style={{ padding: '14px 16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                }}
              >
                КАРТОЧКА ЧТЕЦА И ДОКЛАДЧИКА (ЧИТАТЬ ДОСЛОВНО, СТОЯ У ЭКРАНА)
              </span>
              <button
                type="button"
                disabled={activeBattle.appealUsed}
                onClick={() => dispatch({ type: 'START_APPEAL' })}
                className="instrument-btn btn-warning"
                style={{ fontSize: '13px' }}
              >
                {activeBattle.appealUsed
                  ? `Апелляция подана (${activeBattle.appealRemainingSec} с)`
                  : 'Подать апелляцию (30 сек, 1 на бой)'}
              </button>
            </div>

            <div
              className="mono"
              style={{
                fontSize: '19px',
                fontWeight: 800,
                marginTop: '8px',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.35)',
                borderLeft: '4px solid var(--color-action)',
              }}
            >
              {latestCardForBrigade ? (
                <>
                  «Бригада {latestCardForBrigade.authorBrigade}. Ход:{' '}
                  {latestCardForBrigade.cardType}. Файл {latestCardForBrigade.file},
                  строка {latestCardForBrigade.line}, тип{' '}
                  {latestCardForBrigade.exceptionType}.{' '}
                  {latestCardForBrigade.statement}»
                </>
              ) : (
                `«Атакуем строку ${line} файла ${file}, тип ${exceptionType}. ${
                  statement || 'Утверждение формируется картёром...'
                }»`
              )}
            </div>
          </div>

          {/* Рабочее место Писаря: ведение Журнала смены */}
          <form
            onSubmit={handleAddScribeEntry}
            className="material-armor"
            style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              ПУЛЬТ ПИСАРЯ БРИГАДЫ ({activeBrigade}) · ЗАПИСЬ В ЖУРНАЛ СМЕНЫ
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 130px auto',
                gap: '8px',
              }}
            >
              <input
                type="text"
                value={scribeClaimed}
                onChange={(e) => setScribeClaimed(e.target.value)}
                placeholder="Что заявлено (строка, тип)"
                className="instrument-btn mono"
              />
              <input
                type="text"
                value={scribeVerified}
                onChange={(e) => setScribeVerified(e.target.value)}
                placeholder="Что проверено запуском"
                className="instrument-btn mono"
              />
              <select
                value={scribeResult}
                onChange={(e) => setScribeResult(e.target.value)}
                className="instrument-btn mono"
              >
                <option value="ПРОБИЛА">ПРОБИЛА</option>
                <option value="ОТБИТА">ОТБИТА</option>
                <option value="+1 ПРОПУСК">+1 ПРОПУСК</option>
              </select>
              <button type="submit" className="instrument-btn btn-stable">
                Записать
              </button>
            </div>
          </form>
        </div>

        {/* ================= ПРАВАЯ КОЛОНКА: ИСТОРИЯ БОЯ, ВЕРДИКТ И КОД ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Статус вердикта и отправленных карт текущего боя */}
          <div className="material-armor screw-corners" style={{ padding: '14px 16px' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                marginBottom: '10px',
                letterSpacing: '0.05em',
              }}
            >
              ИСТОРИЯ БОЯ {activeBattle.number} «{activeBattle.codeName.toUpperCase()}»
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  borderLeft: '3px solid var(--color-incident)',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                  КАРТА АТАКИ ({activeBattle.attacker}):
                </div>
                {activeBattle.attackCard ? (
                  <div className="mono" style={{ fontSize: '15px', marginTop: '4px' }}>
                    <strong>
                      {activeBattle.attackCard.file}:{activeBattle.attackCard.line} ·{' '}
                      {activeBattle.attackCard.exceptionType}
                    </strong>{' '}
                    — {activeBattle.attackCard.statement}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Ещё не отправлена
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  borderLeft: '3px solid var(--color-stable)',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                  КАРТА ЗАЩИТЫ ({activeBattle.defender}):
                </div>
                {activeBattle.defenseCard ? (
                  <div className="mono" style={{ fontSize: '15px', marginTop: '4px' }}>
                    <strong>
                      {activeBattle.defenseCard.file}:{activeBattle.defenseCard.line} ·{' '}
                      {activeBattle.defenseCard.exceptionType} [Слот #
                      {activeBattle.defenseCard.patchSlot || '—'}]
                    </strong>{' '}
                    — {activeBattle.defenseCard.statement}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Ещё не отправлена
                  </div>
                )}
              </div>

              {activeBattle.verdict && (
                <div
                  className="material-paper gesture-card-drop"
                  style={{
                    padding: '12px 14px',
                    borderLeftColor:
                      activeBattle.verdict.result === 'ПРОБИЛА'
                        ? 'var(--color-incident)'
                        : 'var(--color-stable)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                      ВЕРДИКТ АРБИТРА ({activeBattle.arbiter}):
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '18px',
                        fontWeight: 900,
                        color:
                          activeBattle.verdict.result === 'ПРОБИЛА'
                            ? 'var(--color-incident)'
                            : 'var(--color-stable)',
                      }}
                    >
                      {activeBattle.verdict.result}
                    </span>
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '14px', marginTop: '6px' }}
                  >
                    «{activeBattle.verdict.oralFormula}»
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Справочный код активного файла для Аналитика и Картёра */}
          <div className="material-screen" style={{ padding: '12px 14px' }}>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-caption)',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              КОД ФАЙЛА {file} (НАЖМИТЕ НА СТРОКУ ДЛЯ ПОДСТАНОВКИ В КАРТУ)
            </div>
            {POLYGON_FILES[file].lines.map((l) => (
              <div
                key={l.line}
                onClick={() => {
                  if (!isLockedAfterSend) {
                    setLine(l.line);
                    if (l.exceptionHint) setExceptionType(l.exceptionHint);
                  }
                }}
                className={`code-line-row ${line === l.line ? 'selected-line' : ''} ${
                  l.vulnerable ? 'vulnerable-line' : ''
                }`}
                style={{ fontSize: '16px' }}
              >
                <span
                  style={{
                    width: '36px',
                    color: 'var(--text-caption)',
                    textAlign: 'right',
                    paddingRight: '10px',
                  }}
                >
                  {l.line}
                </span>
                <span style={{ whiteSpace: 'pre' }}>{l.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
