import React, { useMemo, useState } from 'react';
import {
  INITIAL_SHIELD_RULES,
  REFERENCE_CARDS,
  WORLD_PRESETS,
} from '../game/constants';
import { KIT_DOCUMENTS } from '../game/kitDocuments';
import { GameAction } from '../game/reducer';
import { SessionState } from '../types/game';
import { DefenseDeckPanel } from './DefenseDeckPanel';
import { RoleRotationMatrix } from './RoleRotationMatrix';
import { TechMapSelfAnalysisPanel } from './TechMapSelfAnalysisPanel';

interface MaterialsScreenProps {
  state: SessionState;
  dispatch?: (action: GameAction) => void;
}

type MaterialSubTab =
  | 'protocol'
  | 'shield_poster'
  | 'cards'
  | 'presentation'
  | 'homework'
  | 'checklist'
  | 'kit_docs'
  | 'tech_map';

const ACCEPTANCE_CHECKLIST_ITEMS: string[] = [
  'С первого взгляда не читается как сгенерированный интерфейс: есть три материала (экран, бумага, бронеплита), свет сверху-слева и след человека.',
  'Читается с последнего ряда: минимум 13 px, очки бригад — 56 px, заголовок наряда — 50 px, строка кода — 25 px.',
  'Комиссия видит инструмент, а не мультик: приборы показывают состояние, анимации не превышают 0,4 с.',
  'Цвет означает состояние (#4FC3F7 действие, #FF5D5D инцидент, #35D0A0 стабильно, #FFB020 внимание), а бригады различаются формой (▲ TRY, ⬡ CATCH, ■ FINALLY).',
  'Игра учит, а не проверяет: каждое понятие входит в момент нужды (падение → инструмент → применение → последствие → имя).',
  'Материал покрыт полностью: try / catch / finally, порядок обработчиков (CS0160), иерархия Exception, throw vs throw ex, свои исключения, пустой catch.',
  'Реплик мало: за 15 минут завязки преподаватель произносит ровно 19 реплик (не более 130 слов).',
  'Деление на три бригады (TRY, CATCH, FINALLY) мотивировано устройством механизма, а не командой преподавателя.',
  'Старт в 09:00 необратим, блокируется до полного сбора Щита 6/6, а результат измеряется числом людей с билетами на табло из 1 240 клеток.',
  'Предусмотрены три режима проведения (Полный, Ручной, Автономный) и три темы оформления (Ночная смена, Светлый прибор, Бумажный штаб).',
];

const HOMEWORK_CARDS = [
  {
    level: 'Обязательный',
    gradeTarget: 'Оценка «4»',
    title: 'Разбор одного боя своей бригады',
    task: 'По протоколу смены описать: какая строка падала, какой тип исключения возникал, какой обработчик был поставлен и почему пакет прошёл.',
    deliverable: 'Заполненная карточка разбора (10–12 строк) + фрагмент кода с try-catch.',
  },
  {
    level: 'Повышенный',
    gradeTarget: 'Оценка «5»',
    title: 'Собственный класс исключения домена «Партер»',
    task: 'Написать собственный класс TicketBookingException : Exception со свойством RecordId и конструктором, сохраняющим innerException, и встроить его в обработчик очереди.',
    deliverable: 'Файл TicketBookingException.cs и демонстрация перехвата на тестовой записи.',
  },
  {
    level: 'Высокий (инженерный)',
    gradeTarget: 'Оценка «5+» / зачёт с отличием',
    title: 'Ревизия своего учебного проекта по 6 правилам Щита',
    task: 'Найти в собственном учебном коде 3 незащищённых входа (парсинг, индекс, файл/БД), устранить пустые catch {} и закрыть ресурсы через finally / using.',
    deliverable: 'Отчёт ревизии «До / После» на 1 страницу по форме Протокола смены.',
  },
];

