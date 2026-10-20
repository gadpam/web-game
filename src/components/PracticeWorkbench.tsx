import React, { useState } from 'react';
import { PATCH_SLOTS } from '../game/constants';
import {
  POLYGON_TASKS,
  PolygonSlotId,
  verifyCSharpPolygonTask,
} from '../game/csharpVerifier';
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

  const [activeSlot, setActiveSlot] = useState<PolygonSlotId>(1);
  const [codeBySlot, setCodeBySlot] = useState<Record<PolygonSlotId, string>>(() => ({
    1: POLYGON_TASKS[0].brokenCode,
    2: POLYGON_TASKS[1].brokenCode,
    3: POLYGON_TASKS[2].brokenCode,
    4: POLYGON_TASKS[3].brokenCode,
  }));

  const currentTask =
    POLYGON_TASKS.find((t) => t.slot === activeSlot) || POLYGON_TASKS[0];
  const currentCode = codeBySlot[activeSlot];
  const verification = verifyCSharpPolygonTask(activeSlot, currentCode);

  const handleApplyAndVerify = () => {
    const res = verifyCSharpPolygonTask(activeSlot, currentCode);
    if (res.passed && !practice.enabledSlots.includes(activeSlot)) {
      dispatch({ type: 'TOGGLE_PRACTICE_SLOT', slot: activeSlot });
    }
  };

  const handleLoadSolution = (slot: PolygonSlotId) => {
    const task = POLYGON_TASKS.find((t) => t.slot === slot);
    if (!task) return;
    setCodeBySlot((prev) => ({
      ...prev,
      [slot]: task.solutionCode,
    }));
    if (!practice.enabledSlots.includes(slot)) {
      dispatch({ type: 'TOGGLE_PRACTICE_SLOT', slot });
    }
  };

  const handleResetBroken = (slot: PolygonSlotId) => {
    const task = POLYGON_TASKS.find((t) => t.slot === slot);
    if (!task) return;
    setCodeBySlot((prev) => ({
      ...prev,
      [slot]: task.brokenCode,
    }));
  };

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
            08:05 → 08:55 · ПРАКТИКА: C#-ПОЛИГОН ЧЕТЫРЁХ РУБЕЖЕЙ И СБОРКА СОБСТВЕННОГО ТИПА ИСКЛЮЧЕНИЯ
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Отредактируйте и проверьте C#-код четырёх узлов (`Booking.cs:12`, `Pricing.cs:23`, `Seats.cs:41`, `Promo.cs:55`), устраните ошибку `CS0160`, настройте доменный класс исключения и прогоните стресс-пакет из 1 240 записей перед стартом в 09:00.
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

      {/* Интерактивный C#-тренажёр и статический верификатор (Док. 07 п. 2, Док. 09) */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderLeft: `4px solid ${
            verification.passed ? 'var(--color-stable)' : 'var(--color-warning)'
          }`,
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
            <div style={{ fontSize: '15px', fontWeight: 900 }}>
              ИНТЕРАКТИВНЫЙ C#-ТРЕНАЖЁР ПОЛИГОНА (СТАТИЧЕСКИЙ АНАЛИЗАТОР CS0160 / CA2200 / FINALLY)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Выберите один из 4 файлов, отредактируйте код C# и нажмите «Проверить и установить рубеж» — при успешном прохождении тестов рубеж автоматически включается в конвейер.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {POLYGON_TASKS.map((t) => {
              const slotVerified = verifyCSharpPolygonTask(
                t.slot,
                codeBySlot[t.slot]
              ).passed;
              const isSelected = activeSlot === t.slot;
              return (
                <button
                  key={t.slot}
                  type="button"
                  onClick={() => setActiveSlot(t.slot)}
                  className={`instrument-btn ${isSelected ? 'btn-action' : ''}`}
                  style={{
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderColor: slotVerified
                      ? 'var(--color-stable)'
                      : undefined,
                  }}
                >
                  #{t.slot} {t.file}:{t.line} {slotVerified ? '✓' : '•'}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 1fr',
            gap: '12px',
          }}
        >
          {/* Левая часть: Редактор C#-кода */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <div>
                <span
                  className="mono"
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    color: 'var(--color-warning)',
                  }}
                >
                  {currentTask.file}:{currentTask.line}
                </span>{' '}
                <strong style={{ fontSize: '13px' }}>{currentTask.title}</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleLoadSolution(activeSlot)}
                  className="instrument-btn btn-stable"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Вставить эталонный патч
                </button>
                <button
                  type="button"
                  onClick={() => handleResetBroken(activeSlot)}
                  className="instrument-btn"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Сбросить к уязвимому коду
                </button>
              </div>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.28)',
                borderLeft: '3px solid var(--color-warning)',
              }}
            >
              <div>
                <strong>Проблема:</strong> {currentTask.problemStatement}
              </div>
              <div style={{ marginTop: '3px', color: 'var(--text-main)' }}>
                <strong>Подсказка ({currentTask.ruleName}):</strong> {currentTask.hint}
              </div>
            </div>

            <textarea
              value={currentCode}
              onChange={(e) =>
                setCodeBySlot((prev) => ({
                  ...prev,
                  [activeSlot]: e.target.value,
                }))
              }
              spellCheck={false}
              className="mono"
              rows={13}
              style={{
                width: '100%',
                background: '#090c10',
                color: '#e6edf3',
                border: `1px solid ${
                  verification.passed
                    ? 'var(--color-stable)'
                    : 'var(--border-metal)'
                }`,
                borderRadius: '3px',
                padding: '10px 12px',
                fontSize: '12.5px',
                lineHeight: 1.45,
                resize: 'vertical',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: verification.passed
                    ? 'var(--color-stable)'
                    : 'var(--color-warning)',
                }}
              >
                {verification.summary}
              </span>
              <button
                type="button"
                onClick={handleApplyAndVerify}
                className={`instrument-btn ${
                  verification.passed ? 'btn-stable' : 'btn-action'
                }`}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {verification.passed
                  ? '✓ Проверено: подключить рубеж в конвейер'
                  : 'Проверить C#-код'}
              </button>
            </div>
          </div>

          {/* Правая часть: Диагностика компилятора C# и таблица тестов */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.38)',
                border: '1px solid var(--border-metal)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginBottom: '6px',
                }}
              >
                <span>ДИАГНОСТИКА КОМПИЛЯТОРА C# / АНАЛИЗАТОРА</span>
                <span
                  className="mono"
                  style={{
                    color:
                      verification.compilerDiagnostics.length === 0
                        ? 'var(--color-stable)'
                        : 'var(--color-incident)',
                  }}
                >
                  {verification.compilerDiagnostics.length === 0
                    ? '0 предупреждений / 0 ошибок'
                    : `Замечаний: ${verification.compilerDiagnostics.length}`}
                </span>
              </div>

              {verification.compilerDiagnostics.length === 0 ? (
                <div
                  className="mono"
                  style={{ fontSize: '12px', color: 'var(--color-stable)' }}
                >
                  ✓ Компиляция успешна: ошибок иерархии типов (CS0160) и потери стека (CA2200) не обнаружено.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {verification.compilerDiagnostics.map((diag, idx) => (
                    <div
                      key={idx}
                      className="mono"
                      style={{
                        fontSize: '12px',
                        padding: '6px 8px',
                        background: 'rgba(255, 77, 79, 0.12)',
                        borderLeft: '3px solid var(--color-incident)',
                      }}
                    >
                      <strong style={{ color: 'var(--color-incident)' }}>
                        [{diag.code} · стр. {diag.line}]
                      </strong>{' '}
                      {diag.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.38)',
                border: '1px solid var(--border-metal)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800 }}>
                ПРОГОН КОНТРОЛЬНЫХ ВХОДОВ ПО УЗЛУ {currentTask.file}:{currentTask.line}
              </div>
              {verification.testCases.map((tc) => (
                <div
                  key={tc.id}
                  style={{
                    padding: '6px 8px',
                    background: tc.passed
                      ? 'rgba(53, 208, 160, 0.1)'
                      : 'rgba(255, 77, 79, 0.1)',
                    border: `1px solid ${
                      tc.passed
                        ? 'var(--color-stable)'
                        : 'var(--color-incident)'
                    }`,
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                    }}
                  >
                    <span className="mono">
                      [{tc.id}] {tc.input}
                    </span>
                    <span
                      className="mono"
                      style={{
                        color: tc.passed
                          ? 'var(--color-stable)'
                          : 'var(--color-incident)',
                      }}
                    >
                      {tc.passed ? '✓ ПРОЙДЕН' : '✗ СБОЙ'}
                    </span>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    Факт: {tc.actual}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
