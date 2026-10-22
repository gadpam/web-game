// ============================================================================
// C# EXCEPTION ARENA: АТАКА vs ЗАЩИТА
// Ядро данных, 4 боевых раунда, живая сборка C#-кода и пошаговый трассировщик
// ============================================================================

export type TeamId = 'ALPHA' | 'BETA';
export type RoundNumber = 1 | 2 | 3 | 4;
export type ArenaStage = 'welcome' | 'round' | 'finale';
export type RoundSubPhase = 'planning' | 'tracing' | 'roulette' | 'summary';
export type DeviceRole = 'projector' | 'ALPHA' | 'BETA';

export interface CodeToken {
  text: string;
  kind: 'kw' | 'type' | 'fn' | 'str' | 'num' | 'comment' | 'plain' | 'danger';
}

export interface BaseCodeLine {
  lineNumber: number;
  indent: number;
  code: string;
  isClickableTarget?: boolean;
  targetHint?: string;
}

export interface AttackOption {
  id: 'A1' | 'A2' | 'A3';
  codeLabel: string; // Короткий голосовой код (Ловушка №26: если упал Wi-Fi)
  targetLine: number;
  payloadCode: string;
  expectedException: string;
  shortDesc: string;
  throwsException: string | null; // null если вход безопасный
  explosionLine: number | null;
  earlyReturnLine?: number | null;
  inlineValueHint: string;
}

export interface DefenseOption {
  id: 'D1' | 'D2' | 'D3' | 'D4';
  codeLabel: string;
  title: string;
  shortDesc: string;
  targetLine: number;
  patchedLines: {
    lineNumber: number;
    code: string;
    isAddedPatch?: boolean;
    roleTag?: 'try' | 'catch_specific' | 'catch_general' | 'finally' | 'body' | 'after';
    catchesTypes?: string[];
  }[];
  compileError?: {
    code: string;
    message: string;
    errorLine: number;
  };
  catchesExceptions: string[];
  blindCatchPenalty?: boolean; // Ловушка №5/7: слепой catch (Exception) без точного типа
  closesDbOnNormal: boolean;
  closesDbOnReturn: boolean;
  closesDbOnException: boolean;
  logsErrorWithDetails: boolean;
  swallowsErrorSilently?: boolean;
  resetsStackTrace?: boolean; // throw ex;
}

