import {
  INITIAL_SHIELD_RULES,
  KNOWN_EXCEPTION_TYPES,
} from './constants';
import {
  BattleRole,
  BattleRound,
  Brigade,
  BrigadeId,
  JournalEntry,
  PracticeState,
  RunResult,
  SessionState,
  WaveState,
} from '../types/game';

const NUMBER_WORDS: Record<number, string> = {
  1: 'первый',
  2: 'второй',
  3: 'третий',
  4: 'четвёртый',
};

export function createInitialBrigades(): Record<BrigadeId, Brigade> {
  return {
    TRY: {
      id: 'TRY',
      name: 'TRY',
      shape: 'triangle',
      shapeSymbol: '▲',
      subtitle: 'Очерчивает опасную зону',
      score: 0,
      lamps: [true, true, true, true],
      battleRole: 'АТАКА',
      assignedWave: 'формат',
      attacksWon: 0,
      defensesWon: 0,
    },
    CATCH: {
      id: 'CATCH',
      name: 'CATCH',
      shape: 'hexagon',
      shapeSymbol: '⬡',
      subtitle: 'Перехватывает точный тип',
      score: 0,
      lamps: [true, true, true, true],
      battleRole: 'ЗАЩИТА',
      assignedWave: 'порядок',
      attacksWon: 0,
      defensesWon: 0,
    },
    FINALLY: {
      id: 'FINALLY',
      name: 'FINALLY',
      shape: 'square',
      shapeSymbol: '■',
      subtitle: 'Гарантирует освобождение',
      score: 0,
      lamps: [true, true, true, true],
      battleRole: 'АРБИТР',
      assignedWave: 'ресурс',
      attacksWon: 0,
      defensesWon: 0,
    },
  };
}

export function createInitialBattles(): Record<1 | 2 | 3 | 4, BattleRound> {
  return {
    1: {
      number: 1,
      codeName: 'Перехват',
      waveDesc: '"два" в поле числа',
      topicDesc: 'Поставить обработчик на первую дверь',
      holdGoal: 'Одна запись не роняет весь пакет',
      shiftClock: '04:00',
      defaultFile: 'Booking.cs',
      targetLine: 12,
      targetException: 'FormatException',
      attackLineCode: '12  int.Parse(req.Place)',
      rewardText: '+2  за пробитую',
      attacker: 'TRY',
      defender: 'CATCH',
      arbiter: 'FINALLY',
      tact: 'recon',
      tactRemainingSec: 60,
      tactRunning: false,
      activeSlots: [],
      counterAttackMode: null,
      attackCard: null,
      defenseCard: null,
      counterCard: null,
      lastRun: null,
      verdict: null,
      appealUsed: false,
      appealRemainingSec: 30,
      missedSpotAwarded: false,
      arbiterStopActive: false,
      arbiterStopReason: '',
      probedCount: 0,
      repelledCount: 0,
    },
    2: {
      number: 2,
      codeName: 'Порядок',
      waveDesc: 'Несколько типов одновременно',
      topicDesc: 'Порядок catch, недостижимый обработчик, CS0160',
      holdGoal: 'Ни одна мина не проскочит между обработчиками',
      shiftClock: '05:00',
      defaultFile: 'Pricing.cs',
      targetLine: 23,
      targetException: 'FormatException',
      attackLineCode: '23  catch (Exception ex) // перед частным',
      rewardText: '+2  за пробитую',
      attacker: 'CATCH',
      defender: 'FINALLY',
      arbiter: 'TRY',
      tact: 'recon',
      tactRemainingSec: 60,
      tactRunning: false,
      activeSlots: [],
      counterAttackMode: null,
      attackCard: null,
      defenseCard: null,
      counterCard: null,
      lastRun: null,
      verdict: null,
      appealUsed: false,
      appealRemainingSec: 30,
      missedSpotAwarded: false,
      arbiterStopActive: false,
      arbiterStopReason: '',
      probedCount: 0,
      repelledCount: 0,
    },
    3: {
      number: 3,
      codeName: 'Гарантия',
      waveDesc: '1 240 соединений с базой',
      topicDesc: 'finally: закрыть соединение, даже если упало',
      holdGoal: 'Пул соединений не исчерпается на середине очереди',
      shiftClock: '07:00',
      defaultFile: 'Seats.cs',
      targetLine: 41,
      targetException: 'IndexOutOfRangeException',
      attackLineCode: '41  string badge = Row[req.SeatIndex];',
      rewardText: '+2  за удержание',
      attacker: 'FINALLY',
      defender: 'TRY',
      arbiter: 'CATCH',
      tact: 'recon',
      tactRemainingSec: 60,
      tactRunning: false,
      activeSlots: [],
      counterAttackMode: null,
      attackCard: null,
      defenseCard: null,
      counterCard: null,
      lastRun: null,
      verdict: null,
      appealUsed: false,
      appealRemainingSec: 30,
      missedSpotAwarded: false,
      arbiterStopActive: false,
      arbiterStopReason: '',
      probedCount: 0,
      repelledCount: 0,
    },
    4: {
      number: 4,
      codeName: 'Честность',
      waveDesc: 'Попытка спрятать след в журнале',
      topicDesc: 'throw, throw ex, пустой catch',
      holdGoal: '26 записей попадают в отчёт, а не исчезают',
      shiftClock: '08:00',
      defaultFile: 'Promo.cs',
      targetLine: 55,
      targetException: 'NullReferenceException',
      attackLineCode: '55  catch (NullReferenceException ex) { }',
      rewardText: '+2  за честный стек',
      attacker: 'TRY',
      defender: 'CATCH',
      arbiter: 'FINALLY',
      tact: 'recon',
      tactRemainingSec: 60,
      tactRunning: false,
      activeSlots: [],
      counterAttackMode: null,
      attackCard: null,
      defenseCard: null,
      counterCard: null,
      lastRun: null,
      verdict: null,
      appealUsed: false,
      appealRemainingSec: 30,
      missedSpotAwarded: false,
      arbiterStopActive: false,
      arbiterStopReason: '',
      probedCount: 0,
      repelledCount: 0,
    },
  };
}

