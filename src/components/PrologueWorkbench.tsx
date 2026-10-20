import React, { useState } from 'react';
import { PROLOGUE_MINES, PROLOGUE_SECOND_WAVE_LOGS } from '../game/constants';
import { GameAction } from '../game/reducer';
import { getWorldPrologueLogs } from '../game/worldPolygons';
import {
  BrigadeId,
  MechanismDutyId,
  PhaseId,
  PrologueVoteOption,
  SessionState,
} from '../types/game';

interface PrologueWorkbenchProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  activeBrigade: BrigadeId;
  onExitToBattleCard?: () => void;
}

const VOTE_LABELS: Record<PrologueVoteOption, string> = {
  broken: '«сервис сломался»',
  intrusion: '«в сервис вошли»',
  dataLost: '«данные потеряны»',
};

const MECHANISM_DUTY_OPTIONS: { id: MechanismDutyId; label: string }[] = [
  { id: 'zone', label: 'Очерчивает опасную зону обработки одной записи' },
  { id: 'catch_type', label: 'Ловит конкретный тип и пишет в отчёт без остановки пакета' },
  { id: 'cleanup_always', label: 'Убирает за собой (закрывает соединение) — всегда' },
];

const BRIDGE_TO_BATTLES = [
  {
    happens: 'Одна защита сработала — только от одного типа (FormatException)',
    follows: 'Один catch не защищает от класса атак («Мы справились» — ловушка)',
    battle: 'Бой 1 · Перехват (Booking.cs:12)',
  },
  {
    happens: 'Противник подаёт несколько типов сразу (число, деление на 0)',
    follows: 'Нужна иерархия и строгий порядок обработчиков (от частного к общему, иначе CS0160)',
    battle: 'Бой 2 · Порядок (Pricing.cs:23)',
  },
  {
    happens: '1 240 записей проходят через пул из 64 соединений с базой',
    follows: 'Нужен finally: закрывать соединение всегда — и при падении, и при return',
    battle: 'Бой 3 · Гарантия (Seats.cs:41)',
  },
  {
    happens: 'Попытка спрятать след в журнале (пустой catch {} или throw ex)',
    follows: 'Нужен честный журнал: 26 записей должны попасть в отчёт, а не исчезнуть',
    battle: 'Бой 4 · Честность (Promo.cs:55)',
  },
];

