import { PROLOGUE_MINES, REFERENCE_CARDS } from './constants';
import { createInitialSession } from './engine';
import { GameAction, gameReducer } from './reducer';
import { SessionState } from '../types/game';

export interface RehearsalCheckpoint {
  id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  shiftClock: string;
  shortTitle: string;
  title: string;
  hallVisual: string;
  speakerLine: string;
  pedagogicalGoal: string;
}

export const REHEARSAL_CHECKPOINTS: RehearsalCheckpoint[] = [
  {
    id: 1,
    shiftClock: '03:00',
    shortTitle: 'Т1 · 03:00 Вход',
    title: 'Сцена 1. Вход с тестовой учётной записи (test/test)',
    hallVisual:
      'Лента сессии 02:07–02:48 (91.42.117.6), выгрузка 0 байт, вставлено 26 записей, итог голосования: ВТОРЖЕНИЕ.',
    speakerLine:
      '«Сессия открыта в 02:07. Закрыта в 02:48. Он ничего не украл. Выгрузка — ноль. Он оставил двадцать шесть записей.»',
    pedagogicalGoal:
      'Мотивация изнутри задачи: не «решите пример», а расследуйте ночной инцидент со ставкой в 1 240 человек.',
  },
  {
    id: 2,
    shiftClock: '03:05',
    shortTitle: 'Т2 · 03:05 Вскрытие',
    title: 'Сцена 2. Падение пакета и Анатомия исключения',
    hallVisual:
      'Штамп ПАКЕТ УПАЛ на Booking.cs:12 (#0x1F3), сопоставлены 4 мины и 4 типа, открыто Правило щита №1 (Анатомия).',
    speakerLine:
      '«У падения есть имя и адрес. Имя — это тип. Адрес — строка. Все типы — родня. Общий предок — Exception.»',
    pedagogicalGoal:
      'Шаг 1 «Нужда» и Шаг 5 «Имя»: термин и иерархия вводятся только после того, как одна запись остановила всю очередь.',
  },
  {
    id: 3,
    shiftClock: '03:14',
    shortTitle: 'Т3 · 03:14 Отбито',
    title: 'Сцена 3. Сборка механизма TRY · CATCH · FINALLY и первая победа',
    hallVisual:
      'Три части механизма подключены, прошло: 1214, в отчёт: 26, остановок: 0. Штамп ОТБИТО. Открыто Правило №2.',
    speakerLine:
      '«TRY очерчивает зону. CATCH ловит тип. FINALLY убирает за собой — всегда. Двадцать шесть — в отчёт. Отбито.»',
    pedagogicalGoal:
      'Заслуженная победа на 10-й минуте урока: группа руками собрала механизм, в честь частей которого назовут 3 бригады.',
  },
  {
    id: 4,
    shiftClock: '03:17',
    shortTitle: 'Т4 · 03:17 Поворот',
    title: 'Сцена 4. Лог оживает сам — «АТАКИ ПРОДОЛЖАТСЯ»',
    hallVisual:
      'Вторая волна в логе (03:17:10), 4 направления проб (формат, порядок, ресурс, след), плашка АТАКИ ПРОДОЛЖАТСЯ.',
    speakerLine:
      '«Он меняет способ. Вы закрыли одну дверь. Он пойдёт в те три, что остались открытыми. Атаки продолжатся.»',
    pedagogicalGoal:
      'Главный смысловой поворот: защита от одной атаки не равна защите от класса атак. Мотивация 4 боёв и 3 бригад.',
  },
  {
    id: 5,
    shiftClock: '04:00',
    shortTitle: 'Т5 · Бой 1: ПРОБИЛА',
    title: 'Бой 1 «Перехват» — Карта атаки TRY и падение полигона',
    hallVisual:
      'Файл Booking.cs:12, подана карта атаки TRY (FormatException), живой запуск без патча -> тяжёлый красный штамп ПРОБИЛА.',
    speakerLine:
      '«Атакуем строку 12, тип FormatException: place разбирается через int.Parse без проверки. Запуск: ПРОБИЛА.»',
    pedagogicalGoal:
      'Демонстрация принципа «Код — единственный судья»: карта проверяется реальным прогоном пакета на полигоне.',
  },
  {
    id: 6,
    shiftClock: '04:05',
    shortTitle: 'Т6 · Бой 1: ОТБИТА + Пропуск',
    title: 'Бой 1 «Перехват» — Патч защиты CATCH, вердикт и пропуск Арбитра',
    hallVisual:
      'Включён слот патча #1, запуск: ОТБИТА (1214/1240). Арбитр FINALLY фиксирует пропуск int.TryParse (+1). Правило №3 открыто.',
    speakerLine:
      '«Бой первый. Атака на строку 12. Запуск: отбита. Защите — 3, Арбитру — 2 за найденный пропуск int.TryParse.»',
    pedagogicalGoal:
      'Роль Арбитра стоя у экрана: очко начисляется за найденное инженерное улучшение, которое не заметили обе стороны.',
  },
  {
    id: 7,
    shiftClock: '08:55',
    shortTitle: 'Т7 · 08:55 Отсчёт 1:1',
    title: 'Фаза «Пять минут до старта» — Реальное время и Щит 6/6',
    hallVisual:
      'Часы 08:55 идут секунда в секунду с реальным временем, ревизия Щита 6/6 завершена, 4 волны распределены по бригадам.',
    speakerLine:
      '«Последние пять минут идут в реальном времени. Щит 6 из 6 собран — кнопка СТАРТ разблокирована.»',
    pedagogicalGoal:
      'Встроенная ревизия всей темы без скучного «повторения пройденного»: сама игра требует 6 правил для разблокировки старта.',
  },
  {
    id: 8,
    shiftClock: '09:00',
    shortTitle: 'Т8 · 09:00 Табло 1210/1240',
    title: 'Финал: Старт продаж в 09:00 на табло 1 240 клеток и Протокол',
    hallVisual:
      'Табло из 1 240 клеток: 1 210 зелёных и наглядная красная дыра (−30 человек на 2-й волне). Сформирован Протокол смены.',
    speakerLine:
      '«Старт продаж: выдано 1 210 из 1 240 билетов. Итог урока измеряется не очками, а числом людей, ушедших с билетами.»',
    pedagogicalGoal:
      'Наглядная цена инженерной ошибки с последнего ряда: дыра на табло сразу показывает, какая именно волна пробила.',
  },
];

