import { describe, expect, it } from 'vitest';
import {
  buildArbiterOralFormula,
  computeBattle4RolesByRating,
  createInitialSession,
  evaluatePolygonRun,
  evaluateStart0900Waves,
  isShieldComplete,
  validateCardInput,
} from '../game/engine';
import { gameReducer } from '../game/reducer';
import { PROLOGUE_MINES, TEACHER_SCRIPT_19 } from '../game/constants';
import { KIT_DOCUMENTS } from '../game/kitDocuments';

describe('АПТАЙМ · Ночная смена — Игровой движок и Регламент', () => {
  it('содержит все 11 документов комплекта смены (00–11)', () => {
    expect(KIT_DOCUMENTS).toHaveLength(11);
    const ids = KIT_DOCUMENTS.map((d) => d.id);
    expect(ids).toEqual(['00', '01', '03', '04', '05', '06', '07', '08', '09', '10', '11']);
  });

  it('проверяет лимит реплик ведущего за завязку: 19 реплик и не более 130 слов (Документ 00 и 03)', () => {
    expect(TEACHER_SCRIPT_19).toHaveLength(19);
    const totalWords = TEACHER_SCRIPT_19.reduce((sum, l) => sum + l.wordCount, 0);
    expect(totalWords).toBeLessThanOrEqual(130);
    expect(
      TEACHER_SCRIPT_19.every((line) => line.wordCount <= 12)
    ).toBe(true);
  });

  it('проходит 4 сцены завязки и открывает правила щита №1 (Анатомия) и №2 (Механизм)', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, { type: 'PROLOGUE_VOTE', option: 'intrusion' });
    state = gameReducer(state, { type: 'PROLOGUE_REVEAL_POLL' });
    expect(state.prologue.pollRevealed).toBe(true);

    state = gameReducer(state, { type: 'PROLOGUE_CRASH_BATCH' });
    expect(state.prologue.batchCrashed).toBe(true);

    PROLOGUE_MINES.forEach((m) => {
      state = gameReducer(state, {
        type: 'PROLOGUE_MATCH_MINE',
        mineId: m.id,
        exceptionType: m.expectedType,
      });
    });
    expect(state.shield.find((r) => r.id === 1)?.unlocked).toBe(true);

    state = gameReducer(state, { type: 'PROLOGUE_REPEL_BATCH' });
    expect(state.prologue.batchRepelled).toBe(true);
    expect(state.shield.find((r) => r.id === 2)?.unlocked).toBe(true);

    state = gameReducer(state, { type: 'PROLOGUE_TRIGGER_SECOND_WAVE' });
    expect(state.prologue.secondWaveTriggered).toBe(true);
  });

  it('валидирует карты по трём правилам Раздела 5 Регламента (строка, точный тип, одно утверждение)', () => {
    const noLine = validateCardInput({
      line: 0,
      exceptionType: 'FormatException',
      statement: 'place разбирается через int.Parse без проверки',
    });
    expect(noLine.valid).toBe(false);

    const vagueType = validateCardInput({
      line: 12,
      exceptionType: 'Ошибка',
      statement: 'place разбирается через int.Parse без проверки',
    });
    expect(vagueType.valid).toBe(false);
    expect(vagueType.reason).toContain('«Ошибка» — не тип');

    const validCard = validateCardInput({
      line: 12,
      exceptionType: 'FormatException',
      statement: 'place разбирается через int.Parse, place приходит из запроса без проверки',
    });
    expect(validCard.valid).toBe(true);
  });

  it('корректно выполняет живой запуск полигона «Партер» для всех 4 боёв', () => {
    const b1Fail = evaluatePolygonRun(1, []);
    expect(b1Fail.outcome).toBe('ПРОБИЛА');
    expect(b1Fail.targetLine).toBe(12);
    expect(b1Fail.processedRecords).toBe(18);

    const b1Pass = evaluatePolygonRun(1, [1]);
    expect(b1Pass.outcome).toBe('ОТБИТА');
    expect(b1Pass.processedRecords).toBe(1214);
    expect(b1Pass.reportedMines).toBe(26);

    const b1CounterFail = evaluatePolygonRun(1, [1], 'divide_by_zero');
    expect(b1CounterFail.outcome).toBe('ПРОБИЛА');
    expect(b1CounterFail.exceptionType).toBe('DivideByZeroException');

    const b1CounterPass = evaluatePolygonRun(1, [1, 2], 'divide_by_zero');
    expect(b1CounterPass.outcome).toBe('ОТБИТА');

    const b2Fail = evaluatePolygonRun(2, []);
    expect(b2Fail.outcome).toBe('ПРОБИЛА');
    expect(b2Fail.compilerError).toContain('CS0160');

    const b2Pass = evaluatePolygonRun(2, [2]);
    expect(b2Pass.outcome).toBe('ОТБИТА');
    expect(b2Pass.compilerError).toBeNull();

    const b3Fail = evaluatePolygonRun(3, []);
    expect(b3Fail.outcome).toBe('ПРОБИЛА');
    expect(b3Fail.openConnections).toBe(64);

    const b3Pass = evaluatePolygonRun(3, [3]);
    expect(b3Pass.outcome).toBe('ОТБИТА');
    expect(b3Pass.openConnections).toBe(0);

    const b4Fail = evaluatePolygonRun(4, []);
    expect(b4Fail.outcome).toBe('ПРОБИЛА');
    expect(b4Fail.swallowedMines).toBe(26);
    expect(b4Fail.stackPreserved).toBe(false);

    const b4Pass = evaluatePolygonRun(4, [4]);
    expect(b4Pass.outcome).toBe('ОТБИТА');
    expect(b4Pass.reportedMines).toBe(26);
    expect(b4Pass.stackPreserved).toBe(true);
  });

  it('начисляет очки по вердикту арбитра, открывает правила щита и распределяет Бой 4 по рейтингу', () => {
    let state = createInitialSession('4826');
    expect(state.battles[1].attacker).toBe('TRY');
    expect(state.battles[1].defender).toBe('CATCH');
    expect(state.battles[1].arbiter).toBe('FINALLY');

    state = gameReducer(state, {
      type: 'SUBMIT_VERDICT',
      result: 'ПРОБИЛА',
      legalAttackBonus: true,
      journalLine: 'Защита не поставила обработчик',
    });

    expect(state.brigades.TRY.score).toBe(3);
    expect(state.brigades.CATCH.score).toBe(0);
    expect(state.brigades.FINALLY.score).toBe(1);
    expect(state.shield.find((r) => r.id === 3)?.unlocked).toBe(true);

    state = gameReducer(state, {
      type: 'AWARD_MISSED_SPOT',
      note: 'int.TryParse дешевле int.Parse',
    });
    expect(state.brigades.FINALLY.score).toBe(2);

    const formula = buildArbiterOralFormula({
      battleNumber: 1,
      targetLine: 14,
      result: 'ПРОБИЛА',
      attackerDelta: 2,
      defenderDelta: 0,
      journalLine: 'защита не поставила обработчик.',
    });
    expect(formula).toContain('Бой первый. Атака на строку 14. Запуск: пробила.');

    const roles4 = computeBattle4RolesByRating(state.brigades, 'АТАКА');
    expect(roles4.attacker).toBe('TRY');
    expect(roles4.defender).toBe('FINALLY');
    expect(roles4.arbiter).toBe('CATCH');
  });

  it('блокирует старт в 09:00 при неполном щите, поддерживает пошаговые волны и эталон 1210/1240', () => {
    let state = createInitialSession('4826');
    expect(isShieldComplete(state)).toBe(false);

    state = gameReducer(state, { type: 'TRIGGER_START_0900' });
    expect(state.queue.started).toBe(false);

    state = gameReducer(state, { type: 'UNLOCK_ALL_SHIELD' });
    expect(isShieldComplete(state)).toBe(true);

    // Включаем режим «Слабая группа» (по одной волне)
    state = gameReducer(state, { type: 'TOGGLE_SLOW_GROUP_MODE' });
    state = gameReducer(state, { type: 'TRIGGER_START_0900' });
    expect(state.queue.currentWaveStep).toBe(1);
    expect(state.queue.completed).toBe(false);

    state = gameReducer(state, { type: 'STEP_WAVE_0900' });
    expect(state.queue.currentWaveStep).toBe(2);

    // Проверяем эталонный пресет 1210/1240
    state = gameReducer(state, { type: 'LOAD_DEMO_1210' });
    expect(state.queue.issued).toBe(1210);
    expect(state.queue.lost).toBe(30);
    expect(state.waves[1].status).toBe('пробила');

    const allFailed = evaluateStart0900Waves(
      state.waves.map((w) => ({ ...w, selectedSlot: null })),
      4
    );
    expect(allFailed.issued).toBe(1120);
    expect(allFailed.lost).toBe(120);
  });

  it('вытесняет предыдущую сессию при повторном входе с той же бригадой и ролью и сохраняет состояние при смене режима', () => {
    let state = createInitialSession('4826');
    state = gameReducer(state, {
      type: 'JOIN_PLAYER',
      name: 'Алексей',
      brigade: 'TRY',
      role: 'картёр',
    });
    state = gameReducer(state, {
      type: 'JOIN_PLAYER',
      name: 'Мария',
      brigade: 'TRY',
      role: 'картёр',
    });
    const tryCarters = state.players.filter(
      (p) => p.brigade === 'TRY' && p.role === 'картёр'
    );
    expect(tryCarters).toHaveLength(1);
    expect(tryCarters[0].name).toBe('Мария');

    state = gameReducer(state, {
      type: 'ADJUST_BRIGADE_SCORE',
      brigade: 'TRY',
      delta: 2,
      reason: 'Проверка',
    });
    state = gameReducer(state, { type: 'SET_MODE', mode: 'АВТОНОМНЫЙ' });
    expect(state.mode).toBe('АВТОНОМНЫЙ');
    expect(state.brigades.TRY.score).toBe(2);
  });
});
