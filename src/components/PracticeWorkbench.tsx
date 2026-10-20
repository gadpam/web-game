import React from 'react';
import { PATCH_SLOTS } from '../game/constants';
import { GameAction } from '../game/reducer';
import { SessionState } from '../types/game';

interface PracticeWorkbenchProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
}

export const PracticeWorkbench: React.FC<PracticeWorkbenchProps> = ({
  state,
  dispatch,
}) => {
  const { practice } = state;

  const customClassPreview = `public sealed class ${
    practice.customExceptionName || 'TicketBookingException'
  } : Exception
{
${
  practice.includeRecordIdProperty
    ? '    public string RecordId { get; }\n'
    : '    // [!] Не хватает свойства RecordId для привязки к заявке очереди\n'
}    public ${
    practice.customExceptionName || 'TicketBookingException'
  }(string recordId, string message${
    practice.includeInnerException ? ', Exception innerException' : ''
  })
        : base(message${practice.includeInnerException ? ', innerException' : ''})
    {
${
  practice.includeRecordIdProperty
    ? '        RecordId = recordId;'
    : '        // Контекст заявки потерян'
}
    }
}`;

  return (
    <div
      className="gesture-plate-rise"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <div
        className="material-paper"
        style={{
          padding: '12px 16px',
          borderLeftColor: 'var(--color-action)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900 }}>
            08:05 → 08:55 · ПРАКТИКА: СБОРКА ПОЛНОГО ПАТЧА И СОБСТВЕННОГО ТИПА ИСКЛЮЧЕНИЯ
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Соберите единый защитный контур из четырёх рубежей (Перехват, Порядок, Гарантия,
            Честность), настройте доменный класс исключения и прогоните стресс-пакет из 1 240
            записей перед стартом в 09:00.
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'RUN_PRACTICE_SUITE' })}
          className="instrument-btn btn-stable"
          style={{ fontSize: '16px', padding: '10px 20px' }}
        >
          Прогнать комплексный пакет (1 240 записей)
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
        }}
      >
        {/* Левая колонка: 4 рубежа патча */}
        <div
          className="material-armor screw-corners"
          style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800 }}>
            1. ЧЕТЫРЕ РУБЕЖА ЗАЩИТЫ КОНВЕЙЕРА
          </div>
          {PATCH_SLOTS.map((s) => {
            const enabled = practice.enabledSlots.includes(s.slot);
            return (
              <div
                key={s.slot}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PRACTICE_SLOT', slot: s.slot })
                }
                style={{
                  padding: '10px 12px',
                  background: enabled
                    ? 'rgba(53, 208, 160, 0.14)'
                    : 'rgba(0, 0, 0, 0.32)',
                  border: `1px solid ${
                    enabled ? 'var(--color-stable)' : 'var(--border-metal)'
                  }`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                >
                  <span>
                    Рубеж #{s.slot}: {s.shortName}
                  </span>
                  <span
                    className="mono"
                    style={{
                      color: enabled ? 'var(--color-stable)' : 'var(--color-incident)',
                    }}
                  >
                    {enabled ? 'УСТАНОВЛЕН' : 'ОТКЛЮЧЁН'}
                  </span>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  {s.codeSnippet}
                </div>
              </div>
            );
          })}
        </div>

        {/* Правая колонка: Конструктор собственного типа исключения */}
        <div
          className="material-armor screw-corners"
          style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800 }}>
            2. СОБСТВЕННОЕ ИСКЛЮЧЕНИЕ ДОМЕНА «БРОНЬ» (КРИТЕРИЙ ПОКРЫТИЯ ТЕМЫ)
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
              ИМЯ КЛАССА (ОБЯЗАТЕЛЕН СУФФИКС *Exception):
            </label>
            <input
              type="text"
              value={practice.customExceptionName}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_PRACTICE_CONFIG',
                  customExceptionName: e.target.value,
                })
              }
              className="instrument-btn mono"
              style={{ width: '100%', fontSize: '15px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={practice.includeRecordIdProperty}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_PRACTICE_CONFIG',
                    includeRecordIdProperty: e.target.checked,
                  })
                }
              />
              <span>Сохранять ID проблемной записи (`public string RecordId`)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={practice.includeInnerException}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_PRACTICE_CONFIG',
                    includeInnerException: e.target.checked,
                  })
                }
              />
              <span>Передавать исходную причину в `base(message, innerException)`</span>
            </label>
          </div>

          <pre
            className="mono"
            style={{
              margin: 0,
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid var(--border-metal)',
              fontSize: '13px',
              overflowX: 'auto',
            }}
          >
            {customClassPreview}
          </pre>
        </div>
      </div>

      {practice.lastSuitePassed !== null && (
        <div
          className="material-paper gesture-card-drop"
          style={{
            padding: '14px 18px',
            borderLeftColor: practice.lastSuitePassed
              ? 'var(--color-stable)'
              : 'var(--color-incident)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            {practice.lastSuiteLog.map((line, idx) => (
              <div
                key={idx}
                className="mono"
                style={{
                  fontSize: '14px',
                  color: line.includes('ОШИБКА')
                    ? 'var(--color-incident)'
                    : line.includes('ОК') || line.includes('ГОТОВ')
                    ? 'var(--color-stable)'
                    : 'var(--text-main)',
                }}
              >
                {line}
              </div>
            ))}
          </div>
          <span
            className={`heavy-stamp ${
              practice.lastSuitePassed ? 'stamp-repelled' : 'stamp-probed'
            }`}
          >
            {practice.lastSuitePassed ? 'ПАТЧ ГОТОВ' : 'ПРОБИЛА'}
          </span>
        </div>
      )}
    </div>
  );
};