export interface RouletteQuestion {
  prompt: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface RoundSpec {
  number: RoundNumber;
  title: string;
  subtitle: string;
  maxPoints: number; // Растущие ставки: 100, 150, 200, 300
  ruleTitle: string;
  ruleSummary: string;
  engineeringNote: string; // Ловушка №11: когда нужен if/TryParse вместо try-catch
  methodSignature: string;
  baseLines: BaseCodeLine[];
  attackOptions: AttackOption[];
  defenseOptions: DefenseOption[];
  rouletteQuestion: RouletteQuestion;
}

export interface TraceStep {
  stepIndex: number;
  activeLineNumber: number;
  skippedLineNumbers: number[]; // Ловушка №12/22: строки внутри try после взрыва
  inlineBadge: string;
  statusBanner: string;
  stepKind: 'normal' | 'explode' | 'catch' | 'finally' | 'compile_error' | 'leak' | 'done';
  dbState: 'CLOSED' | 'OPEN' | 'LEAK';
  logState: 'EMPTY' | 'LOGGED' | 'SWALLOWED';
  stackState: 'INTACT' | 'RESET';
}

export interface ClashSimulationResult {
  outcome: 'REPELLED' | 'PARTIAL' | 'BREACHED';
  headline: string;
  reasonDetailed: string;
  attackPointsEarned: number;
  defensePointsEarned: number;
  steps: TraceStep[];
  finalDbState: 'CLOSED' | 'OPEN' | 'LEAK';
  finalLogState: 'EMPTY' | 'LOGGED' | 'SWALLOWED';
  finalStackState: 'INTACT' | 'RESET';
}

export const ARENA_ROUNDS: RoundSpec[] = [
  // ==========================================================================
  // РАУНД 1: ТОЧНЫЙ ПРИЦЕЛ (100 ОЧКОВ)
  // ==========================================================================
  {
    number: 1,
    title: 'Раунд 1 · Точный прицел',
    subtitle: 'У каждого падения в C# есть свой тип исключения и строка-адрес',
    maxPoints: 100,
    ruleTitle: 'Правило №1: Прицельный catch (Тип)',
    ruleSummary:
      'Оборачивайте в try опасную операцию и ловите конкретный тип исключения (FormatException, DivideByZeroException), а не безликий Exception.',
    engineeringNote:
      'Инженерный совет: в реальном продакшене для парсинга пользовательских строк ещё дешевле использовать int.TryParse(), чтобы вообще не бросать исключение.',
    methodSignature: 'int BuyTickets(string countText, int groupSize)',
    baseLines: [
      {
        lineNumber: 1,
        indent: 0,
        code: 'int BuyTickets(string countText, int groupSize)',
      },
      {
        lineNumber: 2,
        indent: 0,
        code: '{',
      },
      {
        lineNumber: 3,
        indent: 1,
        code: 'int tickets = int.Parse(countText);',
        isClickableTarget: true,
        targetHint: 'Строка 3: парсинг текста в число int.Parse',
      },
      {
        lineNumber: 4,
        indent: 1,
        code: 'int perPerson = tickets / groupSize;',
        isClickableTarget: true,
        targetHint: 'Строка 4: целочисленное деление на groupSize',
      },
      {
        lineNumber: 5,
        indent: 1,
        code: 'return perPerson;',
      },
      {
        lineNumber: 6,
        indent: 0,
        code: '}',
      },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 3,
        payloadCode: 'countText = "два", groupSize = 2',
        expectedException: 'FormatException',
        shortDesc: 'Текст "два" вместо цифр обрушит int.Parse на строке 3',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'countText = "два" -> throw FormatException',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 4,
        payloadCode: 'countText = "12", groupSize = 0',
        expectedException: 'DivideByZeroException',
        shortDesc: 'Ноль в делителе groupSize = 0 взорвёт деление на строке 4',
        throwsException: 'DivideByZeroException',
        explosionLine: 4,
        inlineValueHint: '12 / 0 -> throw DivideByZeroException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 3,
        payloadCode: 'countText = "10", groupSize = 5',
        expectedException: 'Без исключения (Холостой ход)',
        shortDesc: 'Корректные данные: метод вернёт 2 без всякого падения',
        throwsException: null,
        explosionLine: null,
        inlineValueHint: '10 / 5 = 2 (Штатно)',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Двойной прицельный щит: FormatException + DivideByZeroException',
        shortDesc: 'Прикрывает и строку парсинга (стр. 3), и деление на 0 (стр. 4)',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int BuyTickets(string countText, int groupSize)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int tickets = int.Parse(countText);', roleTag: 'body' },
          { lineNumber: 5, code: '    int perPerson = tickets / groupSize;', roleTag: 'body' },
          { lineNumber: 6, code: '    return perPerson;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (FormatException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['FormatException'],
          },
          {
            lineNumber: 9,
            code: '  catch (DivideByZeroException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['DivideByZeroException'],
          },
          { lineNumber: 10, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException', 'DivideByZeroException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D2',
        codeLabel: 'З-2',
        title: 'Одиночный щит: только catch (FormatException)',
        shortDesc: 'Ловит неверный формат строки, но пропускает деление на 0',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int BuyTickets(string countText, int groupSize)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int tickets = int.Parse(countText);', roleTag: 'body' },
          { lineNumber: 5, code: '    int perPerson = tickets / groupSize;', roleTag: 'body' },
          { lineNumber: 6, code: '    return perPerson;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (FormatException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['FormatException'],
          },
          { lineNumber: 9, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Одиночный щит: только catch (DivideByZeroException)',
        shortDesc: 'Ловит деление на 0, но падает на текстовом вводе "два"',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'int BuyTickets(string countText, int groupSize)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int tickets = int.Parse(countText);', roleTag: 'body' },
          { lineNumber: 5, code: '    int perPerson = tickets / groupSize;', roleTag: 'body' },
          { lineNumber: 6, code: '    return perPerson;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (DivideByZeroException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['DivideByZeroException'],
          },
          { lineNumber: 9, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['DivideByZeroException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D4',
        codeLabel: 'З-4',
        title: 'Слепой перехват: один общий catch (Exception)',
        shortDesc: 'Ловит всё подряд без разбора причины (Штраф -50% за слепой перехват!)',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int BuyTickets(string countText, int groupSize)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int tickets = int.Parse(countText);', roleTag: 'body' },
          { lineNumber: 5, code: '    int perPerson = tickets / groupSize;', roleTag: 'body' },
          { lineNumber: 6, code: '    return perPerson;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (Exception) { return 0; } // Какая именно ошибка — неизвестно!',
            isAddedPatch: true,
            roleTag: 'catch_general',
            catchesTypes: ['FormatException', 'DivideByZeroException'],
          },
          { lineNumber: 9, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException', 'DivideByZeroException'],
        blindCatchPenalty: true,
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: false,
      },
    ],
    rouletteQuestion: {
      prompt:
        'Что происходит со строкой 5 (int perPerson = tickets / groupSize), когда на строке 4 в int.Parse("два") вылетает FormatException?',
      options: [
        {
          id: 'R1_1',
          text: 'Она пропускается: управление мгновенно прыгает из строки 4 прямо в подходящий блок catch',
          isCorrect: true,
          explanation:
            'Верно! При выбросе исключения все оставшиеся строки внутри блока try пропускаются.',
        },
        {
          id: 'R1_2',
          text: 'Сначала срабатывает блок catch, а затем программа возвращается в try и досчитывает строку 5',
          isCorrect: false,
          explanation:
            'Это главная ловушка новичков! Программа никогда не возвращается обратно внутрь блока try после входа в catch.',
        },
        {
          id: 'R1_3',
          text: 'В переменную tickets записывается 0, и строка 5 выполняется дальше',
          isCorrect: false,
          explanation:
            'Нет, int.Parse не возвращает 0 при сбое — он немедленно прерывает выполнение строки выбросом FormatException.',
        },
      ],
    },
  },

  // ==========================================================================
  // РАУНД 2: ЛОВУШКА ПОРЯДКА И CS0160 (150 ОЧКОВ)
  // ==========================================================================
  {
    number: 2,
    title: 'Раунд 2 · Ловушка порядка (CS0160)',
    subtitle: 'Почему в C# нельзя ставить общий catch (Exception) выше частных типов',
    maxPoints: 150,
    ruleTitle: 'Правило №2: От частного к общему (Без CS0160)',
    ruleSummary:
      'Базовый класс Exception — предок всех исключений. Если поставить catch (Exception) первым, ветки ниже станут недостижимыми, и компилятор C# заблокирует сборку ошибкой CS0160.',
    engineeringNote:
      'Инженерный совет: ставьте сверху самые конкретные исключения, а общий catch (Exception) — только в самом конце как последний рубеж.',
    methodSignature: 'int GetDiscount(string promo, int[] table, int idx)',
    baseLines: [
      {
        lineNumber: 1,
        indent: 0,
        code: 'int GetDiscount(string promo, int[] table, int idx)',
      },
      {
        lineNumber: 2,
        indent: 0,
        code: '{',
      },
      {
        lineNumber: 3,
        indent: 1,
        code: 'int codeLen = promo.Trim().Length;',
        isClickableTarget: true,
        targetHint: 'Строка 3: вызов метода у ссылки promo (опасно при null)',
      },
      {
        lineNumber: 4,
        indent: 1,
        code: 'int discount = table[idx];',
        isClickableTarget: true,
        targetHint: 'Строка 4: обращение к массиву по индексу idx',
      },
      {
        lineNumber: 5,
        indent: 1,
        code: 'return discount + codeLen;',
      },
      {
        lineNumber: 6,
        indent: 0,
        code: '}',
      },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 3,
        payloadCode: 'promo = null, idx = 1',
        expectedException: 'NullReferenceException',
        shortDesc: 'Пустая ссылка promo = null взорвёт вызов promo.Trim() на строке 3',
        throwsException: 'NullReferenceException',
        explosionLine: 3,
        inlineValueHint: 'promo == null -> throw NullReferenceException',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 4,
        payloadCode: 'promo = "SALE", idx = 99 (при 3 элементах)',
        expectedException: 'IndexOutOfRangeException',
        shortDesc: 'Индекс 99 за пределами массива взорвёт table[idx] на строке 4',
        throwsException: 'IndexOutOfRangeException',
        explosionLine: 4,
        inlineValueHint: 'table[99] -> throw IndexOutOfRangeException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 4,
        payloadCode: 'promo = "VIP", idx = -1',
        expectedException: 'IndexOutOfRangeException',
        shortDesc: 'Отрицательный индекс -1 вызовет IndexOutOfRangeException на строке 4',
        throwsException: 'IndexOutOfRangeException',
        explosionLine: 4,
        inlineValueHint: 'table[-1] -> throw IndexOutOfRangeException',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Верный порядок: частные типы сверху → общий Exception внизу',
        shortDesc: '1) NullReferenceException → 2) IndexOutOfRangeException → 3) Exception',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int GetDiscount(string promo, int[] table, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int codeLen = promo.Trim().Length;', roleTag: 'body' },
          { lineNumber: 5, code: '    int discount = table[idx];', roleTag: 'body' },
          { lineNumber: 6, code: '    return discount + codeLen;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (NullReferenceException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          {
            lineNumber: 9,
            code: '  catch (IndexOutOfRangeException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['IndexOutOfRangeException'],
          },
          {
            lineNumber: 10,
            code: '  catch (Exception ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_general',
            catchesTypes: ['Exception'],
          },
          { lineNumber: 11, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['NullReferenceException', 'IndexOutOfRangeException', 'Exception'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D2',
        codeLabel: 'З-2',
        title: 'Инверсия: catch (Exception) поставлен ПЕРВЫМ (Ловушка CS0160!)',
        shortDesc: 'Сначала общий Exception, а под ним — частные типы',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int GetDiscount(string promo, int[] table, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int codeLen = promo.Trim().Length;', roleTag: 'body' },
          { lineNumber: 5, code: '    int discount = table[idx];', roleTag: 'body' },
          { lineNumber: 6, code: '    return discount + codeLen;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (Exception ex) { return 0; } // Перекрывает все ветки ниже!',
            isAddedPatch: true,
            roleTag: 'catch_general',
            catchesTypes: ['Exception'],
          },
          {
            lineNumber: 9,
            code: '  catch (NullReferenceException ex) { return 0; } // Ошибка компиляции CS0160: блок недостижим',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          { lineNumber: 10, code: '}', roleTag: 'body' },
        ],
        compileError: {
          code: 'CS0160',
          message:
            "Ошибка компиляции CS0160: Предыдущий блок catch ('Exception') уже перехватывает все исключения. Ветка на строке 9 недостижима — код даже не скомпилировался!",
          errorLine: 9,
        },
        catchesExceptions: [],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: false,
        logsErrorWithDetails: false,
      },
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Неполный щит: только catch (NullReferenceException)',
        shortDesc: 'Защищает от null на строке 3, но не ловит выход за границы массива',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int GetDiscount(string promo, int[] table, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int codeLen = promo.Trim().Length;', roleTag: 'body' },
          { lineNumber: 5, code: '    int discount = table[idx];', roleTag: 'body' },
          { lineNumber: 6, code: '    return discount + codeLen;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (NullReferenceException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          { lineNumber: 9, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['NullReferenceException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D4',
        codeLabel: 'З-4',
        title: 'Неполный щит: только catch (IndexOutOfRangeException)',
        shortDesc: 'Защищает массив на строке 4, но падает при promo = null',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'int GetDiscount(string promo, int[] table, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int codeLen = promo.Trim().Length;', roleTag: 'body' },
          { lineNumber: 5, code: '    int discount = table[idx];', roleTag: 'body' },
          { lineNumber: 6, code: '    return discount + codeLen;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (IndexOutOfRangeException ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['IndexOutOfRangeException'],
          },
          { lineNumber: 9, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['IndexOutOfRangeException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
    ],
    rouletteQuestion: {
      prompt:
        'В какой момент возникает ошибка CS0160, если поставить catch (Exception) выше catch (NullReferenceException)?',
      options: [
        {
          id: 'R2_1',
          text: 'Ещё ДО запуска программы — компилятор C# отказывается собирать проект с недостижимой веткой catch',
          isCorrect: true,
          explanation:
            'Точно! CS0160 — это ошибка этапа компиляции (Compile-time), а не исключение во время работы (Runtime).',
        },
        {
          id: 'R2_2',
          text: 'Только во время работы программы, когда прилетит пустая ссылка null',
          isCorrect: false,
          explanation:
            'Нет! Программа с ошибкой CS0160 даже не скомпилируется и не запустится.',
        },
        {
          id: 'R2_3',
          text: 'Никакой ошибки не будет, просто сработают оба блока catch по очереди',
          isCorrect: false,
          explanation:
            'За один сбой может сработать максимум ОДИН блок catch, а недостижимый второй блок запрещён компилятором C#.',
        },
      ],
    },
  },

  // ==========================================================================
  // РАУНД 3: ЗАВИСШИЙ ЗАМОК И ГАРАНТИЯ FINALLY (200 ОЧКОВ)
  // ==========================================================================
  {
    number: 3,
    title: 'Раунд 3 · Зависший замок (finally)',
    subtitle: 'Как закрыть соединение с БД, если внутри метода есть и return, и падение',
    maxPoints: 200,
    ruleTitle: 'Правило №3: Гарантия блока finally',
    ruleSummary:
      'Код внутри finally { db.Close(); } выполняется ВСЕГДА: и при штатном завершении, и при раннем return из try, и после перехвата исключения.',
    engineeringNote:
      'Инженерный совет: для объектов с IDisposable в C# конструкция using (var db = ...) автоматически разворачивается компилятором в try / finally { db.Dispose(); }.',
    methodSignature: 'bool TransferCoins(Database db, int amount, int split)',
    baseLines: [
      {
        lineNumber: 1,
        indent: 0,
        code: 'bool TransferCoins(Database db, int amount, int split)',
      },
      {
        lineNumber: 2,
        indent: 0,
        code: '{',
      },
      {
        lineNumber: 3,
        indent: 1,
        code: 'db.Open(); // Открытие соединения с БД',
      },
      {
        lineNumber: 4,
        indent: 1,
        code: 'if (amount <= 0) return false; // Ранний выход!',
        isClickableTarget: true,
        targetHint: 'Строка 4: ранний выход return false до закрытия БД',
      },
      {
        lineNumber: 5,
        indent: 1,
        code: 'int part = amount / split;',
        isClickableTarget: true,
        targetHint: 'Строка 5: опасное деление amount / split',
      },
      {
        lineNumber: 6,
        indent: 1,
        code: 'db.Close();',
      },
      {
        lineNumber: 7,
        indent: 1,
        code: 'return true;',
      },
      {
        lineNumber: 8,
        indent: 0,
        code: '}',
      },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 4,
        payloadCode: 'amount = -50, split = 2 (Ранний return)',
        expectedException: 'Утечка БД при return',
        shortDesc: 'Отрицательная сумма вызовет return false на строке 4 в обход db.Close()!',
        throwsException: null,
        explosionLine: null,
        earlyReturnLine: 4,
        inlineValueHint: 'amount <= 0 -> ранний return false',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 5,
        payloadCode: 'amount = 100, split = 0 (Взрыв деления)',
        expectedException: 'DivideByZeroException',
        shortDesc: 'Деление на split = 0 взорвёт строку 5 и перепрыгнет db.Close()!',
        throwsException: 'DivideByZeroException',
        explosionLine: 5,
        inlineValueHint: '100 / 0 -> throw DivideByZeroException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 5,
        payloadCode: 'amount = 500, split = 0 (Двойной тест БД)',
        expectedException: 'DivideByZeroException',
        shortDesc: 'Проверяет одновременно перехват деления на 0 и закрытие БД в finally',
        throwsException: 'DivideByZeroException',
        explosionLine: 5,
        inlineValueHint: '500 / 0 -> проверка блока finally',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Эталон: catch (DivideByZeroException) + finally { db.Close(); }',
        shortDesc: 'Гарантированно закрывает БД и при падении на строке 5, и при return на строке 4',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open(); // Соединение открыто', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    if (amount <= 0) return false;', roleTag: 'body' },
          { lineNumber: 6, code: '    int part = amount / split;', roleTag: 'body' },
          { lineNumber: 7, code: '    return true;', roleTag: 'body' },
          { lineNumber: 8, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 9,
            code: '  catch (DivideByZeroException ex) { Log(ex.Message); return false; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['DivideByZeroException'],
          },
          {
            lineNumber: 10,
            code: '  finally { db.Close(); } // Гарантированное освобождение ресурса',
            isAddedPatch: true,
            roleTag: 'finally',
          },
          { lineNumber: 11, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['DivideByZeroException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D2',
        codeLabel: 'З-2',
        title: 'Ловушка №1: оставить db.Close() в конце блока try (без finally)',
        shortDesc: 'При любом return или исключении строка db.Close() будет перепрыгнута!',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open(); // Соединение открыто', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    if (amount <= 0) return false;', roleTag: 'body' },
          { lineNumber: 6, code: '    int part = amount / split;', roleTag: 'body' },
          { lineNumber: 7, code: '    db.Close(); // Не выполнится при раннем return или исключении', roleTag: 'body' },
          { lineNumber: 8, code: '    return true;', roleTag: 'body' },
          { lineNumber: 9, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 10,
            code: '  catch (DivideByZeroException ex) { Log(ex.Message); return false; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['DivideByZeroException'],
          },
          { lineNumber: 11, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['DivideByZeroException'],
        closesDbOnNormal: true,
        closesDbOnReturn: false,
        closesDbOnException: false,
        logsErrorWithDetails: true,
      },
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Ловушка №2: поставить db.Close() ПОСЛЕ блока try-catch (без finally)',
        shortDesc: 'Кажется, что сработает, но ранний return внутри try выйдет из метода мимо неё!',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open(); // Соединение открыто', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    if (amount <= 0) return false; // Выход мимо стр. 10!', roleTag: 'body' },
          { lineNumber: 6, code: '    int part = amount / split;', roleTag: 'body' },
          { lineNumber: 7, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 8,
            code: '  catch (DivideByZeroException ex) { Log(ex.Message); }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['DivideByZeroException'],
          },
          {
            lineNumber: 9,
            code: '  db.Close(); // Не выполнится при раннем выходе из метода',
            isAddedPatch: true,
            roleTag: 'after',
          },
          { lineNumber: 10, code: '  return true;', roleTag: 'body' },
          { lineNumber: 11, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['DivideByZeroException'],
        closesDbOnNormal: true,
        closesDbOnReturn: false,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D4',
        codeLabel: 'З-4',
        title: 'Ловушка №3: поместить db.Close() только внутрь catch',
        shortDesc: 'При исключении БД закроется, но при обычной работе и return останется висеть!',
        targetLine: 5,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open(); // Соединение открыто', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    if (amount <= 0) return false;', roleTag: 'body' },
          { lineNumber: 6, code: '    int part = amount / split;', roleTag: 'body' },
          { lineNumber: 7, code: '    return true;', roleTag: 'body' },
          { lineNumber: 8, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 9,
            code: '  catch (DivideByZeroException ex) { db.Close(); return false; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['DivideByZeroException'],
          },
          { lineNumber: 10, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['DivideByZeroException'],
        closesDbOnNormal: false,
        closesDbOnReturn: false,
        closesDbOnException: true,
        logsErrorWithDetails: false,
      },
    ],
    rouletteQuestion: {
      prompt:
        'Чем код внутри блока finally { db.Close(); } отличается от обычной строчки db.Close(), написанной просто после блока try-catch?',
      options: [
        {
          id: 'R3_1',
          text: 'Блок finally выполнится ДАЖЕ если внутри try сработал ранний return или вылетело непойманное исключение',
          isCorrect: true,
          explanation:
            'Абсолютно верно! Команда return внутри try перепрыгивает весь код после try-catch, но обойти блок finally она не может.',
        },
        {
          id: 'R3_2',
          text: 'Ничем не отличается — это просто красивое ключевое слово для читаемости кода',
          isCorrect: false,
          explanation:
            'Отличается кардинально! При return из try код после try-catch вообще не запустится, а finally запустится гарантированно.',
        },
        {
          id: 'R3_3',
          text: 'Блок finally запускается только тогда, когда произошла ошибка',
          isCorrect: false,
          explanation:
            'Только при ошибке запускается catch, а finally запускается ВСЕГДА (и с ошибкой, и без неё).',
        },
      ],
    },
  },

  // ==========================================================================
  // РАУНД 4: СЛЕПАЯ ЗОНА — ПУСТОЙ CATCH И THROW; VS THROW EX; (300 ОЧКОВ)
  // ==========================================================================
  {
    number: 4,
    title: 'Раунд 4 · Слепая зона (Лог и StackTrace)',
    subtitle: 'Почему пустой catch {} опаснее падения, а throw ex; уничтожает улики',
    maxPoints: 300,
    ruleTitle: 'Правило №4: Запиши ex.Message и сохрани стек через throw;',
    ruleSummary:
      'Никогда не оставляйте пустой catch { } (ошибка пропадает без следа). Для повторного проброса ошибки используйте чистый throw; — конструкция throw ex; затирает исходный номер строки в StackTrace!',
    engineeringNote:
      'Инженерный совет: анализатор кода .NET выдаёт предупреждение CA2200 на каждую инструкцию throw ex;, требуя заменять её на throw;.',
    methodSignature: 'int AuthorizeCard(string pinInput, AuditLog log)',
    baseLines: [
      {
        lineNumber: 1,
        indent: 0,
        code: 'int AuthorizeCard(string pinInput, AuditLog log)',
      },
      {
        lineNumber: 2,
        indent: 0,
        code: '{',
      },
      {
        lineNumber: 3,
        indent: 1,
        code: 'int pin = int.Parse(pinInput); // Стр. 3: точка сбоя',
        isClickableTarget: true,
        targetHint: 'Строка 3: парсинг PIN-кода карты (исходная точка стека)',
      },
      {
        lineNumber: 4,
        indent: 1,
        code: 'return VerifyPinHash(pin);',
        isClickableTarget: true,
        targetHint: 'Строка 4: проверка хеша PIN-кода',
      },
      {
        lineNumber: 5,
        indent: 0,
        code: '}',
      },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 3,
        payloadCode: 'pinInput = "HACK_77" (Аудит лога и StackTrace)',
        expectedException: 'FormatException',
        shortDesc: 'Проверяет, записан ли сбой в AuditLog и сохранился ли адрес строки в стеке',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'pinInput = "HACK_77" -> throw FormatException',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 3,
        payloadCode: 'pinInput = "" (Проверка на проглатывание ошибки)',
        expectedException: 'FormatException',
        shortDesc: 'Пустой ввод: если у Защиты пустой catch {}, атака пройдёт незамеченной!',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'pinInput = "" -> throw FormatException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 3,
        payloadCode: 'pinInput = "999999999999999" (Переполнение int)',
        expectedException: 'OverflowException',
        shortDesc: 'Слишком большое число для int вызывает OverflowException на строке 3',
        throwsException: 'OverflowException',
        explosionLine: 3,
        inlineValueHint: 'pinInput = "999999999999999" -> throw OverflowException',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Честный аудит: log.Write(ex.Message) + чистый throw;',
        shortDesc: 'Записывает детали сбоя в журнал и сохраняет исходную строку падения в StackTrace',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int AuthorizeCard(string pinInput, AuditLog log)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int pin = int.Parse(pinInput); // Исходная строка #4', roleTag: 'body' },
          { lineNumber: 5, code: '    return VerifyPinHash(pin);', roleTag: 'body' },
          { lineNumber: 6, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 7,
            code: '  catch (Exception ex) { log.Write(ex.Message); throw; } // Стек вызовов сохранён (rethrow)',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['FormatException', 'OverflowException', 'Exception'],
          },
          { lineNumber: 8, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException', 'OverflowException', 'Exception'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
        swallowsErrorSilently: false,
        resetsStackTrace: false,
      },
      {
        id: 'D2',
        codeLabel: 'З-2',
        title: 'Ловушка CA2200: log.Write(ex.Message) + throw ex;',
        shortDesc: 'Записывает лог, но throw ex; затирает исходную строку падения в StackTrace!',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int AuthorizeCard(string pinInput, AuditLog log)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int pin = int.Parse(pinInput);', roleTag: 'body' },
          { lineNumber: 5, code: '    return VerifyPinHash(pin);', roleTag: 'body' },
          { lineNumber: 6, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 7,
            code: '  catch (Exception ex) { log.Write(ex.Message); throw ex; } // Антипаттерн CA2200: сброс StackTrace',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['FormatException', 'OverflowException', 'Exception'],
          },
          { lineNumber: 8, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException', 'OverflowException', 'Exception'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
        swallowsErrorSilently: false,
        resetsStackTrace: true,
      },
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Ловушка «Молчание»: пустой catch { return 0; }',
        shortDesc: 'Программа не падает, но ошибка бесследно исчезает из журнала безопасности!',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int AuthorizeCard(string pinInput, AuditLog log)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int pin = int.Parse(pinInput);', roleTag: 'body' },
          { lineNumber: 5, code: '    return VerifyPinHash(pin);', roleTag: 'body' },
          { lineNumber: 6, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 7,
            code: '  catch { return 0; } // Антипаттерн: пустой catch скрывает сбой',
            isAddedPatch: true,
            roleTag: 'catch_general',
            catchesTypes: ['FormatException', 'OverflowException', 'Exception'],
          },
          { lineNumber: 8, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException', 'OverflowException', 'Exception'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: false,
        swallowsErrorSilently: true,
        resetsStackTrace: false,
      },
      {
        id: 'D4',
        codeLabel: 'З-4',
        title: 'Узкий перехват: только catch (FormatException) без OverflowException',
        shortDesc: 'Защитит от букв, но пропустит переполнение числа "999999999999999"',
        targetLine: 3,
        patchedLines: [
          { lineNumber: 1, code: 'int AuthorizeCard(string pinInput, AuditLog log)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 4, code: '    int pin = int.Parse(pinInput);', roleTag: 'body' },
          { lineNumber: 5, code: '    return VerifyPinHash(pin);', roleTag: 'body' },
          { lineNumber: 6, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 7,
            code: '  catch (FormatException ex) { log.Write(ex.Message); throw; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['FormatException'],
          },
          { lineNumber: 8, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['FormatException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
        swallowsErrorSilently: false,
        resetsStackTrace: false,
      },
    ],
    rouletteQuestion: {
      prompt:
        'В чём разница между инструкциями throw; и throw ex; внутри блока catch (Exception ex)?',
      options: [
        {
          id: 'R4_1',
          text: 'throw; сохраняет исходный номер строки, где родилась ошибка, а throw ex; перезаписывает StackTrace текущей строкой',
          isCorrect: true,
          explanation:
            'Именно так! Из-за throw ex; разработчик в логах видит только номер строки самого блока catch, а настоящая причина сбоя теряется.',
        },
        {
          id: 'R4_2',
          text: 'throw ex; работает быстрее, а пустой throw; просто игнорирует ошибку',
          isCorrect: false,
          explanation:
            'Наоборот: оба пробрасывают исключение дальше, но throw ex; уничтожает историю вызовов (StackTrace).',
        },
        {
          id: 'R4_3',
          text: 'Между ними нет никакой разницы в компиляторе C#',
          isCorrect: false,
          explanation:
            'В IL-коде это две совершенно разные инструкции: rethrow (сохраняет стек) и throw (создаёт новую точку отсчёта стека).',
        },
      ],
    },
  },
];

// ============================================================================
// ДЕТЕРМИНИРОВАННЫЙ СИМУЛЯТОР СТОЛКНОВЕНИЯ АТАКИ И ЗАЩИТЫ (ТРАССИРОВКА ПО ШАГАМ)
// ============================================================================

export function simulateClash(
  round: RoundSpec,
  attackId: 'A1' | 'A2' | 'A3',
  defenseId: 'D1' | 'D2' | 'D3' | 'D4'
): ClashSimulationResult {
  const attack =
    round.attackOptions.find((a) => a.id === attackId) || round.attackOptions[0];
  const defense =
    round.defenseOptions.find((d) => d.id === defenseId) ||
    round.defenseOptions[0];

  const steps: TraceStep[] = [];
  const halfPool = Math.round(round.maxPoints / 2);

  // 1. Проверка ошибки этапа компиляции (например, CS0160 в Раунде 2)
  if (defense.compileError) {
    steps.push({
      stepIndex: 1,
      activeLineNumber: defense.compileError.errorLine,
      skippedLineNumbers: [],
      inlineBadge: `[BUILD FAILED] ${defense.compileError.code}`,
      statusBanner: defense.compileError.message,
      stepKind: 'compile_error',
      dbState: 'CLOSED',
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    return {
      outcome: 'BREACHED',
      headline: `ОШИБКА КОМПИЛЯЦИИ (${defense.compileError.code})!`,
      reasonDetailed: defense.compileError.message,
      attackPointsEarned: halfPool,
      defensePointsEarned: 0,
      steps,
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  // Начальное состояние датчиков
  const initialDb: 'CLOSED' | 'OPEN' = round.number === 3 ? 'OPEN' : 'CLOSED';

  // Шаг 1: Вход в блок try
  const tryLine =
    defense.patchedLines.find((l) => l.roleTag === 'try')?.lineNumber || 3;
  steps.push({
    stepIndex: 1,
    activeLineNumber: tryLine,
    skippedLineNumbers: [],
    inlineBadge: `▶ Вход в зону try (${attack.payloadCode})`,
    statusBanner: `Шаг 1: Программа входит в защитную зону try со снарядом «${attack.payloadCode}»`,
    stepKind: 'normal',
    dbState: initialDb,
    logState: 'EMPTY',
    stackState: 'INTACT',
  });

  // Сценарий А: Ранний выход return (Раунд 3, снаряд A1)
  if (attack.earlyReturnLine) {
    const returnPatchedLine = 5; // строка с if (amount <= 0) return false;
    const skippedInTry = [6, 7];

    steps.push({
      stepIndex: 2,
      activeLineNumber: returnPatchedLine,
      skippedLineNumbers: skippedInTry,
      inlineBadge: attack.inlineValueHint,
      statusBanner:
        'Шаг 2: Сработал ранний выход return false! Строки ниже внутри try пропускаются.',
      stepKind: 'normal',
      dbState: initialDb,
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    const finallyLineObj = defense.patchedLines.find(
      (l) => l.roleTag === 'finally'
    );
    if (finallyLineObj && defense.closesDbOnReturn) {
      steps.push({
        stepIndex: 3,
        activeLineNumber: finallyLineObj.lineNumber,
        skippedLineNumbers: skippedInTry,
        inlineBadge: '[FINALLY] db.Close() выполнен',
        statusBanner:
          'Шаг 3: Даже при раннем return управление заходит в блок finally и закрывает БД!',
        stepKind: 'finally',
        dbState: 'CLOSED',
        logState: 'EMPTY',
        stackState: 'INTACT',
      });

      return {
        outcome: 'REPELLED',
        headline: 'ЗАЩИТА УСТОЯЛА: блок finally закрыл БД при раннем return',
        reasonDetailed:
          'Ранний return перепрыгнул конец блока try, но блок finally сработал гарантированно и предотвратил утечку соединения.',
        attackPointsEarned: 0,
        defensePointsEarned: halfPool,
        steps,
        finalDbState: 'CLOSED',
        finalLogState: 'EMPTY',
        finalStackState: 'INTACT',
      };
    } else {
      const leakLine =
        defense.patchedLines.find((l) => l.code.includes('db.Close'))
          ?.lineNumber || 7;
      steps.push({
        stepIndex: 3,
        activeLineNumber: leakLine,
        skippedLineNumbers: [leakLine],
        inlineBadge: '[LEAK] Вызов db.Close() пропущен',
        statusBanner:
          'Шаг 3: Выход из метода произошёл мимо db.Close()! Соединение с базой данных осталось висеть открытым.',
        stepKind: 'leak',
        dbState: 'LEAK',
        logState: 'EMPTY',
        stackState: 'INTACT',
      });

      return {
        outcome: 'BREACHED',
        headline: 'ПРОБИТИЕ ЗАЩИТЫ: утечка открытого соединения с БД',
        reasonDetailed:
          'Без блока finally ранний выход return false покинул метод до вызова db.Close(). Соединение с базой данных утекло!',
        attackPointsEarned: halfPool,
        defensePointsEarned: 0,
        steps,
        finalDbState: 'LEAK',
        finalLogState: 'EMPTY',
        finalStackState: 'INTACT',
      };
    }
  }

  // Сценарий Б: Холостой снаряд без исключения (например, A3 в Раунде 1)
  if (!attack.throwsException) {
    steps.push({
      stepIndex: 2,
      activeLineNumber: 5,
      skippedLineNumbers: [],
      inlineBadge: attack.inlineValueHint,
      statusBanner:
        'Шаг 2: Входные данные корректны — метод штатно выполнил все строки без выброса исключений.',
      stepKind: 'done',
      dbState: 'CLOSED',
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    return {
      outcome: 'REPELLED',
      headline: 'ШТАТНОЕ ВЫПОЛНЕНИЕ: входные данные не вызвали сбоя',
      reasonDetailed:
        'Атака выбрала безопасные входные данные, которые не вызывают исключения. Защита сохраняет очки!',
      attackPointsEarned: 0,
      defensePointsEarned: halfPool,
      steps,
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  // Сценарий В: Выброс реального исключения
  const patchedExplosionLine = (attack.explosionLine || 3) + 1;
  const skippedLinesInTry: number[] = [];
  defense.patchedLines.forEach((l) => {
    if (l.roleTag === 'body' && l.lineNumber > patchedExplosionLine && l.lineNumber <= 7) {
      skippedLinesInTry.push(l.lineNumber);
    }
  });

  steps.push({
    stepIndex: 2,
    activeLineNumber: patchedExplosionLine,
    skippedLineNumbers: skippedLinesInTry,
    inlineBadge: attack.inlineValueHint,
    statusBanner: `Шаг 2: На строке ${patchedExplosionLine} выброшено исключение ${attack.throwsException}! Строки ниже внутри try пропускаются.`,
    stepKind: 'explode',
    dbState: initialDb,
    logState: 'EMPTY',
    stackState: 'INTACT',
  });

  const isCaught =
    defense.catchesExceptions.includes(attack.throwsException) ||
    defense.catchesExceptions.includes('Exception');

  const matchingCatchLine =
    defense.patchedLines.find(
      (l) =>
        l.catchesTypes?.includes(attack.throwsException!) ||
        l.catchesTypes?.includes('Exception')
    )?.lineNumber || 8;

  if (!isCaught) {
    steps.push({
      stepIndex: 3,
      activeLineNumber: defense.patchedLines.length,
      skippedLineNumbers: skippedLinesInTry,
      inlineBadge: `[UNHANDLED] ${attack.throwsException}!`,
      statusBanner: `Шаг 3: В щите нет обработчика для типа ${attack.throwsException} — программа аварийно рухнула!`,
      stepKind: 'explode',
      dbState: round.number === 3 && !defense.closesDbOnException ? 'LEAK' : 'CLOSED',
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    return {
      outcome: 'BREACHED',
      headline: `ПРОБИТИЕ ЗАЩИТЫ: необработанное исключение ${attack.throwsException}`,
      reasonDetailed: `Атака ударила типом ${attack.throwsException}, а в щите Защиты не оказалось подходящего блока catch.`,
      attackPointsEarned: halfPool,
      defensePointsEarned: 0,
      steps,
      finalDbState: round.number === 3 && !defense.closesDbOnException ? 'LEAK' : 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  // Исключение перехвачено блоком catch: проверяем качество обработки (Раунд 1 слепой catch, Раунд 3 finally, Раунд 4 лог и стек)
  const logStateAfterCatch: 'EMPTY' | 'LOGGED' | 'SWALLOWED' =
    defense.swallowsErrorSilently
      ? 'SWALLOWED'
      : defense.logsErrorWithDetails
      ? 'LOGGED'
      : 'EMPTY';

  const stackStateAfterCatch: 'INTACT' | 'RESET' = defense.resetsStackTrace
    ? 'RESET'
    : 'INTACT';

  steps.push({
    stepIndex: 3,
    activeLineNumber: matchingCatchLine,
    skippedLineNumbers: skippedLinesInTry,
    inlineBadge: defense.swallowsErrorSilently
      ? '[SILENT CATCH] Ошибка скрыта от лога'
      : defense.resetsStackTrace
      ? '[CA2200] throw ex перезаписал StackTrace'
      : `[CATCH] Перехвачено исключение (${attack.throwsException})`,
    statusBanner: `Шаг 3: Управление прыгнуло в блок catch на строке ${matchingCatchLine}.`,
    stepKind: 'catch',
    dbState: initialDb,
    logState: logStateAfterCatch,
    stackState: stackStateAfterCatch,
  });

  // Если это Раунд 3 — проверяем закрытие БД в finally
  if (round.number === 3) {
    const finallyLineObj = defense.patchedLines.find(
      (l) => l.roleTag === 'finally'
    );
    if (finallyLineObj && defense.closesDbOnException) {
      steps.push({
        stepIndex: 4,
        activeLineNumber: finallyLineObj.lineNumber,
        skippedLineNumbers: skippedLinesInTry,
        inlineBadge: '[FINALLY] db.Close() закрыл соединение',
        statusBanner:
          'Шаг 4: После блока catch гарантированно сработал блок finally и закрыл соединение с БД.',
        stepKind: 'finally',
        dbState: 'CLOSED',
        logState: logStateAfterCatch,
        stackState: stackStateAfterCatch,
      });
    } else if (!defense.closesDbOnException) {
      steps.push({
        stepIndex: 4,
        activeLineNumber: defense.patchedLines.length,
        skippedLineNumbers: skippedLinesInTry,
        inlineBadge: '[LEAK] Соединение с БД осталось открытым',
        statusBanner:
          'Шаг 4: Исключение поймали, но db.Close() остался в пропущенной части try! Соединение утекло.',
        stepKind: 'leak',
        dbState: 'LEAK',
        logState: logStateAfterCatch,
        stackState: stackStateAfterCatch,
      });

      return {
        outcome: 'BREACHED',
        headline: 'ПРОБИТИЕ ЗАЩИТЫ: исключение перехвачено, но соединение с БД утекло',
        reasonDetailed:
          'Вызов db.Close() находился внутри try после опасной строки и был пропущен при прыжке в catch. Без finally база данных осталась висеть открытой!',
        attackPointsEarned: halfPool,
        defensePointsEarned: 0,
        steps,
        finalDbState: 'LEAK',
        finalLogState: logStateAfterCatch,
        finalStackState: stackStateAfterCatch,
      };
    }
  }

  // Проверка антипаттернов Раунда 4 (пустой catch или throw ex;)
  if (defense.swallowsErrorSilently) {
    return {
      outcome: 'BREACHED',
      headline: 'ПРОБИТИЕ ЗАЩИТЫ: пустой блок catch {} скрыл сбой от журнала',
      reasonDetailed:
        'Защита поставила пустой блок catch: программа промолчала, в AuditLog не попало ни одной записи, и атака осталась незамеченной!',
      attackPointsEarned: halfPool,
      defensePointsEarned: 0,
      steps,
      finalDbState: 'CLOSED',
      finalLogState: 'SWALLOWED',
      finalStackState: 'INTACT',
    };
  }

  if (defense.resetsStackTrace) {
    return {
      outcome: 'BREACHED',
      headline: 'ПРОБИТИЕ ЗАЩИТЫ (CA2200): инструкция throw ex; стёрла стек вызовов',
      reasonDetailed:
        'Защита написала throw ex; вместо чистого throw;. Из-за этого исходный номер строки падения в StackTrace был перезаписан!',
      attackPointsEarned: halfPool,
      defensePointsEarned: 0,
      steps,
      finalDbState: 'CLOSED',
      finalLogState: 'LOGGED',
      finalStackState: 'RESET',
    };
  }

  // Проверка штрафа за слепой catch (Exception) в Раунде 1
  if (defense.blindCatchPenalty) {
    const partialPts = Math.round(halfPool / 2);
    return {
      outcome: 'PARTIAL',
      headline: 'ЧАСТИЧНЫЙ ПЕРЕХВАТ: общий catch (Exception) вместо точного типа',
      reasonDetailed:
        'Падение остановлено, но общий catch (Exception) скрыл конкретный тип сбоя. Защита получает только половину очков за ход!',
      attackPointsEarned: halfPool - partialPts,
      defensePointsEarned: partialPts,
      steps,
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  return {
    outcome: 'REPELLED',
    headline: `ЗАЩИТА УСТОЯЛА: прицельно обработан ${attack.throwsException}`,
    reasonDetailed: `Щит Защиты прицельно перехватил ${attack.throwsException}, зафиксировал детали в логе и сохранил целостность всех ресурсов.`,
    attackPointsEarned: 0,
    defensePointsEarned: halfPool,
    steps,
    finalDbState: 'CLOSED',
    finalLogState: 'LOGGED',
    finalStackState: 'INTACT',
  };
}

export interface DisplayedCodeLine {
  lineNumber: number;
  code: string;
  isAddedPatch: boolean;
}

export function getPatchedCodeLines(
  round: RoundSpec,
  defenseId: 'D1' | 'D2' | 'D3' | 'D4' | null
): DisplayedCodeLine[] {
  if (!defenseId) {
    return round.baseLines.map((b) => ({
      lineNumber: b.lineNumber,
      code: `${' '.repeat(b.indent * 2)}${b.code}`,
      isAddedPatch: false,
    }));
  }
  const def = round.defenseOptions.find((d) => d.id === defenseId);
  if (!def) {
    return round.baseLines.map((b) => ({
      lineNumber: b.lineNumber,
      code: `${' '.repeat(b.indent * 2)}${b.code}`,
      isAddedPatch: false,
    }));
  }
  return def.patchedLines.map((p) => ({
    lineNumber: p.lineNumber,
    code: p.code,
    isAddedPatch: Boolean(p.isAddedPatch),
  }));
}