export function createInitialWaves(): WaveState[] {
  return [
    {
      id: 1,
      direction: 'формат',
      title: 'Волна 1 · Формат числа',
      exceptionType: 'FormatException',
      file: 'Booking.cs',
      line: 12,
      holder: 'TRY',
      rewardCoins: 3,
      patchSlotRequired: 1,
      selectedSlot: 1,
      status: 'ожидание',
      lostPeople: 0,
    },
    {
      id: 2,
      direction: 'порядок',
      title: 'Волна 2 · Порядок обработчиков',
      exceptionType: 'DivideByZeroException / CS0160',
      file: 'Pricing.cs',
      line: 23,
      holder: 'CATCH',
      rewardCoins: 4,
      patchSlotRequired: 2,
      selectedSlot: 2,
      status: 'ожидание',
      lostPeople: 0,
    },
    {
      id: 3,
      direction: 'ресурс',
      title: 'Волна 3 · Гарантия ресурса',
      exceptionType: 'IndexOutOfRangeException + finally',
      file: 'Seats.cs',
      line: 41,
      holder: 'FINALLY',
      rewardCoins: 5,
      patchSlotRequired: 3,
      selectedSlot: 3,
      status: 'ожидание',
      lostPeople: 0,
    },
    {
      id: 4,
      direction: 'след',
      title: 'Волна 4 · Честность журнала',
      exceptionType: 'NullReferenceException + throw;',
      file: 'Promo.cs',
      line: 55,
      holder: 'АРБИТР',
      rewardCoins: 5,
      patchSlotRequired: 4,
      selectedSlot: 4,
      status: 'ожидание',
      lostPeople: 0,
    },
  ];
}

export function createInitialPracticeState(): PracticeState {
  return {
    enabledSlots: [1, 2],
    customExceptionName: 'TicketBookingException',
    includeInnerException: true,
    includeRecordIdProperty: true,
    lastSuitePassed: null,
    lastSuiteIssued: 0,
    lastSuiteReported: 0,
    lastSuiteLog: [],
  };
}

