import {
  ClashSimulationResult,
  RoundNumber,
  RoundSpec,
  simulateClash,
  TraceStep,
} from './arenaData';

export interface CustomRoundArgs {
  // Раунд 1: CalculateUnitCost(string countText, int total)
  r1CountText: string;
  r1Total: string;
  // Раунд 2: ApplyPromoBonus(string? promo, int slotIndex)
  r2PromoIsNull: boolean;
  r2PromoText: string;
  r2SlotIndex: string;
  // Раунд 3: ExecuteTransfer(DbConnection db, int amount, int feeDivisor)
  r3Amount: string;
  r3Divisor: string;
  // Раунд 4: AuthorizeCard(string pinInput, AuditLog log)
  r4PinInput: string;
}

export interface LocalVariableRow {
  name: string;
  value: string;
  type: string;
  changed?: boolean;
  isFault?: boolean;
}

export function createDefaultCustomArgs(): CustomRoundArgs {
  return {
    r1CountText: 'два',
    r1Total: '1200',
    r2PromoIsNull: true,
    r2PromoText: 'VIP2026',
    r2SlotIndex: '1',
    r3Amount: '100',
    r3Divisor: '0',
    r4PinInput: 'HACK_77',
  };
}

export function getCustomArgsForAttackPreset(
  roundNumber: RoundNumber,
  attackId: 'A1' | 'A2' | 'A3',
  prev: CustomRoundArgs
): CustomRoundArgs {
  const next = { ...prev };
  if (roundNumber === 1) {
    if (attackId === 'A1') {
      next.r1CountText = 'два';
      next.r1Total = '1200';
    } else if (attackId === 'A2') {
      next.r1CountText = '0';
      next.r1Total = '1200';
    } else {
      next.r1CountText = '4';
      next.r1Total = '1200';
    }
  } else if (roundNumber === 2) {
    if (attackId === 'A1') {
      next.r2PromoIsNull = true;
      next.r2PromoText = 'null';
      next.r2SlotIndex = '1';
    } else if (attackId === 'A2') {
      next.r2PromoIsNull = false;
      next.r2PromoText = 'SALE';
      next.r2SlotIndex = '99';
    } else {
      next.r2PromoIsNull = false;
      next.r2PromoText = 'VIP';
      next.r2SlotIndex = '-1';
    }
  } else if (roundNumber === 3) {
    if (attackId === 'A1') {
      next.r3Amount = '100';
      next.r3Divisor = '0';
    } else if (attackId === 'A2') {
      next.r3Amount = '-50';
      next.r3Divisor = '2';
    } else {
      next.r3Amount = '500';
      next.r3Divisor = '0';
    }
  } else if (roundNumber === 4) {
    if (attackId === 'A1') {
      next.r4PinInput = 'HACK_77';
    } else if (attackId === 'A2') {
      next.r4PinInput = '';
    } else {
      next.r4PinInput = '999999999999999';
    }
  }
  return next;
}

// Имитация C# int.Parse(string s)
function csharpIntParse(raw: string): {
  ok: boolean;
  value?: number;
  exception?: 'FormatException' | 'OverflowException';
} {
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return { ok: false, exception: 'FormatException' };
  }
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num > 2147483647 || num < -2147483648) {
    return { ok: false, exception: 'OverflowException' };
  }
  return { ok: true, value: num };
}

