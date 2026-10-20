// ============================================================================
// АПТАЙМ · НОЧНАЯ СМЕНА — ИНТЕРАКТИВНЫЙ C#-ТРЕНАЖЁР И СТАТИЧЕСКИЙ ВЕРИФИКАТОР
// Документ 07 (п. 2, 4, 5) и Документ 09 (08:05 Практика и 09:15 ДЗ 3 уровней)
// ============================================================================

export type PolygonSlotId = 1 | 2 | 3 | 4;

export interface CompilerDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  message: string;
}

export interface PolygonTestCaseResult {
  id: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface PolygonVerificationResult {
  slot: PolygonSlotId;
  passed: boolean;
  compilerDiagnostics: CompilerDiagnostic[];
  testCases: PolygonTestCaseResult[];
  summary: string;
}

export interface PolygonTaskSpec {
  slot: PolygonSlotId;
  file: string;
  line: number;
  title: string;
  ruleName: string;
  problemStatement: string;
  hint: string;
  brokenCode: string;
  solutionCode: string;
}

export const POLYGON_TASKS: PolygonTaskSpec[] = [
  {
    slot: 1,
    file: 'Booking.cs',
    line: 12,
    title: 'Рубеж #1 · Перехват (Прицел)',
    ruleName: 'ПЕРЕХВАТ (Правило Щита №3)',
    problemStatement:
      'Строка 12 разбирает номер места через голый int.Parse(request.Place). На битом вводе ("12а" или "") весь конвейер падает с FormatException.',
    hint: 'Оберните опасный участок в try { ... } и перехватите прицельно catch (FormatException ex) с возвратом безопасного результата BookingResult.Rejected(...).',
    brokenCode: `public BookingResult ParseSeat(BookingRequest request)
{
    // [УЯЗВИМОСТЬ Booking.cs:12] Внешний ввод без прицельного перехвата
    int place = int.Parse(request.Place);
    return BookingResult.Success(place);
}`,
    solutionCode: `public BookingResult ParseSeat(BookingRequest request)
{
    try
    {
        int place = int.Parse(request.Place);
        return BookingResult.Success(place);
    }
    catch (FormatException ex)
    {
        Logger.Warn($"Битый формат места '{request.Place}': {ex.Message}");
        return BookingResult.Rejected("FORMAT_ERROR");
    }
}`,
  },
  {
    slot: 2,
    file: 'Pricing.cs',
    line: 23,
    title: 'Рубеж #2 · Порядок обработчиков (CS0160)',
    ruleName: 'ПОРЯДОК (Правило Щита №4)',
    problemStatement:
      'В Pricing.cs:23 общий перехватчик catch (Exception ex) поставлен ПЕРВЫМ и перекрывает специфичные ветки DivideByZeroException и FormatException — компилятор выдаёт ошибку CS0160.',
    hint: 'Выстройте цепочку catch строго от частного к общему: сначала DivideByZeroException и FormatException, а общий catch (Exception ex) — самым последним.',
    brokenCode: `public decimal CalculateUnitPrice(string rawTotal, int count)
{
    try
    {
        int total = int.Parse(rawTotal);
        return total / count;
    }
    catch (Exception ex)
    {
        // [ОШИБКА CS0160] Общий базовый тип стоит первым!
        return -1m;
    }
    catch (DivideByZeroException ex)
    {
        Logger.Warn("Деление на ноль при расчёте тарифа", ex);
        return 0m;
    }
    catch (FormatException ex)
    {
        Logger.Warn("Некорректная сумма тарифа", ex);
        return 0m;
    }
}`,
    solutionCode: `public decimal CalculateUnitPrice(string rawTotal, int count)
{
    try
    {
        int total = int.Parse(rawTotal);
        return total / count;
    }
    catch (DivideByZeroException ex)
    {
        Logger.Warn("Деление на ноль при расчёте тарифа", ex);
        return 0m;
    }
    catch (FormatException ex)
    {
        Logger.Warn("Некорректная сумма тарифа", ex);
        return 0m;
    }
    catch (Exception ex)
    {
        Logger.Error("Непредвиденный сбой тарификации", ex);
        throw;
    }
}`,
  },
  {
    slot: 3,
    file: 'Seats.cs',
    line: 41,
    title: 'Рубеж #3 · Гарантия освобождения ресурса (finally)',
    ruleName: 'ГАРАНТИЯ (Правило Щита №5)',
    problemStatement:
      'В Seats.cs:41 блокировка сектора (conn.Open / seatLock = true) снимается в конце try. При раннем return или выбросе исключения соединение остаётся висеть открытым.',
    hint: 'Перенесите освобождение ресурса conn.Close() и seatLock = false в блок finally { ... }, который гарантированно выполняется и при return, и при падении.',
    brokenCode: `public bool ReserveSeat(DbConnection conn, int seatNumber)
{
    conn.Open();
    seatLock = true;
    try
    {
        if (seatNumber <= 0)
            return false; // [УТЕЧКА!] Ранний выход мимо conn.Close()

         PersistReservation(conn, seatNumber);
        conn.Close();
        seatLock = false;
        return true;
    }
    catch (InvalidOperationException ex)
    {
        Logger.Warn("Сбой бронирования места", ex);
        return false; // [УТЕЧКА!] Соединение осталось открытым
    }
}`,
    solutionCode: `public bool ReserveSeat(DbConnection conn, int seatNumber)
{
    conn.Open();
    seatLock = true;
    try
    {
        if (seatNumber <= 0)
            return false;

        PersistReservation(conn, seatNumber);
        return true;
    }
    catch (InvalidOperationException ex)
    {
        Logger.Warn("Сбой бронирования места", ex);
        return false;
    }
    finally
    {
        conn.Close();
        seatLock = false;
    }
}`,
  },
  {
    slot: 4,
    file: 'Promo.cs',
    line: 55,
    title: 'Рубеж #4 · Честность журнала, фильтр when и сохранение стека',
    ruleName: 'ЧЕСТНОСТЬ (Правило Щита №6)',
    problemStatement:
      'В Promo.cs:55 пустой catch { } проглатывает 26 битых записей без следа в отчёте, либо throw ex; сбрасывает исходную строку падения в стеке вызовов.',
    hint: 'Запишите каждую битую заявку в report.RecordIncident(record.Id, ex), используйте фильтр when или честный проброс throw; без потери стека.',
    brokenCode: `public void ProcessPromoBatch(PromoRecord record, IncidentReport report)
{
    try
    {
        ApplyDiscountCode(record);
    }
    catch (Exception ex)
    {
        // [УЯЗВИМОСТЬ Promo.cs:55] Пустой перехват или сброс стека через throw ex;
        throw ex;
    }
}`,
    solutionCode: `public void ProcessPromoBatch(PromoRecord record, IncidentReport report)
{
    try
    {
        ApplyDiscountCode(record);
    }
    catch (PromoException ex) when (ex.IsRecoverable)
    {
        report.RecordIncident(record.Id, ex);
    }
    catch (Exception ex)
    {
        report.RecordIncident(record.Id, ex);
        throw;
    }
}`,
  },
];

function findLineNumber(code: string, pattern: RegExp): number {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1;
    }
  }
  return 1;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