export function createInitialSession(code = '4826'): SessionState {
  const brigades = createInitialBrigades();
  const battles = createInitialBattles();
  const initialJournal: JournalEntry[] = [
    {
      id: 'j-init-1',
      shiftTime: '02:07',
      roundNumber: null,
      actor: 'auth',
      claimed: 'Сессия "test" открыта с 91.42.117.6 (права: администратор)',
      verified: 'Выгрузка: 0 байт · Удалено: 0',
      result: 'ВТОРЖЕНИЕ',
    },
    {
      id: 'j-init-2',
      shiftTime: '02:49',
      roundNumber: null,
      actor: 'monitor',
      claimed: 'В очередь из 1 240 человек вставлено 26 записей с битыми полями',
      verified: 'Контроль целостности: 26 не проходят',
      result: 'ТИКЕТ #7712 P1',
    },
  ];

  return {
    code,
    hostPin: '0900',
    startedAt: new Date().toISOString(),
    phase: 'prologue_1',
    shiftClock: '03:00',
    remainingToStart: '06:00',
    phaseRemainingSec: 180,
    timerRunning: false,
    mode: 'ПОЛНЫЙ',
    theme: 'night',
    world: 'tickets',
    screensDimmedForStandingReport: false,
    selectedPolygonFile: 'Booking.cs',
    selectedLine: 12,
    shield: INITIAL_SHIELD_RULES.map((r) => ({ ...r })),
    brigades,
    players: [
      { id: 'p-1', name: 'Дежурный TRY-1', brigade: 'TRY', role: 'аналитик', connected: true, joinedAt: '03:00' },
      { id: 'p-2', name: 'Дежурный TRY-2', brigade: 'TRY', role: 'картёр', connected: true, joinedAt: '03:00' },
      { id: 'p-3', name: 'Дежурный CATCH-1', brigade: 'CATCH', role: 'картёр', connected: true, joinedAt: '03:00' },
      { id: 'p-4', name: 'Дежурный FINALLY-1', brigade: 'FINALLY', role: 'арбитр', connected: true, joinedAt: '03:00' },
    ],
    currentBattleNumber: 1,
    battles,
    prologue: {
      pollVotes: { broken: 2, intrusion: 14, dataLost: 2 },
      brigadeVotes: {},
      pollRevealed: false,
      batchCrashed: false,
      matchedMines: {},
      hierarchyShown: false,
      mechanismParts: { TRY: false, CATCH: false, FINALLY: false },
      mechanismDuties: {},
      batchRepelled: false,
      secondWaveTriggered: false,
    },
    practice: createInitialPracticeState(),
    waves: createInitialWaves(),
    queue: {
      total: 1240,
      issued: 0,
      lost: 0,
      reported: 0,
      started: false,
      completed: false,
      slowGroupMode: false,
      currentWaveStep: 0,
      lossReasons: [],
    },
    journal: initialJournal,
    nominations: {
      mostPreciseAnalysis: 'TRY',
      bestJournal: 'CATCH',
      honestMistake: 'FINALLY',
    },
    lastGesture: null,
  };
}

export interface CardValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateCardInput(input: {
  line: number | null | undefined;
  exceptionType: string;
  statement: string;
}): CardValidationResult {
  if (!input.line || Number.isNaN(Number(input.line)) || Number(input.line) <= 0) {
    return {
      valid: false,
      reason: 'Правило №1: ссылка на номер строки кода обязательна. Карта без номера строки не принимается.',
    };
  }

  const rawType = (input.exceptionType || '').trim();
  if (!rawType) {
    return {
      valid: false,
      reason: 'Правило №2: укажите точный тип исключения или конструкцию механизма.',
    };
  }

  const lowerType = rawType.toLowerCase();
  if (lowerType === 'ошибка' || lowerType === 'исключение' || lowerType === 'баг' || lowerType === 'error') {
    return {
      valid: false,
      reason: 'Правило №2: «Ошибка» — не тип. Укажите точный тип (например, FormatException или DivideByZeroException).',
    };
  }

  const matchesKnown = KNOWN_EXCEPTION_TYPES.some(
    (t) => rawType.toLowerCase().includes(t.toLowerCase())
  ) || /Exception$/i.test(rawType);

  if (!matchesKnown) {
    return {
      valid: false,
      reason: 'Правило №2: тип должен быть точным именем класса исключения (*Exception), кодом CS0160 или блоком finally/throw.',
    };
  }

  const text = (input.statement || '').trim();
  if (text.length < 8) {
    return {
      valid: false,
      reason: 'Утверждение слишком короткое: сформулируйте одно проверяемое утверждение по строке кода.',
    };
  }

  if (text.length > 220) {
    return {
      valid: false,
      reason: 'Карта — это одно утверждение, а не сочинение (максимум 220 символов).',
    };
  }

  const vaguePromises = ['нужно обработать исключения', 'мы бы поставили try', 'тут может быть ошибка'];
  if (vaguePromises.some((p) => text.toLowerCase() === p)) {
    return {
      valid: false,
      reason: 'Формулировка без конкретики не принимается: укажите переменную, вызов или порядок блоков.',
    };
  }

  return { valid: true };
}

