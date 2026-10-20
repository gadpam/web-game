import React, { useEffect, useState } from 'react';
import {
  COMMISSION_QA,
  DEFENSE_SLIDES_12,
  INITIAL_SHIELD_RULES,
  REFERENCE_CARDS,
} from '../game/constants';
import { getUnlockedShieldCount } from '../game/engine';
import { KIT_DOCUMENTS } from '../game/kitDocuments';
import { GameAction } from '../game/reducer';
import { SessionState } from '../types/game';

interface MaterialsScreenProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
}

const DEFENSE_SEGMENTS = [
  { start: 0, end: 30, title: '0:00–0:30 · Проблема: игра-проверка vs игра-изучение (30 с)' },
  { start: 30, end: 70, title: '0:30–1:10 · Мир и вторжение: 02:07, 0 байт, 26 записей (40 с)' },
  { start: 70, end: 100, title: '1:10–1:40 · Победа (1214/1240) и поворот: Атаки продолжатся (30 с)' },
  { start: 100, end: 140, title: '1:40–2:20 · Четыре боя, бригады TRY/CATCH/FINALLY и щит 6/6 (40 с)' },
  { start: 140, end: 165, title: '2:20–2:45 · Старт в 09:00 и табло 1 240 клеток (25 с)' },
  { start: 165, end: 180, title: '2:45–3:00 · Итог числом выданных билетов (15 с)' },
];