export type DisputeScenarioId =
  | 'vague_error_type'
  | 'missing_line_number'
  | 'unpatched_promise'
  | 'counter_divide_by_zero'
  | 'arbiter_stop_dispute';

export interface DisputeScenarioSpec {
  id: DisputeScenarioId;
  title: string;
  regulationRule: string;
  description: string;
  expectedOutcome: string;
}

export const DISPUTE_SCENARIOS: DisputeScenarioSpec[] = [
  {
    id: 'vague_error_type',
    title: '1. Слово «Ошибка» вместо типа исключения',
    regulationRule: 'Раздел 5 Регламента, правило №2',
    description:
      'Бригада пытается подать карту со словом «Ошибка» вместо точного типа FormatException.',
    expectedOutcome:
      'Валидатор и Арбитр отклоняют карту: «"Ошибка" — не тип. FormatException — тип».',
  },
  {
    id: 'missing_line_number',
    title: '2. Атака «по жизненному опыту» без строки кода',
    regulationRule: 'Раздел 11 Регламента («Спорные ситуации»)',
    description:
      'Бригада пишет общее рассуждение «Пользователь может ввести плохие данные» без привязки к строке кода.',
    expectedOutcome:
      'Арбитр выносит вердикт «НЕ ПРИНЯТА»: атака обязана указывать точный номер строки кода.',
  },
  {
    id: 'unpatched_promise',
    title: '3. Защита-обещание «Мы бы поставили try» без патча',
    regulationRule: 'Раздел 6 и 11 Регламента («Живой запуск»)',
    description:
      'Защита подала красивую карту на словах, но не включила слот патча на полигоне перед запуском.',
    expectedOutcome:
      'Живой запуск падает -> штамп ПРОБИЛА («Код — единственный судья, обещание без патча не защищает»).',
  },
  {
    id: 'counter_divide_by_zero',
    title: '4. Контратака в Бою 1: смена вектора на count = 0 (строка 14)',
    regulationRule: 'Раздел 4 Регламента (Такт 5 «Контратака и патч»)',
    description:
      'Защита закрыла строку 12 (FormatException), а атака одним ходом бьёт в строку 14 (TotalSum / count при count = 0).',
    expectedOutcome:
      'Обработчик FormatException не ловит DivideByZeroException -> контратака ПРОБИЛА!',
  },
  {
    id: 'arbiter_stop_dispute',
    title: '5. Спор двух бригад о типе -> Стоп-кран Арбитра [S]',
    regulationRule: 'Документ 10, п. 7 («Стоп-кран арбитра»)',
    description:
      'Две бригады спорят, какой именно тип вылетит на строке 23 в Бою 2 (FormatException или CS0160).',
    expectedOutcome:
      'Арбитр включает СТОП-БОЙ, ставит таймер на паузу и запускает полигон как единственного судью.',
  },
];

