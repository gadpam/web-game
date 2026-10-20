import React, { useEffect, useState } from 'react';
import {
  BATTLE_TACTS,
  INITIAL_SHIELD_RULES,
  PROLOGUE_LOG_LINES,
  PROLOGUE_MINES,
  PROLOGUE_SECOND_WAVE_LOGS,
} from '../game/constants';
import {
  DEFENSE_SLIDE_SPECS,
  DEFENSE_TIMING_SEGMENTS,
  formatDefenseClock,
  getSlideForElapsedSeconds,
  getTimingSegmentForElapsedSeconds,
} from '../game/defenseDeck';
import { GameAction } from '../game/reducer';
import { SessionState } from '../types/game';

interface DefenseDeckPanelProps {
  state: SessionState;
  dispatch?: (action: GameAction) => void;
}

const FULL_COMMISSION_QA = [
  {
    q: '1. Это игра или урок?',
    a: 'Урок открытия нового знания в игровой форме. Оценки в ходе игры не выставляются: игра — обучение, контроль переносится на домашнее задание трёх уровней и разбор протокола.',
  },
  {
    q: '2. Не слишком ли сложно за 90 минут?',
    a: 'Сложность в темпе, а не в материале. Полигон ограничен четырьмя слотами патчей — синтаксис не отнимает время у инженерной мысли.',
  },
  {
    q: '3. Что если сеть упадёт?',
    a: 'Три режима в один клик: Полный (сервер + клиенты), Ручной (экран ведёт преподаватель) и Автономный (один экран + бумажные карты). Смена не останавливается.',
  },
  {
    q: '4. Как вы оцениваете результат каждого?',
    a: 'В игре — исполнение одной из 6 ролей и записи в бортовом журнале. Отметка выставляется за домашнее задание трёх уровней и разбор протокола на следующем уроке.',
  },
  {
    q: '5. Не учите ли вы взламывать?',
    a: 'Группа всегда на стороне защиты. Роль атакующего — red team, легальная профессия тестирования на устойчивость. Стенд учебный, реальные сервисы не затронуты.',
  },
  {
    q: '6. Почему именно 26 записей и 1 240 человек?',
    a: '26 записей достаточно, чтобы пакет падал многократно без try-catch, и достаточно мало, чтобы разбор оставался посильным за 15 минут завязки.',
  },
  {
    q: '7. Чем это отличается от обычного квеста?',
    a: 'Квест проверяет готовое знание, а эта игра производит понятие. Здесь ни один термин не называется раньше, чем в нём возникла нужда на упавшем пакете.',
  },
  {
    q: '8. Почему такие крупные элементы интерфейса?',
    a: 'Проектор и последний ряд аудитории. Минимум 13 пикселей, очки бригад — 56 пикселей. Проверялось на читаемость с двадцати метров.',
  },
];