const SHIELD_EXAMPLES: Record<number, string> = {
  1: `// Имя типа + сообщение + адрес строки:\n// System.FormatException: Input string was not in a correct format\n// at Parter.Booking.Parse(TicketRequest req) in Booking.cs:line 12`,
  2: `try {\n    Booking.Parse(req); // опасная зона\n} catch (FormatException ex) {\n    AuditLog.Report(req.Id, ex); // перехват\n} finally {\n    conn.Close(); // уборка всегда\n}`,
  3: `foreach (var req in queue) {\n    try {\n        ProcessOne(req); // внутри цикла пакета!\n    } catch (FormatException ex) {\n        report.Add(req.Id);\n    }\n}`,
  4: `catch (FormatException ex) { /* 1. Частный тип */ }\ncatch (DivideByZeroException ex) { /* 2. Частный тип */ }\ncatch (Exception ex) { /* 3. Общий предок — последним */ }`,
  5: `var conn = DbPool.Open();\ntry {\n    if (req.IsVip) return BookVip(req);\n    return Row[req.SeatIndex];\n} finally {\n    conn.Close(); // сработает и при return, и при падении\n}`,
  6: `catch (NullReferenceException ex) {\n    AuditLog.ReportMine(req.Id, ex);\n    throw; // сохраняет исходный стек вызовов (не throw ex;)\n}`,
};