export const PrologueWorkbench: React.FC<PrologueWorkbenchProps> = ({
  state,
  dispatch,
  activeBrigade,
  onExitToBattleCard,
}) => {
  const [tenSecChecks, setTenSecChecks] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
  });

  const activeScene: PhaseId = state.phase.startsWith('prologue_')
    ? state.phase
    : 'prologue_1';

  const brigadeObj = state.brigades[activeBrigade];
  const brigadeVote = state.prologue.brigadeVotes?.[activeBrigade];
  const worldLogs = getWorldPrologueLogs(state.world);

  const matchedCount = PROLOGUE_MINES.filter(
    (m) => state.prologue.matchedMines[m.id] === m.expectedType
  ).length;

  const allMechanismReady =
    state.prologue.mechanismParts.TRY &&
    state.prologue.mechanismParts.CATCH &&
    state.prologue.mechanismParts.FINALLY;

  return (
    <div
      className="gesture-plate-rise"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* Шапка пульта завязки с переключателем 4 сцен (Документы 03–04) */}
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="brass-nameplate">
              <span>{brigadeObj.shapeSymbol}</span>
              <span>ПУЛЬТ ЗАВЯЗКИ · БРИГАДА {brigadeObj.name}</span>
            </span>
            <span className="mono" style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
              Драматургия: Атака → Отбита → Атаки продолжатся (Документы 03–04)
            </span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Выполняйте интерактивные задания завязки на ноутбуке бригады синхронно с Экраном зала.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'prologue_1', label: '1. Вход (03:00)' },
              { id: 'prologue_2', label: '2. Вскрытие (03:05)' },
              { id: 'prologue_3', label: '3. Отбито (03:14)' },
              { id: 'prologue_4', label: '4. Продолжение (03:17)' },
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_PHASE', phase: sc.id })}
              className={`instrument-btn ${activeScene === sc.id ? 'btn-action' : ''}`}
            >
              {sc.label}
            </button>
          ))}
          {onExitToBattleCard && (
            <button
              type="button"
              onClick={onExitToBattleCard}
              className="instrument-btn btn-warning"
            >
              К бланку Карты боя →
            </button>
          )}
        </div>
      </div>

      {/* ================= СЦЕНА 1: ВХОД (03:00) ================= */}
      {activeScene === 'prologue_1' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '52fr 48fr',
            gap: '14px',
          }}
        >
          {/* Левая колонка: Улики забытой учётной записи test/test + Лог */}
          <div
            className="material-armor"
            style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="brass-nameplate">СЦЕНА 1 · КАК ОН ВОШЁЛ (ДОКУМЕНТ 04, П. 4)</span>
              <span className="mono" style={{ fontSize: '13px', color: 'var(--color-incident)' }}>
                ДВЕРЬ НЕ БЫЛА ЗАПЕРТА
              </span>
            </div>

            <div
              className="mono"
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.42)',
                border: '1px solid var(--color-warning)',
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              <div>
                логин: <strong>test</strong> · пароль: <strong>test</strong> · права:{' '}
                <strong style={{ color: 'var(--color-incident)' }}>администратор</strong>
              </div>
              <div>
                создана: <strong>14.04</strong> (для проверки выгрузки) · удалена:{' '}
                <strong style={{ color: 'var(--color-incident)' }}>нет</strong>
              </div>
              <div>
                02:07:44 вход с <strong>91.42.117.6</strong> → 02:48:57 выход{' '}
                <strong>штатный</strong> (41 минута внутри)
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.48)',
                border: '1px solid var(--border-metal)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                ЛЕНТА ДИСПЕТЧЕРСКОЙ НА ЭКРАНЕ БРИГАДЫ:
              </div>
              {worldLogs.map((item, idx) => (
                <div
                  key={idx}
                  className="code-line-row"
                  style={{
                    fontSize: '15px',
                    cursor: 'default',
                    color:
                      item.level === 'danger' ? 'var(--color-incident)' : 'var(--text-main)',
                  }}
                >
                  <span style={{ width: '80px', color: 'var(--text-caption)' }}>{item.time}</span>
                  <span style={{ width: '95px', color: 'var(--color-warning)', fontWeight: 700 }}>
                    {item.unit}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Тест «10 секунд» (Документ 04, п. 13) */}
            <div className="material-paper" style={{ padding: '10px 14px' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--text-caption)',
                  marginBottom: '6px',
                }}
              >
                ТЕСТ «ДЕСЯТИ СЕКУНД» (ДОКУМЕНТ 04, П. 13 — СЕМЬ ПРАВИЛ ПИСЬМА):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                }}
              >
                {[
                  { id: 1, q: '1. Что произошло?', a: 'В систему вошли (test, 91.42.117.6)' },
                  { id: 2, q: '2. Что оставили?', a: '26 записей-мин в пакете' },
                  { id: 3, q: '3. Кому плохо?', a: '1 240 человек в очереди с ночи' },
                  { id: 4, q: '4. Сколько времени?', a: 'До старта продаж 06:11 (к 09:00)' },
                ].map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(tenSecChecks[item.id])}
                      onChange={() =>
                        setTenSecChecks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                      }
                    />
                    <span>
                      <strong>{item.q}</strong> — {item.a}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Правая колонка: Голосование бригады из клиента */}
          <div
            className="material-paper"
            style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
                ЗАДАНИЕ КЛИЕНТА БРИГАДЫ · СЦЕНА 1 (ДОКУМЕНТ 03, П. 4)
              </div>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 900 }}>
                Что произошло в ночную смену?
              </h3>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Выберите ответ вашей бригады ({brigadeObj.shapeSymbol} {brigadeObj.name}). После
                ответа ведущий держит паузу и открывает верный вариант на Экране зала.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(
                [
                  {
                    id: 'broken' as PrologueVoteOption,
                    title: '1. «Сервис сломался»',
                    hint: 'Внутренний технический сбой оборудования или сети',
                  },
                  {
                    id: 'intrusion' as PrologueVoteOption,
                    title: '2. «В сервис вошли»',
                    hint: 'Штатный вход под забытой админской учёткой test/test на 41 минуту',
                  },
                  {
                    id: 'dataLost' as PrologueVoteOption,
                    title: '3. «Данные потеряны»',
                    hint: 'База очереди удалена или похищена злоумышленником',
                  },
                ] as const
              ).map((opt) => {
                const isSelected = brigadeVote === opt.id;
                const count = state.prologue.pollVotes[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'PROLOGUE_VOTE',
                        option: opt.id,
                        brigade: activeBrigade,
                      })
                    }
                    className={`instrument-btn ${isSelected ? 'btn-action' : ''}`}
                    style={{
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800 }}>{opt.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {opt.hint}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: '16px', fontWeight: 900 }}>
                      {isSelected ? 'ВАШ ВЫБОР · ' : ''}
                      {count} гол.
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Табло голосов всех 3 бригад */}
            <div
              className="material-armor"
              style={{
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
                ОТВЕТЫ БРИГАД:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
                  const b = state.brigades[bId];
                  const v = state.prologue.brigadeVotes?.[bId];
                  return (
                    <span
                      key={bId}
                      className="mono"
                      style={{
                        fontSize: '13px',
                        padding: '3px 8px',
                        border: '1px solid var(--border-metal)',
                        color: v ? 'var(--color-stable)' : 'var(--text-caption)',
                      }}
                    >
                      {b.shapeSymbol} {bId}: {v ? VOTE_LABELS[v] : 'ожидание...'}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'PROLOGUE_REVEAL_POLL' })}
                className="instrument-btn btn-warning"
              >
                Показать верный ответ на экранах
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'prologue_2' })}
                className="instrument-btn btn-action"
              >
                Дальше → Сцена 2 «Вскрытие»
              </button>
            </div>

            {state.prologue.pollRevealed && (
              <div
                className="gesture-card-drop"
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 93, 93, 0.14)',
                  borderLeft: '4px solid var(--color-incident)',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                ВТОРЖЕНИЕ — доступ с чужой учётной записи (test/test). Данные не похищены
                (выгрузка 0 байт). В очередь вставлено 26 записей-мин.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= СЦЕНА 2: ВСКРЫТИЕ (03:05) ================= */}
      {activeScene === 'prologue_2' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            className="material-armor"
            style={{
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div className="brass-nameplate">
                СЦЕНА 2 · ВСКРЫТИЕ ПАКЕТА И ЧЕТЫРЕ МИНЫ (ДОКУМЕНТ 03, П. 4)
              </div>
              <div style={{ fontSize: '15px', marginTop: '4px' }}>
                Шаг 1: запустите обработку пакета (сервис падает на первой мине). Шаг 2:
                сопоставьте 4 записи и 4 типа исключений, чтобы открыть{' '}
                <strong>Правило щита №1 (АНАТОМИЯ)</strong>.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'PROLOGUE_CRASH_BATCH' })}
                className="instrument-btn btn-incident"
              >
                1. Запустить обработку пакета
              </button>
              <button
                type="button"
                onClick={() => {
                  PROLOGUE_MINES.forEach((m) =>
                    dispatch({
                      type: 'PROLOGUE_MATCH_MINE',
                      mineId: m.id,
                      exceptionType: m.expectedType,
                    })
                  );
                }}
                className="instrument-btn btn-stable"
              >
                Сопоставить все 4 типа ({matchedCount}/4)
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'prologue_3' })}
                className="instrument-btn btn-action"
              >
                Дальше → Сцена 3 «Отбито»
              </button>
            </div>
          </div>

          {state.prologue.batchCrashed && (
            <div
              className="gesture-card-drop"
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 93, 93, 0.16)',
                border: '2px solid var(--color-incident)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <div
                  className="mono"
                  style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-incident)' }}
                >
                  FormatException · Booking.cs:12 · запись #0x1F3 (place = "два")
                </div>
                <div style={{ fontSize: '14px' }}>
                  «У падения есть имя и адрес. Имя — это тип. Адрес — строка.» Почему нельзя
                  просто удалить 26 записей? Они не помечены, а ошибка на 1 запись = человек без
                  билета.
                </div>
              </div>
              <span className="heavy-stamp stamp-probed">ПАКЕТ УПАЛ</span>
            </div>
          )}

          {/* Карточки сопоставления 4 мин */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '10px',
            }}
          >
            {PROLOGUE_MINES.map((mine) => {
              const currentMatch = state.prologue.matchedMines[mine.id] || '';
              const isCorrect = currentMatch === mine.expectedType;
              return (
                <div
                  key={mine.id}
                  className="material-armor"
                  style={{
                    padding: '12px',
                    borderColor: isCorrect ? 'var(--color-stable)' : 'var(--border-metal)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: '13px', color: 'var(--color-warning)', fontWeight: 700 }}
                    >
                      Запись {mine.recordHex} · {mine.fileLine}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '13px',
                        color: isCorrect ? 'var(--color-stable)' : 'var(--text-caption)',
                        fontWeight: 800,
                      }}
                    >
                      {isCorrect ? '✓ ТОЧНО' : 'ВЫБЕРИТЕ ТИП'}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0' }}>
                    поле {mine.field} = {mine.badValue}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px',
                    }}
                  >
                    {mine.message}
                  </div>
                  <select
                    aria-label={`Сопоставить тип для ${mine.recordHex}`}
                    value={currentMatch}
                    onChange={(e) =>
                      dispatch({
                        type: 'PROLOGUE_MATCH_MINE',
                        mineId: mine.id,
                        exceptionType: e.target.value,
                      })
                    }
                    className="instrument-btn mono"
                    style={{ width: '100%', fontSize: '14px' }}
                  >
                    <option value="">— Сопоставьте тип исключения —</option>
                    <option value="FormatException">FormatException</option>
                    <option value="DivideByZeroException">DivideByZeroException</option>
                    <option value="IndexOutOfRangeException">IndexOutOfRangeException</option>
                    <option value="NullReferenceException">NullReferenceException</option>
                  </select>
                </div>
              );
            })}
          </div>

          {/* Дерево родства System.Exception */}
          <div className="material-paper" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 800 }}>
              ДЕРЕВО ИЕРАРХИИ ИСКЛЮЧЕНИЙ C# · «Все типы — родня. Общий предок — Exception»
            </div>
            <div
              className="mono"
              style={{
                marginTop: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <div style={{ padding: '8px 10px', border: '1px solid var(--color-warning)' }}>
                <strong>System.Exception</strong> (общий предок)
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  └── <strong>System.SystemException</strong>
                </div>
              </div>
              <div style={{ padding: '8px 10px', border: '1px solid var(--border-metal)' }}>
                ├── <strong>FormatException</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  "два" вместо числа (Booking.cs:12)
                </div>
              </div>
              <div style={{ padding: '8px 10px', border: '1px solid var(--border-metal)' }}>
                ├── Arithmetic → <strong>DivideByZeroException</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  count = 0 (Pricing.cs:31)
                </div>
              </div>
              <div style={{ padding: '8px 10px', border: '1px solid var(--border-metal)' }}>
                └── <strong>IndexOutOfRange</strong> / <strong>NullReference</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  seat = 7 (Seats.cs:8) · promo = null (Promo.cs:19)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= СЦЕНА 3: ОТБИТО (03:14) ================= */}
      {activeScene === 'prologue_3' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            className="material-armor"
            style={{
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div className="brass-nameplate">
                СЦЕНА 3 · «СОБЕРИ МЕХАНИЗМ В РАЗРЕЗЕ» (ДОКУМЕНТ 03, П. 4)
              </div>
              <div style={{ fontSize: '15px', marginTop: '4px' }}>
                Назначьте роль каждой из трёх частей (<strong>TRY</strong>, <strong>CATCH</strong>
                , <strong>FINALLY</strong>) и запустите пакет из 1 240 записей заново.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'PROLOGUE_REPEL_BATCH' })}
                className="instrument-btn btn-stable"
              >
                Прогнать пакет 1 240 с механизмом (ОТБИТО)
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'prologue_4' })}
                className="instrument-btn btn-action"
              >
                Дальше → Сцена 4 «Продолжение»
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            {(
              [
                {
                  id: 'TRY' as BrigadeId,
                  symbol: '▲',
                  expectedDuty: 'zone' as MechanismDutyId,
                  code: 'try { var order = Booking.Parse(req); }',
                },
                {
                  id: 'CATCH' as BrigadeId,
                  symbol: '⬡',
                  expectedDuty: 'catch_type' as MechanismDutyId,
                  code: 'catch (FormatException ex) { report.Add(req.Id, ex); }',
                },
                {
                  id: 'FINALLY' as BrigadeId,
                  symbol: '■',
                  expectedDuty: 'cleanup_always' as MechanismDutyId,
                  code: 'finally { conn.Close(); }',
                },
              ] as const
            ).map((part) => {
              const isReady = state.prologue.mechanismParts[part.id];
              const selectedDuty =
                state.prologue.mechanismDuties?.[part.id] ||
                (isReady ? part.expectedDuty : '');
              return (
                <div
                  key={part.id}
                  className="material-armor"
                  style={{
                    padding: '14px',
                    borderColor: isReady ? 'var(--color-stable)' : 'var(--border-metal)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="brass-nameplate">
                      <span>{part.symbol}</span>
                      <span>УЗЕЛ {part.id}</span>
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isReady ? 'var(--color-stable)' : 'var(--color-warning)',
                      }}
                    >
                      {isReady ? '✓ РОЛЬ ПОДТВЕРЖДЕНА' : 'ВЫБЕРИТЕ РАБОТУ УЗЛА'}
                    </span>
                  </div>

                  <div
                    className="mono"
                    style={{
                      fontSize: '13px',
                      padding: '6px 8px',
                      background: 'rgba(0,0,0,0.38)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {part.code}
                  </div>

                  <select
                    aria-label={`Роль узла ${part.id}`}
                    value={selectedDuty}
                    onChange={(e) =>
                      dispatch({
                        type: 'PROLOGUE_ASSIGN_MECHANISM_DUTY',
                        part: part.id,
                        duty: e.target.value as MechanismDutyId,
                      })
                    }
                    className="instrument-btn"
                    style={{ width: '100%', fontSize: '13px' }}
                  >
                    <option value="">— Какую работу выполняет {part.id}? —</option>
                    {MECHANISM_DUTY_OPTIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'PROLOGUE_ASSIGN_MECHANISM_DUTY',
                        part: part.id,
                        duty: part.expectedDuty,
                      })
                    }
                    className={`instrument-btn ${isReady ? 'btn-stable' : ''}`}
                    style={{ fontSize: '13px' }}
                  >
                    {isReady ? `Узел ${part.id} включён` : `Подключить ${part.id} в разрез`}
                  </button>
                </div>
              );
            })}
          </div>

          {state.prologue.batchRepelled && (
            <div
              className="material-paper gesture-card-drop"
              style={{
                padding: '14px 18px',
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
                  style={{ fontSize: '15px', color: 'var(--text-secondary)' }}
                >
                  03:14:02 batch старт записей: 1240 → 03:14:19 batch прошло: 1214 · в отчёт: 26 ·
                  ошибок с остановкой: 0
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: 'var(--color-stable)',
                    marginTop: '4px',
                  }}
                >
                  «Двадцать шесть — в отчёт. Тысяча двести четырнадцать — билеты. Отбито.»
                </div>
                <div style={{ fontSize: '14px', marginTop: '2px' }}>
                  Правило щита №2 (МЕХАНИЗМ) открыто. Пауза 3–5 секунд: дайте группе выдохнуть
                  перед поворотом Сцены 4.
                </div>
              </div>
              <span className="heavy-stamp stamp-repelled">ОТБИТО</span>
            </div>
          )}

          {!state.prologue.batchRepelled && allMechanismReady && (
            <div
              className="material-paper"
              style={{ padding: '10px 14px', borderLeftColor: 'var(--color-action)' }}
            >
              Все 3 узла механизма (TRY · CATCH · FINALLY) собраны верно! Нажмите{' '}
              <strong>«Прогнать пакет 1 240 с механизмом (ОТБИТО)»</strong>.
            </div>
          )}
        </div>
      )}

      {/* ================= СЦЕНА 4: ПРОДОЛЖЕНИЕ (03:17) ================= */}
      {activeScene === 'prologue_4' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.48)',
              border: '1px solid var(--color-incident)',
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-incident)',
                fontWeight: 800,
                marginBottom: '6px',
              }}
            >
              03:17:10 · ЧЕРЕЗ ТРИ МИНУТЫ ЛОГ ОЖИВАЕТ САМ (ДОКУМЕНТ 04, П. 7):
            </div>
            {PROLOGUE_SECOND_WAVE_LOGS.map((l, i) => (
              <div
                key={i}
                className="code-line-row"
                style={{ fontSize: '16px', color: 'var(--color-incident)' }}
              >
                <span style={{ width: '90px', color: 'var(--text-caption)' }}>{l.time}</span>
                <span style={{ width: '100px', color: 'var(--color-warning)' }}>{l.unit}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>

          {/* Таблица мостика к 4 боям из Документа 04, п. 7 */}
          <div className="material-paper" style={{ padding: '14px 16px' }}>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-caption)',
                fontWeight: 800,
                marginBottom: '8px',
              }}
            >
              ЧЕСТНЫЙ МОСТИК ОТ ЗАВЯЗКИ К ЧЕТЫРЁМ БОЯМ (ДОКУМЕНТ 04, П. 7): «ЗАЩИТА ОТ АТАКИ ≠
              ЗАЩИТА ОТ КЛАССА АТАК»
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {BRIDGE_TO_BATTLES.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '34fr 42fr 24fr',
                    gap: '10px',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.18)',
                    borderLeft: '3px solid var(--color-warning)',
                    fontSize: '14px',
                  }}
                >
                  <div>
                    <strong>{row.happens}</strong>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{row.follows}</div>
                  <div className="mono" style={{ color: 'var(--color-action)', fontWeight: 700 }}>
                    {row.battle}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="material-armor"
            style={{
              padding: '16px 20px',
              borderLeft: '6px solid var(--color-incident)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: 'var(--color-incident)',
                }}
              >
                АТАКИ ПРОДОЛЖАТСЯ
              </div>
              <div className="mono" style={{ fontSize: '16px', marginTop: '4px' }}>
                ДО СТАРТА 05:43 · ПРОГОНОВ: 4 · БРИГАД: 3 · НАПРАВЛЕНИЯ: формат · порядок ·
                ресурс · след
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'battle_1' })}
                className="instrument-btn btn-incident"
                style={{ fontSize: '16px', padding: '10px 18px' }}
              >
                Вступить в Бой 1 «Перехват» →
              </button>
              {onExitToBattleCard && (
                <button
                  type="button"
                  onClick={onExitToBattleCard}
                  className="instrument-btn"
                >
                  Открыть бланк карты
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
