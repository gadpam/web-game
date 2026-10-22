// ============================================================================
// C# EXCEPTION ARENA: АТАКА И ЗАЩИТА КОДА
// Ядро данных, 4 раунда без спойлеров и детерминированный симулятор CLR
// ============================================================================

export type TeamId = 'ALPHA' | 'BETA';
export type RoundNumber = 1 | 2 | 3 | 4;
export type ArenaStage = 'welcome' | 'round' | 'finale';
export type RoundSubPhase = 'planning' | 'tracing' | 'roulette' | 'summary';
export type DeviceRole = 'projector' | 'ALPHA' | 'BETA';

export interface BaseCodeLine {
  lineNumber: number;
  indent: number;
  code: string;
  isClickableTarget?: boolean;
  targetHint?: string;
}

export interface AttackOption {
  id: 'A1' | 'A2' | 'A3';
  codeLabel: string;
  targetLine: number;
  payloadCode: string;
  expectedException: string;
  shortDesc: string;
  throwsException: string | null;
  explosionLine: number | null;
  earlyReturnLine?: number | null;
  normalReturnLine?: number | null;
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
    roleTag?:
      | 'try'
      | 'catch_specific'
      | 'catch_general'
      | 'finally'
      | 'body'
      | 'after';
    catchesTypes?: string[];
  }[];
  compileError?: {
    code: string;
    message: string;
    errorLine: number;
  };
  catchesExceptions: string[];
  blindCatchPenalty?: boolean;
  closesDbOnNormal: boolean;
  closesDbOnReturn: boolean;
  closesDbOnException: boolean;
  logsErrorWithDetails: boolean;
  swallowsErrorSilently?: boolean;
  resetsStackTrace?: boolean;
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
  maxPoints: number;
  ruleTitle: string;
  ruleSummary: string;
  engineeringNote: string;
  methodSignature: string;
  baseLines: BaseCodeLine[];
  attackOptions: AttackOption[];
  defenseOptions: DefenseOption[];
  rouletteQuestion: RouletteQuestion;
}

export interface TraceStep {
  stepIndex: number;
  activeLineNumber: number;
  skippedLineNumbers: number[];
  inlineBadge: string;
  statusBanner: string;
  stepKind:
    | 'normal'
    | 'explode'
    | 'catch'
    | 'finally'
    | 'compile_error'
    | 'leak'
    | 'done';
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
  // РАУНД 1: ТОЧНЫЙ ПРИЦЕЛ (100 ОЧКОВ) — Лучшая защита: D3 (З-3), Блиц: R1_2
  // ==========================================================================
  {
    number: 1,
    title: 'Точный прицел',
    subtitle: 'У каждого сбоя в C# есть свой тип исключения и строка возникновения',
    maxPoints: 100,
    ruleTitle: 'Правило №1: Прицельный перехват по типам',
    ruleSummary:
      'Оборачивайте опасные вычисления в try и перехватывайте конкретные типы исключений (FormatException, DivideByZeroException), чтобы точно знать причину сбоя.',
    engineeringNote:
      'В продакшене для чтения пользовательского ввода также применяют int.TryParse(), чтобы избежать накладных расходов на выброс исключения.',
    methodSignature: 'int BuyTickets(string countText, int groupSize)',
    baseLines: [
      { lineNumber: 1, indent: 0, code: 'int BuyTickets(string countText, int groupSize)' },
      { lineNumber: 2, indent: 0, code: '{' },
      {
        lineNumber: 3,
        indent: 1,
        code: 'int tickets = int.Parse(countText);',
        isClickableTarget: true,
      },
      {
        lineNumber: 4,
        indent: 1,
        code: 'int perPerson = tickets / groupSize;',
        isClickableTarget: true,
      },
      { lineNumber: 5, indent: 1, code: 'return perPerson;' },
      { lineNumber: 6, indent: 0, code: '}' },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 4,
        payloadCode: 'countText = "два", groupSize = 2',
        expectedException: 'FormatException',
        shortDesc: 'Передать словесную строку вместо числа в int.Parse',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'int.Parse("два") -> throw FormatException',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 5,
        payloadCode: 'countText = "12", groupSize = 0',
        expectedException: 'DivideByZeroException',
        shortDesc: 'Передать корректное число "12" и нулевой делитель groupSize = 0',
        throwsException: 'DivideByZeroException',
        explosionLine: 4,
        inlineValueHint: '12 / 0 -> throw DivideByZeroException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 4,
        payloadCode: 'countText = "", groupSize = 0',
        expectedException: 'FormatException',
        shortDesc: 'Пустая строка в countText и одновременный ноль в groupSize',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'int.Parse("") -> throw FormatException до деления',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Один блок: catch (FormatException)',
        shortDesc: 'Обработчик ошибок преобразования строки в число',
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
        id: 'D2',
        codeLabel: 'З-2',
        title: 'Один общий блок: catch (Exception)',
        shortDesc: 'Перехват базового типа Exception без разделения причин сбоя',
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
            code: '  catch (Exception) { return 0; }',
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
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Два блока: catch (FormatException) и catch (DivideByZeroException)',
        shortDesc: 'Отдельный специализированный обработчик для каждой опасной операции',
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
        id: 'D4',
        codeLabel: 'З-4',
        title: 'Один блок: catch (DivideByZeroException)',
        shortDesc: 'Обработчик ошибок целочисленного деления на ноль',
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
    ],
    rouletteQuestion: {
      prompt:
        'Если передать countText = "" и groupSize = 0 (обе ошибки сразу!), какое исключение возникнет при выполнении метода?',
      options: [
        {
          id: 'R1_1',
          text: 'DivideByZeroException, потому что деление на ноль критичнее ошибки текста',
          isCorrect: false,
          explanation:
            'Программа выполняет строки строго сверху вниз: до строки деления на ноль выполнение вообще не дойдёт.',
        },
        {
          id: 'R1_2',
          text: 'Только FormatException на строке 4 — а строка 5 с делением на ноль будет полностью пропущена',
          isCorrect: true,
          explanation:
            'Верно! При выбросе FormatException в int.Parse("") управление мгновенно прыгает в catch, перепрыгивая строку с делением.',
        },
        {
          id: 'R1_3',
          text: 'Вылетят сразу оба исключения одновременно',
          isCorrect: false,
          explanation:
            'В одном потоке в конкретный момент времени выбрасывается только одно исключение — на первой упавшей инструкции.',
        },
      ],
    },
  },