export const MaterialsScreen: React.FC<MaterialsScreenProps> = ({
  state,
  dispatch,
}) => {
  const [subTab, setSubTab] = useState<
    | 'protocol'
    | 'shield_a4'
    | 'arbiter_blank'
    | 'defense_12'
    | 'homework'
    | 'kit_11'
  >('protocol');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [defenseSec, setDefenseSec] = useState(0);
  const [defenseRunning, setDefenseRunning] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(KIT_DOCUMENTS[0].id);
  const [docSearch, setDocSearch] = useState('');

  useEffect(() => {
    if (!defenseRunning) return;
    const t = setInterval(() => {
      setDefenseSec((s) => {
        if (s >= 180) {
          setDefenseRunning(false);
          return 180;
        }
        const next = s + 1;
        const autoSlide = Math.min(11, Math.floor((next / 180) * 12));
        setActiveSlideIdx(autoSlide);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [defenseRunning]);

  const shieldCount = getUnlockedShieldCount(state);
  const issuedTickets = state.queue.started ? state.queue.issued : 1210;
  const lostTickets = state.queue.started ? state.queue.lost : 30;
  const breachedText =
    state.queue.started && state.queue.lossReasons.length === 0
      ? 'нет (все 4 волны удержаны)'
      : state.queue.lossReasons.length > 0
      ? state.queue.lossReasons.join(', ')
      : 'волна 2 (порядок обработчиков)';

  const currentSlide = DEFENSE_SLIDES_12[activeSlideIdx];
  const currentDefenseSegment =
    DEFENSE_SEGMENTS.find(
      (seg) => defenseSec >= seg.start && defenseSec <= seg.end
    ) || DEFENSE_SEGMENTS[0];

  const currentDoc =
    KIT_DOCUMENTS.find((d) => d.id === selectedDocId) || KIT_DOCUMENTS[0];

  const filteredDocs = KIT_DOCUMENTS.filter(
    (d) =>
      !docSearch.trim() ||
      d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.content.toLowerCase().includes(docSearch.toLowerCase())
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
      {/* Панель переключения документов и кнопка печати A4 */}
      <div
        className="material-armor no-print"
        style={{
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSubTab('protocol')}
            className={`instrument-btn ${
              subTab === 'protocol' ? 'btn-action' : ''
            }`}
          >
            1. Протокол смены (A4)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('shield_a4')}
            className={`instrument-btn ${
              subTab === 'shield_a4' ? 'btn-action' : ''
            }`}
          >
            2. Раздатка «Шесть правил»
          </button>
          <button
            type="button"
            onClick={() => setSubTab('arbiter_blank')}
            className={`instrument-btn ${
              subTab === 'arbiter_blank' ? 'btn-action' : ''
            }`}
          >
            3. Бланк арбитра и Резерв карт
          </button>
          <button
            type="button"
            onClick={() => setSubTab('defense_12')}
            className={`instrument-btn ${
              subTab === 'defense_12' ? 'btn-action' : ''
            }`}
          >
            4. Защита (12 слайдов · 3 мин)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('homework')}
            className={`instrument-btn ${
              subTab === 'homework' ? 'btn-action' : ''
            }`}
          >
            5. Домашнее задание
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kit_11')}
            className={`instrument-btn ${
              subTab === 'kit_11' ? 'btn-action' : ''
            }`}
          >
            6. Все 11 документов комплекта
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => dispatch({ type: 'LOAD_DEMO_1210' })}
            className="instrument-btn btn-warning"
          >
            Заполнить эталоном 1210/1240
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="instrument-btn btn-stable"
          >
            Печать листа A4 [Ctrl+P]
          </button>
        </div>
      </div>

      {/* ВКЛАДКА 1: ПРОТОКОЛ СМЕНЫ (ОДНА СТРАНИЦА A4 — Документ 07, п. 6) */}
      {subTab === 'protocol' && (
        <div
          className="material-paper print-sheet-a4"
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            width: '100%',
            padding: '28px 34px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid var(--border-metal)',
              paddingBottom: '12px',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '0.14em',
              }}
            >
              ПРОТОКОЛ СМЕНЫ
            </div>
            <div
              className="mono"
              style={{ fontSize: '18px', color: 'var(--text-secondary)' }}
            >
              03:00 – 09:09 · СЛУЖБА «АПТАЙМ» · КОД ПАРТИИ {state.code}
            </div>
          </div>

          {/* СТАРТ ПРОДАЖ */}
          <div>
            <div
              className="mono"
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-warning)',
                marginBottom: '6px',
              }}
            >
              СТАРТ ПРОДАЖ (09:00)
            </div>
            <div className="mono" style={{ fontSize: '20px', lineHeight: 1.6 }}>
              <div>
                билетов выдано .........................{' '}
                <strong
                  style={{ fontSize: '26px', color: 'var(--color-stable)' }}
                >
                  {issuedTickets} из 1240
                </strong>
              </div>
              <div>
                пробито ................................{' '}
                <strong
                  style={{
                    color:
                      lostTickets > 0
                        ? 'var(--color-incident)'
                        : 'var(--color-stable)',
                  }}
                >
                  {breachedText}
                </strong>
              </div>
              <div>
                потеряно ...............................{' '}
                <strong>{lostTickets} человек</strong>
              </div>
            </div>
          </div>

          {/* БОИ 1–4 */}
          <div>
            <div
              className="mono"
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-warning)',
                marginBottom: '6px',
              }}
            >
              БОИ
            </div>
            <div className="mono" style={{ fontSize: '16px', lineHeight: 1.7 }}>
              {([1, 2, 3, 4] as const).map((bNum) => {
                const b = state.battles[bNum];
                return (
                  <div key={bNum}>
                    {b.number} {b.codeName.padEnd(10, ' ')} атака {b.attacker}{' '}
                    / защита {b.defender} / арбитр {b.arbiter} ...... пробила{' '}
                    {b.probedCount} · отбито {b.repelledCount}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ЩИТ 6/6 */}
          <div>
            <div
              className="mono"
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-warning)',
                marginBottom: '6px',
              }}
            >
              ЩИТ {shieldCount}/6
            </div>
            <div className="mono" style={{ fontSize: '16px' }}>
              анатомия · механизм · перехват · порядок · гарантия · честность
            </div>
          </div>

          {/* НОМИНАЦИИ */}
          <div>
            <div
              className="mono"
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-warning)',
                marginBottom: '6px',
              }}
            >
              НОМИНАЦИИ СМЕНЫ
            </div>
            <div className="mono" style={{ fontSize: '16px', lineHeight: 1.6 }}>
              <div>
                самый точный разбор ....................{' '}
                <strong>{state.nominations.mostPreciseAnalysis}</strong> (карта
                назвала строку и тип без лишней детали)
              </div>
              <div>
                лучший журнал ..........................{' '}
                <strong>{state.nominations.bestJournal}</strong> (запись, по
                которой смену можно восстановить через сутки)
              </div>
              <div>
                честная ошибка .........................{' '}
                <strong>{state.nominations.honestMistake}</strong> (разобранная
                ошибка, которая научила смену)
              </div>
            </div>
          </div>

          {/* ЖУРНАЛ СМЕНЫ */}
          <div>
            <div
              className="mono"
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'var(--color-warning)',
                marginBottom: '6px',
              }}
            >
              ВЫПИСКА ИЗ ЖУРНАЛА СМЕНЫ
            </div>
            <table
              className="mono"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-metal)',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '6px' }}>Время</th>
                  <th style={{ padding: '6px' }}>Бой</th>
                  <th style={{ padding: '6px' }}>Кто</th>
                  <th style={{ padding: '6px' }}>Что заявлено</th>
                  <th style={{ padding: '6px' }}>Что проверено</th>
                  <th style={{ padding: '6px' }}>Результат</th>
                </tr>
              </thead>
              <tbody>
                {state.journal.slice(0, 8).map((j) => (
                  <tr
                    key={j.id}
                    style={{ borderBottom: '1px solid rgba(143,176,198,0.2)' }}
                  >
                    <td style={{ padding: '6px' }}>{j.shiftTime}</td>
                    <td style={{ padding: '6px' }}>{j.roundNumber || '—'}</td>
                    <td style={{ padding: '6px', fontWeight: 700 }}>{j.actor}</td>
                    <td style={{ padding: '6px' }}>{j.claimed}</td>
                    <td style={{ padding: '6px' }}>{j.verified}</td>
                    <td style={{ padding: '6px', fontWeight: 800 }}>{j.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ПОДПИСИ */}
          <div
            className="mono"
            style={{
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '2px solid var(--border-metal)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '15px',
            }}
          >
            <span>ведущий смены _______________</span>
            <span>арбитры TRY / CATCH / FINALLY _______________</span>
            <span>дежурные бригад _______________</span>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 2: РАЗДАТКА «ШЕСТЬ ПРАВИЛ» (ЩИТ СМЕНЫ A4 — Документ 07, п. 7) */}
      {subTab === 'shield_a4' && (
        <div
          className="material-paper print-sheet-a4"
          style={{
            maxWidth: '860px',
            margin: '0 auto',
            width: '100%',
            padding: '28px 34px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: '30px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              borderBottom: '2px solid var(--border-metal)',
              paddingBottom: '10px',
            }}
          >
            ЩИТ СМЕНЫ · ШЕСТЬ ПРАВИЛ
          </div>
          {INITIAL_SHIELD_RULES.map((r) => (
            <div key={r.id} style={{ padding: '8px 0' }}>
              <div
                className="mono"
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: 'var(--color-warning)',
                }}
              >
                {r.id}. {r.code}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>
                {r.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ВКЛАДКА 3: ПРОТОКОЛ АРБИТРА НА ОДИН БОЙ + РЕЗЕРВНЫЕ БУМАЖНЫЕ КАРТЫ (Документ 07, п. 1, 3, 8) */}
      {subTab === 'arbiter_blank' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="material-paper print-sheet-a4"
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              width: '100%',
              padding: '24px 30px',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '22px',
                fontWeight: 900,
                marginBottom: '12px',
                borderBottom: '2px solid var(--border-metal)',
                paddingBottom: '8px',
              }}
            >
              ПЕЧАТНЫЙ ПРОТОКОЛ АРБИТРА (ФОРМА НА ОДИН БОЙ)
            </div>
            <pre
              className="mono"
              style={{
                fontSize: '15px',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
{`БОЙ ____   ФАЗА ______________   ВРЕМЯ СМЕНЫ ______

Атакует: ________________   Защищается: ________________   Арбитр: ________________

КАРТА АТАКИ
  строка ______   тип ____________________________________
  утверждение ____________________________________________________________________

КАРТА ЗАЩИТЫ
  строка ______   обработчик / слот ______________________
  утверждение ____________________________________________________________________

ЖИВОЙ ЗАПУСК ПОЛИГОНА
  результат:  [ ] ПРОБИЛА     [ ] ОТБИТА     [ ] НЕ ПРИНЯТА
  причина: _______________________________________________________________________

ОЧКИ РАУНДА
  атакующим (+1 легальная, +2 пробила): ______
  защите (+1 отбита, +2 контратака):    ______
  арбитру (+1 вердикт, +1 пропуск):     ______

ЖУРНАЛ СМЕНЫ (одна строка)
  ________________________________________________________________________________

ПРОПУСК, НАЙДЕННЫЙ АРБИТРОМ (+1)
  ________________________________________________________________________________`}
            </pre>
          </div>

          <div
            className="material-armor print-sheet-a4"
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              width: '100%',
              padding: '20px 26px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                marginBottom: '10px',
              }}
            >
              ЭТАЛОННЫЙ КОМПЛЕКТ КАРТ (БОИ 1–4 · ДЛЯ АВТОПРОВЕРКИ И БУМАЖНОГО РЕЗЕРВА)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '10px',
              }}
            >
              {REFERENCE_CARDS.map((card, idx) => (
                <div
                  key={idx}
                  className="material-paper"
                  style={{ padding: '12px 14px' }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-warning)',
                      fontWeight: 800,
                    }}
                  >
                    БОЙ {card.battleNumber} · КАРТА: {card.cardType.toUpperCase()}
                  </div>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 800, marginTop: '4px' }}>
                    {card.file} : строка {card.line} · {card.exceptionType}
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    «{card.statement}»
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '6px',
                      borderTop: '1px dashed var(--border-metal)',
                      paddingTop: '4px',
                    }}
                  >
                    {card.arbiterMissedSpotHint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 4: ПРЕЗЕНТАЦИЯ И РЕЧЬ ЗАЩИТЫ (12 слайдов на 3 минуты + Таймер + Вопросы — Документ 11) */}
      {subTab === 'defense_12' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Таймер защиты на 3:00 (180 секунд) */}
          <div
            className="material-armor screw-corners"
            style={{
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
                ТАЙМИНГ ЗАЩИТЫ УРОКА (3 МИНУТЫ = 180 СЕКУНД · ДОКУМЕНТ 11, П. 4)
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-warning)' }}>
                Текущий отрезок: {currentDefenseSegment.title}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Правило: «Не уложились — режьте блок 4, но никогда не режьте поворот: он и есть смысл урока.»
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className={`seven-segment-window ${
                  defenseSec >= 165 ? 'red-zone' : ''
                }`}
                style={{ fontSize: '28px', padding: '4px 12px' }}
              >
                {Math.floor(defenseSec / 60)}:
                {String(defenseSec % 60).padStart(2, '0')} / 3:00
              </div>
              <button
                type="button"
                onClick={() => setDefenseRunning((r) => !r)}
                className={`instrument-btn ${
                  defenseRunning ? 'btn-warning' : 'btn-stable'
                }`}
              >
                {defenseRunning ? 'Пауза защиты' : 'Пуск 3:00'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDefenseRunning(false);
                  setDefenseSec(0);
                  setActiveSlideIdx(0);
                }}
                className="instrument-btn"
              >
                Сброс 0:00
              </button>
            </div>
          </div>

          <div
            className="material-screen"
            style={{
              padding: '28px 32px',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: 'var(--text-caption)',
              }}
            >
              <span>
                СЛАЙД {currentSlide.number} ИЗ 12 · ТАЙМИНГ СЛАЙДА:{' '}
                {currentSlide.timeRange}
              </span>
              <span>НА СЛАЙДЕ — НЕ ТЕКСТ, А СОСТОЯНИЕ</span>
            </div>

            <div
              className="mono"
              style={{
                fontSize: '36px',
                fontWeight: 900,
                textAlign: 'center',
                padding: '28px 16px',
                color: 'var(--color-warning)',
                letterSpacing: '0.06em',
              }}
            >
              {currentSlide.onSlide}
            </div>

            <div
              className="material-paper"
              style={{
                padding: '16px 20px',
                fontSize: '19px',
                fontWeight: 600,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                РЕЧЬ ЗАЩИТЫ (ЧТО ГОВОРИТЬ НА СЛАЙДЕ):
              </span>
              «{currentSlide.speech}»
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveSlideIdx((i) => Math.max(0, i - 1))
                }
                className="instrument-btn"
              >
                ← Предыдущий слайд
              </button>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {DEFENSE_SLIDES_12.map((s, idx) => (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`instrument-btn mono ${
                      idx === activeSlideIdx ? 'btn-action' : ''
                    }`}
                    style={{ padding: '4px 9px' }}
                  >
                    {s.number}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveSlideIdx((i) =>
                    Math.min(DEFENSE_SLIDES_12.length - 1, i + 1)
                  )
                }
                className="instrument-btn btn-action"
              >
                Следующий слайд →
              </button>
            </div>
          </div>

          {/* Ответы на вероятные вопросы комиссии */}
          <div className="material-armor" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '10px' }}>
              ОТВЕТЫ НА ВЕРОЯТНЫЕ ВОПРОСЫ КОМИССИИ (ДОКУМЕНТ 11, РАЗДЕЛ 3)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '10px',
              }}
            >
              {COMMISSION_QA.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    borderLeft: '3px solid var(--color-action)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--color-warning)',
                    }}
                  >
                    В: {item.q}
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    О: {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 5: ДОМАШНЕЕ ЗАДАНИЕ ТРЁХ УРОВНЕЙ (Документ 09, п. 5) */}
      {subTab === 'homework' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
          }}
        >
          {[
            {
              level: '1. ОБЯЗАТЕЛЬНЫЙ УРОВЕНЬ',
              badge: 'По журналу смены',
              task: 'Восстановить по журналу смены один бой и описать, каким именно обработчиком он отбивался и почему без него пакет останавливался.',
            },
            {
              level: '2. ПОВЫШЕННЫЙ УРОВЕНЬ',
              badge: 'Собственный тип исключения',
              task: 'Написать собственный класс исключения TicketBookingException для домена «бронь билетов» и обосновать, почему не подошёл стандартный тип.',
            },
            {
              level: '3. ВЫСОКИЙ УРОВЕНЬ',
              badge: 'Аудит собственного проекта',
              task: 'Найти в своём учебном или курсовом проекте место без обработки исключений и доказать, что оно опасно, — с конкретным входным примером падения.',
            },
          ].map((hw, i) => (
            <div
              key={i}
              className="material-paper"
              style={{ padding: '18px 20px' }}
            >
              <div
                className="mono"
                style={{
                  fontSize: '13px',
                  color: 'var(--color-warning)',
                  fontWeight: 800,
                }}
              >
                {hw.badge}
              </div>
              <div
                style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px' }}
              >
                {hw.level}
              </div>
              <div
                style={{ fontSize: '16px', marginTop: '10px', lineHeight: 1.5 }}
              >
                {hw.task}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ВКЛАДКА 6: ПОЛНЫЙ КОМПЛЕКТ ИЗ 11 ДОКУМЕНТОВ СМЕНЫ (00–11) */}
      {subTab === 'kit_11' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '14px',
          }}
        >
          <aside
            className="material-armor"
            style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800 }}>
              11 ДОКУМЕНТОВ КОМПЛЕКТА (docs/*.md)
            </div>
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Поиск по документам..."
              className="instrument-btn"
              style={{ width: '100%' }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`instrument-btn ${
                    selectedDocId === doc.id ? 'btn-action' : ''
                  }`}
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    padding: '8px 10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>
                      {doc.title}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-caption)',
                      }}
                    >
                      docs/{doc.filename}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section
            className="material-paper print-sheet-a4"
            style={{ padding: '22px 28px', overflowX: 'auto' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid var(--border-metal)',
                paddingBottom: '10px',
                marginBottom: '14px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>
                {currentDoc.title}
              </h2>
              <span className="mono" style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                docs/{currentDoc.filename}
              </span>
            </div>
            <pre
              style={{
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                fontSize: '15px',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {currentDoc.content}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
};