export const DefenseDeckPanel: React.FC<DefenseDeckPanelProps> = ({
  state,
  dispatch,
}) => {
  const [selectedSlide, setSelectedSlide] = useState<number>(1);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [autoAdvanceSlides, setAutoAdvanceSlides] = useState<boolean>(true);
  const [autoSyncHall, setAutoSyncHall] = useState<boolean>(false);

  const currentSlide =
    DEFENSE_SLIDE_SPECS.find((s) => s.number === selectedSlide) ||
    DEFENSE_SLIDE_SPECS[0];
  const activeSegment = getTimingSegmentForElapsedSeconds(elapsedSec);
  const remainingSec = Math.max(0, 180 - elapsedSec);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => {
        if (prev >= 180) {
          setTimerRunning(false);
          return 180;
        }
        const next = prev + 1;
        if (autoAdvanceSlides) {
          const nextSlide = getSlideForElapsedSeconds(next);
          setSelectedSlide(nextSlide.number);
          if (autoSyncHall && dispatch) {
            dispatch({
              type: 'APPLY_REHEARSAL_CHECKPOINT',
              checkpointId: nextSlide.rehearsalCheckpointId,
            });
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, autoAdvanceSlides, autoSyncHall, dispatch]);

  const handleSelectSlide = (slideNum: number) => {
    const spec =
      DEFENSE_SLIDE_SPECS.find((s) => s.number === slideNum) ||
      DEFENSE_SLIDE_SPECS[0];
    setSelectedSlide(spec.number);
    setElapsedSec(spec.startSec);
    if (autoSyncHall && dispatch) {
      dispatch({
        type: 'APPLY_REHEARSAL_CHECKPOINT',
        checkpointId: spec.rehearsalCheckpointId,
      });
    }
  };

  const handleSyncHallNow = () => {
    if (!dispatch) return;
    dispatch({
      type: 'APPLY_REHEARSAL_CHECKPOINT',
      checkpointId: currentSlide.rehearsalCheckpointId,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ================= ВЕРХНЯЯ ПАНЕЛЬ: 6-СЕКЦИОННЫЙ ТАЙМЕР 3:00 (ДОКУМЕНТ 11, П. 4) ================= */}
      <div
        className="material-armor screw-corners"
        style={{
          padding: '14px 18px',
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
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="brass-nameplate">
                ТАЙМИНГ ЗАЩИТЫ · 12 СЛАЙДОВ ЗА 3:00 (ДОКУМЕНТ 11, П. 4)
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '13px',
                  padding: '3px 8px',
                  border: '1px solid var(--border-metal)',
                  color:
                    activeSegment.policy === 'never_cut'
                      ? 'var(--color-incident)'
                      : activeSegment.policy === 'cut_if_late'
                      ? 'var(--color-warning)'
                      : 'var(--color-action)',
                  fontWeight: 800,
                }}
              >
                {activeSegment.title} ({activeSegment.rangeLabel})
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {activeSegment.policyNote}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              className="seven-seg-window"
              style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-caption)' }}>ИДЁТ:</span>
              <span className="mono" style={{ fontSize: '24px', fontWeight: 900 }}>
                {formatDefenseClock(elapsedSec)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-caption)' }}>ОСТАЛОСЬ:</span>
              <span
                className="mono"
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: remainingSec <= 30 ? 'var(--color-incident)' : 'var(--color-stable)',
                }}
              >
                {formatDefenseClock(remainingSec)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className={`instrument-btn ${timerRunning ? 'btn-warning' : 'btn-stable'}`}
            >
              {timerRunning ? 'Пауза речи' : 'Пуск 3:00'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setElapsedSec(0);
                setSelectedSlide(1);
              }}
              className="instrument-btn"
            >
              Сброс 0:00
            </button>
            <label
              className="instrument-btn"
              style={{ cursor: 'pointer', fontSize: '13px', gap: '6px' }}
            >
              <input
                type="checkbox"
                checked={autoAdvanceSlides}
                onChange={(e) => setAutoAdvanceSlides(e.target.checked)}
              />
              <span>Автосмена слайдов</span>
            </label>
            {dispatch && (
              <label
                className="instrument-btn"
                style={{ cursor: 'pointer', fontSize: '13px', gap: '6px' }}
                title="Автоматически переключать состояние Экрана зала синхронно со слайдами"
              >
                <input
                  type="checkbox"
                  checked={autoSyncHall}
                  onChange={(e) => setAutoSyncHall(e.target.checked)}
                />
                <span>Синхр. Экран зала</span>
              </label>
            )}
          </div>
        </div>

        {/* 6-секционная шкала 180 секунд */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '30fr 40fr 30fr 40fr 25fr 15fr',
            gap: '4px',
          }}
        >
          {DEFENSE_TIMING_SEGMENTS.map((seg) => {
            const isActive = activeSegment.id === seg.id;
            const isDone = elapsedSec >= seg.endSec;
            const borderColor =
              seg.policy === 'never_cut'
                ? 'var(--color-incident)'
                : seg.policy === 'cut_if_late'
                ? 'var(--color-warning)'
                : isActive
                ? 'var(--color-action)'
                : 'var(--border-metal)';
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => {
                  const firstSlide = seg.slides[0];
                  handleSelectSlide(firstSlide);
                }}
                className="instrument-btn"
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '6px 8px',
                  borderColor,
                  background: isActive
                    ? 'rgba(79, 195, 247, 0.16)'
                    : isDone
                    ? 'rgba(53, 208, 160, 0.1)'
                    : 'rgba(0, 0, 0, 0.28)',
                }}
                title={seg.policyNote}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <span>{seg.rangeLabel}</span>
                  <span>{seg.durationSec}с</span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}
                >
                  {seg.policy === 'never_cut'
                    ? '★ ПОВОРОТ (НЕ РЕЗАТЬ)'
                    : seg.policy === 'cut_if_late'
                    ? '✂ БЛОК 4 (МОЖНО СЖАТЬ)'
                    : `Сл. ${seg.slides.join('–')}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= ОСНОВНАЯ СЕТКА: 12 СЛАЙДОВ + ЖИВАЯ ПРИБОРНАЯ СЦЕНА ================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '16px',
        }}
      >
        {/* Левая колонка: список 12 слайдов */}
        <div
          className="material-armor screw-corners"
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '4px' }}>
            12 СЛАЙДОВ-СОСТОЯНИЙ (ДОК. 11, П. 1)
          </div>
          {DEFENSE_SLIDE_SPECS.map((sl) => (
            <button
              key={sl.number}
              type="button"
              onClick={() => handleSelectSlide(sl.number)}
              className={`instrument-btn ${
                selectedSlide === sl.number ? 'btn-action' : ''
              }`}
              style={{
                justifyContent: 'space-between',
                textAlign: 'left',
                padding: '7px 10px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                Слайд {sl.number} · Т{sl.rehearsalCheckpointId}
              </span>
              <span className="mono" style={{ fontSize: '13px' }}>
                {sl.timeRange}
              </span>
            </button>
          ))}
        </div>

        {/* Правая колонка: Приборная сцена слайда + Суфлёр докладчика */}
        <div
          className="material-screen"
          style={{
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Заголовок и кнопка синхронизации с Экраном зала */}
          <div>
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
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-warning)',
                    fontWeight: 800,
                  }}
                >
                  СЛАЙД {currentSlide.number} ИЗ 12 · ТАЙМКОД {currentSlide.timeRange} · «НА
                  СЛАЙДЕ — СОСТОЯНИЕ, А НЕ ТЕКСТ»
                </div>
                <h2
                  style={{
                    fontSize: '30px',
                    fontWeight: 900,
                    margin: '6px 0 0 0',
                    color: 'var(--text-main)',
                  }}
                >
                  {currentSlide.onSlide}
                </h2>
              </div>

              {dispatch && (
                <button
                  type="button"
                  onClick={handleSyncHallNow}
                  className="instrument-btn btn-action"
                  title="Выставить соответствующую контрольную точку БКП-1 на Экране зала и в окне проектора"
                >
                  Вывести состояние на Экран зала (Т{currentSlide.rehearsalCheckpointId})
                </button>
              )}
            </div>
          </div>

          {/* ================= ЖИВАЯ ПРИБОРНАЯ СЦЕНА ДЛЯ СЛАЙДОВ 1–12 ================= */}
          <div
            className="material-armor"
            style={{
              padding: '18px 20px',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {/* СЛАЙД 1 */}
            {currentSlide.number === 1 && (
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-warning)',
                    letterSpacing: '0.16em',
                  }}
                >
                  СПЕЦИАЛЬНОСТЬ ПОИТ · 3 КУРС · ПАРА 90 МИНУТ · МЕХАНИЗМ ИСКЛЮЧЕНИЙ C#
                </div>
                <div
                  style={{
                    fontSize: '52px',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    margin: '10px 0',
                  }}
                >
                  АПТАЙМ · НОЧНАЯ СМЕНА
                </div>
                <div
                  className="mono"
                  style={{
                    display: 'inline-flex',
                    gap: '16px',
                    padding: '8px 18px',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid var(--border-metal)',
                    fontSize: '16px',
                  }}
                >
                  <span>СМЕНА: 03:00 → 09:00</span>
                  <span>·</span>
                  <span>ОЧЕРЕДЬ: 1 240 ЧЕЛ.</span>
                  <span>·</span>
                  <span>БРИГАДЫ: ▲ TRY · ⬡ CATCH · ■ FINALLY</span>
                </div>
              </div>
            )}

            {/* СЛАЙД 2 */}
            {currentSlide.number === 2 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px dashed var(--border-metal)',
                    opacity: 0.65,
                  }}
                >
                  <div className="mono" style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                    ОБЫЧНАЯ СХЕМА (ОТКАЗАЛИСЬ)
                  </div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      textDecoration: 'line-through',
                      margin: '6px 0',
                    }}
                  >
                    ИГРА-ПРОВЕРКА
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Сначала 20 минут объяснения синтаксиса → затем викторина на закрепление.
                    Игра лишь украшает контроль.
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(53, 208, 160, 0.12)',
                    border: '2px solid var(--color-stable)',
                  }}
                >
                  <div className="mono" style={{ fontSize: '13px', color: 'var(--color-stable)' }}>
                    НАША СХЕМА (ПОРЯДОК «НУЖДА ДО ТЕРМИНА»)
                  </div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      color: 'var(--color-stable)',
                      margin: '6px 0',
                    }}
                  >
                    ИГРА-ИЗУЧЕНИЕ
                  </div>
                  <div className="mono" style={{ fontSize: '14px', fontWeight: 700 }}>
                    1. Нужда (падение) → 2. Инструмент → 3. Применение → 4. Последствие → 5. Имя
                  </div>
                </div>
              </div>
            )}

            {/* СЛАЙД 3 */}
            {currentSlide.number === 3 && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.52)',
                  border: '1px solid var(--border-metal)',
                  padding: '12px 14px',
                }}
              >
                {PROLOGUE_LOG_LINES.map((item, i) => (
                  <div
                    key={i}
                    className="code-line-row"
                    style={{
                      fontSize: '18px',
                      color:
                        item.level === 'danger' ? 'var(--color-incident)' : 'var(--text-main)',
                    }}
                  >
                    <span style={{ width: '90px', color: 'var(--text-caption)' }}>{item.time}</span>
                    <span style={{ width: '110px', color: 'var(--color-warning)' }}>
                      {item.unit}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* СЛАЙД 4 */}
            {currentSlide.number === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(53,208,160,0.1)',
                      border: '2px solid var(--color-stable)',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                      ПОХИЩЕНО / СКАЧАНО
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-stable)' }}
                    >
                      ВЫГРУЗКА — 0 БАЙТ
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(255,93,93,0.12)',
                      border: '2px solid var(--color-incident)',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                      ВСТАВЛЕНО В ОЧЕРЕДЬ (1 240 ЧЕЛ.)
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '36px',
                        fontWeight: 900,
                        color: 'var(--color-incident)',
                      }}
                    >
                      26 ЗАПИСЕЙ-МИН
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                  }}
                >
                  {PROLOGUE_MINES.map((m) => (
                    <div
                      key={m.id}
                      className="mono"
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-metal)',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                        {m.field} = {m.badValue}
                      </div>
                      <div style={{ color: 'var(--color-incident)' }}>{m.expectedType}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* СЛАЙД 5 */}
            {currentSlide.number === 5 && (
              <div
                style={{
                  padding: '20px 24px',
                  background: 'rgba(53, 208, 160, 0.14)',
                  border: '2px solid var(--color-stable)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div className="mono" style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                    03:14:19 · batch · механизм try-catch-finally собран
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '34px', fontWeight: 900, color: 'var(--color-stable)' }}
                  >
                    ПРОШЛО: 1 214 ИЗ 1 240 · В ОТЧЁТ: 26 · ОСТАНОВОК: 0
                  </div>
                  <div style={{ fontSize: '15px', marginTop: '4px' }}>
                    «Двадцать шесть — в отчёт. Тысяча двести четырнадцать — билеты. Отбито.»
                  </div>
                </div>
                <span className="heavy-stamp stamp-repelled">ОТБИТО</span>
              </div>
            )}

            {/* СЛАЙД 6 */}
            {currentSlide.number === 6 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.48)',
                    border: '1px solid var(--color-incident)',
                  }}
                >
                  {PROLOGUE_SECOND_WAVE_LOGS.slice(0, 3).map((l, i) => (
                    <div
                      key={i}
                      className="mono"
                      style={{ fontSize: '15px', color: 'var(--color-incident)' }}
                    >
                      {l.time} {l.unit} — {l.text}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(255, 93, 93, 0.15)',
                    borderLeft: '6px solid var(--color-incident)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '38px',
                      fontWeight: 900,
                      letterSpacing: '0.14em',
                      color: 'var(--color-incident)',
                    }}
                  >
                    АТАКИ ПРОДОЛЖАТСЯ
                  </div>
                  <div className="mono" style={{ fontSize: '16px', marginTop: '4px' }}>
                    ДО СТАРТА 05:43 · ПРОГОНОВ: 4 · БРИГАД: 3 · формат · порядок · ресурс · след
                  </div>
                </div>
              </div>
            )}

            {/* СЛАЙД 7 */}
            {currentSlide.number === 7 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {(
                  [
                    {
                      sym: '▲',
                      name: 'TRY',
                      role: 'Очерчивает опасную зону',
                      wave: 'Волна 1: формат',
                    },
                    {
                      sym: '⬡',
                      name: 'CATCH',
                      role: 'Ловит точный тип по иерархии',
                      wave: 'Волна 2: порядок',
                    },
                    {
                      sym: '■',
                      name: 'FINALLY',
                      role: 'Закрывает соединение всегда',
                      wave: 'Волна 3: ресурс',
                    },
                  ] as const
                ).map((b) => (
                  <div
                    key={b.name}
                    style={{
                      padding: '14px 16px',
                      background: 'rgba(0,0,0,0.38)',
                      border: '2px solid var(--border-metal)',
                    }}
                  >
                    <span className="brass-nameplate">
                      <span>{b.sym}</span>
                      <span>БРИГАДА {b.name}</span>
                    </span>
                    <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '10px' }}>
                      {b.role}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: '13px', color: 'var(--color-warning)', marginTop: '4px' }}
                    >
                      {b.wave} · клеймо формы (не цвет!)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* СЛАЙД 8 */}
            {currentSlide.number === 8 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}
              >
                {BATTLE_TACTS.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(0,0,0,0.36)',
                      border: '1px solid var(--color-action)',
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: 'var(--color-action)',
                      }}
                    >
                      <span>{t.title}</span>
                      <span>{t.durationSec} с</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>
                      {t.actor}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {t.instruction}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* СЛАЙД 9 */}
            {currentSlide.number === 9 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {INITIAL_SHIELD_RULES.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(53,208,160,0.1)',
                      border: '1px solid var(--color-stable)',
                    }}
                  >
                    <div
                      className="mono"
                      style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-stable)' }}
                    >
                      ✓ ПРАВИЛО №{r.id} · {r.code}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{r.text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* СЛАЙД 10 */}
            {currentSlide.number === 10 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.42)',
                  border: '2px solid var(--color-warning)',
                }}
              >
                <div>
                  <span className="brass-nameplate">БЛОК ВРЕМЕНИ БВ-1 · ЧАСЫ СМЕНЫ</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '8px' }}>
                    03:00 → 04:00 → 05:00 → 06:00 → 07:00 → 08:00 → 08:55 → 09:00
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    В 08:55 игровые часы впервые совпадают с реальными секундами 1:1 (5 минут до
                    старта).
                  </div>
                </div>
                <div className="seven-seg-window" style={{ padding: '10px 18px' }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: '42px',
                      fontWeight: 900,
                      color: 'var(--color-warning)',
                    }}
                  >
                    08:55 · 05:00
                  </div>
                </div>
              </div>
            )}

            {/* СЛАЙД 11 */}
            {currentSlide.number === 11 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 800 }}>
                    ТАБЛО ОЧЕРЕДИ 09:00 (1 240 КЛЕТОК · 1 ПРОБИТАЯ ВОЛНА = −30 ЧЕЛОВЕК)
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: '15px', color: 'var(--color-incident)', fontWeight: 800 }}
                  >
                    ВОЛНА 2 ПРОБИЛА (ДЫРА ВИДНА С ПОСЛЕДНЕГО РЯДА)
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(31, 1fr)',
                    gap: '3px',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.5)',
                  }}
                >
                  {Array.from({ length: 124 }).map((_, idx) => {
                    const isHole = idx >= 42 && idx < 45;
                    return (
                      <div
                        key={idx}
                        style={{
                          height: '14px',
                          borderRadius: '2px',
                          background: isHole
                            ? 'var(--color-incident)'
                            : 'var(--color-stable)',
                          opacity: isHole ? 1 : 0.85,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* СЛАЙД 12 */}
            {currentSlide.number === 12 && (
              <div
                className="material-paper"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div className="mono" style={{ fontSize: '14px', color: 'var(--text-caption)' }}>
                    ПРОТОКОЛ СМЕНЫ · 03:00 – 09:09 · ГЛАВНЫЙ АРТЕФАКТ УРОКА
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '38px', fontWeight: 900, marginTop: '4px' }}
                  >
                    БИЛЕТОВ ВЫДАНО: 1 210 ИЗ 1 240
                  </div>
                  <div style={{ fontSize: '16px', marginTop: '4px' }}>
                    Итог урока измеряется не очками, а числом людей, которые ушли с билетами.
                  </div>
                </div>
                <span className="heavy-stamp stamp-repelled">1210 / 1240</span>
              </div>
            )}
          </div>

          {/* ДОСЛОВНАЯ РЕЧЬ ДОКЛАДЧИКА */}
          <div className="material-paper" style={{ padding: '16px 20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: 'var(--text-caption)',
                fontWeight: 800,
              }}
            >
              <span>ДОСЛОВНАЯ РЕЧЬ НА СЛАЙДЕ (ДОКУМЕНТ 11, П. 1–2):</span>
              <span>{currentSlide.visualCaption}</span>
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                marginTop: '6px',
                lineHeight: 1.4,
              }}
            >
              «{currentSlide.speech}»
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginTop: '6px',
              }}
            >
              Развёрнутый абзац речи (380 слов): {currentSlide.extendedSpeech}
            </div>
          </div>

          {/* Навигация слайдов */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              disabled={selectedSlide <= 1}
              onClick={() => handleSelectSlide(Math.max(1, selectedSlide - 1))}
              className="instrument-btn"
            >
              ← Предыдущий слайд
            </button>
            <button
              type="button"
              disabled={selectedSlide >= 12}
              onClick={() => handleSelectSlide(Math.min(12, selectedSlide + 1))}
              className="instrument-btn btn-action"
            >
              Следующий слайд →
            </button>
          </div>

          {/* 8 ОТВЕТОВ НА ВЕРОЯТНЫЕ ВОПРОСЫ КОМИССИИ (ДОКУМЕНТ 11, П. 3) */}
          <div
            className="material-armor"
            style={{
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-warning)',
                fontWeight: 800,
              }}
            >
              ШПАРГАЛКА ЗАЩИТЫ · ВСЕ 8 ОТВЕТОВ НА ВОПРОСЫ КОМИССИИ (ДОКУМЕНТ 11, П. 3)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {FULL_COMMISSION_QA.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.28)',
                    borderLeft: '3px solid var(--color-action)',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>{item.q}</div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