export function applyRehearsalCheckpoint(
  currentState: SessionState,
  checkpointId: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
): SessionState {
  let base = createInitialSession(currentState.code);
  base = {
    ...base,
    theme: currentState.theme,
    mode: currentState.mode,
    world: currentState.world,
    activeRehearsalStep: checkpointId,
  } as SessionState;

  const runActions = (s: SessionState, actions: GameAction[]): SessionState =>
    actions.reduce((acc, act) => gameReducer(acc, act), s);

  if (checkpointId === 1) {
    return runActions(base, [
      { type: 'SET_PHASE', phase: 'prologue_1' },
      { type: 'PROLOGUE_REVEAL_POLL' },
    ]);
  }

  if (checkpointId === 2) {
    const matchActions: GameAction[] = PROLOGUE_MINES.map((m) => ({
      type: 'PROLOGUE_MATCH_MINE',
      mineId: m.id,
      exceptionType: m.expectedType,
    }));
    return runActions(base, [
      { type: 'SET_PHASE', phase: 'prologue_2' },
      { type: 'PROLOGUE_CRASH_BATCH' },
      ...matchActions,
    ]);
  }

  if (checkpointId === 3) {
    const s2 = applyRehearsalCheckpoint(currentState, 2);
    return runActions(s2, [
      { type: 'SET_PHASE', phase: 'prologue_3' },
      { type: 'PROLOGUE_REPEL_BATCH' },
    ]);
  }

  if (checkpointId === 4) {
    const s3 = applyRehearsalCheckpoint(currentState, 3);
    return runActions(s3, [
      { type: 'SET_PHASE', phase: 'prologue_4' },
      { type: 'PROLOGUE_TRIGGER_SECOND_WAVE' },
    ]);
  }

  if (checkpointId === 5) {
    const s4 = applyRehearsalCheckpoint(currentState, 4);
    const refAttack = REFERENCE_CARDS.find(
      (c) => c.battleNumber === 1 && c.cardType === 'атака'
    )!;
    return runActions(s4, [
      { type: 'SET_PHASE', phase: 'battle_1' },
      { type: 'SET_TACT', tact: 'exchange' },
      {
        type: 'SUBMIT_CARD',
        brigade: 'TRY',
        role: 'картёр',
        cardType: 'атака',
        file: refAttack.file,
        line: refAttack.line,
        exceptionType: refAttack.exceptionType,
        statement: refAttack.statement,
      },
      { type: 'RUN_POLYGON' },
    ]);
  }

  if (checkpointId === 6) {
    const s5 = applyRehearsalCheckpoint(currentState, 5);
    const refDef = REFERENCE_CARDS.find(
      (c) => c.battleNumber === 1 && c.cardType === 'защита'
    )!;
    return runActions(s5, [
      { type: 'SET_TACT', tact: 'verdict' },
      {
        type: 'SUBMIT_CARD',
        brigade: 'CATCH',
        role: 'картёр',
        cardType: 'защита',
        file: refDef.file,
        line: refDef.line,
        exceptionType: refDef.exceptionType,
        statement: refDef.statement,
        patchSlot: 1,
      },
      { type: 'RUN_POLYGON' },
      {
        type: 'SUBMIT_VERDICT',
        result: 'ОТБИТА',
        legalAttackBonus: true,
        counterHeldBonus: true,
        journalLine:
          'Защита CATCH обернула Booking.cs:12 в try-catch (FormatException), пакет прошёл',
      },
      {
        type: 'AWARD_MISSED_SPOT',
        note: 'Пропуск: int.TryParse дешевле исключения на потоке из 1240 запросов (+1 арбитру FINALLY)',
      },
    ]);
  }

  if (checkpointId === 7) {
    const s6 = applyRehearsalCheckpoint(currentState, 6);
    return runActions(s6, [
      { type: 'ADJUST_BRIGADE_SCORE', brigade: 'TRY', delta: 9, reason: 'Итог боёв 1–4' },
      { type: 'ADJUST_BRIGADE_SCORE', brigade: 'CATCH', delta: 6, reason: 'Итог боёв 1–4' },
      { type: 'ADJUST_BRIGADE_SCORE', brigade: 'FINALLY', delta: 6, reason: 'Итог боёв 1–4' },
      { type: 'UNLOCK_ALL_SHIELD' },
      { type: 'SET_PHASE', phase: 'five_min' },
      { type: 'TOGGLE_TIMER' },
    ]);
  }

  // Checkpoint 8: 09:00 Старт продаж (1210 / 1240)
  return gameReducer(base, { type: 'LOAD_DEMO_1210' });
}

