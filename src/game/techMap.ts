import { PhaseId, SessionState } from '../types/game';

export type DidacticStepNumber = 1 | 2 | 3 | 4 | 5;

export interface DidacticCycleStep {
  step: DidacticStepNumber;
  code: 'НУЖДА' | 'ИНСТРУМЕНТ' | 'ПРИМЕНЕНИЕ' | 'ПОСЛЕДСТВИЕ' | 'ИМЯ';
  title: string;
  happensOnLesson: string;
  formedSkill: string;
}

export interface TechMapStage {
  phaseId: PhaseId;
  realTimeSpan: string;
  shiftClock: string;
  durationMin: number;
  stageTitle: string;
  teacherActivity: string;
  studentActivity: string;
  plannedResult: string;
  didacticStep: DidacticStepNumber;
}

export interface SubjectOutcomeStatus {
  id: number;
  title: string;
  verificationMethod: string;
  achieved: boolean;
}

export const LESSON_PASSPORT = {
  topic: 'Механизм исключений. Блоки try-catch-finally. Иерархия исключений',
  specialty: 'ПОИТ, 3 курс',
  lessonType: 'Урок открытия нового знания (игровая форма)',
  duration: '90 минут (пара)',
  form: 'Учебная игра-расследование, три бригады по 6 человек (18 участников)',
  technology: 'Геймификация, проблемное обучение, обучение в сотрудничестве',
  goal: 'Сформировать у обучающихся умение применять механизм исключений для обеспечения устойчивости программы к неверным входным данным.',
  tasks: [
    {
      kind: 'Обучающая',
      text: 'Освоить структуру try-catch-finally, порядок обработчиков, иерархию типов, правила throw / throw ex.',
    },
    {
      kind: 'Развивающая',
      text: 'Развивать умение читать стек вызовов и сообщение исключения, формулировать утверждение точно и кратко.',
    },
    {
      kind: 'Воспитательная',
      text: 'Формировать ответственность за результат смены, культуру честной фиксации ошибки, уважение к чужой позиции в споре.',
    },
  ],
};

export const DIDACTIC_CYCLE_STEPS: DidacticCycleStep[] = [
  {
    step: 1,
    code: 'НУЖДА',
    title: '1. Нужда',
    happensOnLesson: 'Пакет падает на неверной записи, очередь из 1 240 человек стоит',
    formedSkill: 'Вопрос и потребность в защите возникают сами, до определения',
  },
  {
    step: 2,
    code: 'ИНСТРУМЕНТ',
    title: '2. Инструмент',
    happensOnLesson: 'Вводится ровно тот узел (try / catch / finally / throw;), который нужен сейчас',
    formedSkill: 'Понятие появляется как рабочий инструмент, а не абстракция',
  },
  {
    step: 3,
    code: 'ПРИМЕНЕНИЕ',
    title: '3. Применение',
    happensOnLesson: 'Бригада ставит слот защиты, пишет карту из 3 полей и запускает полигон',
    formedSkill: 'Знание сразу проверяется действием и живым кодом',
  },
  {
    step: 4,
    code: 'ПОСЛЕДСТВИЕ',
    title: '4. Последствие',
    happensOnLesson: 'Пакет дошёл (ОТБИТА) или упал (ПРОБИЛА); табло показывает цену в людях',
    formedSkill: 'Ошибка видна как объективная цена в очереди, а не отметка учителя',
  },
  {
    step: 5,
    code: 'ИМЯ',
    title: '5. Имя',
    happensOnLesson: 'Только теперь понятие называется термином и фиксируется в Щите смены',
    formedSkill: 'Термин намертво закрепляется за пережитым опытом',
  },
];