export function validateJournalEntry(input: {
  claimed: string;
  verified: string;
}): CardValidationResult {
  const claimed = (input.claimed || '').trim();
  const verified = (input.verified || '').trim();

  if (claimed.length < 6) {
    return {
      valid: false,
      reason:
        'Правило журнала (Документ 07, п. 4): укажите конкретно, что было заявлено (строка или тип).',
    };
  }

  const forbiddenPhrases = [
    'обсудили и решили',
    'всё нормально',
    'поговорили',
    'исправили ошибку',
    'сделали задание',
  ];
  const combined = `${claimed} ${verified}`.toLowerCase();
  if (forbiddenPhrases.some((p) => combined.includes(p))) {
    return {
      valid: false,
      reason:
        'Правило журнала: «Обсудили и решили» — не запись. Запись должна позволять восстановить бой через сутки без свидетелей (строка, тип, результат запуска).',
    };
  }

  return { valid: true };
}

export function evaluatePolygonRun(
  battleNumber: 1 | 2 | 3 | 4,
  appliedSlots: number[],
  counterAttackVector?: string | null
): RunResult {
  const hasSlot1 = appliedSlots.includes(1);
  const hasSlot2 = appliedSlots.includes(2);
  const hasSlot3 = appliedSlots.includes(3);
  const hasSlot4 = appliedSlots.includes(4);

  const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (battleNumber === 1) {
    if (!hasSlot1) {
      return {
        id: `run-${Date.now()}`,
        roundNumber: 1,
        timestamp: now,
        file: 'Booking.cs',
        targetLine: 12,
        exceptionType: 'FormatException',
        appliedSlots,
        outcome: 'ПРОБИЛА',
        handlerTriggered: null,
        totalRecords: 1240,
        processedRecords: 18,
        reportedMines: 0,
        swallowedMines: 0,
        openConnections: 1,
        stackPreserved: true,
        compilerError: null,
        consoleLog: [
          '[04:12:01] ПАКЕТ: старт обработки 1 240 записей очереди...',
          '[04:12:02] Запись #0x1F3: req.Place = "два"',
          '[04:12:02] НЕОБРАБОТАННОЕ ИСКЛЮЧЕНИЕ: System.FormatException на Booking.cs:строка 12',
          '[04:12:02] Стек: at Parter.Booking.Parse(TicketRequest req) in Booking.cs:line 12',
          '[04:12:02] АВАРИЙНАЯ ОСТАНОВКА КОНВЕЙЕРА: выдано 18 из 1240. Очередь стоит.',
        ],
        durationMs: 140,
      };
    }

    if (counterAttackVector === 'divide_by_zero' && !hasSlot2) {
      return {
        id: `run-${Date.now()}`,
        roundNumber: 1,
        timestamp: now,
        file: 'Booking.cs',
        targetLine: 14,
        exceptionType: 'DivideByZeroException',
        appliedSlots,
        outcome: 'ПРОБИЛА',
        handlerTriggered: null,
        totalRecords: 1240,
        processedRecords: 47,
        reportedMines: 1,
        swallowedMines: 0,
        openConnections: 1,
        stackPreserved: true,
        compilerError: null,
        consoleLog: [
          '[04:15:10] ПАКЕТ: слот #1 (try-catch FormatException) активен.',
          '[04:15:11] Запись #0x1F3 ("два") перехвачена -> в отчёт.',
          '[04:15:11] КОНТРАТАКА #0x2A8: req.Count = 0 на строке 14 (TotalSum / count)',
          '[04:15:11] НЕОБРАБОТАННОЕ ИСКЛЮЧЕНИЕ: System.DivideByZeroException на Booking.cs:строка 14',
          '[04:15:11] ПРОБИЛА: обработчик FormatException не ловит DivideByZeroException.',
        ],
        durationMs: 165,
      };
    }

    return {
      id: `run-${Date.now()}`,
      roundNumber: 1,
      timestamp: now,
      file: 'Booking.cs',
      targetLine: 12,
      exceptionType: 'FormatException',
      appliedSlots,
      outcome: 'ОТБИТА',
      handlerTriggered: hasSlot2
        ? 'catch (FormatException) + catch (DivideByZeroException)'
        : 'catch (FormatException ex) around Booking.Parse',
      totalRecords: 1240,
      processedRecords: 1214,
      reportedMines: 26,
      swallowedMines: 0,
      openConnections: 0,
      stackPreserved: true,
      compilerError: null,
      consoleLog: [
        '[04:14:02] ПАКЕТ: старт обработки 1 240 записей со слотом #1...',
        '[04:14:08] Запись #0x1F3 (Booking.cs:12) -> перехвачена catch (FormatException), занесена в отчёт.',
        '[04:14:19] ПАКЕТ ЗАВЕРШЁН: прошло 1 214 · в отчёт 26 · аварийных остановок: 0.',
        '[04:14:19] ВЕРДИКТ ПОЛИГОНА: ОТБИТА.',
      ],
      durationMs: 180,
    };
  }

  if (battleNumber === 2) {
    if (!hasSlot2) {
      return {
        id: `run-${Date.now()}`,
        roundNumber: 2,
        timestamp: now,
        file: 'Pricing.cs',
        targetLine: 27,
        exceptionType: 'FormatException',
        appliedSlots,
        outcome: 'ПРОБИЛА',
        handlerTriggered: null,
        totalRecords: 1240,
        processedRecords: 0,
        reportedMines: 0,
        swallowedMines: 26,
        openConnections: 0,
        stackPreserved: false,
        compilerError:
          'CS0160 (Pricing.cs, строка 27): Предыдущее предложение catch уже перехватывает все исключения этого или супертипа ("Exception").',
        consoleLog: [
          '[05:11:04] КОМПИЛЯЦИЯ Pricing.cs...',
          '[05:11:04] ОШИБКА CS0160 на строке 27: catch (FormatException) недостижим, так как на строке 23 стоит общий catch (Exception).',
          '[05:11:04] Все 26 мин проваливаются в общий блок (return -1) без точной диагностики.',
          '[05:11:04] ВЕРДИКТ ПОЛИГОНА: ПРОБИЛА (нарушен порядок иерархии от частного к общему).',
        ],
        durationMs: 120,
      };
    }

    return {
      id: `run-${Date.now()}`,
      roundNumber: 2,
      timestamp: now,
      file: 'Pricing.cs',
      targetLine: 23,
      exceptionType: 'DivideByZeroException',
      appliedSlots,
      outcome: 'ОТБИТА',
      handlerTriggered: 'catch (FormatException) -> catch (DivideByZeroException) -> catch (Exception)',
      totalRecords: 1240,
      processedRecords: 1214,
      reportedMines: 26,
      swallowedMines: 0,
      openConnections: 0,
      stackPreserved: true,
      compilerError: null,
      consoleLog: [
        '[05:14:10] КОМПИЛЯЦИЯ Pricing.cs со слотом #2: ОК (0 ошибок, CS0160 устранён).',
        '[05:14:12] Частные обработчики FormatException и DivideByZeroException стоят перед общим Exception.',
        '[05:14:22] ПАКЕТ ЗАВЕРШЁН: прошло 1 214 · 26 мин классифицированы по типам.',
        '[05:14:22] ВЕРДИКТ ПОЛИГОНА: ОТБИТА.',
      ],
      durationMs: 175,
    };
  }

  if (battleNumber === 3) {
    if (!hasSlot3) {
      return {
        id: `run-${Date.now()}`,
        roundNumber: 3,
        timestamp: now,
        file: 'Seats.cs',
        targetLine: 41,
        exceptionType: 'IndexOutOfRangeException',
        appliedSlots,
        outcome: 'ПРОБИЛА',
        handlerTriggered: null,
        totalRecords: 1240,
        processedRecords: 312,
        reportedMines: 8,
        swallowedMines: 0,
        openConnections: 64,
        stackPreserved: true,
        compilerError: null,
        consoleLog: [
          '[07:10:05] ПАКЕТ: открытие соединений DbPool.Open() на каждой заявке (лимит пула: 64)...',
          '[07:10:09] Запись #0x4D1 (SeatIndex = 7): падение IndexOutOfRangeException на Seats.cs:41 — строка 43 conn.Close() не выполнена!',
          '[07:10:11] Заявки с IsVip = true выходят по return на строке 42 — conn.Close() снова обойдён!',
          '[07:10:14] КРИТИЧЕСКИЙ ОТКАЗ НА ЗАПИСИ #312: пул соединений исчерпан (64 / 64 открыто). Очередь встала.',
          '[07:10:14] ВЕРДИКТ ПОЛИГОНА: ПРОБИЛА (утечка ресурса из-за отсутствия finally).',
        ],
        durationMs: 210,
      };
    }

    return {
      id: `run-${Date.now()}`,
      roundNumber: 3,
      timestamp: now,
      file: 'Seats.cs',
      targetLine: 41,
      exceptionType: 'IndexOutOfRangeException',
      appliedSlots,
      outcome: 'ОТБИТА',
      handlerTriggered: 'try { ... } finally { conn.Close(); }',
      totalRecords: 1240,
      processedRecords: 1214,
      reportedMines: 26,
      swallowedMines: 0,
      openConnections: 0,
      stackPreserved: true,
      compilerError: null,
      consoleLog: [
        '[07:14:01] ПАКЕТ: слот #3 (finally { conn.Close(); }) установлен.',
        '[07:14:06] При падении IndexOutOfRangeException на строке 41 блок finally закрывает соединение.',
        '[07:14:09] При раннем return на строке 42 (VIP-бронь) блок finally также закрывает соединение.',
        '[07:14:18] ПАКЕТ ЗАВЕРШЁН: прошло 1 214 · открытых соединений: 0 из 64 · в отчёт: 26.',
        '[07:14:18] ВЕРДИКТ ПОЛИГОНА: ОТБИТА.',
      ],
      durationMs: 190,
    };
  }

  if (!hasSlot4) {
    return {
      id: `run-${Date.now()}`,
      roundNumber: 4,
      timestamp: now,
      file: 'Promo.cs',
      targetLine: 55,
      exceptionType: 'NullReferenceException',
      appliedSlots,
      outcome: 'ПРОБИЛА',
      handlerTriggered: 'catch (NullReferenceException) { } // ПУСТОЙ БЛОК',
      totalRecords: 1240,
      processedRecords: 1214,
      reportedMines: 0,
      swallowedMines: 26,
      openConnections: 0,
      stackPreserved: false,
      compilerError: null,
      consoleLog: [
        '[08:11:02] ПАКЕТ: прогон Promo.Apply(req, price) на 1 240 записях...',
        '[08:11:05] Строка 55: пустой catch (NullReferenceException) { } проглотил 26 подозрительных записей!',
        '[08:11:06] Строка 58: инструкция throw ex; перезаписала StackTrace (исходная строка 20 потеряна).',
        '[08:11:08] АУДИТ СМЕНЫ: в отчёте 0 из 26 мин. Улики вторжения уничтожены пустым catch.',
        '[08:11:08] ВЕРДИКТ ПОЛИГОНА: ПРОБИЛА (сокрытие следов и потеря стека).',
      ],
      durationMs: 160,
    };
  }

  return {
    id: `run-${Date.now()}`,
    roundNumber: 4,
    timestamp: now,
    file: 'Promo.cs',
    targetLine: 55,
    exceptionType: 'NullReferenceException',
    appliedSlots,
    outcome: 'ОТБИТА',
    handlerTriggered: 'AuditLog.ReportMine(req.Id, ex); throw;',
    totalRecords: 1240,
    processedRecords: 1214,
    reportedMines: 26,
    swallowedMines: 0,
    openConnections: 0,
    stackPreserved: true,
    compilerError: null,
    consoleLog: [
      '[08:15:03] ПАКЕТ: слот #4 (AuditLog.ReportMine + throw;) активен.',
      '[08:15:09] Все 26 записей с пустым PromoCode зафиксированы в журнале безопасности.',
      '[08:15:11] Инструкция throw; сохранила оригинальный адрес падения (Promo.cs:line 20).',
      '[08:15:15] ПАКЕТ ЗАВЕРШЁН: прошло 1 214 · в отчёте 26 из 26 · стек сохранён.',
      '[08:15:15] ВЕРДИКТ ПОЛИГОНА: ОТБИТА.',
    ],
    durationMs: 170,
  };
}