export function applyDisputeScenario(
  state: SessionState,
  scenarioId: DisputeScenarioId
): SessionState {
  const runActions = (s: SessionState, actions: GameAction[]): SessionState =>
    actions.reduce((acc, act) => gameReducer(acc, act), s);

  if (scenarioId === 'vague_error_type') {
    const s = state.phase.startsWith('battle_')
      ? state
      : gameReducer(state, { type: 'SET_PHASE', phase: 'battle_1' });
    const active = s.battles[s.currentBattleNumber];
    return runActions(s, [
      {
        type: 'SUBMIT_CARD',
        brigade: active.attacker,
        role: 'картёр',
        cardType: 'атака',
        file: active.defaultFile,
        line: active.targetLine,
        exceptionType: 'Ошибка',
        statement: 'На этой строке вылетит ошибка при вводе текста',
      },
    ]);
  }

  if (scenarioId === 'missing_line_number') {
    const s = state.phase.startsWith('battle_')
      ? state
      : gameReducer(state, { type: 'SET_PHASE', phase: 'battle_1' });
    const active = s.battles[s.currentBattleNumber];
    return runActions(s, [
      {
        type: 'SUBMIT_CARD',
        brigade: active.attacker,
        role: 'картёр',
        cardType: 'атака',
        file: active.defaultFile,
        line: 0,
        exceptionType: active.targetException,
        statement: 'Пользователь может ввести некорректные данные по условиям задачи',
      },
      {
        type: 'SUBMIT_VERDICT',
        result: 'НЕ ПРИНЯТА',
        rejectReason: 'Атака «по условиям задачи», а не по коду (не указан номер строки)',
        journalLine: 'Карта атаки отклонена арбитром: отсутствует номер строки кода',
      },
    ]);
  }

  if (scenarioId === 'unpatched_promise') {
    const s = gameReducer(state, { type: 'SET_PHASE', phase: 'battle_1' });
    // Гарантируем, что слот #1 выключен, хотя карта обещает try
    const clearedSlotsState: SessionState = {
      ...s,
      battles: {
        ...s.battles,
        1: {
          ...s.battles[1],
          activeSlots: [],
          counterAttackMode: null,
        },
      },
    };
    return runActions(clearedSlotsState, [
      {
        type: 'SUBMIT_CARD',
        brigade: 'CATCH',
        role: 'картёр',
        cardType: 'защита',
        file: 'Booking.cs',
        line: 12,
        exceptionType: 'FormatException',
        statement: 'Мы бы поставили try-catch вокруг парсинга (слот патча не включён)',
      },
      { type: 'RUN_POLYGON' },
    ]);
  }

  if (scenarioId === 'counter_divide_by_zero') {
    const s = gameReducer(state, { type: 'SET_PHASE', phase: 'battle_1' });
    const withSlot1Only: SessionState = {
      ...s,
      battles: {
        ...s.battles,
        1: {
          ...s.battles[1],
          tact: 'counter',
          activeSlots: [1],
          counterAttackMode: 'divide_by_zero',
        },
      },
    };
    return runActions(withSlot1Only, [
      {
        type: 'SUBMIT_CARD',
        brigade: 'TRY',
        role: 'картёр',
        cardType: 'контратака',
        file: 'Booking.cs',
        line: 14,
        exceptionType: 'DivideByZeroException',
        statement: 'Контратака: на строке 14 TotalSum / count падает при count = 0',
      },
      { type: 'RUN_POLYGON' },
    ]);
  }

  // arbiter_stop_dispute
  const s = gameReducer(state, { type: 'SET_PHASE', phase: 'battle_2' });
  const clearedStop: SessionState = {
    ...s,
    battles: {
      ...s.battles,
      2: {
        ...s.battles[2],
        arbiterStopActive: false,
      },
    },
  };
  return runActions(clearedStop, [
    {
      type: 'TOGGLE_ARBITER_STOP',
      reason:
        'Спор бригад CATCH и FINALLY о порядке блоков catch на строках 23–27 (проверка CS0160)',
    },
  ]);
}