export const TECH_MAP_STAGES: TechMapStage[] = [
  {
    phaseId: 'prologue_1',
    realTimeSpan: '0:00–0:03',
    shiftClock: '03:00',
    durationMin: 3,
    stageTitle: 'Завязка · Сцена 1. Вход',
    teacherActivity: 'Показывает ленту диспетчерской, задаёт один вопрос: «Что произошло?»',
    studentActivity: 'Читают лог сессии test/test, голосуют в клиенте («В сервис вошли»)',
    plannedResult: 'Понятие «вторжение» (26 записей-мин при выгрузке 0 байт)',
    didacticStep: 1,
  },
  {
    phaseId: 'prologue_2',
    realTimeSpan: '0:03–0:07',
    shiftClock: '03:05',
    durationMin: 4,
    stageTitle: 'Завязка · Сцена 2. Вскрытие',
    teacherActivity: 'Вводит понятие анатомии исключения по факту падения пакета',
    studentActivity: 'Запускают пакет, читают тип и строку, сопоставляют 4 записи и 4 типа',
    plannedResult: 'Правило щита №1 «Анатомия» (тип, сообщение, адрес; иерархия Exception)',
    didacticStep: 2,
  },
  {
    phaseId: 'prologue_3',
    realTimeSpan: '0:07–0:11',
    shiftClock: '03:14',
    durationMin: 4,
    stageTitle: 'Завязка · Сцена 3. Отбито',
    teacherActivity: 'Показывает механизм из трёх частей (TRY, CATCH, FINALLY)',
    studentActivity: 'Собирают try-catch-finally в клиенте, прогоняют пакет заново (1214/1240)',
    plannedResult: 'Правило щита №2 «Механизм» · заслуженная первая победа (ОТБИТО)',
    didacticStep: 3,
  },
  {
    phaseId: 'prologue_4',
    realTimeSpan: '0:11–0:15',
    shiftClock: '03:17',
    durationMin: 4,
    stageTitle: 'Завязка · Сцена 4. Продолжение',
    teacherActivity: 'Показывает оживший лог: противник сменил способ («Атаки продолжатся»)',
    studentActivity: 'Формулируют, почему одна защита не закрывает класс атак; делятся на 3 бригады',
    plannedResult: 'Сдвиг: «Защита от атаки ≠ защита от класса атак»; деление на TRY, CATCH, FINALLY',
    didacticStep: 4,
  },
  {
    phaseId: 'battle_1',
    realTimeSpan: '0:15–0:23',
    shiftClock: '04:00',
    durationMin: 8,
    stageTitle: 'Бой 1 · «Перехват» (Booking.cs:12)',
    teacherActivity: 'Ведёт 6 тактов боя по таймеру БВ-1, не подсказывает решение',
    studentActivity: 'TRY атакует, CATCH защищается, FINALLY судит стоя у экрана',
    plannedResult: 'Правило щита №3 «Перехват» (обработчик вокруг опасного места внутри цикла)',
    didacticStep: 3,
  },
  {
    phaseId: 'battle_2',
    realTimeSpan: '0:23–0:31',
    shiftClock: '05:00',
    durationMin: 8,
    stageTitle: 'Бой 2 · «Порядок» (Pricing.cs:23)',
    teacherActivity: 'Фиксирует конфликт иерархии типов и ошибку компилятора CS0160',
    studentActivity: 'CATCH атакует, FINALLY защищается, TRY судит стоя у экрана',
    plannedResult: 'Правило щита №4 «Порядок» (от частного к общему, иначе недостижим — CS0160)',
    didacticStep: 5,
  },
  {
    phaseId: 'lull',
    realTimeSpan: '0:31–0:33',
    shiftClock: '06:00',
    durationMin: 2,
    stageTitle: 'Затишье · Две минуты без атак',
    teacherActivity: 'Показывает экран комиссии, коротко поясняет механику («Пока тихо»)',
    studentActivity: 'Переводят дух, сверяют роли на вторую половину смены',
    plannedResult: 'Пауза внимания и фиксация промежуточного счёта перед ресурсным боем',
    didacticStep: 4,
  },
  {
    phaseId: 'battle_3',
    realTimeSpan: '0:33–0:41',
    shiftClock: '07:00',
    durationMin: 8,
    stageTitle: 'Бой 3 · «Гарантия» (Seats.cs:41)',
    teacherActivity: 'Обращает внимание на исчерпание пула из 64 соединений с базой',
    studentActivity: 'FINALLY атакует, TRY защищается, CATCH судит стоя у экрана',
    plannedResult: 'Правило щита №5 «Гарантия» (finally закрывает соединение и при падении, и при return)',
    didacticStep: 3,
  },
  {
    phaseId: 'battle_4',
    realTimeSpan: '0:41–0:49',
    shiftClock: '08:00',
    durationMin: 8,
    stageTitle: 'Бой 4 · «Честность» (Promo.cs:55)',
    teacherActivity: 'Вводит различие throw; и throw ex;, разбирает пустой catch {} как сокрытие улик',
    studentActivity: 'Роли распределяются по рейтингу боёв 1–3; разбирают сокрытие ошибок',
    plannedResult: 'Правило щита №6 «Честность» (поймал — запиши в отчёт или пробрось throw;)',
    didacticStep: 5,
  },
  {
    phaseId: 'practice',
    realTimeSpan: '0:49–1:02',
    shiftClock: '08:05',
    durationMin: 13,
    stageTitle: 'Практика · Сборка своего патча',
    teacherActivity: 'Консультирует бригады по запросу, проверяет готовность к 09:00',
    studentActivity: 'Собирают полный патч (слоты 1–4 + TicketBookingException) и тестируют на своём наборе',
    plannedResult: 'Индивидуальный навык сборки устойчивого конвейера обработки очереди',
    didacticStep: 3,
  },
  {
    phaseId: 'five_min',
    realTimeSpan: '1:02–1:07',
    shiftClock: '08:55',
    durationMin: 5,
    stageTitle: 'Пять минут до · Отсчёт 1:1',
    teacherActivity: 'Держит честный отсчёт 5:00 в реальном времени, проводит ревизию Щита 6/6',
    studentActivity: 'Называют 6 правил щита, распределяют 4 направления обороны на старте',
    plannedResult: 'Щит 6/6 собран целиком; кнопка СТАРТ 09:00 разблокирована',
    didacticStep: 5,
  },
  {
    phaseId: 'start_0900',
    realTimeSpan: '1:07–1:16',
    shiftClock: '09:00',
    durationMin: 9,
    stageTitle: 'СТАРТ В 09:00 · Табло 1 240 клеток',
    teacherActivity: 'Наблюдает и фиксирует результат, не вмешивается в ход прогона',
    studentActivity: 'Держат 4 волны одновременно (формат, порядок, ресурс, след)',
    plannedResult: 'Объективный результат на табло из 1 240 клеток (эталон: 1210 из 1240)',
    didacticStep: 4,
  },
  {
    phaseId: 'closed',
    realTimeSpan: '1:16–1:24',
    shiftClock: '09:07',
    durationMin: 8,
    stageTitle: 'Смена закрыта · Рефлексия и Протокол',
    teacherActivity: 'Ведёт рефлексию от числа выданных билетов, а не от оценок; печатает протокол',
    studentActivity: 'Разбирают, какая волна пробила и почему; утверждают 3 номинации смены',
    plannedResult: 'Одностраничный Протокол смены (03:00–09:09) для сдачи комиссии',
    didacticStep: 5,
  },
  {
    phaseId: 'homework',
    realTimeSpan: '1:24–1:30',
    shiftClock: '09:15',
    durationMin: 6,
    stageTitle: 'Домашнее задание трёх уровней',
    teacherActivity: 'Выдаёт карточку «Ночной дежурный» трёх уровней (Обязательный, Повышенный, Высокий)',
    studentActivity: 'Выбирают свой уровень домашнего задания для переноса навыка в свой код',
    plannedResult: 'Перенос навыка обработки исключений в самостоятельную инженерную практику',
    didacticStep: 3,
  },
];