/**
 * Оценивает комплексный прогон фазы «08:05 Практика — сборка своего патча» (все 4 рубежа + свой класс исключения).
 */
export function evaluatePracticeSuite(practice: PracticeState): {
  passed: boolean;
  issued: number;
  reported: number;
  log: string[];
} {
  const log: string[] = [];
  const has1 = practice.enabledSlots.includes(1);
  const has2 = practice.enabledSlots.includes(2);
  const has3 = practice.enabledSlots.includes(3);
  const has4 = practice.enabledSlots.includes(4);
  const validName = /Exception$/i.test(practice.customExceptionName.trim());

  log.push(`[08:18:00] СТРЕСС-ПРОГОН ПРАКТИКИ: 1 240 записей (4 волны одновременно)...`);

  if (!has1) {
    log.push(`[ОШИБКА РУБЕЖА 1] Отсутствует try внутри цикла пакета -> остановка на записи #0x1F3 (FormatException).`);
    return { passed: false, issued: 18, reported: 0, log };
  }
  log.push(`[РУБЕЖ 1 ОК] Перехват внутри цикла удерживает конвейер на плаву.`);

  if (!has2) {
    log.push(`[ОШИБКА РУБЕЖА 2] Нарушен порядок иерархии catch -> CS0160 (DivideByZeroException перекрыт общим Exception).`);
    return { passed: false, issued: 0, reported: 0, log };
  }
  log.push(`[РУБЕЖ 2 ОК] Иерархия от частного к общему соблюдена без CS0160.`);

  if (!has3) {
    log.push(`[ОШИБКА РУБЕЖА 3] Нет блока finally { conn.Close(); } -> пул из 64 соединений исчерпан на записи #312.`);
    return { passed: false, issued: 312, reported: 8, log };
  }
  log.push(`[РУБЕЖ 3 ОК] Блок finally освобождает все 1 240 соединений при падении и при return.`);

  if (!has4) {
    log.push(`[ОШИБКА РУБЕЖА 4] Пустой catch {} проглотил 26 мин, в отчёте 0 записей.`);
    return { passed: false, issued: 1214, reported: 0, log };
  }
  log.push(`[РУБЕЖ 4 ОК] Все 26 подозрительных записей переданы в отчёт с сохранением стека (throw;).`);

  if (!validName || !practice.includeInnerException || !practice.includeRecordIdProperty) {
    log.push(
      `[ДОМЕННОЕ ИСКЛЮЧЕНИЕ] Проверьте класс ${practice.customExceptionName}: требуется суффикс *Exception, свойство RecordId и передача innerException.`
    );
    return { passed: false, issued: 1214, reported: 26, log };
  }

  log.push(
    `[ДОМЕННЫЙ ТИП ОК] Собственный класс ${practice.customExceptionName} : Exception сохраняет RecordId и InnerException.`
  );
  log.push(`[ИТОГ ПРАКТИКИ] ПАТЧ ГОТОВ К 09:00: билетов 1214 · в отчёте 26 · утечек 0.`);
  return { passed: true, issued: 1214, reported: 26, log };
}

