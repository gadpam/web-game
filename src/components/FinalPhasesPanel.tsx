import React, { useState } from 'react';
import { PATCH_SLOTS, WORLD_PRESETS } from '../game/constants';
import { getUnlockedShieldCount, isShieldComplete } from '../game/engine';
import { GameAction } from '../game/reducer';
import { BrigadeId, ScreenView, SessionState } from '../types/game';

interface FinalPhasesPanelProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  onNavigateScreen: (screen: ScreenView) => void;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const FinalPhasesPanel: React.FC<FinalPhasesPanelProps> = ({
  state,
  dispatch,
  onNavigateScreen,
}) => {
  const [hwPicks, setHwPicks] = useState<Record<string, number>>({
    mandatory: 7,
    advanced: 8,
    engineering: 3,
  });

  const shieldUnlockedCount = getUnlockedShieldCount(state);
  const shieldReady = isShieldComplete(state);
  const worldMeta = WORLD_PRESETS[state.world];

  // ================= 08:55 -> 09:00 ПЯТЬ МИНУТ ДО СТАРТА (РЕАЛЬНОЕ ВРЕМЯ) =================
  if (state.phase === 'five_min') {
    const sortedBrigades = Object.values(state.brigades).sort(
      (a, b) => b.score - a.score
    );

    return (
      <div
        className="gesture-plate-rise"
        style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
      >
        <div
          className="material-armor screw-corners"
          style={{
            padding: '16px 20px',
            borderLeft: '6px solid var(--color-warning)',
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
                fontSize: '13px',
                color: 'var(--color-warning)',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              08:55 → 09:00 · ПЯТЬ МИНУТ ДО СТАРТА · ИГРОВОЕ ВРЕМЯ СОВПАЛО С РЕАЛЬНЫМ
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>
              «Последние пять минут идут секунда в секунду с реальным временем. Смена
              догоняет реальность.»
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Перед нажатием кнопки СТАРТ соберите все 6 правил Щита (ревизия за 40 секунд)
              и распределите 4 направления обороны по рейтингу бригад.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                ОБРАТНЫЙ ОТСЧЁТ 1:1
              </div>
              <div className="seven-segment-window amber-zone" style={{ fontSize: '36px' }}>
                {formatSec(state.phaseRemainingSec)}
              </div>
            </div>
            <button
              type="button"
              disabled={!shieldReady}
              onClick={() => dispatch({ type: 'TRIGGER_START_0900' })}
              className="instrument-btn btn-stable"
              style={{ fontSize: '16px', padding: '12px 20px' }}
            >
              {shieldReady
                ? 'ПЕРЕЙТИ К СТАРТУ 09:00 →'
                : `СТАРТ ЗАБЛОКИРОВАН (ЩИТ ${shieldUnlockedCount}/6)`}
            </button>
          </div>
        </div>

        {/* Ревизия Щита 6/6 перед стартом */}
        <div className="material-paper" style={{ padding: '14px 18px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>
                1. РЕВИЗИЯ ЩИТА ПЕРЕД СТАРТОМ ({shieldUnlockedCount} ИЗ 6 ПРАВИЛ ОТКРЫТО)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Пока не названы все 6 правил, кнопка СТАРТ физически заблокирована. Назовите
                недостающие правила вслух:
              </div>
            </div>
            {!shieldReady && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'UNLOCK_ALL_SHIELD' })}
                className="instrument-btn btn-warning"
              >
                Подтвердить ревизию всех 6 правил (Щит 6/6)
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {state.shield.map((r) => (
              <div
                key={r.id}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_SHIELD_RULE', ruleId: r.id })
                }
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${
                    r.unlocked ? 'var(--color-stable)' : 'var(--color-warning)'
                  }`,
                  background: r.unlocked
                    ? 'rgba(53, 208, 160, 0.14)'
                    : 'rgba(255, 176, 32, 0.1)',
                  cursor: 'pointer',
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
                    Правило №{r.id} · {r.code}
                  </span>
                  <span
                    className="mono"
                    style={{
                      color: r.unlocked
                        ? 'var(--color-stable)'
                        : 'var(--color-warning)',
                    }}
                  >
                    {r.unlocked ? 'ОТКРЫТО' : 'НАЗВАТЬ'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>{r.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Выбор направлений обороны на старте (по рейтингу очков бригад: 3 / 4 / 5 коинов) */}
        <div className="material-armor screw-corners" style={{ padding: '14px 18px' }}>
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
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>
                2. ВЫБОР НАПРАВЛЕНИЙ ОБОРОНЫ НА СТАРТЕ В 09:00 (ПО РЕЙТИНГУ ОЧКОВ)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Рейтинг смены:{' '}
                {sortedBrigades
                  .map((b, i) => `${i + 1}. ${b.shapeSymbol} ${b.name} (${b.score} очк.)`)
                  .join(' · ')}{' '}
                — лидер выбирает направление первым. Четвёртая волна («След») закреплена за
                арбитром.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            {state.waves.map((wave) => (
              <div
                key={wave.id}
                style={{
                  padding: '12px',
                  background: 'rgba(0,0,0,0.34)',
                  border: '1px solid var(--border-metal)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
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
                  <span>ВОЛНА {wave.id}</span>
                  <span>{wave.rewardCoins} КОИНА</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900 }}>{wave.title}</div>
                <div className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {wave.file}:{wave.line} · {wave.exceptionType}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: 'var(--text-caption)',
                      marginBottom: '2px',
                    }}
                  >
                    Кто держит направление:
                  </label>
                  <select
                    value={wave.holder}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_WAVE_HOLDER',
                        waveId: wave.id,
                        holder: e.target.value as BrigadeId | 'АРБИТР',
                      })
                    }
                    className="instrument-btn mono"
                    style={{ width: '100%', fontSize: '13px' }}
                  >
                    <option value="TRY">▲ Бригада TRY</option>
                    <option value="CATCH">⬡ Бригада CATCH</option>
                    <option value="FINALLY">■ Бригада FINALLY</option>
                    <option value="АРБИТР">Арбитр смены</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: 'var(--text-caption)',
                      marginBottom: '2px',
                    }}
                  >
                    Установленный слот патча:
                  </label>
                  <select
                    value={wave.selectedSlot || ''}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_WAVE_SLOT',
                        waveId: wave.id,
                        slot: e.target.value
                          ? (Number(e.target.value) as 1 | 2 | 3 | 4)
                          : null,
                      })
                    }
                    className="instrument-btn mono"
                    style={{ width: '100%', fontSize: '13px' }}
                  >
                    {PATCH_SLOTS.map((s) => (
                      <option key={s.slot} value={s.slot}>
                        Слот #{s.slot}: {s.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ================= 09:07 СМЕНА ЗАКРЫТА: РЕФЛЕКСИЯ И НОМИНАЦИИ =================
  if (state.phase === 'closed') {
    const nominationSpecs: {
      key: 'mostPreciseAnalysis' | 'bestJournal' | 'honestMistake';
      title: string;
      desc: string;
    }[] = [
      {
        key: 'mostPreciseAnalysis',
        title: 'Самый точный разбор',
        desc: 'Карта, которая назвала строку и точный тип без единой лишней детали.',
      },
      {
        key: 'bestJournal',
        title: 'Лучший журнал',
        desc: 'Запись писаря, по которой смену можно восстановить через сутки без свидетелей.',
      },
      {
        key: 'honestMistake',
        title: 'Честная ошибка',
        desc: 'Признанная и разобранная ошибка, которая чему-то научила всю смену.',
      },
    ];

    return (
      <div
        className="gesture-plate-rise"
        style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
      >
        <div
          className="material-paper"
          style={{
            padding: '16px 20px',
            borderLeftColor:
              state.queue.lost > 0 ? 'var(--color-warning)' : 'var(--color-stable)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
              09:07 · СМЕНА ЗАКРЫТА · РЕФЛЕКСИЯ ОТ ЧИСЛА НА ТАБЛО (ДОКУМЕНТ 09, ЭТАП 6)
            </div>
            <div className="mono" style={{ fontSize: '30px', fontWeight: 900 }}>
              ИТОГ СМЕНЫ: {worldMeta.unitLabel.toUpperCase()} —{' '}
              {state.queue.started ? state.queue.issued : 1210} ИЗ {state.queue.total}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              «Рефлексия начинается с числа выданных билетов на табло, а не с общих слов
              "понравилось / не понравилось".»
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onNavigateScreen('materials')}
              className="instrument-btn btn-stable"
            >
              Печать Протокола смены (А4)
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PHASE', phase: 'homework' })}
              className="instrument-btn btn-action"
            >
              09:15 Домашнее задание →
            </button>
          </div>
        </div>

        {/* Три номинации смены (Документ 01, п. 10) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {nominationSpecs.map((nom) => {
            const winner = state.nominations[nom.key];
            const b = state.brigades[winner];
            return (
              <div
                key={nom.key}
                className="material-armor screw-corners"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
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
                    НОМИНАЦИЯ СМЕНЫ (ДОКУМЕНТ 01, П. 10)
                  </div>
                  <div style={{ fontSize: '19px', fontWeight: 900, marginTop: '2px' }}>
                    «{nom.title}»
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                    }}
                  >
                    {nom.desc}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-metal)',
                  }}
                >
                  <span className="brass-nameplate">
                    {b.shapeSymbol} {b.name}
                  </span>
                  <select
                    aria-label={`Выбор бригады для номинации ${nom.title}`}
                    value={winner}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_NOMINATION',
                        nomination: nom.key,
                        brigade: e.target.value as BrigadeId,
                      })
                    }
                    className="instrument-btn mono"
                    style={{ fontSize: '13px' }}
                  >
                    <option value="TRY">▲ TRY</option>
                    <option value="CATCH">⬡ CATCH</option>
                    <option value="FINALLY">■ FINALLY</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Три вопроса инженерного разбора (Документ 09) */}
        <div className="material-paper" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, marginBottom: '8px' }}>
            ВОПРОСЫ ИНЖЕНЕРНОЙ РЕФЛЕКСИИ СМЕНЫ (8 МИНУТ):
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid var(--border-metal)',
              }}
            >
              <strong>1. Цена ошибки на табло:</strong> Какая волна пробила (или могла
              пробить) очередь в 09:00 и какая одна строка кода за это отвечала?
            </div>
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid var(--border-metal)',
              }}
            >
              <strong>2. Главный вывод завязки:</strong> Почему победа в Сцене 3 («Отбито»)
              не спасла сервис в Сцене 4? Чем защита от одной атаки отличается от защиты от
              класса атак?
            </div>
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid var(--border-metal)',
              }}
            >
              <strong>3. Этика инженера:</strong> Почему пустой блок{' '}
              <span className="mono">catch &#123; &#125;</span> в Бою 4 опаснее самого
              падения программы?
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= 09:15 ДОМАШНЕЕ ЗАДАНИЕ ТРЁХ УРОВНЕЙ =================
  return (
    <div
      className="gesture-plate-rise"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}
    >
      <div
        className="material-paper"
        style={{
          padding: '16px 20px',
          borderLeftColor: 'var(--color-action)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 700 }}>
            09:15 · КАРТОЧКА «НОЧНОЙ ДЕЖУРНЫЙ» (ДОКУМЕНТ 07, П. 4 · ДОКУМЕНТ 09, ЭТАП 7)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900 }}>
            Домашнее задание трёх уровней на выбор обучающегося
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Оценки в ходе самой игры не выставляются — контроль вынесен в осознанный выбор
            уровня домашнего задания по материалам прошедшей смены.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
        }}
      >
        {[
          {
            id: 'mandatory',
            level: 'УРОВЕНЬ 1 · ОБЯЗАТЕЛЬНЫЙ',
            grade: 'На оценку «4»',
            title: 'Разбор одного боя своей бригады по Протоколу',
            desc: 'Взять одну строку падения из своего боя, выписать тип исключения, условие возникновения и написать рабочий фрагмент try-catch-finally с комментарием.',
            deliverable: 'Карточка разбора (10–12 строк) + фрагмент кода.',
          },
          {
            id: 'advanced',
            level: 'УРОВЕНЬ 2 · ПОВЫШЕННЫЙ',
            grade: 'На оценку «5»',
            title: 'Собственный класс исключения домена «Партер»',
            desc: 'Реализовать класс TicketBookingException : Exception со свойством RecordId и конструктором base(message, innerException) и обернуть им 26 битых записей очереди.',
            deliverable: 'Файл TicketBookingException.cs + вывод тестового прогона.',
          },
          {
            id: 'engineering',
            level: 'УРОВЕНЬ 3 · ВЫСОКИЙ (ИНЖЕНЕРНЫЙ)',
            grade: 'На оценку «5+» / с отличием',
            title: 'Аудит собственного проекта по 6 правилам Щита',
            desc: 'Провести ревизию своего курсового/учебного кода: найти 3 незащищённых входа, устранить пустые catch {} и гарантировать закрытие ресурсов в finally.',
            deliverable: 'Инженерный акт ревизии «До / После» на 1 страницу.',
          },
        ].map((card) => (
          <div
            key={card.id}
            className="material-armor screw-corners"
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: 'var(--color-warning)',
                  fontWeight: 800,
                }}
              >
                <span>{card.level}</span>
                <span>{card.grade}</span>
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 900, margin: '8px 0' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                {card.desc}
              </p>
            </div>

            <div>
              <div
                className="mono"
                style={{
                  padding: '8px 10px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--border-metal)',
                  fontSize: '13px',
                  marginBottom: '10px',
                }}
              >
                <strong>Сдаётся:</strong> {card.deliverable}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="mono" style={{ fontSize: '14px' }}>
                  Выбрали в группе: <strong>{hwPicks[card.id]} чел.</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setHwPicks((prev) => ({
                      ...prev,
                      [card.id]: (prev[card.id] || 0) + 1,
                    }))
                  }
                  className="instrument-btn btn-action"
                >
                  + Выбрать уровень
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