export const SELF_ANALYSIS_CHALLENGES = [
  {
    challenge: '18 человек за ноутбуками — комиссия видит «спины»',
    solution:
      'Докладчик и Арбитр объявляют позицию стоя у экрана; экраны бригад автоматически приглушаются в тактах объявления и вердикта.',
  },
  {
    challenge: 'Восемь минут боя — очень плотный темп',
    solution:
      'Контратака ограничена одним ходом; жёсткий таймер фазы БВ-1; при нехватке времени сжимается практика (с 13 до 8 мин), но бои и старт не режутся никогда.',
  },
  {
    challenge: 'Риск уйти в синтаксическую рутину и потерять темп',
    solution:
      'Полигон ограничен 4 готовыми слотами патчей (клавиши 1–4): синтаксис не отнимает время у инженерной мысли.',
  },
  {
    challenge: 'Риск отказа локальной сети на конкурсном уроке',
    solution:
      'Три режима в один клик (Полный, Ручной с голосовыми картами, Автономный с полосой очереди) + двухоконная офлайн-шина BroadcastChannel и бумажный резерв.',
  },
  {
    challenge: 'Риск восприятия игры как «несерьёзного развлечения»',
    solution:
      'Сухой приборный тон диспетчерской, ноль эмодзи, ноль похвалы («молодцы» заменено на «ОТБИТА / ПРОБИЛА»), оценка числом спасённых билетов.',
  },
];