// Вычисление пошаговой симуляции для произвольных пользовательских аргументов C#
export function simulateCustomArgsClash(
  round: RoundSpec,
  customArgs: CustomRoundArgs,
  defenseId: 'D1' | 'D2' | 'D3' | 'D4'
): ClashSimulationResult {
  // Определяем, какому типу поведения соответствует свободный ввод ученика/учителя
  if (round.number === 1) {
    const parsedCount = csharpIntParse(customArgs.r1CountText);
    const parsedTotal = csharpIntParse(customArgs.r1Total);
    const totalVal = parsedTotal.ok && parsedTotal.value !== undefined ? parsedTotal.value : 1200;

    if (!parsedCount.ok && parsedCount.exception === 'FormatException') {
      const base = simulateClash(round, 'A1', defenseId);
      return {
        ...base,
        steps: base.steps.map((s, idx) =>
          idx === 0
            ? {
                ...s,
                inlineBadge: `countText = "${customArgs.r1CountText}", total = ${totalVal}`,
                statusBanner: `Вызов CalculateUnitCost("${customArgs.r1CountText}", ${totalVal}): вход в блок try.`,
              }
            : idx === 1
            ? {
                ...s,
                inlineBadge: `int.Parse("${customArgs.r1CountText}") -> FormatException`,
              }
            : s
        ),
      };
    }

    if (parsedCount.ok && parsedCount.value === 0) {
      const base = simulateClash(round, 'A2', defenseId);
      return {
        ...base,
        steps: base.steps.map((s, idx) =>
          idx === 0
            ? {
                ...s,
                inlineBadge: `count = 0, total = ${totalVal}`,
              }
            : s
        ),
      };
    }

    if (parsedCount.ok && parsedCount.value !== undefined && parsedCount.value !== 0) {
      const resultUnit = Math.trunc(totalVal / parsedCount.value);
      const base = simulateClash(round, 'A3', defenseId);
      return {
        ...base,
        headline: `ШТАТНОЕ ВЫПОЛНЕНИЕ: ${totalVal} / ${parsedCount.value} = ${resultUnit}`,
        steps: base.steps.map((s, idx) =>
          idx === base.steps.length - 1
            ? {
                ...s,
                inlineBadge: `return ${resultUnit}`,
                statusBanner: `Метод выполнен без исключений: ${totalVal} / ${parsedCount.value} = ${resultUnit}.`,
              }
            : s
        ),
      };
    }
  }

  if (round.number === 2) {
    const slotParsed = csharpIntParse(customArgs.r2SlotIndex);
    const slotVal = slotParsed.ok && slotParsed.value !== undefined ? slotParsed.value : 99;
    if (customArgs.r2PromoIsNull) {
      return simulateClash(round, 'A1', defenseId);
    }
    if (slotVal < 0 || slotVal >= 3) {
      const preset = slotVal < 0 ? 'A3' : 'A2';
      const base = simulateClash(round, preset, defenseId);
      return {
        ...base,
        steps: base.steps.map((s, idx) =>
          idx === 1
            ? {
                ...s,
                inlineBadge: `table[${slotVal}] -> IndexOutOfRangeException`,
              }
            : s
        ),
      };
    }
    // Безопасный индекс 0..2 и не-null строка
    const def =
      round.defenseOptions.find((d) => d.id === defenseId) ||
      round.defenseOptions[0];
    if (def.compileError) {
      return simulateClash(round, 'A1', defenseId);
    }
    const cleanCode = customArgs.r2PromoText.trim();
    const bonusTable = [5, 10, 25];
    const bonus = bonusTable[slotVal] ?? 10;
    return {
      outcome: 'REPELLED',
      headline: `ШТАТНОЕ ВЫПОЛНЕНИЕ: promo="${cleanCode}", table[${slotVal}] = ${bonus}%`,
      reasonDetailed: `Передана корректная строка "${customArgs.r2PromoText}" и допустимый индекс ${slotVal} (в пределах 0..2). Исключений не возникло.`,
      attackPointsEarned: 0,
      defensePointsEarned: Math.round(round.maxPoints / 2),
      steps: [
        {
          stepIndex: 1,
          activeLineNumber: 4,
          skippedLineNumbers: [],
          inlineBadge: `clean = "${cleanCode}"`,
          statusBanner: `Шаг 1: promo.Trim() вернул "${cleanCode}".`,
          stepKind: 'normal',
          dbState: 'CLOSED',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
        {
          stepIndex: 2,
          activeLineNumber: 5,
          skippedLineNumbers: [],
          inlineBadge: `return ${bonus}`,
          statusBanner: `Шаг 2: Доступ к элементу table[${slotVal}] корректен, возвращено значение ${bonus}.`,
          stepKind: 'done',
          dbState: 'CLOSED',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
      ],
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  if (round.number === 3) {
    const amountParsed = csharpIntParse(customArgs.r3Amount);
    const divisorParsed = csharpIntParse(customArgs.r3Divisor);
    const amountVal = amountParsed.ok && amountParsed.value !== undefined ? amountParsed.value : 100;
    const divVal = divisorParsed.ok && divisorParsed.value !== undefined ? divisorParsed.value : 0;

    if (amountVal <= 0) {
      return simulateClash(round, 'A2', defenseId);
    }
    if (divVal === 0) {
      return simulateClash(round, 'A1', defenseId);
    }
    // Штатный перевод без return и без деления на 0
    const resultTransfer = Math.trunc(amountVal / divVal);
    return {
      outcome: 'REPELLED',
      headline: `ШТАТНОЕ ВЫПОЛНЕНИЕ: перевод ${amountVal} / ${divVal} = ${resultTransfer}, БД закрыта`,
      reasonDetailed:
        'При корректных аргументах (amount > 0 и divisor != 0) выполнение доходит до конца метода и закрывает соединение.',
      attackPointsEarned: 0,
      defensePointsEarned: Math.round(round.maxPoints / 2),
      steps: [
        {
          stepIndex: 1,
          activeLineNumber: 3,
          skippedLineNumbers: [],
          inlineBadge: 'db.State = Open',
          statusBanner: 'Шаг 1: Соединение с базой данных открыто.',
          stepKind: 'normal',
          dbState: 'OPEN',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
        {
          stepIndex: 2,
          activeLineNumber: 6,
          skippedLineNumbers: [],
          inlineBadge: `tx = ${resultTransfer}`,
          statusBanner: `Шаг 2: Вычисление комиссии ${amountVal} / ${divVal} = ${resultTransfer} прошло успешно.`,
          stepKind: 'normal',
          dbState: 'OPEN',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
        {
          stepIndex: 3,
          activeLineNumber: 8,
          skippedLineNumbers: [],
          inlineBadge: 'db.State = Closed',
          statusBanner: 'Шаг 3: Соединение с БД штатно закрыто в конце работы метода.',
          stepKind: 'finally',
          dbState: 'CLOSED',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
      ],
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  if (round.number === 4) {
    const pinParsed = csharpIntParse(customArgs.r4PinInput);
    if (!pinParsed.ok && pinParsed.exception === 'FormatException') {
      const preset = customArgs.r4PinInput.trim() === '' ? 'A2' : 'A1';
      return simulateClash(round, preset, defenseId);
    }
    if (!pinParsed.ok && pinParsed.exception === 'OverflowException') {
      return simulateClash(round, 'A3', defenseId);
    }
    const pinVal = pinParsed.value ?? 1234;
    return {
      outcome: 'REPELLED',
      headline: `ШТАТНАЯ АВТОРИЗАЦИЯ: PIN ${pinVal} корректен`,
      reasonDetailed: `Строка "${customArgs.r4PinInput}" успешно преобразована в int (${pinVal}), проверка хэша пройдена без исключений.`,
      attackPointsEarned: 0,
      defensePointsEarned: Math.round(round.maxPoints / 2),
      steps: [
        {
          stepIndex: 1,
          activeLineNumber: 4,
          skippedLineNumbers: [],
          inlineBadge: `pin = ${pinVal}`,
          statusBanner: `Шаг 1: int.Parse("${customArgs.r4PinInput}") успешно вернул число ${pinVal}.`,
          stepKind: 'normal',
          dbState: 'CLOSED',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
        {
          stepIndex: 2,
          activeLineNumber: 5,
          skippedLineNumbers: [],
          inlineBadge: 'return 1 (OK)',
          statusBanner: 'Шаг 2: Хэш ПИН-кода подтверждён, метод штатно завершён.',
          stepKind: 'done',
          dbState: 'CLOSED',
          logState: 'EMPTY',
          stackState: 'INTACT',
        },
      ],
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  return simulateClash(round, 'A1', defenseId);
}

// Формирование живой таблицы локальных переменных отладчика (Locals / Watch) для текущего шага
export function buildLocalsTable(
  round: RoundSpec,
  customArgs: CustomRoundArgs,
  activeStep: TraceStep | null,
  simulation: ClashSimulationResult
): LocalVariableRow[] {
  const rows: LocalVariableRow[] = [];

  if (round.number === 1) {
    rows.push({
      name: 'countText',
      value: `"${customArgs.r1CountText}"`,
      type: 'string',
    });
    rows.push({
      name: 'total',
      value: customArgs.r1Total,
      type: 'int',
    });

    const parsed = csharpIntParse(customArgs.r1CountText);
    if (!activeStep) {
      rows.push({ name: 'count', value: '<не инициализировано>', type: 'int' });
    } else if (activeStep.stepKind === 'explode' && !parsed.ok) {
      rows.push({
        name: '$exception',
        value: `System.FormatException: Input string '${customArgs.r1CountText}' was not in a correct format.`,
        type: 'FormatException',
        changed: true,
        isFault: true,
      });
    } else if (parsed.ok && parsed.value === 0) {
      rows.push({
        name: 'count',
        value: '0',
        type: 'int',
        changed: activeStep.stepIndex === 1,
      });
      if (activeStep.stepKind === 'explode' || activeStep.stepKind === 'catch') {
        rows.push({
          name: '$exception',
          value: 'System.DivideByZeroException: Attempted to divide by zero.',
          type: 'DivideByZeroException',
          changed: true,
          isFault: true,
        });
      }
    } else if (parsed.ok && parsed.value !== undefined) {
      const totalNum = Number(customArgs.r1Total) || 1200;
      rows.push({ name: 'count', value: String(parsed.value), type: 'int' });
      rows.push({
        name: '$return',
        value: String(Math.trunc(totalNum / parsed.value)),
        type: 'int',
        changed: true,
      });
    }
  } else if (round.number === 2) {
    rows.push({
      name: 'promo',
      value: customArgs.r2PromoIsNull ? 'null' : `"${customArgs.r2PromoText}"`,
      type: 'string?',
    });
    rows.push({
      name: 'slotIndex',
      value: customArgs.r2SlotIndex,
      type: 'int',
    });
    rows.push({
      name: 'table',
      value: 'int[3] { 5, 10, 25 }',
      type: 'int[]',
    });

    if (activeStep?.stepKind === 'compile_error') {
      rows.push({
        name: '$compiler',
        value: 'CS0160: A previous catch clause already catches all exceptions',
        type: 'CompilerError',
        changed: true,
        isFault: true,
      });
    } else if (activeStep && customArgs.r2PromoIsNull) {
      rows.push({
        name: '$exception',
        value: 'System.NullReferenceException: Object reference not set to an instance of an object.',
        type: 'NullReferenceException',
        changed: true,
        isFault: true,
      });
    } else if (activeStep) {
      const slot = Number(customArgs.r2SlotIndex);
      if (slot < 0 || slot >= 3) {
        rows.push({
          name: '$exception',
          value: `System.IndexOutOfRangeException: Index [${slot}] was outside the bounds of the array [0..2].`,
          type: 'IndexOutOfRangeException',
          changed: true,
          isFault: true,
        });
      }
    }
  } else if (round.number === 3) {
    rows.push({
      name: 'amount',
      value: customArgs.r3Amount,
      type: 'int',
    });
    rows.push({
      name: 'feeDivisor',
      value: customArgs.r3Divisor,
      type: 'int',
    });
    rows.push({
      name: 'db.State',
      value: activeStep
        ? activeStep.dbState === 'CLOSED'
          ? 'ConnectionState.Closed'
          : activeStep.dbState === 'LEAK'
          ? 'ConnectionState.Open [LEAKED]'
          : 'ConnectionState.Open'
        : 'ConnectionState.Closed',
      type: 'ConnectionState',
      changed: Boolean(activeStep),
      isFault: activeStep?.dbState === 'LEAK',
    });
  } else if (round.number === 4) {
    rows.push({
      name: 'pinInput',
      value: `"${customArgs.r4PinInput}"`,
      type: 'string',
    });
    rows.push({
      name: 'log.EntriesCount',
      value: simulation.finalLogState === 'LOGGED' ? '1' : '0',
      type: 'int',
      changed: simulation.finalLogState === 'LOGGED',
    });
    rows.push({
      name: 'ex.StackTrace',
      value:
        simulation.finalStackState === 'RESET'
          ? 'at AuthorizeCard() line 7 [ИСТОРИЯ СТЁРТА throw ex]'
          : 'at int.Parse() -> at AuthorizeCard() line 4 [СОХРАНЁН]',
      type: 'string',
      changed: Boolean(activeStep),
      isFault: simulation.finalStackState === 'RESET',
    });
  }

  return rows;
}