export function buildArbiterOralFormula(params: {
  battleNumber: 1 | 2 | 3 | 4;
  targetLine: number;
  result: 'ПРОБИЛА' | 'ОТБИТА' | 'НЕ ПРИНЯТА';
  attackerDelta: number;
  defenderDelta: number;
  journalLine: string;
}): string {
  const battleWord = NUMBER_WORDS[params.battleNumber] || String(params.battleNumber);
  const resWord =
    params.result === 'ПРОБИЛА'
      ? 'пробила'
      : params.result === 'ОТБИТА'
      ? 'отбита'
      : 'не принята';
  return `Бой ${battleWord}. Атака на строку ${params.targetLine}. Запуск: ${resWord}. Атакующим — ${params.attackerDelta}. Защите — ${params.defenderDelta}. Журнал: ${params.journalLine}`;
}

export function computeBattle4RolesByRating(
  brigades: Record<BrigadeId, Brigade>,
  leaderPreferredRole: BattleRole = 'ЗАЩИТА'
): { attacker: BrigadeId; defender: BrigadeId; arbiter: BrigadeId } {
  const sorted = (Object.values(brigades) as Brigade[]).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const order: Record<BrigadeId, number> = { TRY: 3, CATCH: 2, FINALLY: 1 };
    return order[b.id] - order[a.id];
  });

  const first = sorted[0].id;
  const second = sorted[1].id;
  const third = sorted[2].id;

  if (leaderPreferredRole === 'АТАКА') {
    return { attacker: first, defender: second, arbiter: third };
  }
  if (leaderPreferredRole === 'АРБИТР') {
    return { attacker: second, defender: third, arbiter: first };
  }
  return { attacker: second, defender: first, arbiter: third };
}