export function verifyCSharpPolygonTask(
  slot: PolygonSlotId,
  rawCode: string
): PolygonVerificationResult {
  const clean = stripComments(rawCode);
  const diagnostics: CompilerDiagnostic[] = [];

  if (slot === 1) {
    const hasTry = /\btry\s*\{/.test(clean) || /\bint\.TryParse\b/.test(clean);
    const hasSpecificCatch =
      /\bcatch\s*\(\s*(FormatException|ArgumentNullException|OverflowException)\b/.test(
        clean
      ) || /\bint\.TryParse\b/.test(clean);
    const hasOnlyGeneralCatch =
      !hasSpecificCatch && /\bcatch\s*\(\s*Exception\b/.test(clean);

    if (!hasTry) {
      diagnostics.push({
        code: 'UPTIME001',
        severity: 'error',
        line: findLineNumber(rawCode, /int\.Parse/),
        message:
          'Вызов int.Parse(request.Place) не защищён блоком try { ... } или int.TryParse.',
      });
    }
    if (hasOnlyGeneralCatch) {
      diagnostics.push({
        code: 'UPTIME002',
        severity: 'warning',
        line: findLineNumber(rawCode, /\bcatch\b/),
        message:
          'Используется слишком широкий catch (Exception) вместо прицельного catch (FormatException).',
      });
    }

    const passed = hasTry && hasSpecificCatch;
    const testCases: PolygonTestCaseResult[] = [
      {
        id: 'T1.1',
        input: 'request.Place = "14"',
        expected: 'BookingResult.Success(14)',
        actual: 'BookingResult.Success(14)',
        passed: true,
      },
      {
        id: 'T1.2',
        input: 'request.Place = "12а" (кириллица в номере)',
        expected: 'ПЕРЕХВАТ FormatException → Rejected("FORMAT_ERROR")',
        actual: passed
          ? 'ПЕРЕХВАТ FormatException → Rejected("FORMAT_ERROR")'
          : hasOnlyGeneralCatch
          ? 'Перехвачено общим Exception (нет прицела по типу)'
          : 'КРАХ ПРОЦЕССА: Unhandled System.FormatException',
        passed,
      },
      {
        id: 'T1.3',
        input: 'request.Place = "" (пустая строка)',
        expected: 'ПЕРЕХВАТ FormatException → конвейер продолжает ход',
        actual: passed
          ? 'ПЕРЕХВАТ FormatException → конвейер продолжает ход'
          : 'КРАХ ПРОЦЕССА: аварийная остановка на записи #1',
        passed,
      },
    ];

    return {
      slot,
      passed,
      compilerDiagnostics: diagnostics,
      testCases,
      summary: passed
        ? 'Рубеж #1 (Перехват) защищён: прицельный перехват FormatException установлен.'
        : 'Рубеж #1 уязвим: добавьте try и прицельный catch (FormatException ex).',
    };
  }

  if (slot === 2) {
    // Проверяем порядок блоков catch: специфичные должны идти ДО catch (Exception)
    const catchMatches = Array.from(
      clean.matchAll(/\bcatch\s*(?:\(\s*([A-Za-z0-9_]+))?/g)
    );
    const typesOrder = catchMatches.map((m) => m[1] || 'Exception');
    const generalIdx = typesOrder.findIndex((t) => t === 'Exception');
    const specificAfterGeneral =
      generalIdx !== -1 &&
      typesOrder
        .slice(generalIdx + 1)
        .some((t) =>
          [
            'FormatException',
            'DivideByZeroException',
            'OverflowException',
            'ArgumentException',
          ].includes(t)
        );

    const hasDivideByZero = typesOrder.includes('DivideByZeroException');
    const hasFormat = typesOrder.includes('FormatException');

    if (specificAfterGeneral) {
      const trappedType =
        typesOrder
          .slice(generalIdx + 1)
          .find((t) => t !== 'Exception') || 'FormatException';
      diagnostics.push({
        code: 'CS0160',
        severity: 'error',
        line: findLineNumber(rawCode, new RegExp(`catch\\s*\\(\\s*${trappedType}`)),
        message: `error CS0160: Предыдущее предложение catch уже перехватывает все исключения этого или базового типа ('Exception'). Обработчик '${trappedType}' недостижим.`,
      });
    }

    if (!hasDivideByZero || !hasFormat) {
      diagnostics.push({
        code: 'UPTIME020',
        severity: 'error',
        line: 1,
        message:
          'Для полного прикрытия узла Pricing.cs:23 нужны специализированные обработчики DivideByZeroException и FormatException.',
      });
    }

    const passed = !specificAfterGeneral && hasDivideByZero && hasFormat;

    const testCases: PolygonTestCaseResult[] = [
      {
        id: 'T2.1',
        input: 'Компиляция C# (контроль иерархии типов)',
        expected: '0 ошибок компилятора (нет CS0160)',
        actual: specificAfterGeneral
          ? 'ОШИБКА КОМПИЛЯЦИИ CS0160: недостижимый блок catch'
          : '0 ошибок компилятора (иерархия от частного к общему)',
        passed: !specificAfterGeneral,
      },
      {
        id: 'T2.2',
        input: 'rawTotal = "1500", count = 0',
        expected: 'Ветка catch (DivideByZeroException) → возврат 0m',
        actual: passed
          ? 'Ветка catch (DivideByZeroException) → возврат 0m'
          : 'Поглощено общим catch (Exception) / ошибка CS0160',
        passed,
      },
      {
        id: 'T2.3',
        input: 'rawTotal = "БЕСПЛАТНО", count = 2',
        expected: 'Ветка catch (FormatException) → возврат 0m',
        actual: passed
          ? 'Ветка catch (FormatException) → возврат 0m'
          : 'Поглощено общим catch (Exception) / ошибка CS0160',
        passed,
      },
    ];

    return {
      slot,
      passed,
      compilerDiagnostics: diagnostics,
      testCases,
      summary: passed
        ? 'Рубеж #2 (Порядок) чист: ошибка CS0160 устранена, обработчики стоят от частного к общему.'
        : 'Рубеж #2 не прошёл проверку: устраните ошибку компилятора CS0160 (поставьте частные catch перед общим Exception).',
    };
  }

  if (slot === 3) {
    const finallyMatch = clean.match(/\bfinally\s*\{([\s\S]*?)\}/);
    const hasFinally = Boolean(finallyMatch);
    const finallyBody = finallyMatch ? finallyMatch[1] : '';
    const closesInFinally =
      /\bconn\.Close\s*\(\s*\)/.test(finallyBody) ||
      /\bDispose\s*\(\s*\)/.test(finallyBody) ||
      /\bseatLock\s*=\s*false/.test(finallyBody);

    if (!hasFinally) {
      diagnostics.push({
        code: 'UPTIME031',
        severity: 'error',
        line: findLineNumber(rawCode, /conn\.Open/),
        message:
          'Отсутствует блок finally { ... }: при раннем return или исключении соединение останется открытым.',
      });
    } else if (!closesInFinally) {
      diagnostics.push({
        code: 'UPTIME032',
        severity: 'error',
        line: findLineNumber(rawCode, /\bfinally\b/),
        message:
          'Блок finally найден, но внутри него нет вызова conn.Close() и сброса seatLock = false.',
      });
    }

    const passed = hasFinally && closesInFinally;
    const testCases: PolygonTestCaseResult[] = [
      {
        id: 'T3.1',
        input: 'Штатная бронь: seatNumber = 18',
        expected: 'conn.State == Closed, seatLock == false',
        actual: 'conn.State == Closed, seatLock == false',
        passed: true,
      },
      {
        id: 'T3.2',
        input: 'Ранний выход (return false): seatNumber = -1',
        expected: 'finally сработал при return → conn.State == Closed',
        actual: passed
          ? 'finally сработал при return → conn.State == Closed'
          : 'УТЕЧКА РЕСУРСА: return обошёл закрытие, conn.State == Open!',
        passed,
      },
      {
        id: 'T3.3',
        input: 'Сбой БД внутри PersistReservation (InvalidOperationException)',
        expected: 'finally сработал при исключении → conn.State == Closed',
        actual: passed
          ? 'finally сработал при исключении → conn.State == Closed'
          : ' ЗАВИСШИЙ ЗАМОК: seatLock == true, очередь заблокирована!',
        passed,
      },
    ];

    return {
      slot,
      passed,
      compilerDiagnostics: diagnostics,
      testCases,
      summary: passed
        ? 'Рубеж #3 (Гарантия) защищён: освобождение ресурса в finally выполняется и при return, и при падении.'
        : 'Рубеж #3 уязвим: перенесите conn.Close() и seatLock = false внутрь блока finally { ... }.',
    };
  }

  // Slot 4: Честность (Promo.cs:55)
  const hasEmptyCatch = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(clean);
  const hasThrowEx = /\bthrow\s+[A-Za-z0-9_]+\s*;/.test(clean);
  const hasCleanRethrowOrWhen =
    /\bthrow\s*;/.test(clean) || /\bwhen\s*\(/.test(clean);
  const hasIncidentLog =
    /\b(RecordIncident|Log|Warn|Error|AddIncident)\s*\(/.test(clean);

  if (hasEmptyCatch) {
    diagnostics.push({
      code: 'UPTIME041',
      severity: 'error',
      line: findLineNumber(rawCode, /\bcatch\b/),
      message:
        'Обнаружен пустой блок catch { }: ошибка бесследно проглатывается, 26 битых записей исчезают из отчёта смены.',
    });
  }
  if (hasThrowEx) {
    diagnostics.push({
      code: 'CA2200',
      severity: 'error',
      line: findLineNumber(rawCode, /\bthrow\s+[A-Za-z0-9_]+\s*;/),
      message:
        "warning CA2200: Повторный выброс через 'throw ex;' затирает исходный StackTrace! Используйте 'throw;' без аргумента.",
    });
  }
  if (!hasIncidentLog) {
    diagnostics.push({
      code: 'UPTIME042',
      severity: 'error',
      line: findLineNumber(rawCode, /\bcatch\b/),
      message:
        'В блоке catch отсутствует запись инцидента в отчёт (report.RecordIncident / Logger).',
    });
  }

  const passed =
    !hasEmptyCatch && !hasThrowEx && hasIncidentLog && hasCleanRethrowOrWhen;

  const testCases: PolygonTestCaseResult[] = [
    {
      id: 'T4.1',
      input: 'Пакет из 26 битых промокодов (контроль полноты журнала)',
      expected: 'В отчёте зафиксировано 26 / 26 инцидентов',
      actual: hasIncidentLog && !hasEmptyCatch
        ? 'В отчёте зафиксировано 26 / 26 инцидентов'
        : 'ПОТЕРЯ ДАННЫХ: в отчёте 0 из 26 записей (ошибки скрыты)',
      passed: hasIncidentLog && !hasEmptyCatch,
    },
    {
      id: 'T4.2',
      input: 'Проверка сохранности стека вызовов (StackTrace)',
      expected: 'Сохранена исходная точка падения Promo.cs:line 55 (throw; / when)',
      actual: hasThrowEx
        ? 'СТЕК УНИЧТОЖЕН (CA2200): throw ex перезаписал адрес строки'
        : hasCleanRethrowOrWhen
        ? 'Сохранена исходная точка падения Promo.cs:line 55'
        : 'Нет фильтра when или честного проброса throw;',
      passed: !hasThrowEx && hasCleanRethrowOrWhen,
    },
  ];

  return {
    slot,
    passed,
    compilerDiagnostics: diagnostics,
    testCases,
    summary: passed
      ? 'Рубеж #4 (Честность) защищён: все 26 записей в журнале, стек вызовов сохранён.'
      : 'Рубеж #4 не прошёл проверку: зафиксируйте ошибку в report.RecordIncident и замените throw ex; на throw; (или используйте фильтр when).',
  };
}

// ============================================================================
// 09:15 ДОМАШНЕЕ ЗАДАНИЕ ТРЁХ УРОВНЕЙ — ПЕСОЧНИЦА И АВТОПРОВЕРКА (ДОК. 07, 09)
// ============================================================================

export type HomeworkLevelId = 'mandatory' | 'advanced' | 'engineering';

export interface HomeworkLevelSpec {
  id: HomeworkLevelId;
  levelTitle: string;
  gradeLabel: string;
  title: string;
  taskDescription: string;
  starterCode: string;
  sampleSolutionCode: string;
  criteriaLabels: string[];
}

export interface HomeworkVerificationResult {
  levelId: HomeworkLevelId;
  passed: boolean;
  checks: { label: string; passed: boolean; detail: string }[];
  certificateCode: string;
}

export const HOMEWORK_SANDBOX_TASKS: HomeworkLevelSpec[] = [
  {
    id: 'mandatory',
    levelTitle: 'УРОВЕНЬ 1 · ОБЯЗАТЕЛЬНЫЙ',
    gradeLabel: 'На оценку «4»',
    title: 'Разбор одного боя своей бригады по Протоколу смены',
    taskDescription:
      'Восстановите по журналу один бой смены: укажите в комментарии бой, строку и тип исключения, а ниже напишите рабочий фрагмент try / catch / finally, отбивающий эту атаку.',
    starterCode: `// РАЗБОР БОЯ: Бой 1 (Booking.cs, строка 12)
// ТИП ИСКЛЮЧЕНИЯ: FormatException
// ПРИЧИНА: поле Place приходит из запроса без проверки

public BookingResult HandleSeatRequest(string rawPlace)
{
    // Допишите блок try / catch (FormatException) / finally:
    int seat = int.Parse(rawPlace);
    return BookingResult.Success(seat);
}`,
    sampleSolutionCode: `// РАЗБОР БОЯ: Бой 1 (Booking.cs, строка 12)
// ТИП ИСКЛЮЧЕНИЯ: FormatException — строка "12а" не приводится к int
// ПРИЧИНА: внешний ввод передавался напрямую в int.Parse без защиты

public BookingResult HandleSeatRequest(string rawPlace)
{
    try
    {
        int seat = int.Parse(rawPlace);
        return BookingResult.Success(seat);
    }
    catch (FormatException ex)
    {
        Logger.Warn($"Отклонена некорректная заявка '{rawPlace}': {ex.Message}");
        return BookingResult.Rejected("INVALID_SEAT_FORMAT");
    }
    finally
    {
        Metrics.IncrementProcessedRequests();
    }
}`,
    criteriaLabels: [
      'Указан поясняющий инженерный комментарий разбора боя (строка, тип, причина)',
      'Присутствует защитный блок try { ... } вокруг опасной операции',
      'Указан конкретный тип исключения в catch (...) (например, FormatException / DivideByZeroException)',
      'Присутствует блок finally { ... } или фиксация в журнале',
    ],
  },
  {
    id: 'advanced',
    levelTitle: 'УРОВЕНЬ 2 · ПОВЫШЕННЫЙ',
    gradeLabel: 'На оценку «5»',
    title: 'Собственный класс исключения домена «Бронь» (TicketBookingException)',
    taskDescription:
      'Реализуйте доменный класс исключения с суффиксом *Exception, наследующий Exception, со свойством RecordId и конструктором base(message, innerException) для обёртки 26 битых записей.',
    starterCode: `using System;

// Реализуйте класс TicketBookingException : Exception
public sealed class TicketBookingException
{
    // 1. Добавьте свойство public string RecordId { get; }
    // 2. Добавьте конструктор (string recordId, string message, Exception innerException)
    //    с вызовом : base(message, innerException)
}`,
    sampleSolutionCode: `using System;

public sealed class TicketBookingException : Exception
{
    public string RecordId { get; }

    public TicketBookingException(
        string recordId,
        string message,
        Exception innerException
    ) : base(message, innerException)
    {
        RecordId = recordId;
    }
}`,
    criteriaLabels: [
      'Имя класса заканчивается каноническим суффиксом *Exception и наследует : Exception',
      'Объявлено свойство контекста заявки (public string RecordId { get; })',
      'Конструктор принимает исходную причину (Exception innerException) и передаёт её в : base(message, innerException)',
      'В теле конструктора сохраняется идентификатор проблемной записи (RecordId = recordId)',
    ],
  },
  {
    id: 'engineering',
    levelTitle: 'УРОВЕНЬ 3 · ВЫСОКИЙ (ИНЖЕНЕРНЫЙ)',
    gradeLabel: 'На оценку «5+» / с отличием',
    title: 'Инженерный аудит «До / После» по 6 правилам Щита',
    taskDescription:
      'Отрефакторите уязвимый метод из учебного проекта: устраните все 3 антипаттерна (1 — пустой catch {}, 2 — сброс стека через throw ex;, 3 — незакрытый ресурс вне finally).',
    starterCode: `public void SyncOrderBatch(DbConnection conn, string rawOrderId)
{
    conn.Open();
    try
    {
        int orderId = int.Parse(rawOrderId);
        if (orderId <= 0) return; // [Антипаттерн 1] Утечка conn при раннем return
        SaveOrder(conn, orderId);
        conn.Close();
    }
    catch (FormatException)
    {
        // [Антипаттерн 2] Пустой catch {} — сбой проглочен без записи
    }
    catch (Exception ex)
    {
        Logger.Error("Ошибка синхронизации", ex);
        throw ex; // [Антипаттерн 3] Сброс стека вызовов (CA2200)
    }
}`,
    sampleSolutionCode: `public void SyncOrderBatch(DbConnection conn, string rawOrderId)
{
    conn.Open();
    try
    {
        int orderId = int.Parse(rawOrderId);
        if (orderId <= 0) return;
        SaveOrder(conn, orderId);
    }
    catch (FormatException ex)
    {
        Logger.Warn($"Некорректный ID заказа '{rawOrderId}'", ex);
    }
    catch (Exception ex)
    {
        Logger.Error("Критическая ошибка синхронизации партии", ex);
        throw;
    }
    finally
    {
        conn.Close();
    }
}`,
    criteriaLabels: [
      'Устранён пустой перехват catch { } — добавлена честная запись в журнал (Logger)',
      'Устранён антипаттерн throw ex; — используется чистый проброс throw; с сохранением стека',
      'Освобождение ресурса conn.Close() перенесено внутрь гарантийного блока finally { ... }',
    ],
  },
];

export function verifyHomeworkSubmission(
  levelId: HomeworkLevelId,
  rawCode: string
): HomeworkVerificationResult {
  const clean = stripComments(rawCode);

  if (levelId === 'mandatory') {
    const hasComment = /\/\/.+/.test(rawCode) && rawCode.split('\n').some((l) => l.trim().startsWith('//') && l.trim().length > 10);
    const hasTry = /\btry\s*\{/.test(clean);
    const hasSpecificCatch =
      /\bcatch\s*\(\s*(FormatException|DivideByZeroException|OverflowException|InvalidOperationException|ArgumentException)\b/.test(
        clean
      );
    const hasFinallyOrLog =
      /\bfinally\s*\{/.test(clean) || /\b(Logger|report|Console)\./.test(clean);

    const checks = [
      {
        label: HOMEWORK_SANDBOX_TASKS[0].criteriaLabels[0],
        passed: hasComment,
        detail: hasComment
          ? 'Комментарий с разбором боя присутствует'
          : 'Добавьте комментарий // с указанием боя, строки и причины сбоя',
      },
      {
        label: HOMEWORK_SANDBOX_TASKS[0].criteriaLabels[1],
        passed: hasTry,
        detail: hasTry ? 'Блок try { ... } установлен' : 'Не найден блок try { ... }',
      },
      {
        label: HOMEWORK_SANDBOX_TASKS[0].criteriaLabels[2],
        passed: hasSpecificCatch,
        detail: hasSpecificCatch
          ? 'Прицельный тип исключения в catch указан верно'
          : 'Укажите конкретный тип исключения в catch (например, FormatException)',
      },
      {
        label: HOMEWORK_SANDBOX_TASKS[0].criteriaLabels[3],
        passed: hasFinallyOrLog,
        detail: hasFinallyOrLog
          ? 'Есть фиксация в журнале и/или блок finally'
          : 'Добавьте блок finally { ... } или запись в Logger',
      },
    ];

    const passed = checks.every((c) => c.passed);
    return {
      levelId,
      passed,
      checks,
      certificateCode: passed ? 'HW-L1-VERIFIED-4' : 'HW-L1-PENDING',
    };
  }

  if (levelId === 'advanced') {
    const hasClassAndBase =
      /class\s+[A-Za-z0-9_]*Exception\s*:\s*Exception\b/.test(clean);
    const hasRecordIdProp = /\bstring\s+RecordId\b/.test(clean);
    const hasInnerExBase =
      /:\s*base\s*\(\s*message\s*,\s*innerException\s*\)/.test(clean);
    const assignsRecordId = /\bRecordId\s*=\s*recordId\s*;/.test(clean);

    const checks = [
      {
        label: HOMEWORK_SANDBOX_TASKS[1].criteriaLabels[0],
        passed: hasClassAndBase,
        detail: hasClassAndBase
          ? 'Класс *Exception : Exception объявлен по стандарту .NET'
          : 'Объявите класс с суффиксом Exception, наследующий : Exception',
      },
      {
        label: HOMEWORK_SANDBOX_TASKS[1].criteriaLabels[1],
        passed: hasRecordIdProp,
        detail: hasRecordIdProp
          ? 'Свойство public string RecordId найдено'
          : 'Добавьте свойство public string RecordId { get; }',
      },
      {
        label: HOMEWORK_SANDBOX_TASKS[1].criteriaLabels[2],
        passed: hasInnerExBase,
        detail: hasInnerExBase
          ? 'Цепочка причин сохранена через : base(message, innerException)'
          : 'Передайте исходное исключение в : base(message, innerException)',
      },
      {
        label: HOMEWORK_SANDBOX_TASKS[1].criteriaLabels[3],
        passed: assignsRecordId,
        detail: assignsRecordId
          ? 'Идентификатор записи привязан (RecordId = recordId;)'
          : 'Присвойте RecordId = recordId; внутри конструктора',
      },
    ];

    const passed = checks.every((c) => c.passed);
    return {
      levelId,
      passed,
      checks,
      certificateCode: passed ? 'HW-L2-VERIFIED-5' : 'HW-L2-PENDING',
    };
  }

  // engineering
  const hasEmptyCatch = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(clean);
  const hasLoggerInCatch = /\bLogger\.(Warn|Error|Info)\s*\(/.test(clean);
  const hasThrowEx = /\bthrow\s+[A-Za-z0-9_]+\s*;/.test(clean);
  const hasCleanThrow = /\bthrow\s*;/.test(clean);
  const finallyMatch = clean.match(/\bfinally\s*\{([\s\S]*?)\}/);
  const closesInFinally = Boolean(
    finallyMatch && /\bconn\.Close\s*\(\s*\)/.test(finallyMatch[1])
  );

  const checks = [
    {
      label: HOMEWORK_SANDBOX_TASKS[2].criteriaLabels[0],
      passed: !hasEmptyCatch && hasLoggerInCatch,
      detail:
        !hasEmptyCatch && hasLoggerInCatch
          ? 'Пустой catch устранён, сбой фиксируется в Logger'
          : 'Внутри catch (FormatException) добавьте вызов Logger.Warn(...)',
    },
    {
      label: HOMEWORK_SANDBOX_TASKS[2].criteriaLabels[1],
      passed: !hasThrowEx && hasCleanThrow,
      detail:
        !hasThrowEx && hasCleanThrow
          ? 'Стек вызовов сохранён (используется чистый throw;)'
          : "Замените 'throw ex;' на 'throw;' для сохранения StackTrace",
    },
    {
      label: HOMEWORK_SANDBOX_TASKS[2].criteriaLabels[2],
      passed: closesInFinally,
      detail: closesInFinally
        ? 'conn.Close() гарантированно вызывается внутри finally'
        : 'Перенесите conn.Close() внутрь блока finally { ... }',
    },
  ];

  const passed = checks.every((c) => c.passed);
  return {
    levelId,
    passed,
    checks,
    certificateCode: passed ? 'HW-L3-VERIFIED-5PLUS' : 'HW-L3-PENDING',
  };
}