export const MaterialsScreen: React.FC<MaterialsScreenProps> = ({
  state,
  dispatch,
}) => {
  const [subTab, setSubTab] = useState<MaterialSubTab>('protocol');
  const [selectedDocId, setSelectedDocId] = useState<string>('00');
  const [docSearch, setDocSearch] = useState<string>('');
  const [protocolBattleNum, setProtocolBattleNum] = useState<1 | 2 | 3 | 4>(1);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(
    () =>
      Object.fromEntries(
        ACCEPTANCE_CHECKLIST_ITEMS.map((_item: string, idx: number) => [idx, true])
      )
  );
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const worldMeta = WORLD_PRESETS[state.world];

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return KIT_DOCUMENTS;
    return KIT_DOCUMENTS.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q)
    );
  }, [docSearch]);

  const activeDoc =
    filteredDocs.find((d) => d.id === selectedDocId) ||
    filteredDocs[0] ||
    KIT_DOCUMENTS[0];

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uptime-shift-${state.code}-${state.shiftClock.replace(':', '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const lines = [
      `# Протокол смены «АПТАЙМ · Ночная смена»`,
      `- **Сервис:** ${worldMeta.serviceName}`,
      `- **Код партии:** ${state.code}`,
      `- **Часы смены:** ${state.shiftClock}`,
      `- **Итог 09:00:** Выдано ${state.queue.issued} из ${state.queue.total} (Потеряно: ${state.queue.lost})`,
      ``,
      `## Итоговый счёт бригад`,
      `- ▲ Бригада TRY: **${state.brigades.TRY.score}** очков`,
      `- ⬡ Бригада CATCH: **${state.brigades.CATCH.score}** очков`,
      `- ■ Бригада FINALLY: **${state.brigades.FINALLY.score}** очков`,
      ``,
      `## Щит смены (6 правил)`,
      ...state.shield.map(
        (r) => `- [${r.unlocked ? 'x' : ' '}] **Правило ${r.id} (${r.code}):** ${r.text}`
      ),
      ``,
      `## Журнал ночной смены`,
      ...state.journal.map(
        (j) => `- \`${j.shiftTime}\` **${j.actor}** — ${j.claimed} → **${j.result}**`
      ),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocol-shift-${state.code}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dispatch) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && parsed.brigades && parsed.battles && parsed.shield) {
          dispatch({ type: 'IMPORT_SESSION_STATE', imported: parsed });
          setImportFeedback('Снимок партии успешно загружен в текущую сессию.');
        } else {
          setImportFeedback('Ошибка: файл не является снимком партии «Аптайм».');
        }
      } catch {
        setImportFeedback('Ошибка чтения JSON-файла.');
      }
    };
    reader.readAsText(file);
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
      {/* Навигация по материалам смены */}
      <div
        className="material-armor screw-corners no-print"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSubTab('protocol')}
            className={`instrument-btn ${
              subTab === 'protocol' ? 'btn-action' : ''
            }`}
          >
            1. Протокол смены (А4)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('shield_poster')}
            className={`instrument-btn ${
              subTab === 'shield_poster' ? 'btn-action' : ''
            }`}
          >
            2. Щит «6 правил смены» (А4)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('cards')}
            className={`instrument-btn ${
              subTab === 'cards' ? 'btn-action' : ''
            }`}
          >
            3. Образцы карт и бланк Арбитра
          </button>
          <button
            type="button"
            onClick={() => setSubTab('presentation')}
            className={`instrument-btn ${
              subTab === 'presentation' ? 'btn-action' : ''
            }`}
          >
            4. Презентация защиты (12 слайдов)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('homework')}
            className={`instrument-btn ${
              subTab === 'homework' ? 'btn-action' : ''
            }`}
          >
            5. ДЗ «Ночной дежурный» (3 уровня)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('checklist')}
            className={`instrument-btn ${
              subTab === 'checklist' ? 'btn-stable' : ''
            }`}
          >
            6. Чеклист приёмки (10/10)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kit_docs')}
            className={`instrument-btn ${
              subTab === 'kit_docs' ? 'btn-warning' : ''
            }`}
          >
            7. Полный комплект (11 документов)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('tech_map')}
            className={`instrument-btn ${
              subTab === 'tech_map' ? 'btn-action' : ''
            }`}
          >
            8. Техкарта 90 мин и Самоанализ (Док. 09–10)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href="/api/portable"
            download="uptime-portable.html"
            className="instrument-btn btn-action"
            style={{ textDecoration: 'none' }}
            title="Скачать автономную однофайловую сборку для запуска с флешки без интернета и без Node.js (Документ 06, п. 10)"
          >
            Для флешки (.html)
          </a>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="instrument-btn"
          >
            Выгрузить Протокол (.md)
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="instrument-btn"
          >
            Сохранить снимок (.json)
          </button>
          {dispatch && (
            <label
              className="instrument-btn"
              style={{ cursor: 'pointer' }}
              title="Загрузить ранее сохранённый снимок партии (.json)"
            >
              Загрузить снимок (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                style={{ display: 'none' }}
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="instrument-btn btn-stable"
          >
            Печать / Экспорт A4 (PDF)
          </button>
        </div>
      </div>

      {importFeedback && (
        <div
          className="material-paper no-print"
          style={{
            padding: '8px 14px',
            borderLeftColor: 'var(--color-action)',
            fontSize: '14px',
          }}
        >
          {importFeedback}
        </div>
      )}

      {/* ================= 1. ПРОТОКОЛ СМЕНЫ (ОДНА СТРАНИЦА А4) ================= */}
      {subTab === 'protocol' && (
        <div
          className="material-paper"
          style={{
            padding: '24px 28px',
            maxWidth: '960px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid var(--border-metal)',
              paddingBottom: '12px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                ИТОГОВЫЙ ДОКУМЕНТ ПАРТИИ (ДОКУМЕНТ 06, П. 9) · 1 СТРАНИЦА А4
              </div>
              <h1 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 900 }}>
                ПРОТОКОЛ НОЧНОЙ СМЕНЫ · {worldMeta.serviceName.toUpperCase()}
              </h1>
              <div className="mono" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Инженерная игра по дисциплине «Основы алгоритмизации и
                программирования» (C# · Исключения)
              </div>
            </div>

            <div className="mono" style={{ textAlign: 'right', fontSize: '14px' }}>
              <div>
                КОД ПАРТИИ: <strong>{state.code}</strong>
              </div>
              <div>ЧАСЫ СМЕНЫ: {state.shiftClock}</div>
              <div>РЕЖИМ: {state.mode}</div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid var(--border-metal)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
                ГЛАВНЫЙ РЕЗУЛЬТАТ СТАРТА В 09:00
              </div>
              <div className="mono" style={{ fontSize: '30px', fontWeight: 900 }}>
                {worldMeta.unitLabel.toUpperCase()}: {state.queue.issued} ИЗ{' '}
                {state.queue.total}
              </div>
              {state.queue.lost > 0 ? (
                <div
                  className="mono"
                  style={{ fontSize: '15px', color: 'var(--color-incident)' }}
                >
                  Потеряно на пробитых волнах: {state.queue.lost} чел. (
                  {state.queue.lossReasons.join('; ')})
                </div>
              ) : (
                <div
                  className="mono"
                  style={{ fontSize: '15px', color: 'var(--color-stable)' }}
                >
                  Все 26 повреждённых записей ушли в отчёт. Очередь из 1 240 человек
                  прошла без потерь.
                </div>
              )}
            </div>

            <span
              className={`heavy-stamp ${
                state.queue.lost > 0 ? 'stamp-probed' : 'stamp-repelled'
              }`}
            >
              {state.queue.lost > 0
                ? `${state.queue.issued} / 1240`
                : 'СМЕНА СДАНА · 1240'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            {(['TRY', 'CATCH', 'FINALLY'] as const).map((bId) => {
              const b = state.brigades[bId];
              return (
                <div
                  key={bId}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border-metal)',
                    background: 'rgba(0,0,0,0.16)',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>
                    {b.shapeSymbol} БРИГАДА {b.name}
                  </div>
                  <div className="mono" style={{ fontSize: '32px', fontWeight: 900 }}>
                    {b.score} ОЧК.
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Клеймо формы: {b.shape}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>
              СВОДКА ЧЕТЫРЁХ РАУНДОВ («Перехват», «Порядок», «Гарантия», «Честность»)
            </h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid var(--border-metal)',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '6px' }}>Бой</th>
                  <th style={{ padding: '6px' }}>Файл и строка</th>
                  <th style={{ padding: '6px' }}>Атака / Защита / Арбитр</th>
                  <th style={{ padding: '6px' }}>Вердикт</th>
                  <th style={{ padding: '6px' }}>Запись в журнале</th>
                </tr>
              </thead>
              <tbody>
                {([1, 2, 3, 4] as const).map((bNum) => {
                  const b = state.battles[bNum];
                  return (
                    <tr
                      key={bNum}
                      style={{ borderBottom: '1px solid var(--border-metal)' }}
                    >
                      <td style={{ padding: '8px 6px', fontWeight: 800 }}>
                        Бой {b.number} «{b.codeName}»
                      </td>
                      <td className="mono" style={{ padding: '8px 6px' }}>
                        {b.defaultFile}:{b.targetLine} ({b.targetException})
                      </td>
                      <td className="mono" style={{ padding: '8px 6px' }}>
                        {b.attacker} → {b.defender} (судья {b.arbiter})
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '8px 6px',
                          fontWeight: 800,
                          color:
                            b.verdict?.result === 'ПРОБИЛА'
                              ? 'var(--color-incident)'
                              : b.verdict?.result === 'ОТБИТА'
                              ? 'var(--color-stable)'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {b.verdict ? b.verdict.result : 'НЕ ПРОВЕДЁН'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        {b.verdict?.journalLine ||
                          'Ожидает вынесения вердикта арбитра'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>
              СОБРАННЫЙ ЩИТ СМЕНЫ (6 ПРАВИЛ ОБРАБОТКИ ИСКЛЮЧЕНИЙ)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {state.shield.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid var(--border-metal)',
                    fontSize: '13px',
                  }}
                >
                  <strong>
                    Правило {r.id} ({r.code}):
                  </strong>{' '}
                  {r.text}{' '}
                  <span className="mono" style={{ color: 'var(--color-stable)' }}>
                    [{r.unlocked ? 'ОТКРЫТО' : 'НЕ ОТКРЫТО'}]
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px dashed var(--border-metal)',
              fontSize: '14px',
            }}
          >
            <div>Подпись старшего смены (преподаватель): _____________________</div>
            <div>Подписи бригадиров TRY / CATCH / FINALLY: _____________________</div>
          </div>

          {/* КАНОНИЧЕСКИЙ ТЕКСТОВЫЙ БЛАНК «ПРОТОКОЛ СМЕНЫ 03:00–09:09» ПО ДОКУМЕНТУ 07, П. 6 */}
          <div
            style={{
              marginTop: '10px',
              padding: '16px 20px',
              background: 'rgba(0,0,0,0.28)',
              border: '1px solid var(--border-metal)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-warning)',
                fontWeight: 800,
                marginBottom: '8px',
              }}
            >
              ПЕЧАТНЫЙ БЛАНК ДЛЯ КОМИССИИ · ДОКУМЕНТ 07, П. 6 («ПРОТОКОЛ СМЕНЫ: ОДНА СТРАНИЦА»)
            </div>
            <pre
              className="mono"
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-main)',
              }}
            >
{`                  ПРОТОКОЛ СМЕНЫ
                  03:00 – 09:09 (Код партии: ${state.code})

СТАРТ ПРОДАЖ
  билетов выдано ......................... ${state.queue.issued} из ${state.queue.total}
  пробито ................................ ${
    state.queue.lost > 0
      ? state.queue.lossReasons.join('; ') || 'волна 2 (порядок обработчиков)'
      : 'нет (все 4 волны удержаны)'
  }
  потеряно ............................... ${state.queue.lost} человек

БОИ
  1 Перехват   атака ${state.battles[1].attacker} / защита ${state.battles[1].defender}      пробила ${state.battles[1].probedCount} · отбито ${state.battles[1].repelledCount}
  2 Порядок    атака ${state.battles[2].attacker} / защита ${state.battles[2].defender}  пробила ${state.battles[2].probedCount} · отбито ${state.battles[2].repelledCount}
  3 Гарантия   атака ${state.battles[3].attacker} / защита ${state.battles[3].defender}    пробила ${state.battles[3].probedCount} · отбито ${state.battles[3].repelledCount}
  4 Честность  по рейтингу (${state.battles[4].attacker}/${state.battles[4].defender})        пробила ${state.battles[4].probedCount} · отбито ${state.battles[4].repelledCount}

ЩИТ ${state.shield.filter((r) => r.unlocked).length}/6
  анатомия · механизм · перехват · порядок · гарантия · честность

НОМИНАЦИИ
  самый точный разбор ... ${state.nominations.mostPreciseAnalysis}
  лучший журнал ......... ${state.nominations.bestJournal}
  честная ошибка ........ ${state.nominations.honestMistake}

ПОДПИСИ
  ведущий смены ________   арбитры ________   дежурные ________`}
            </pre>
          </div>

          {/* БЛАНК «ПРОТОКОЛ АРБИТРА НА ОДИН БОЙ» ПО ДОКУМЕНТУ 07, П. 3 */}
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid var(--border-metal)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--color-action)',
                  fontWeight: 800,
                }}
              >
                БЛАНК «ПРОТОКОЛ АРБИТРА» НА ВЫБРАННЫЙ БОЙ · ДОКУМЕНТ 07, П. 3
              </span>
              <div className="no-print" style={{ display: 'flex', gap: '6px' }}>
                {([1, 2, 3, 4] as const).map((bNum) => (
                  <button
                    key={bNum}
                    type="button"
                    onClick={() => setProtocolBattleNum(bNum)}
                    className={`instrument-btn mono ${
                      protocolBattleNum === bNum ? 'btn-action' : ''
                    }`}
                    style={{ fontSize: '13px', padding: '4px 10px' }}
                  >
                    Бой {bNum} «{state.battles[bNum].codeName}»
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const b = state.battles[protocolBattleNum];
              const resProbed = b.verdict?.result === 'ПРОБИЛА' ? '[X]' : '[ ]';
              const resRepelled = b.verdict?.result === 'ОТБИТА' ? '[X]' : '[ ]';
              const resRejected = b.verdict?.result === 'НЕ ПРИНЯТА' ? '[X]' : '[ ]';
              return (
                <pre
                  className="mono"
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-main)',
                  }}
                >
{`БОЙ ${b.number} («${b.codeName}»)   ФАЗА: battle_${b.number}   ВРЕМЯ: ${b.shiftClock}

Атакует: ${b.attacker}            Защищается: ${b.defender}            Арбитр: ${b.arbiter}

КАРТА АТАКИ
  строка ${b.attackCard ? b.attackCard.line : b.targetLine}   тип ${
                    b.attackCard ? b.attackCard.exceptionType : b.targetException
                  }
  утверждение ${
    b.attackCard
      ? b.attackCard.statement
      : '________________________________________'
  }

КАРТА ЗАЩИТЫ
  строка ${b.defenseCard ? b.defenseCard.line : b.targetLine}   обработчик ${
                    b.defenseCard
                      ? `${b.defenseCard.exceptionType} (слот #${b.defenseCard.patchSlot || 1})`
                      : '____________________'
                  }
  утверждение ${
    b.defenseCard
      ? b.defenseCard.statement
      : '________________________________________'
  }

ЗАПУСК
  результат:  ${resProbed} ПРОБИЛА   ${resRepelled} ОТБИТА   ${resRejected} НЕ ПРИНЯТА
  причина: ${
    b.verdict?.rejectReason ||
    (b.lastRun ? b.lastRun.consoleLog.join(' | ') : '__________________________________________')
  }

ОЧКИ
  атакующим: ${b.verdict ? `+${b.verdict.attackerDelta}` : '____'}   защите: ${
                    b.verdict ? `+${b.verdict.defenderDelta}` : '____'
                  }   арбитру: ${b.verdict ? `+${b.verdict.arbiterDelta}` : '____'}

ЖУРНАЛ (одна строка)
  ${b.verdict?.journalLine || '____________________________________________________'}

ПРОПУСК, НАЙДЕННЫЙ АРБИТРОМ
  ${b.verdict?.missedSpotNote || (b.missedSpotAwarded ? 'Зафиксирован (+1 очко арбитру)' : '____________________________________________________')}`}
                </pre>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= 2. ПЛАКАТ А4 «ЩИТ: 6 ПРАВИЛ СМЕНЫ» ================= */}
      {subTab === 'shield_poster' && (
        <div
          className="material-paper"
          style={{
            padding: '24px 28px',
            maxWidth: '960px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              ПЛАКАТ А4 НА СТЕНУ И ПАМЯТКА В ТЕТРАДЬ (ДОКУМЕНТ 07, П. 3)
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: 900 }}>
              ЩИТ: 6 ПРАВИЛ НОЧНОЙ СМЕНЫ (ОБРАБОТКА ИСКЛЮЧЕНИЙ В C#)
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            {INITIAL_SHIELD_RULES.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '14px 16px',
                  border: '2px solid var(--border-metal)',
                  background: 'rgba(0,0,0,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: 'var(--color-warning)',
                    fontWeight: 800,
                  }}
                >
                  <span>
                    ПРАВИЛО №{item.id} · {item.code}
                  </span>
                  <span>{item.source}</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900 }}>
                  «{item.text}»
                </div>
                <pre
                  className="mono"
                  style={{
                    margin: '6px 0 0 0',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.45)',
                    fontSize: '13px',
                    overflowX: 'auto',
                  }}
                >
                  {SHIELD_EXAMPLES[item.id]}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 3. ОБРАЗЦЫ КАРТ И ПЕЧАТНЫЙ БЛАНК АРБИТРА ================= */}
      {subTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="material-paper" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              ЭТАЛОННЫЕ КАРТЫ АТАКИ И ЗАЩИТЫ (ДОКУМЕНТ 07, П. 1)
            </div>
            <h2 style={{ margin: '4px 0 12px 0', fontSize: '22px', fontWeight: 900 }}>
              Образцы заполнения бланков для 4 боёв смены
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              {REFERENCE_CARDS.map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border-metal)',
                    borderLeft: `5px solid ${
                      card.cardType === 'атака'
                        ? 'var(--color-incident)'
                        : 'var(--color-stable)'
                    }`,
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      fontWeight: 800,
                    }}
                  >
                    <span>
                      БОЙ {card.battleNumber} · КАРТА {card.cardType.toUpperCase()}
                    </span>
                    <span className="mono">{card.file}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '15px', marginTop: '6px' }}>
                    <strong>Поле 1 (Строка):</strong> {card.line} ·{' '}
                    <strong>Поле 2 (Тип):</strong> {card.exceptionType}
                  </div>
                  <div className="mono" style={{ fontSize: '14px', marginTop: '4px' }}>
                    <strong>Поле 3 (Утверждение):</strong> «{card.statement}»
                  </div>
                  {card.arbiterMissedSpotHint && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-warning)',
                        marginTop: '6px',
                      }}
                    >
                      Подсказка Арбитру (пропуск на +1): {card.arbiterMissedSpotHint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="material-paper" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              БЛАНК ПРОТОКОЛА АРБИТРА ДЛЯ ПЕЧАТИ (ДОКУМЕНТ 07, П. 2)
            </div>
            <h3 style={{ margin: '4px 0 10px 0', fontSize: '20px', fontWeight: 900 }}>
              Печатная ведомость Арбитра на 4 раунда (для Ручного и Автономного режима)
            </h3>
            <div className="mono" style={{ fontSize: '14px', lineHeight: 1.7 }}>
              <div>
                БОЙ № ____ · АТАКА: __________ · ЗАЩИТА: __________ · АРБИТР:
                __________
              </div>
              <div>
                КАРТА АТАКИ: строка № ____ · тип исключения: ____________________
              </div>
              <div>
                КАРТА ЗАЩИТЫ: слот патча № ____ · обработчик: ____________________
              </div>
              <div>
                ВЕРДИКТ ЗАПУСКА: [ ] ПРОБИЛА (+2 атаке)   [ ] ОТБИТА (+1 защите, +2
                за контратаку)   [ ] НЕ ПРИНЯТА
              </div>
              <div>
                НАЙДЕННЫЙ ПРОПУСК АРБИТРА (+1 очко):
                ________________________________________________
              </div>
              <div>
                УСТНАЯ ФОРМУЛА (произнесена стоя): «Атака на строке ___ [пробила /
                отбита]. Причина — ___. Очки: ___»
              </div>
            </div>
          </div>

          <RoleRotationMatrix
            state={state}
            activeBrigade="TRY"
            showAllBrigadesDefault
          />
        </div>
      )}

      {/* ================= 4. ПРЕЗЕНТАЦИЯ И РЕЧЬ ЗАЩИТЫ (12 СЛАЙДОВ, 3 МИНУТЫ) ================= */}
      {subTab === 'presentation' && (
        <DefenseDeckPanel state={state} dispatch={dispatch} />
      )}

      {/* ================= 5. ДОМАШНЕЕ ЗАДАНИЕ «НОЧНОЙ ДЕЖУРНЫЙ» (3 УРОВНЯ) ================= */}
      {subTab === 'homework' && (
        <div
          className="material-paper"
          style={{
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              ДОМАШНЕЕ ЗАДАНИЕ НА ВЫБОР (ДОКУМЕНТ 07, П. 4 · 09:15)
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: 900 }}>
              Карточка «Ночной дежурный» — три уровня сложности
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
            }}
          >
            {HOMEWORK_CARDS.map((hw) => (
              <div
                key={hw.level}
                className="material-armor screw-corners"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: 'var(--color-warning)',
                      fontWeight: 800,
                    }}
                  >
                    <span>УРОВЕНЬ «{hw.level}»</span>
                    <span>{hw.gradeTarget}</span>
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 900, margin: '8px 0' }}>
                    {hw.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                    {hw.task}
                  </p>
                </div>

                <div
                  className="mono"
                  style={{
                    padding: '10px',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid var(--border-metal)',
                    fontSize: '13px',
                  }}
                >
                  <strong>Что сдаётся:</strong> {hw.deliverable}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 6. ЧЕКЛИСТ ПРИЁМКИ КОМПЛЕКТА (10/10) ================= */}
      {subTab === 'checklist' && (
        <div
          className="material-paper"
          style={{
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              ДОКУМЕНТ 00, РАЗДЕЛ 11 · «ГОТОВО — КОГДА ВСЁ ДА»
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: 900 }}>
              Интерактивный чеклист приёмки комплекта «АПТАЙМ · Ночная смена»
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ACCEPTANCE_CHECKLIST_ITEMS.map((item: string, idx: number) => {
              const checked = !!checkedItems[idx];
              return (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    background: checked
                      ? 'rgba(53, 208, 160, 0.14)'
                      : 'rgba(0,0,0,0.22)',
                    border: `1px solid ${
                      checked ? 'var(--color-stable)' : 'var(--border-metal)'
                    }`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setCheckedItems((prev) => ({
                          ...prev,
                          [idx]: e.target.checked,
                        }))
                      }
                    />
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>
                      {idx + 1}. {item}
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: checked
                        ? 'var(--color-stable)'
                        : 'var(--color-warning)',
                    }}
                  >
                    {checked ? 'ДА · ВЫПОЛНЕНО' : 'ПРОВЕРИТЬ'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 7. ПОЛНЫЙ КОМПЛЕКТ (11 ДОКУМЕНТОВ SHIFT KIT) ================= */}
      {subTab === 'kit_docs' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '340px 1fr',
            gap: '16px',
          }}
        >
          <div
            className="material-armor screw-corners"
            style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800 }}>
              11 ДОКУМЕНТОВ КОМПЛЕКТА «АПТАЙМ» (ПАПКА /docs)
            </div>
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Поиск по 11 документам..."
              className="instrument-btn mono"
              style={{ width: '100%', fontSize: '13px' }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                maxHeight: '540px',
                overflowY: 'auto',
              }}
            >
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`instrument-btn ${
                    activeDoc.id === doc.id ? 'btn-action' : ''
                  }`}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '8px 10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      fontSize: '13px',
                      fontWeight: 800,
                    }}
                  >
                    <span>{doc.title}</span>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    docs/{doc.filename}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className="material-paper"
            style={{
              padding: '22px 26px',
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
                borderBottom: '1px solid var(--border-metal)',
                paddingBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div
                  className="mono"
                  style={{ fontSize: '13px', color: 'var(--color-warning)' }}
                >
                  ФАЙЛ: docs/{activeDoc.filename}
                </div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 900 }}>
                  {activeDoc.title}
                </h2>
              </div>
              <span className="brass-nameplate">ДОКУМЕНТ {activeDoc.id}</span>
            </div>

            <pre
              className="mono"
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '14px',
                lineHeight: 1.6,
                background: 'rgba(0,0,0,0.22)',
                padding: '16px 18px',
                border: '1px solid var(--border-metal)',
                maxHeight: '580px',
                overflowY: 'auto',
              }}
            >
              {activeDoc.content}
            </pre>
          </div>
        </div>
      )}

      {/* ================= 8. ЖИВАЯ ТЕХНОЛОГИЧЕСКАЯ КАРТА 90 МИН И САМОАНАЛИЗ (ДОК. 09–10) ================= */}
      {subTab === 'tech_map' && (
        <TechMapSelfAnalysisPanel state={state} dispatch={dispatch} />
      )}
    </div>
  );
};