export function getDidacticCycleStepForState(
  state: SessionState
): DidacticCycleStep {
  if (state.phase === 'prologue_1') return DIDACTIC_CYCLE_STEPS[0]; // 1. Нужда
  if (state.phase === 'prologue_2') return DIDACTIC_CYCLE_STEPS[1]; // 2. Инструмент
  if (state.phase === 'prologue_3') return DIDACTIC_CYCLE_STEPS[2]; // 3. Применение
  if (state.phase === 'prologue_4') return DIDACTIC_CYCLE_STEPS[3]; // 4. Последствие

  if (state.phase.startsWith('battle_')) {
    const activeBattle = state.battles[state.currentBattleNumber];
    if (activeBattle.tact === 'recon' || activeBattle.tact === 'announce') {
      return DIDACTIC_CYCLE_STEPS[0]; // 1. Нужда
    }
    if (activeBattle.tact === 'card') {
      return DIDACTIC_CYCLE_STEPS[1]; // 2. Инструмент
    }
    if (activeBattle.tact === 'exchange' || activeBattle.tact === 'counter') {
      return DIDACTIC_CYCLE_STEPS[2]; // 3. Применение
    }
    return DIDACTIC_CYCLE_STEPS[4]; // 5. Имя (вердикт и правило щита)
  }

  if (state.phase === 'practice' || state.phase === 'homework') {
    return DIDACTIC_CYCLE_STEPS[2]; // 3. Применение
  }
  if (state.phase === 'start_0900' || state.phase === 'lull') {
    return DIDACTIC_CYCLE_STEPS[3]; // 4. Последствие
  }
  return DIDACTIC_CYCLE_STEPS[4]; // 5. Имя (five_min, closed)
}

export function evaluateSubjectOutcomes(
  state: SessionState
): SubjectOutcomeStatus[] {
  const s = state.shield;
  const isRuleUnlocked = (id: number) => Boolean(s.find((r) => r.id === id)?.unlocked);

  return [
    {
      id: 1,
      title: 'Называет тип и место исключения по сообщению и стеку вызовов',
      verificationMethod: 'Завязка (Сцена 2) и карты атаки с обязательным номером строки',
      achieved: isRuleUnlocked(1) || state.prologue.batchCrashed,
    },
    {
      id: 2,
      title: 'Выбирает обработчик catch, точно соответствующий типу исключения',
      verificationMethod: 'Завязка (Сцена 3) и Бой 1 «Перехват» (FormatException на Booking.cs:12)',
      achieved: isRuleUnlocked(2) || isRuleUnlocked(3),
    },
    {
      id: 3,
      title: 'Расставляет обработчики от частного к общему и объясняет ошибку CS0160',
      verificationMethod: 'Бой 2 «Порядок» (Pricing.cs:23 — DivideByZeroException до Exception)',
      achieved: isRuleUnlocked(4),
    },
    {
      id: 4,
      title: 'Применяет блок finally для гарантированного закрытия ресурса (даже при return)',
      verificationMethod: 'Бой 3 «Гарантия» (Seats.cs:41 — освобождение пула DbConnection)',
      achieved: isRuleUnlocked(5),
    },
    {
      id: 5,
      title: 'Различает throw; и throw ex; по сохранению исходного стека вызовов',
      verificationMethod: 'Бой 4 «Честность» (Promo.cs:58 — сохранение адреса исходного сбоя)',
      achieved: isRuleUnlocked(6),
    },
    {
      id: 6,
      title: 'Объясняет, почему пустой catch {} недопустим (потеря 26 записей из отчёта)',
      verificationMethod: 'Бой 4 «Честность» и табло очереди 09:00 (26 записей в карантинный отчёт)',
      achieved: isRuleUnlocked(6) || state.queue.started,
    },
  ];
}
