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

  it('3. эталонные варианты Защиты и ответы Блица перемешаны по разным позициям (не всегда №1)', () => {
    const bestDefIds = ARENA_ROUNDS.map(
      (r) =>
        r.defenseOptions.find((d) =>
          (['A1', 'A2', 'A3'] as const).every(
            (aId) => simulateClash(r, aId, d.id).outcome === 'REPELLED'
          )
        )?.id
    );
    expect(bestDefIds).toEqual(['D3', 'D2', 'D4', 'D2']);

    const correctBlitzIds = ARENA_ROUNDS.map(
      (r) => r.rouletteQuestion.options.find((o) => o.isCorrect)?.id
    );
    expect(correctBlitzIds).toEqual(['R1_2', 'R2_3', 'R3_2', 'R4_3']);
  });

  it('4. Раунд 1: отражает FormatException при выборе эталонного D3 и пропускает оставшиеся строки внутри try', () => {
    const r1 = ARENA_ROUNDS[0];
    const sim = simulateClash(r1, 'A1', 'D3');
    expect(sim.outcome).toBe('REPELLED');
    expect(sim.defensePointsEarned).toBe(50);
    const lastStep = sim.steps[sim.steps.length - 1];
    expect(lastStep.skippedLineNumbers.length).toBeGreaterThan(0);
    expect(sim.finalLogState).toBe('LOGGED');
  });

  it('5. Раунд 1: штрафует за слепой catch (Exception) без указания точного типа (PARTIAL)', () => {
    const r1 = ARENA_ROUNDS[0];
    const blindDef = r1.defenseOptions.find((d) => d.blindCatchPenalty);
    expect(blindDef).toBeDefined();
    if (blindDef) {
      const sim = simulateClash(r1, 'A1', blindDef.id);
      expect(sim.outcome).toBe('PARTIAL');
      expect(sim.defensePointsEarned).toBeLessThan(50);
    }
  });

  it('6. Раунд 2: блокирует защиту D1 ошибкой компилятора CS0160, если catch (Exception) стоит выше узких типов', () => {
    const r2 = ARENA_ROUNDS[1];
    const sim = simulateClash(r2, 'A1', 'D1');
    expect(sim.outcome).toBe('BREACHED');
    expect(sim.steps[0].stepKind).toBe('compile_error');
    expect(sim.headline).toContain('CS0160');
  });

  it('7. Раунд 2: корректно перехватывает NullReferenceException (A1), IndexOutOfRangeException (A2) и ArgumentException (A3) при верном порядке блоков catch (D2)', () => {
    const r2 = ARENA_ROUNDS[1];
    expect(simulateClash(r2, 'A1', 'D2').outcome).toBe('REPELLED');
    expect(simulateClash(r2, 'A2', 'D2').outcome).toBe('REPELLED');
    expect(simulateClash(r2, 'A3', 'D2').outcome).toBe('REPELLED');
    // А защита D3 без финального catch (Exception) пропускает ArgumentException (A3)
    expect(simulateClash(r2, 'A3', 'D3').outcome).toBe('BREACHED');
  });

  it('8. Раунд 3: закрывает соединение БД при раннем return (A1), при делении на 0 (A2) и при штатном переводе (A3) только при наличии блока finally (D4)', () => {
    const r3 = ARENA_ROUNDS[2];
    // D1 закрывает БД в конце try, поэтому ранний return (A1) и исключение (A2) приводят к утечке
    expect(simulateClash(r3, 'A1', 'D1').finalDbState).toBe('LEAK');
    expect(simulateClash(r3, 'A2', 'D1').finalDbState).toBe('LEAK');

    // D2 закрывает БД только в catch, поэтому и ранний return (A1), и штатный перевод (A3) оставляют БД открытой!
    expect(simulateClash(r3, 'A1', 'D2').finalDbState).toBe('LEAK');
    expect(simulateClash(r3, 'A3', 'D2').finalDbState).toBe('LEAK');
    expect(simulateClash(r3, 'A3', 'D2').outcome).toBe('BREACHED');

    // D3 закрывает БД после try-catch, поэтому ранний return (A1) приводит к утечке
    expect(simulateClash(r3, 'A1', 'D3').finalDbState).toBe('LEAK');
    expect(simulateClash(r3, 'A2', 'D3').outcome).toBe('PARTIAL');

    // D4 (try / finally) гарантированно закрывает БД при любом сценарии (A1, A2, A3)
    expect(simulateClash(r3, 'A1', 'D4').finalDbState).toBe('CLOSED');
    expect(simulateClash(r3, 'A2', 'D4').finalDbState).toBe('CLOSED');
    expect(simulateClash(r3, 'A3', 'D4').finalDbState).toBe('CLOSED');
    expect(simulateClash(r3, 'A1', 'D4').outcome).toBe('REPELLED');
  });

  it('9. Раунд 4: различает пустой catch (D3), сброс стека throw ex (D1) и эталонный throw; (D2)', () => {
    const r4 = ARENA_ROUNDS[3];
    const swallowed = simulateClash(r4, 'A1', 'D3');
    expect(swallowed.finalLogState).toBe('SWALLOWED');
    expect(swallowed.outcome).toBe('BREACHED');

    const resetStack = simulateClash(r4, 'A1', 'D1');
    expect(resetStack.finalStackState).toBe('RESET');
    expect(resetStack.outcome).toBe('BREACHED');

    const intactStack = simulateClash(r4, 'A1', 'D2');
    expect(intactStack.finalStackState).toBe('INTACT');
    expect(intactStack.finalLogState).toBe('LOGGED');
    expect(intactStack.outcome).toBe('REPELLED');
  });

  it('10. живой diff кода вставляет строки патча try/catch/finally прямо в окно метода', () => {
    const r1 = ARENA_ROUNDS[0];
    const baseLines = getPatchedCodeLines(r1, null);
    const patchedLines = getPatchedCodeLines(r1, 'D3');
    expect(patchedLines.length).toBeGreaterThan(baseLines.length);
    expect(patchedLines.some((l) => l.isAddedPatch)).toBe(true);
  });

  it('11. изолирует демо-переключатель «А что если?» (SET_SANDBOX_VARIANT) от боевого выбора команд и счёта', () => {
    let state = createInitialArenaState();
    state = arenaReducer(state, { type: 'START_GAME' });
    state = arenaReducer(state, { type: 'PICK_DEFENSE_OPTION', optionId: 'D3' });
    state = arenaReducer(state, { type: 'PICK_ATTACK_OPTION', optionId: 'A1' });
    state = arenaReducer(state, { type: 'LAUNCH_CLASH' });

    expect(state.betaScore).toBe(50);
    expect(state.selectedDefenseId).toBe('D3');

    // Ведущий на Шаге 3 кликает по демо-пилюле D4 (уязвимый вариант)
    state = arenaReducer(state, {
      type: 'SET_SANDBOX_VARIANT',
      defenseId: 'D4',
    });
    expect(state.sandboxDefenseId).toBe('D4');
    // Но настоящий боевой ход Защиты остаётся D3!
    expect(state.selectedDefenseId).toBe('D3');

    const correctOpt =
      ARENA_ROUNDS[0].rouletteQuestion.options.find((o) => o.isCorrect)?.id ||
      'R1_2';
    state = arenaReducer(state, { type: 'OPEN_ROULETTE' });
    state = arenaReducer(state, {
      type: 'ANSWER_ROULETTE',
      optionId: correctOpt,
    });
    expect(state.betaScore).toBe(100);
    expect(state.roundHistory[1]?.defenseId).toBe('D3');
    expect(state.roundHistory[1]?.outcome).toBe('REPELLED');
  });

  it('12. живой вычислитель свободного ввода аргументов C# корректно отрабатывает любые числа/строки во всех 4 раундах', () => {
    const baseArgs = createDefaultCustomArgs();

    // Раунд 1: штатное деление 1500 / 5 = 300 при эталонной защите D3
    const r1Safe = simulateCustomArgsClash(
      ARENA_ROUNDS[0],
      { ...baseArgs, r1CountText: '5', r1Total: '1500' },
      'D3'
    );
    expect(r1Safe.outcome).toBe('REPELLED');
    expect(r1Safe.headline).toContain('300');

    // Раунд 2: выход за границы массива table[42] при эталонной защите D2
    const r2Out = simulateCustomArgsClash(
      ARENA_ROUNDS[1],
      { ...baseArgs, r2PromoIsNull: false, r2PromoText: 'VIP', r2SlotIndex: '42' },
      'D2'
    );
    expect(r2Out.outcome).toBe('REPELLED');

    // Раунд 3: отрицательный перевод вызывает ранний return, но D4 (finally) закрывает БД
    const r3Early = simulateCustomArgsClash(
      ARENA_ROUNDS[2],
      { ...baseArgs, r3Amount: '-200', r3Divisor: '2' },
      'D4'
    );
    expect(r3Early.finalDbState).toBe('CLOSED');

    // Раунд 4: корректный ПИН-код "4821" при D2
    const r4Valid = simulateCustomArgsClash(
      ARENA_ROUNDS[3],
      { ...baseArgs, r4PinInput: '4821' },
      'D2'
    );
    expect(r4Valid.outcome).toBe('REPELLED');
    expect(r4Valid.headline).toContain('4821');
  });

  it('13. формирует таблицу переменных отладчика Locals / Watch для каждого раунда', () => {
    const args = getCustomArgsForAttackPreset(1, 'A1', createDefaultCustomArgs());
    const sim = simulateClash(ARENA_ROUNDS[0], 'A1', 'D3');
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
