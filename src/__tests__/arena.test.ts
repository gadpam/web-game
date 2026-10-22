import { readFileSync } from 'fs';
import { join } from 'path';
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
  getCustomArgsForAttackPreset,
  simulateCustomArgsClash,
} from '../arena/liveEvaluator';

describe('C# Exception Arena: Атака и Защита кода — Ядро симулятора CLR', () => {
  it('1. содержит ровно 4 раунда с растущими ставками 100 / 150 / 200 / 300 очков', () => {
    expect(ARENA_ROUNDS).toHaveLength(4);
    expect(ARENA_ROUNDS.map((r) => r.maxPoints)).toEqual([100, 150, 200, 300]);
  });

  it('2. автоматически меняет роли АЛЬФА и БЕТА каждый раунд', () => {
    expect(getTeamsForRound(1)).toEqual({ attacker: 'ALPHA', defender: 'BETA' });
    expect(getTeamsForRound(2)).toEqual({ attacker: 'BETA', defender: 'ALPHA' });
    expect(getTeamsForRound(3)).toEqual({ attacker: 'ALPHA', defender: 'BETA' });
    expect(getTeamsForRound(4)).toEqual({ attacker: 'BETA', defender: 'ALPHA' });
  });

  it('3. Раунд 1: отражает FormatException при выборе D1 и пропускает оставшиеся строки внутри try', () => {
    const r1 = ARENA_ROUNDS[0];
    const sim = simulateClash(r1, 'A1', 'D1');
    expect(sim.outcome).toBe('REPELLED');
    expect(sim.defensePointsEarned).toBe(50);
    const lastStep = sim.steps[sim.steps.length - 1];
    expect(lastStep.skippedLineNumbers.length).toBeGreaterThan(0);
    expect(sim.finalLogState).toBe('LOGGED');
  });

  it('4. Раунд 1: штрафует за слепой catch (Exception) без указания точного типа (PARTIAL)', () => {
    const r1 = ARENA_ROUNDS[0];
    const blindDef = r1.defenseOptions.find((d) => d.blindCatchPenalty);
    expect(blindDef).toBeDefined();
    if (blindDef) {
      const sim = simulateClash(r1, 'A1', blindDef.id);
      expect(sim.outcome).toBe('PARTIAL');
      expect(sim.defensePointsEarned).toBeLessThan(50);
    }
  });

  it('5. Раунд 2: блокирует защиту D2 ошибкой компилятора CS0160, если catch (Exception) стоит выше узких типов', () => {
    const r2 = ARENA_ROUNDS[1];
    const sim = simulateClash(r2, 'A1', 'D2');
    expect(sim.outcome).toBe('BREACHED');
    expect(sim.steps[0].stepKind).toBe('compile_error');
    expect(sim.headline).toContain('CS0160');
  });

  it('6. Раунд 2: корректно перехватывает NullReferenceException и IndexOutOfRangeException при верном порядке блоков catch (D1)', () => {
    const r2 = ARENA_ROUNDS[1];
    expect(simulateClash(r2, 'A1', 'D1').outcome).toBe('REPELLED');
    expect(simulateClash(r2, 'A2', 'D1').outcome).toBe('REPELLED');
  });

  it('7. Раунд 3: закрывает соединение БД и при раннем return (A1), и при исключении (A2/A3) только при наличии блока finally (D1)', () => {
    const r3 = ARENA_ROUNDS[2];
    const leakSim = simulateClash(r3, 'A3', 'D2');
    expect(leakSim.finalDbState).toBe('LEAK');
    expect(leakSim.outcome).toBe('BREACHED');

    const earlyReturnLeak = simulateClash(r3, 'A1', 'D3');
    expect(earlyReturnLeak.finalDbState).toBe('LEAK');
    expect(earlyReturnLeak.outcome).toBe('BREACHED');

    const safeSim = simulateClash(r3, 'A1', 'D1');
    expect(safeSim.finalDbState).toBe('CLOSED');
    expect(safeSim.outcome).toBe('REPELLED');
  });

  it('8. Раунд 4: различает пустой catch (D3), сброс стека throw ex (D2) и эталонный throw; (D1)', () => {
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

  it('9. живой diff кода вставляет строки патча try/catch/finally прямо в окно метода', () => {
    const r1 = ARENA_ROUNDS[0];
    const baseLines = getPatchedCodeLines(r1, null);
    const patchedLines = getPatchedCodeLines(r1, 'D3');
    expect(patchedLines.length).toBeGreaterThan(baseLines.length);
    expect(patchedLines.some((l) => l.isAddedPatch)).toBe(true);
  });

  it('10. поддерживает двухшаговое прицеливание и фиксацию командного хода', () => {
    let state = createInitialArenaState();
    state = arenaReducer(state, { type: 'START_GAME' });
    state = arenaReducer(state, { type: 'PICK_ATTACK_LINE', line: 3 });
    expect(state.attackTargetLine).toBe(3);

    state = arenaReducer(state, { type: 'PICK_ATTACK_OPTION', optionId: 'A2' });
    expect(state.selectedAttackId).toBe('A2');

    state = arenaReducer(state, { type: 'TOGGLE_ATTACK_LOCK' });
    expect(state.attackLocked).toBe(true);

    // Пока ход заблокирован, смена строки игнорируется
    state = arenaReducer(state, { type: 'PICK_ATTACK_LINE', line: 5 });
    expect(state.attackTargetLine).toBe(3);
  });

  it('11. начисляет 50% очков за боевой ход и вторые 50% очков за верный ответ на блиц-рулетке без дублирования', () => {
    let state = createInitialArenaState();
    state = arenaReducer(state, { type: 'START_GAME' });
    state = arenaReducer(state, { type: 'PICK_ATTACK_OPTION', optionId: 'A1' });
    state = arenaReducer(state, { type: 'PICK_DEFENSE_OPTION', optionId: 'D1' });
    state = arenaReducer(state, { type: 'LAUNCH_CLASH' });

    expect(state.betaScore).toBe(50);
    expect(state.alphaScore).toBe(0);

    // Повторный запуск LAUNCH_CLASH в том же раунде не удваивает очки
    state = arenaReducer(state, { type: 'LAUNCH_CLASH' });
    expect(state.betaScore).toBe(50);

    const correctOpt =
      ARENA_ROUNDS[0].rouletteQuestion.options.find((o) => o.isCorrect)?.id ||
      'R1_1';
    state = arenaReducer(state, { type: 'OPEN_ROULETTE' });
    state = arenaReducer(state, {
      type: 'ANSWER_ROULETTE',
      optionId: correctOpt,
    });
    expect(state.betaScore).toBe(100);
  });

  it('12. живой вычислитель свободного ввода аргументов C# корректно отрабатывает любые числа/строки во всех 4 раундах', () => {
    const baseArgs = createDefaultCustomArgs();

    // Раунд 1: штатное деление 1500 / 5 = 300
    const r1Safe = simulateCustomArgsClash(
      ARENA_ROUNDS[0],
      { ...baseArgs, r1CountText: '5', r1Total: '1500' },
      'D1'
    );
    expect(r1Safe.outcome).toBe('REPELLED');
    expect(r1Safe.headline).toContain('300');

    // Раунд 2: выход за границы массива table[42]
    const r2Out = simulateCustomArgsClash(
      ARENA_ROUNDS[1],
      { ...baseArgs, r2PromoIsNull: false, r2PromoText: 'VIP', r2SlotIndex: '42' },
      'D1'
    );
    expect(r2Out.outcome).toBe('REPELLED');

    // Раунд 3: отрицательный перевод вызывает ранний return, но D1 (finally) закрывает БД
    const r3Early = simulateCustomArgsClash(
      ARENA_ROUNDS[2],
      { ...baseArgs, r3Amount: '-200', r3Divisor: '2' },
      'D1'
    );
    expect(r3Early.finalDbState).toBe('CLOSED');

    // Раунд 4: корректный ПИН-код "4821"
    const r4Valid = simulateCustomArgsClash(
      ARENA_ROUNDS[3],
      { ...baseArgs, r4PinInput: '4821' },
      'D1'
    );
    expect(r4Valid.outcome).toBe('REPELLED');
    expect(r4Valid.headline).toContain('4821');
  });

  it('13. формирует таблицу переменных отладчика Locals / Watch для каждого раунда', () => {
    const args = getCustomArgsForAttackPreset(1, 'A1', createDefaultCustomArgs());
    const sim = simulateClash(ARENA_ROUNDS[0], 'A1', 'D1');
    const locals = buildLocalsTable(ARENA_ROUNDS[0], args, sim.steps[1], sim);
    expect(locals.some((row) => row.name === 'countText')).toBe(true);
    expect(locals.some((row) => row.name === '$exception')).toBe(true);
  });

  it('14. соблюдает жёсткое правило «0 эмодзи» во всех исходных файлах арены и стилях', () => {
    const filesToCheck = [
      'src/arena/arenaData.ts',
      'src/arena/arenaSync.ts',
      'src/arena/CSharpCodeHighlighter.tsx',
      'src/arena/ExceptionArenaApp.tsx',
      'src/arena/liveEvaluator.ts',
      'src/arena/soundEngine.ts',
      'src/styles/arena.css',
    ];
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

    for (const relPath of filesToCheck) {
      const fullPath = join(process.cwd(), relPath);
      const content = readFileSync(fullPath, 'utf-8');
      const matches = content.match(emojiRegex);
      expect(matches, `Found forbidden emoji in ${relPath}`).toBeNull();
    }
  });
});