export function syncBrigadeRolesWithBattle(
  brigades: Record<BrigadeId, Brigade>,
  battle: BattleRound
): Record<BrigadeId, Brigade> {
  const next: Record<BrigadeId, Brigade> = {
    TRY: { ...brigades.TRY },
    CATCH: { ...brigades.CATCH },
    FINALLY: { ...brigades.FINALLY },
  };
  next[battle.attacker].battleRole = 'АТАКА';
  next[battle.defender].battleRole = 'ЗАЩИТА';
  next[battle.arbiter].battleRole = 'АРБИТР';
  return next;
}

export function isShieldComplete(state: SessionState): boolean {
  return state.shield.length === 6 && state.shield.every((r) => r.unlocked);
}

export function getUnlockedShieldCount(state: SessionState): number {
  return state.shield.filter((r) => r.unlocked).length;
}

export function evaluateStart0900Waves(
  waves: WaveState[],
  upToWaveCount = 4
): {
  updatedWaves: WaveState[];
  issued: number;
  lost: number;
  lossReasons: string[];
} {
  let lost = 0;
  const lossReasons: string[] = [];

  const updatedWaves: WaveState[] = waves.map((wave, idx) => {
    if (idx >= upToWaveCount) {
      return { ...wave, status: 'ожидание', lostPeople: 0 };
    }
    const repelled = wave.selectedSlot === wave.patchSlotRequired;
    if (repelled) {
      return {
        ...wave,
        status: 'отбита',
        lostPeople: 0,
      };
    } else {
      lost += 30;
      lossReasons.push(`волна ${wave.id} (${wave.direction} · ${wave.exceptionType})`);
      return {
        ...wave,
        status: 'пробила',
        lostPeople: 30,
      };
    }
  });

  const total = 1240;
  const issued = total - lost;

  return {
    updatedWaves,
    issued,
    lost,
    lossReasons,
  };
}

export function computeNominations(state: SessionState): {
  mostPreciseAnalysis: BrigadeId;
  bestJournal: BrigadeId;
  honestMistake: BrigadeId;
} {
  const list = Object.values(state.brigades).sort((a, b) => b.score - a.score);
  return {
    mostPreciseAnalysis: list[0]?.id || 'TRY',
    bestJournal: list[1]?.id || 'CATCH',
    honestMistake: list[2]?.id || 'FINALLY',
  };
}
