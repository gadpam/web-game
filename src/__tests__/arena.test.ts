import { describe, expect, it } from 'vitest';
import {
  ARENA_ROUNDS,
  getPatchedCodeLines,
  simulateClash,
} from '../arena/arenaData';
import {
  arenaReducer,
  createInitialArenaState,
  getTeamsForRound,
} from '../arena/arenaSync';
import {
  buildLocalsTable,
  createDefaultCustomArgs,
  simulateCustomArgsClash,
} from '../arena/liveEvaluator';

describe('C# Exception Arena: Атака vs Защита — Симулятор CLR и Правила 4 Раундов', () => {
  it('содержит ровно 4 раунда с растущими ставками 100 / 150 / 200 / 300 очков', () => {
    expect(ARENA_ROUNDS).toHaveLength(4);
    expect(ARENA_ROUNDS.map((r) => r.maxPoints)).toEqual([100, 150, 200, 300]);
  });

  it('автоматически меняет роли АЛЬФА и БЕТА каждый раунд', () => {
    expect(getTeamsForRound(1)).toEqual({ attacker: 'ALPHA', defender: 'BETA' });
    expect(getTeamsForRound(2)).toEqual({ attacker: 'BETA', defender: 'ALPHA' });
    expect(getTeamsForRound(3)).toEqual({ attacker: 'ALPHA', defender: 'BETA' });
    expect(getTeamsForRound(4)).toEqual({ attacker: 'BETA', defender: 'ALPHA' });
  });

  it('Раунд 1: отражает FormatException при выборе D1 и пропускает оставшиеся строки внутри try', () => {
    const r1 = ARENA_ROUNDS[0];
    const sim = simulateClash(r1, 'A1', 'D1');
    expect(sim.outcome).toBe('REPELLED');
    expect(sim.defensePointsEarned).toBe(50); // 50% от 100 за боевой ход
    const lastStep = sim.steps[sim.steps.length - 1];
    expect(lastStep.skippedLineNumbers.length).toBeGreaterThan(0);
    expect(sim.finalLogState).toBe('LOGGED');
  });

  it('Раунд 2: блокирует защиту D2 ошибкой компилятора CS0160, если catch (Exception) стоит выше узких типов', () => {
    const r2 = ARENA_ROUNDS[1];
    const sim = simulateClash(r2, 'A1', 'D2');
    expect(sim.outcome).toBe('BREACHED');
    expect(sim.steps[0].stepKind).toBe('compile_error');
    expect(sim.headline).toContain('CS0160');
  });

  it('Раунд 3: закрывает соединение БД только при наличии блока finally (D3), даже при раннем return или исключении', () => {
    const r3 = ARENA_ROUNDS[2];
    const leakSim = simulateClash(r3, 'A3', 'D2');
    expect(leakSim.finalDbState).toBe('LEAK');
    expect(leakSim.outcome).toBe('BREACHED');

    const safeSim = simulateClash(r3, 'A3', 'D3');
    expect(safeSim.finalDbState).toBe('CLOSED');
    expect(safeSim.outcome).toBe('REPELLED');
  });

  it('Раунд 4: различает пустой catch (D3), сброс стека throw ex (D2) и эталонный throw; (D1)', () => {
    const r4 = ARENA_ROUNDS[3];
    const swallowed = simulateClash(r4, 'A1', 'D3');
    expect(swallowed.finalLogState).toBe('SWALLOWED');
    expect(swallowed.outcome).toBe('BREACHED');

    const resetStack = simulateClash(r4, 'A1', 'D2');
    expect(resetStack.finalStackState).toBe('RESET');
    expect(resetStack.outcome).toBe('BREACHED');

    const intactStack = simulateClash(r4, 'A1', 'D1');
    expect(intactStack.finalStackState).toBe('INTACT');
    expect(intactStack.finalLogState).toBe('LOGGED');
    expect(intactStack.outcome).toBe('REPELLED');
  });

  it('живой diff кода вставляет строки патча try/catch/finally прямо в окно метода', () => {
    const r1 = ARENA_ROUNDS[0];
    const baseLines = getPatchedCodeLines(r1, null);
    const patchedLines = getPatchedCodeLines(r1, 'D3');
    expect(patchedLines.length).toBeGreaterThan(baseLines.length);
    expect(patchedLines.some((l) => l.isAddedPatch)).toBe(true);
  });

  it('начисляет 50% очков за боевой ход и вторые 50% очков за верный ответ на слепой блиц-рулетке без дублирования при повторных кликах', () => {
    let state = createInitialArenaState();
    state = arenaReducer(state, { type: 'START_GAME' });
    state = arenaReducer(state, { type: 'PICK_ATTACK_OPTION', optionId: 'A1' });
    state = arenaReducer(state, { type: 'PICK_DEFENSE_OPTION', optionId: 'D1' });
    state = arenaReducer(state, { type: 'LAUNCH_CLASH' });

    // В Раунде 1 БЕТА защищается и отразила атаку A1 патчем D1 -> получает 50 очков
    expect(state.betaScore).toBe(50);
    expect(state.alphaScore).toBe(0);

    // Повторный запуск LAUNCH_CLASH в том же раунде не удваивает очки
    state = arenaReducer(state, { type: 'LAUNCH_CLASH' });
    expect(state.betaScore).toBe(50);

    // Ответ на блиц-рулетку (верный вариант в Раунде 1) приносит вторые 50 очков
    const correctOpt =
      ARENA_ROUNDS[0].rouletteQuestion.options.find((o) => o.isCorrect)?.id ||
      'Q1_A';
    state = arenaReducer(state, { type: 'OPEN_ROULETTE' });
    state = arenaReducer(state, {
      type: 'ANSWER_ROULETTE',
      optionId: correctOpt,
    });
    expect(state.betaScore).toBe(100);
  });

  it('живой вычислитель свободного ввода аргументов C# корректно отрабатывает любые числа/строки и формирует таблицу Locals', () => {
    const r1 = ARENA_ROUNDS[0];
    const customArgs = {
      ...createDefaultCustomArgs(),
      r1CountText: '5',
      r1Total: '1500',
    };
    const simSafe = simulateCustomArgsClash(r1, customArgs, 'D1');
    expect(simSafe.outcome).toBe('REPELLED');
    expect(simSafe.headline).toContain('300');

    const locals = buildLocalsTable(
      r1,
      customArgs,
      simSafe.steps[simSafe.steps.length - 1],
      simSafe
    );
    expect(locals.some((v) => v.name === '$return' && v.value === '300')).toBe(
      true
    );
  });
});
