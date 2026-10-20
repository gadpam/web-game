import { describe, expect, it } from 'vitest';
import {
  createInitialSession,
  evaluatePolygonRun,
  evaluatePracticeSuite,
  getUnlockedShieldCount,
  isShieldComplete,
  validateCardInput,
  validateJournalEntry,
} from '../game/engine';
import { KIT_DOCUMENTS } from '../game/kitDocuments';
import { gameReducer } from '../game/reducer';
import {
  acquireOrCheckClockLeader,
  clearPersistedSessionState,
  loadPersistedSessionState,
  parseLaunchParams,
  persistSessionState,
} from '../game/syncBus';
import { getWorldPolygonFiles, getWorldPrologueLogs } from '../game/worldPolygons';

describe('АПТАЙМ · Ночная смена — Ядро и Регламент (Документы 00–11)', () => {
  it('содержит все 11 документов комплекта «Аптайм» (от 00 до 11)', () => {
    expect(KIT_DOCUMENTS).toHaveLength(11);
    const ids = KIT_DOCUMENTS.map((d) => d.id);
    expect(ids).toEqual([
      '00',
      '01',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
    ]);
  });

  it('предоставляет доменные файлы полигона и логи для всех 4 сменных миров (Документ 04, п. 14)', () => {
    const worlds = ['tickets', 'game_server', 'food_delivery', 'clinic'] as const;
    for (const w of worlds) {
      const files = getWorldPolygonFiles(w);
      const logs = getWorldPrologueLogs(w);
      expect(Object.keys(files)).toEqual([
        'Program.cs',
        'Booking.cs',
        'Pricing.cs',
        'Seats.cs',
        'Promo.cs',
      ]);
      expect(logs.length).toBeGreaterThanOrEqual(5);
      expect(files['Booking.cs'].lines.length).toBeGreaterThanOrEqual(10);
    }
    expect(getWorldPolygonFiles('game_server')['Program.cs'].subtitle).toContain(
      'Арена-Матч'
    );
    expect(getWorldPolygonFiles('clinic')['Program.cs'].subtitle).toContain(
      'МедСмена'
    );
  });

  it('создаёт начальную партию в фазе 03:00 Сцена 1 с 3 бригадами (TRY ▲, CATCH ⬡, FINALLY ■)', () => {
    const state = createInitialSession('4826');
    expect(state.code).toBe('4826');
    expect(state.phase).toBe('prologue_1');
    expect(state.shiftClock).toBe('03:00');
    expect(state.brigades.TRY.shapeSymbol).toBe('▲');
    expect(state.brigades.CATCH.shapeSymbol).toBe('⬡');
    expect(state.brigades.FINALLY.shapeSymbol).toBe('■');
    expect(getUnlockedShieldCount(state)).toBe(0);
    expect(isShieldComplete(state)).toBe(false);
  });

  it('открывает Правила щита №1 и №2 в ходе Завязки (Сцены 2 и 3)', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, {
      type: 'PROLOGUE_MATCH_MINE',
      mineId: 'mine_1',
      exceptionType: 'FormatException',
    });
    state = gameReducer(state, {
      type: 'PROLOGUE_MATCH_MINE',
      mineId: 'mine_2',
      exceptionType: 'DivideByZeroException',
    });
    state = gameReducer(state, {
      type: 'PROLOGUE_MATCH_MINE',
      mineId: 'mine_3',
      exceptionType: 'IndexOutOfRangeException',
    });
    state = gameReducer(state, {
      type: 'PROLOGUE_MATCH_MINE',
      mineId: 'mine_4',
      exceptionType: 'NullReferenceException',
    });

    expect(state.shield.find((r) => r.id === 1)?.unlocked).toBe(true);

    state = gameReducer(state, { type: 'PROLOGUE_REPEL_BATCH' });
    expect(state.shield.find((r) => r.id === 2)?.unlocked).toBe(true);
    expect(getUnlockedShieldCount(state)).toBe(2);
  });

  it('проверяет карты по разделу 5 Регламента (ровно 3 поля, запрет слова «Ошибка» вместо типа)', () => {
    const badType = validateCardInput({
      line: 12,
      exceptionType: 'Ошибка',
      statement: 'Упадёт на пустой строке',
    });
    expect(badType.valid).toBe(false);

    const goodCard = validateCardInput({
      line: 12,
      exceptionType: 'FormatException',
      statement: 'int.Parse("") выбрасывает FormatException на строке 12',
    });
    expect(goodCard.valid).toBe(true);

    // Проверка правила Журнала Писаря (Документ 07, п. 4: «Обсудили и решили» — не запись)
    const badJournal = validateJournalEntry({
      claimed: 'Обсудили и решили поставить защиту',
      verified: 'всё нормально',
    });
    expect(badJournal.valid).toBe(false);

    const goodJournal = validateJournalEntry({
      claimed: 'Строка 12, FormatException',
      verified: 'Запуск: пакет 1214/1240 прошёл, 26 в отчёт',
    });
    expect(goodJournal.valid).toBe(true);
  });

  it('выполняет живой запуск полигона для всех 4 боёв («Перехват», «Порядок», «Гарантия», «Честность»)', () => {
    const b1Fail = evaluatePolygonRun(1, [], null);
    expect(b1Fail.outcome).toBe('ПРОБИЛА');

    const b1Ok = evaluatePolygonRun(1, [1], null);
    expect(b1Ok.outcome).toBe('ОТБИТА');

    const b1CounterFail = evaluatePolygonRun(1, [1], 'divide_by_zero');
    expect(b1CounterFail.outcome).toBe('ПРОБИЛА');

    const b2Ok = evaluatePolygonRun(2, [2], null);
    expect(b2Ok.outcome).toBe('ОТБИТА');

    const b3Ok = evaluatePolygonRun(3, [3], null);
    expect(b3Ok.outcome).toBe('ОТБИТА');

    const b4Ok = evaluatePolygonRun(4, [4], null);
    expect(b4Ok.outcome).toBe('ОТБИТА');
  });

  it('поддерживает стоп-кран Арбитра на спорной карте и паузу таймера (Документ 10, п. 7)', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, { type: 'SET_PHASE', phase: 'battle_1' });
    state = gameReducer(state, { type: 'TOGGLE_TIMER' });
    expect(state.timerRunning).toBe(true);

    // Арбитр нажимает стоп-кран
    state = gameReducer(state, {
      type: 'TOGGLE_ARBITER_STOP',
      reason: 'Сверка номера строки в карте атаки TRY',
    });
    expect(state.battles[1].arbiterStopActive).toBe(true);
    expect(state.timerRunning).toBe(false);

    // Снятие стоп-крана
    state = gameReducer(state, { type: 'TOGGLE_ARBITER_STOP' });
    expect(state.battles[1].arbiterStopActive).toBe(false);

    // Апелляция Докладчика (30 с, одна на бой — Документ 01, п. 7)
    state = gameReducer(state, { type: 'START_APPEAL' });
    expect(state.battles[1].appealUsed).toBe(true);
    expect(state.battles[1].appealRemainingSec).toBe(30);
    state = gameReducer(state, { type: 'TICK_SECOND' });
    expect(state.battles[1].appealRemainingSec).toBe(29);
  });

  it('синхронизирует часы смены секунда в секунду в фазе 08:55 Пять минут до старта и распределяет номинации 09:07', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, { type: 'SET_PHASE', phase: 'five_min' });
    state = gameReducer(state, { type: 'TOGGLE_TIMER' });
    state = gameReducer(state, { type: 'TICK_SECOND' });
    expect(state.shiftClock).toBe('08:55:01');

    state = gameReducer(state, {
      type: 'SET_WAVE_HOLDER',
      waveId: 1,
      holder: 'CATCH',
    });
    expect(state.waves.find((w) => w.id === 1)?.holder).toBe('CATCH');

    state = gameReducer(state, {
      type: 'SET_NOMINATION',
      nomination: 'honestMistake',
      brigade: 'TRY',
    });
    expect(state.nominations.honestMistake).toBe('TRY');
  });

  it('проверяет практику 08:05: сборку 4 рубежей патча и собственный класс TicketBookingException : Exception', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, { type: 'SET_PHASE', phase: 'practice' });

    // Включаем недостающие слоты 3 и 4 для полного контура
    state = gameReducer(state, { type: 'TOGGLE_PRACTICE_SLOT', slot: 3 });
    state = gameReducer(state, { type: 'TOGGLE_PRACTICE_SLOT', slot: 4 });

    state = gameReducer(state, { type: 'RUN_PRACTICE_SUITE' });
    expect(state.practice.lastSuitePassed).toBe(true);

    // Отключаем слот 3 (finally) — пакет должен упасть на утечке соединения
    state = gameReducer(state, { type: 'TOGGLE_PRACTICE_SLOT', slot: 3 });
    state = gameReducer(state, { type: 'RUN_PRACTICE_SUITE' });
    expect(state.practice.lastSuitePassed).toBe(false);

    // Проверяем также функцию evaluatePracticeSuite при неверном имени класса без суффикса Exception
    const badClassResult = evaluatePracticeSuite({
      ...state.practice,
      enabledSlots: [1, 2, 3, 4],
      customExceptionName: 'TicketError',
    });
    expect(badClassResult.passed).toBe(false);
  });

  it('начисляет очки по шкале Регламента (п. 8) и открывает правила Щита при вердикте Арбитра', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, { type: 'SET_PHASE', phase: 'battle_1' });

    state = gameReducer(state, {
      type: 'SUBMIT_VERDICT',
      result: 'ОТБИТА',
      legalAttackBonus: true,
      counterHeldBonus: true,
      journalLine: 'Защита поставила try-catch вокруг строки 12 и строчки 14',
    });

    expect(state.brigades.TRY.score).toBe(1);
    expect(state.brigades.CATCH.score).toBe(3);
    expect(state.brigades.FINALLY.score).toBe(1);
    expect(state.shield.find((r) => r.id === 3)?.unlocked).toBe(true);

    state = gameReducer(state, {
      type: 'AWARD_MISSED_SPOT',
      note: 'Пропуск: int.TryParse вместо исключения на потоке',
    });
    expect(state.brigades.FINALLY.score).toBe(2);
  });

  it('блокирует старт в 09:00 при неполном Щите и рассчитывает 4 волны (включая пошаговый режим для медленной группы)', () => {
    let state = createInitialSession('4826');

    state = gameReducer(state, { type: 'TRIGGER_START_0900' });
    expect(state.queue.started).toBe(false);

    state = gameReducer(state, { type: 'UNLOCK_ALL_SHIELD' });
    expect(isShieldComplete(state)).toBe(true);

    state = gameReducer(state, {
      type: 'SET_WAVE_SLOT',
      waveId: 3,
      slot: null,
    });
    state = gameReducer(state, { type: 'TRIGGER_START_0900' });

    expect(state.queue.started).toBe(true);
    expect(state.queue.completed).toBe(true);
    expect(state.queue.issued).toBe(1210);
    expect(state.queue.lost).toBe(30);

    let slowState = createInitialSession('4826');
    slowState = gameReducer(slowState, { type: 'UNLOCK_ALL_SHIELD' });
    slowState = gameReducer(slowState, { type: 'TOGGLE_SLOW_GROUP_MODE' });
    slowState = gameReducer(slowState, { type: 'TRIGGER_START_0900' });
    expect(slowState.queue.currentWaveStep).toBe(1);
    expect(slowState.queue.completed).toBe(false);

    slowState = gameReducer(slowState, { type: 'STEP_WAVE_0900' });
    slowState = gameReducer(slowState, { type: 'STEP_WAVE_0900' });
    slowState = gameReducer(slowState, { type: 'STEP_WAVE_0900' });
    expect(slowState.queue.completed).toBe(true);
    expect(slowState.queue.issued).toBe(1240);
  });

  it('загружает эталонный демо-пресет 1210/1240, поддерживает импорт снимка и перехват роли с нового окна/устройства', () => {
    let demo = createInitialSession('4826');
    demo = gameReducer(demo, { type: 'LOAD_DEMO_1210' });
    expect(demo.queue.issued).toBe(1210);
    expect(demo.brigades.TRY.score).toBe(14);
    expect(demo.brigades.CATCH.score).toBe(12);
    expect(demo.brigades.FINALLY.score).toBe(11);

    let state = gameReducer(demo, {
      type: 'JOIN_PLAYER',
      name: 'Илья',
      brigade: 'TRY',
      role: 'аналитик',
    });
    const tryAnalysts1 = state.players.filter(
      (p) => p.brigade === 'TRY' && p.role === 'аналитик'
    );
    expect(tryAnalysts1).toHaveLength(1);
    expect(tryAnalysts1[0].name).toBe('Илья');

    state = gameReducer(state, {
      type: 'JOIN_PLAYER',
      name: 'Илья (новое окно)',
      brigade: 'TRY',
      role: 'аналитик',
    });
    const tryAnalysts2 = state.players.filter(
      (p) => p.brigade === 'TRY' && p.role === 'аналитик'
    );
    expect(tryAnalysts2).toHaveLength(1);
    expect(tryAnalysts2[0].name).toBe('Илья (новое окно)');

    // Проверка IMPORT_SESSION_STATE
    const fresh = createInitialSession('9999');
    const imported = gameReducer(fresh, {
      type: 'IMPORT_SESSION_STATE',
      imported: demo,
    });
    expect(imported.queue.issued).toBe(1210);
    expect(imported.brigades.TRY.score).toBe(14);
  });

  it('разбирает параметры запуска #projector и ?screen=... для двухоконного офлайн-режима', () => {
    const p1 = parseLaunchParams('', '#projector');
    expect(p1.screen).toBe('hall');
    expect(p1.projectorClean).toBe(true);

    const p2 = parseLaunchParams('?screen=host', '');
    expect(p2.screen).toBe('host');
    expect(p2.projectorClean).toBeUndefined();

    const p3 = parseLaunchParams(
      '',
      '#screen=brigade&brigade=CATCH&role=арбитр&projector=1'
    );
    expect(p3.screen).toBe('brigade');
    expect(p3.brigade).toBe('CATCH');
    expect(p3.role).toBe('арбитр');
    expect(p3.projectorClean).toBe(true);
  });

  it('сохраняет состояние в хранилище (защита от F5) и выбирает единственного лидера таймера между окнами', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };

    const initial = createInitialSession('4826');
    const modified = gameReducer(initial, { type: 'LOAD_DEMO_1210' });
    persistSessionState(modified, mockStorage);

    const restored = loadPersistedSessionState(mockStorage);
    expect(restored).not.toBeNull();
    expect(restored?.queue.issued).toBe(1210);
    expect(restored?.brigades.TRY.score).toBe(14);

    clearPersistedSessionState(mockStorage);
    expect(loadPersistedSessionState(mockStorage)).toBeNull();

    // Проверка выбора лидера секундного таймера (Clock Leader Election):
    // 1. Окно проектора открывается первым в t=1000 и берёт лидерство
    expect(acquireOrCheckClockLeader('win-projector', false, 1000, mockStorage)).toBe(
      true
    );
    // 2. Второе обычное окно в t=1500 не может перехватить таймер (чтобы часы не шли в 2 раза быстрее)
    expect(acquireOrCheckClockLeader('win-brigade', false, 1500, mockStorage)).toBe(
      false
    );
    // 3. Окно Панели ведущего (isPreferredHost = true) имеет приоритет и забирает тактовый генератор себе
    expect(acquireOrCheckClockLeader('win-host', true, 1600, mockStorage)).toBe(
      true
    );
    expect(acquireOrCheckClockLeader('win-projector', false, 1700, mockStorage)).toBe(
      false
    );
    // 4. Если окно ведущего закрылось и прошло > 2400 мс (t=5000), окно проектора подхватывает таймер
    expect(acquireOrCheckClockLeader('win-projector', false, 5000, mockStorage)).toBe(
      true
    );
  });
});