  // ==========================================================================
  // РАУНД 2: ПОРЯДОК БЛОКОВ CATCH (150 ОЧКОВ) — Лучшая защита: D2 (З-2), Блиц: R2_3
  // ==========================================================================
  {
    number: 2,
    title: 'Порядок блоков catch',
    subtitle: 'Как иерархия наследования классов исключений влияет на компиляцию',
    maxPoints: 150,
    ruleTitle: 'Правило №2: От частного к общему (без ошибки CS0160)',
    ruleSummary:
      'В C# блоки catch проверяются сверху вниз. Специализированные типы должны стоять выше базового класса Exception, иначе компилятор заблокирует сборку ошибкой CS0160.',
    engineeringNote:
      'Все прикладные исключения в .NET наследуются от System.Exception, поэтому catch (Exception) перехватывает любой тип сбоя.',
    methodSignature: 'int GetPromoDiscount(string? promo, int idx)',
    baseLines: [
      { lineNumber: 1, indent: 0, code: 'int GetPromoDiscount(string? promo, int idx)' },
      { lineNumber: 2, indent: 0, code: '{' },
      { lineNumber: 3, indent: 1, code: 'int[] table = { 5, 10, 25 };' },
      {
        lineNumber: 4,
        indent: 1,
        code: 'string code = promo.Trim();',
        isClickableTarget: true,
      },
      {
        lineNumber: 5,
        indent: 1,
        code: 'if (code.Length == 0) throw new ArgumentException();',
        isClickableTarget: true,
      },
      {
        lineNumber: 6,
        indent: 1,
        code: 'return table[idx];',
        isClickableTarget: true,
      },
      { lineNumber: 7, indent: 0, code: '}' },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 5,
        payloadCode: 'promo = null, idx = 1',
        expectedException: 'NullReferenceException',
        shortDesc: 'Передать пустую ссылку null в параметр promo',
        throwsException: 'NullReferenceException',
        explosionLine: 4,
        inlineValueHint: 'promo == null -> throw NullReferenceException',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 7,
        payloadCode: 'promo = "SALE", idx = 99',
        expectedException: 'IndexOutOfRangeException',
        shortDesc: 'Передать индекс 99 при массиве из 3 элементов',
        throwsException: 'IndexOutOfRangeException',
        explosionLine: 6,
        inlineValueHint: 'table[99] -> throw IndexOutOfRangeException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 6,
        payloadCode: 'promo = "   ", idx = 1',
        expectedException: 'ArgumentException',
        shortDesc: 'Передать строку из одних пробелов (после Trim длина станет 0)',
        throwsException: 'ArgumentException',
        explosionLine: 5,
        inlineValueHint: 'code.Length == 0 -> throw ArgumentException',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Exception -> NullReferenceException -> IndexOutOfRangeException',
        shortDesc: 'Базовый блок catch (Exception) первым, узкие типы под ним',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'int GetPromoDiscount(string? promo, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  int[] table = { 5, 10, 25 };', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    string code = promo.Trim();', roleTag: 'body' },
          { lineNumber: 6, code: '    if (code.Length == 0) throw new ArgumentException();', roleTag: 'body' },
          { lineNumber: 7, code: '    return table[idx];', roleTag: 'body' },
          { lineNumber: 8, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 9,
            code: '  catch (Exception ex) { return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_general',
            catchesTypes: ['Exception'],
          },
          {
            lineNumber: 10,
            code: '  catch (NullReferenceException ex) { return -1; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          {
            lineNumber: 11,
            code: '  catch (IndexOutOfRangeException ex) { return -2; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['IndexOutOfRangeException'],
          },
          { lineNumber: 12, code: '}', roleTag: 'body' },
        ],
        compileError: {
          code: 'CS0160',
          message:
            'Ошибка компиляции CS0160 (строка 10): предыдущий блок catch (Exception) уже перехватывает все исключения этого или производного типа!',
          errorLine: 10,
        },
        catchesExceptions: [],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: false,
      },
      {
        id: 'D2',
        codeLabel: 'З-2',
        title: 'NullReferenceException -> IndexOutOfRangeException -> Exception',
        shortDesc: 'Специализированные типы сверху, базовый Exception замыкает цепочку',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'int GetPromoDiscount(string? promo, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  int[] table = { 5, 10, 25 };', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    string code = promo.Trim();', roleTag: 'body' },
          { lineNumber: 6, code: '    if (code.Length == 0) throw new ArgumentException();', roleTag: 'body' },
          { lineNumber: 7, code: '    return table[idx];', roleTag: 'body' },
          { lineNumber: 8, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 9,
            code: '  catch (NullReferenceException ex) { Log(ex.Message); return -1; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          {
            lineNumber: 10,
            code: '  catch (IndexOutOfRangeException ex) { Log(ex.Message); return -2; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['IndexOutOfRangeException'],
          },
          {
            lineNumber: 11,
            code: '  catch (Exception ex) { Log(ex.Message); return 0; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['ArgumentException', 'Exception'],
          },
          { lineNumber: 12, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: [
          'NullReferenceException',
          'IndexOutOfRangeException',
          'ArgumentException',
          'Exception',
        ],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Два блока: NullReferenceException и IndexOutOfRangeException',
        shortDesc: 'Перехват только двух частных типов без замыкающего блока Exception',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'int GetPromoDiscount(string? promo, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  int[] table = { 5, 10, 25 };', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    string code = promo.Trim();', roleTag: 'body' },
          { lineNumber: 6, code: '    if (code.Length == 0) throw new ArgumentException();', roleTag: 'body' },
          { lineNumber: 7, code: '    return table[idx];', roleTag: 'body' },
          { lineNumber: 8, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 9,
            code: '  catch (NullReferenceException ex) { Log(ex.Message); return -1; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          {
            lineNumber: 10,
            code: '  catch (IndexOutOfRangeException ex) { Log(ex.Message); return -2; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['IndexOutOfRangeException'],
          },
          { lineNumber: 11, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['NullReferenceException', 'IndexOutOfRangeException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
      {
        id: 'D4',
        codeLabel: 'З-4',
        title: 'Только catch (NullReferenceException)',
        shortDesc: 'Одиночный обработчик пустой ссылки на объект',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'int GetPromoDiscount(string? promo, int idx)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  int[] table = { 5, 10, 25 };', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    string code = promo.Trim();', roleTag: 'body' },
          { lineNumber: 6, code: '    if (code.Length == 0) throw new ArgumentException();', roleTag: 'body' },
          { lineNumber: 7, code: '    return table[idx];', roleTag: 'body' },
          { lineNumber: 8, code: '  }', isAddedPatch: true, roleTag: 'try' },
          {
            lineNumber: 9,
            code: '  catch (NullReferenceException ex) { Log(ex.Message); return -1; }',
            isAddedPatch: true,
            roleTag: 'catch_specific',
            catchesTypes: ['NullReferenceException'],
          },
          { lineNumber: 10, code: '}', roleTag: 'body' },
        ],
        catchesExceptions: ['NullReferenceException'],
        closesDbOnNormal: true,
        closesDbOnReturn: true,
        closesDbOnException: true,
        logsErrorWithDetails: true,
      },
    ],
    rouletteQuestion: {
      prompt:
        'На каком этапе обнаруживается ошибка CS0160, когда catch (Exception) написан выше catch (NullReferenceException)?',
      options: [
        {
          id: 'R2_1',
          text: 'Только во время работы программы, когда в метод реально передадут null',
          isCorrect: false,
          explanation:
            'Нет! Программа с ошибкой CS0160 вообще не скомпилируется и даже не запустится.',
        },
        {
          id: 'R2_2',
          text: 'Ошибки не будет — просто сработают оба блока catch по очереди',
          isCorrect: false,
          explanation:
            'Для одного исключения на одном уровне try может выполниться только один блок catch.',
        },
        {
          id: 'R2_3',
          text: 'Ещё до запуска программы — компилятор C# запретит сборку из-за недостижимой ветки кода',
          isCorrect: true,
          explanation:
            'Верно! Это ошибка времени компиляции (Compile-Time Error CS0160): нижний блок никогда не сможет выполниться.',
        },
      ],
    },
  },

  // ==========================================================================
  // РАУНД 3: ОСВОБОЖДЕНИЕ РЕСУРСОВ (200 ОЧКОВ) — Лучшая защита: D4 (З-4), Блиц: R3_2
  // 3 атаки проверяют 3 разных пути выхода: ранний return, исключение, штатный return!
  // ==========================================================================
  {
    number: 3,
    title: 'Освобождение ресурсов',
    subtitle: 'Как гарантировать закрытие соединения с БД при любом сценарии выхода из метода',
    maxPoints: 200,
    ruleTitle: 'Правило №3: Гарантия блока finally',
    ruleSummary:
      'Код внутри секции finally выполняется всегда: при нормальном завершении try, при раннем выходе через return и при выбросе любого исключения.',
    engineeringNote:
      'В C# для объектов IDisposable также используется конструкция using (var db = ...), которая при компиляции разворачивается в try / finally { db.Dispose(); }.',
    methodSignature: 'bool TransferCoins(Database db, int amount, int split)',
    baseLines: [
      { lineNumber: 1, indent: 0, code: 'bool TransferCoins(Database db, int amount, int split)' },
      { lineNumber: 2, indent: 0, code: '{' },
      { lineNumber: 3, indent: 1, code: 'db.Open();' },
      {
        lineNumber: 4,
        indent: 1,
        code: 'if (amount <= 0) return false;',
        isClickableTarget: true,
      },
      {
        lineNumber: 5,
        indent: 1,
        code: 'int part = amount / split;',
        isClickableTarget: true,
      },
      { lineNumber: 6, indent: 1, code: 'db.Close();' },
      {
        lineNumber: 7,
        indent: 1,
        code: 'return true;',
        isClickableTarget: true,
      },
      { lineNumber: 8, indent: 0, code: '}' },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 5,
        payloadCode: 'amount = -50, split = 2',
        expectedException: 'Ранний выход return false',
        shortDesc: 'Отрицательная сумма вызывает срабатывание условия if (amount <= 0) return false',
        throwsException: null,
        explosionLine: null,
        earlyReturnLine: 5,
        inlineValueHint: 'amount <= 0 -> ранний return false',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 6,
        payloadCode: 'amount = 100, split = 0',
        expectedException: 'DivideByZeroException',
        shortDesc: 'Положительная сумма, но делитель split = 0 на строке деления',
        throwsException: 'DivideByZeroException',
        explosionLine: 5,
        inlineValueHint: '100 / 0 -> throw DivideByZeroException',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 7,
        payloadCode: 'amount = 100, split = 2',
        expectedException: 'Штатный выход return true',
        shortDesc: 'Корректные числа: метод проходит без ошибок до return true',
        throwsException: null,
        explosionLine: null,
        normalReturnLine: 7,
        inlineValueHint: '100 / 2 = 50 -> штатный return true',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'Вызов db.Close() внутри блока try (перед return true)',
        shortDesc: 'Закрытие соединения в последней строке блока try',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open();', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    if (amount <= 0) return false;', roleTag: 'body' },
          { lineNumber: 6, code: '    int part = amount / split;', roleTag: 'body' },
          { lineNumber: 7, code: '    db.Close();', roleTag: 'body' },
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
        id: 'D2',
        codeLabel: 'З-2',
        title: 'Вызов db.Close() внутри блока catch',
        shortDesc: 'Закрытие соединения при входе в блок обработки исключения',
        targetLine: 5,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open();', roleTag: 'body' },
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
      {
        id: 'D3',
        codeLabel: 'З-3',
        title: 'Вызов db.Close() после блока try-catch (в конце метода)',
        shortDesc: 'Закрытие соединения обычной строкой после конструкции try-catch',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open();', roleTag: 'body' },
          { lineNumber: 4, code: '  try {', isAddedPatch: true, roleTag: 'try' },
          { lineNumber: 5, code: '    if (amount <= 0) return false;', roleTag: 'body' },
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
            code: '  db.Close();',
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
        title: 'Блок try-catch + секция finally { db.Close(); }',
        shortDesc: 'Вызов db.Close() вынесен в отдельный блок finally',
        targetLine: 4,
        patchedLines: [
          { lineNumber: 1, code: 'bool TransferCoins(Database db, int amount, int split)', roleTag: 'body' },
          { lineNumber: 2, code: '{', roleTag: 'body' },
          { lineNumber: 3, code: '  db.Open();', roleTag: 'body' },
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
            code: '  finally { db.Close(); }',
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
    ],
    rouletteQuestion: {
      prompt:
        'Чем код внутри блока finally { db.Close(); } отличается от обычной строчки db.Close(), написанной сразу после блока try-catch?',
      options: [
        {
          id: 'R3_1',
          text: 'Блок finally работает только при возникновении ошибки, а при обычной работе пропускается',
          isCorrect: false,
          explanation:
            'Наоборот: finally выполняется абсолютно всегда — и при ошибках, и при штатной работе.',
        },
        {
          id: 'R3_2',
          text: 'Если внутри try сработает ранний return, строчка после try-catch будет пропущена, а блок finally всё равно выполнится перед выходом',
          isCorrect: true,
          explanation:
            'Верно! CLR гарантирует заход в блок finally даже тогда, когда внутри try или catch вызван return.',
        },
        {
          id: 'R3_3',
          text: 'Ничем не отличается — это просто более красивая запись для читаемости',
          isCorrect: false,
          explanation:
            'Обычная строка после try-catch не выполнится при любом return внутри try или при необработанном исключении.',
        },
      ],
    },
  },

  // ==========================================================================
  // РАУНД 4: ЖУРНАЛ ОШИБОК И THROW; VS THROW EX; (300 ОЧКОВ) — Лучшая защита: D2 (З-2), Блиц: R4_3
  // ==========================================================================
  {
    number: 4,
    title: 'Журнал ошибок и проброс throw',
    subtitle: 'Как залогировать сбой в внутреннем методе и передать его выше, не потеряв строку ошибки',
    maxPoints: 300,
    ruleTitle: 'Правило №4: Запрет пустого catch и сохранение стека через throw;',
    ruleSummary:
      'Никогда не оставляйте catch пустым. Фиксируйте ex.Message в логе, а для проброса исключения выше используйте только чистый throw; (инструкция throw ex; затирает номер исходной строки в StackTrace).',
    engineeringNote:
      'Анализатор кода Roslyn помечает конструкцию throw ex; предупреждением CA2200 (Rethrow to preserve stack details).',
    methodSignature: 'int AuthorizeCard(string pinInput, AuditLog log)',
    baseLines: [
      { lineNumber: 1, indent: 0, code: 'int AuthorizeCard(string pinInput, AuditLog log)' },
      { lineNumber: 2, indent: 0, code: '{' },
      {
        lineNumber: 3,
        indent: 1,
        code: 'int pin = int.Parse(pinInput);',
        isClickableTarget: true,
      },
      { lineNumber: 4, indent: 1, code: 'return VerifyPinHash(pin);' },
      { lineNumber: 5, indent: 0, code: '}' },
    ],
    attackOptions: [
      {
        id: 'A1',
        codeLabel: 'А-1',
        targetLine: 4,
        payloadCode: 'pinInput = "HACK_77"',
        expectedException: 'FormatException',
        shortDesc: 'Буквы вместо цифр в ПИН-коде',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'int.Parse("HACK_77") -> throw FormatException (строка 4)',
      },
      {
        id: 'A2',
        codeLabel: 'А-2',
        targetLine: 4,
        payloadCode: 'pinInput = ""',
        expectedException: 'FormatException',
        shortDesc: 'Пустая строка вместо ПИН-кода',
        throwsException: 'FormatException',
        explosionLine: 3,
        inlineValueHint: 'int.Parse("") -> throw FormatException (строка 4)',
      },
      {
        id: 'A3',
        codeLabel: 'А-3',
        targetLine: 4,
        payloadCode: 'pinInput = "999999999999999"',
        expectedException: 'OverflowException',
        shortDesc: 'Число из 15 девяток, превышающее размер типа int',
        throwsException: 'OverflowException',
        explosionLine: 3,
        inlineValueHint: 'int.Parse("999999999999999") -> throw OverflowException (строка 4)',
      },
    ],
    defenseOptions: [
      {
        id: 'D1',
        codeLabel: 'З-1',
        title: 'catch (Exception ex) { log.Write(ex.Message); throw ex; }',
        shortDesc: 'Запись сообщения в лог и повторный выброс переменной throw ex;',
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
            code: '  catch (Exception ex) { log.Write(ex.Message); throw ex; }',
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
        id: 'D2',
        codeLabel: 'З-2',
        title: 'catch (Exception ex) { log.Write(ex.Message); throw; }',
        shortDesc: 'Запись сообщения в лог и проброс инструкцией throw;',
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
            code: '  catch (Exception ex) { log.Write(ex.Message); throw; }',
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
        id: 'D3',
        codeLabel: 'З-3',
        title: 'catch { return 0; }',
        shortDesc: 'Перехват без параметров и возврат значения 0',
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
            code: '  catch { return 0; }',
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
        title: 'catch (FormatException ex) { log.Write(ex.Message); throw; }',
        shortDesc: 'Перехват только типа FormatException с записью в лог',
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
          text: 'throw ex; работает быстрее, а пустой throw; просто игнорирует ошибку',
          isCorrect: false,
          explanation:
            'Наоборот: оба пробрасывают исключение дальше, но throw ex; уничтожает историю вызовов (StackTrace).',
        },
        {
          id: 'R4_2',
          text: 'Между ними нет никакой разницы в компиляторе C#',
          isCorrect: false,
          explanation:
            'В IL-коде это две разные инструкции: rethrow (сохраняет стек) и throw (создаёт новую точку отсчёта стека со строки catch).',
        },
        {
          id: 'R4_3',
          text: 'throw; сохраняет исходный номер строки (line 4), где родилась ошибка, а throw ex; затирает его строкой самого блока catch (line 7)',
          isCorrect: true,
          explanation:
            'Верно! При throw ex; внешний обработчик увидит в StackTrace только строку 7 (блок catch), а настоящая точка сбоя на строке 4 пропадёт.',
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

  // 1. Проверка ошибки компиляции (CS0160 в Раунде 2)
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

  const initialDb: 'CLOSED' | 'OPEN' = round.number === 3 ? 'OPEN' : 'CLOSED';

  // Шаг 1: Вход в блок try
  const tryLine =
    defense.patchedLines.find((l) => l.roleTag === 'try')?.lineNumber || 3;
  steps.push({
    stepIndex: 1,
    activeLineNumber: tryLine,
    skippedLineNumbers: [],
    inlineBadge: `Вход в try (${attack.payloadCode})`,
    statusBanner: `Шаг 1: Выполнение входит в блок try с аргументами (${attack.payloadCode}).`,
    stepKind: 'normal',
    dbState: initialDb,
    logState: 'EMPTY',
    stackState: 'INTACT',
  });

  // Сценарий А: Ранний выход return (Раунд 3, А-1: amount = -50)
  if (attack.earlyReturnLine) {
    const returnPatchedLine = 5;
    const skippedInTry = defense.patchedLines
      .filter((l) => l.roleTag === 'body' && l.lineNumber > 5 && l.lineNumber <= 8)
      .map((l) => l.lineNumber);

    steps.push({
      stepIndex: 2,
      activeLineNumber: returnPatchedLine,
      skippedLineNumbers: skippedInTry,
      inlineBadge: attack.inlineValueHint,
      statusBanner:
        'Шаг 2: Условие amount <= 0 истинно — срабатывает ранний выход return false! Строки ниже внутри try пропускаются.',
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
          'Шаг 3: Перед выходом из метода по return гарантированно выполняется блок finally и закрывает соединение с БД.',
        stepKind: 'finally',
        dbState: 'CLOSED',
        logState: 'EMPTY',
        stackState: 'INTACT',
      });

      return {
        outcome: 'REPELLED',
        headline: 'ЗАЩИТА УСТОЯЛА: блок finally закрыл БД при раннем return',
        reasonDetailed:
          'Ранний return перепрыгнул конец блока try, но секция finally отработала перед выходом из метода и закрыла соединение.',
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
        skippedLineNumbers: [...skippedInTry, leakLine],
        inlineBadge: '[LEAK] Вызов db.Close() не выполнен',
        statusBanner:
          'Шаг 3: Метод завершился по return false в обход строки db.Close()! Соединение с базой данных осталось открытым.',
        stepKind: 'leak',
        dbState: 'LEAK',
        logState: 'EMPTY',
        stackState: 'INTACT',
      });

      return {
        outcome: 'BREACHED',
        headline: 'ПРОБИТИЕ ЗАЩИТЫ: утечка открытого соединения с БД при раннем return',
        reasonDetailed:
          'Без блока finally ранний выход return false покинул метод, так и не вызвав db.Close(). Соединение с БД зависло в памяти!',
        attackPointsEarned: halfPool,
        defensePointsEarned: 0,
        steps,
        finalDbState: 'LEAK',
        finalLogState: 'EMPTY',
        finalStackState: 'INTACT',
      };
    }
  }

  // Сценарий Б: Штатное прохождение без исключений (Раунд 3, А-3: amount = 100, split = 2)
  if (!attack.throwsException) {
    steps.push({
      stepIndex: 2,
      activeLineNumber: 6,
      skippedLineNumbers: [],
      inlineBadge: attack.inlineValueHint,
      statusBanner:
        'Шаг 2: Деление 100 / 2 = 50 прошло без ошибок, исключений не возникло.',
      stepKind: 'normal',
      dbState: initialDb,
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    if (round.number === 3 && !defense.closesDbOnNormal) {
      // Ловит ошибку З-2, где db.Close() написали ТОЛЬКО внутри catch!
      const catchLine =
        defense.patchedLines.find((l) => l.roleTag === 'catch_specific')
          ?.lineNumber || 9;
      steps.push({
        stepIndex: 3,
        activeLineNumber: catchLine,
        skippedLineNumbers: [catchLine],
        inlineBadge: '[LEAK] Блок catch пропущен -> БД не закрыта!',
        statusBanner:
          'Шаг 3: Ошибки не было, поэтому программа НЕ зашла в catch, где лежал единственный вызов db.Close()! Соединение утекло.',
        stepKind: 'leak',
        dbState: 'LEAK',
        logState: 'EMPTY',
        stackState: 'INTACT',
      });

      return {
        outcome: 'BREACHED',
        headline: 'ПРОБИТИЕ ЗАЩИТЫ: db.Close() спрятан в catch и не сработал без ошибки!',
        reasonDetailed:
          'Поскольку вызов db.Close() поместили только внутрь catch, при обычной работе без ошибок он вообще не вызывается, и база данных остаётся открытой!',
        attackPointsEarned: halfPool,
        defensePointsEarned: 0,
        steps,
        finalDbState: 'LEAK',
        finalLogState: 'EMPTY',
        finalStackState: 'INTACT',
      };
    }

    const closeLine =
      defense.patchedLines.find((l) => l.code.includes('db.Close'))
        ?.lineNumber || 7;
    steps.push({
      stepIndex: 3,
      activeLineNumber: closeLine,
      skippedLineNumbers: [],
      inlineBadge: 'db.Close() выполнен -> return true',
      statusBanner:
        'Шаг 3: Соединение с базой данных успешно закрыто перед завершением метода.',
      stepKind: 'finally',
      dbState: 'CLOSED',
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    return {
      outcome: 'REPELLED',
      headline: 'ЗАЩИТА УСТОЯЛА: метод завершился штатно, соединение закрыто',
      reasonDetailed:
        'При штатном прохождении без ошибок вызов db.Close() отработал корректно.',
      attackPointsEarned: 0,
      defensePointsEarned: halfPool,
      steps,
      finalDbState: 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  // Сценарий В: Выброс исключения
  const patchedExplosionLine = (attack.explosionLine || 3) + 1;
  const tryEndLine =
    defense.patchedLines
      .filter((l) => l.roleTag === 'try')
      .map((l) => l.lineNumber)
      .pop() || 7;

  const skippedLinesInTry: number[] = [];
  defense.patchedLines.forEach((l) => {
    if (
      l.roleTag === 'body' &&
      l.lineNumber > patchedExplosionLine &&
      l.lineNumber < tryEndLine
    ) {
      skippedLinesInTry.push(l.lineNumber);
    }
  });

  steps.push({
    stepIndex: 2,
    activeLineNumber: patchedExplosionLine,
    skippedLineNumbers: skippedLinesInTry,
    inlineBadge: attack.inlineValueHint,
    statusBanner: `Шаг 2: На строке ${patchedExplosionLine} выброшено исключение ${attack.throwsException}! Остаток блока try пропускается.`,
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
      inlineBadge: `[UNHANDLED] ${attack.throwsException}`,
      statusBanner: `Шаг 3: В методе нет обработчика catch для типа ${attack.throwsException} — выполнение аварийно прервано!`,
      stepKind: 'explode',
      dbState:
        round.number === 3 && !defense.closesDbOnException ? 'LEAK' : 'CLOSED',
      logState: 'EMPTY',
      stackState: 'INTACT',
    });

    return {
      outcome: 'BREACHED',
      headline: `ПРОБИТИЕ ЗАЩИТЫ: необработанное исключение ${attack.throwsException}`,
      reasonDetailed: `Атака вызвала ${attack.throwsException}, для которого в коде Защиты не нашлось подходящего блока catch.`,
      attackPointsEarned: halfPool,
      defensePointsEarned: 0,
      steps,
      finalDbState:
        round.number === 3 && !defense.closesDbOnException ? 'LEAK' : 'CLOSED',
      finalLogState: 'EMPTY',
      finalStackState: 'INTACT',
    };
  }

  // Исключение перехвачено блоком catch
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
      ? '[CA2200] throw ex затёр строку #4 на строку #7'
      : round.number === 4
      ? `[CATCH + THROW;] Лог записан, строка #4 сохранена в StackTrace`
      : `[CATCH] Перехвачено исключение ${attack.throwsException}`,
    statusBanner:
      round.number === 4 && !defense.swallowsErrorSilently
        ? defense.resetsStackTrace
          ? `Шаг 3: Блок catch на строке ${matchingCatchLine} записал лог, но инструкция throw ex; перезаписала StackTrace строкой #${matchingCatchLine} вместо исходной строки #4!`
          : `Шаг 3: Блок catch на строке ${matchingCatchLine} записал ex.Message в лог и через чистый throw; передал исключение выше с сохранённой строкой #4 в StackTrace.`
        : `Шаг 3: Управление перешло в блок catch на строке ${matchingCatchLine}.`,
    stepKind: 'catch',
    dbState: initialDb,
    logState: logStateAfterCatch,
    stackState: stackStateAfterCatch,
  });

  // Если это Раунд 3 — проверяем закрытие БД
  if (round.number === 3) {
    const finallyLineObj = defense.patchedLines.find(
      (l) => l.roleTag === 'finally'
    );
    const afterCloseLineObj = defense.patchedLines.find(
      (l) => l.roleTag === 'after'
    );

    if (finallyLineObj && defense.closesDbOnException) {
      steps.push({
        stepIndex: 4,
        activeLineNumber: finallyLineObj.lineNumber,
        skippedLineNumbers: skippedLinesInTry,
        inlineBadge: '[FINALLY] db.Close() закрыл соединение',
        statusBanner:
          'Шаг 4: После блока catch гарантированно выполнился блок finally и закрыл соединение с БД.',
        stepKind: 'finally',
        dbState: 'CLOSED',
        logState: logStateAfterCatch,
        stackState: stackStateAfterCatch,
      });
    } else if (afterCloseLineObj && defense.closesDbOnException) {
      steps.push({
        stepIndex: 4,
        activeLineNumber: afterCloseLineObj.lineNumber,
        skippedLineNumbers: skippedLinesInTry,
        inlineBadge: 'db.Close() после catch (но уязвим к раннему return!)',
        statusBanner:
          'Шаг 4: Так как внутри catch не было return, выполнение дошло до db.Close() на строке 9. Но при раннем return (А-1) эта защита дала бы утечку!',
        stepKind: 'finally',
        dbState: 'CLOSED',
        logState: logStateAfterCatch,
        stackState: stackStateAfterCatch,
      });

      const partialPts = Math.round(halfPool / 2);
      return {
        outcome: 'PARTIAL',
        headline:
          'ЧАСТИЧНАЯ ЗАЩИТА: db.Close() после try-catch сработал, но не защищён от раннего return',
        reasonDetailed:
          'При делении на ноль код дошёл до строки db.Close() после catch, однако без секции finally любой ранний return внутри try оставит базу данных открытой.',
        attackPointsEarned: halfPool - partialPts,
        defensePointsEarned: partialPts,
        steps,
        finalDbState: 'CLOSED',
        finalLogState: logStateAfterCatch,
        finalStackState: stackStateAfterCatch,
      };
    } else if (!finallyLineObj && defense.closesDbOnException) {
      // Это вариант D2 (db.Close внутри самого catch)
      const partialPts = Math.round(halfPool / 2);
      return {
        outcome: 'PARTIAL',
        headline:
          'ЧАСТИЧНАЯ ЗАЩИТА: db.Close() внутри catch закрыл БД только потому, что произошла ошибка',
        reasonDetailed:
          'Вызов db.Close() внутри catch сработал при делении на ноль, но при обычной работе без ошибок (А-3) или раннем return (А-1) база данных останется открытой!',
        attackPointsEarned: halfPool - partialPts,
        defensePointsEarned: partialPts,
        steps,
        finalDbState: 'CLOSED',
        finalLogState: logStateAfterCatch,
        finalStackState: stackStateAfterCatch,
      };
    } else {
      steps.push({
        stepIndex: 4,
        activeLineNumber: 7,
        skippedLineNumbers: skippedLinesInTry,
        inlineBadge: '[LEAK] Строка db.Close() в try была пропущена!',
        statusBanner:
          'Шаг 4: Исключение поймали, но вызов db.Close() остался на пропущенной строке 7 внутри try! Соединение утекло.',
        stepKind: 'leak',
        dbState: 'LEAK',
        logState: logStateAfterCatch,
        stackState: stackStateAfterCatch,
      });

      return {
        outcome: 'BREACHED',
        headline: 'ПРОБИТИЕ ЗАЩИТЫ: исключение перехвачено, но соединение с БД утекло',
        reasonDetailed:
          'Вызов db.Close() находился внутри блока try после строки деления и был пропущен при переходе в catch. Без finally соединение осталось открытым!',
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
        'Защита поставила пустой блок catch: программа вернула 0, но в журнал безопасности AuditLog не попало ни одной записи о попытке взлома!',
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
        'Защита написала throw ex; вместо чистого throw;. Из-за этого исходный номер строки сбоя (строка 4) в StackTrace был перезаписан строкой блока catch (строка 7)!',
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
        'Падение остановлено, но общий catch (Exception) скрыл конкретный тип сбоя и не записал детали. Защита получает только половину очков за ход.',
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
    reasonDetailed: `Конструкция Защиты корректно перехватила ${attack.throwsException}, зафиксировала детали в журнале и сохранила целостность ресурсов.`,
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
