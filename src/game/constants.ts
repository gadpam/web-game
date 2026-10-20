import {
  BattleTactId,
  BrigadeId,
  MemberRole,
  PhaseId,
  PolygonFileId,
  ShieldRule,
  WorldId,
} from '../types/game';

export interface PhaseMeta {
  id: PhaseId;
  title: string;
  shortTitle: string;
  realTimeSpan: string;
  shiftClock: string;
  remainingToStart: string;
  durationSec: number;
  battleNumber?: 1 | 2 | 3 | 4;
  description: string;
}

export const PHASES: PhaseMeta[] = [
  {
    id: 'prologue_1',
    title: 'Завязка · Сцена 1. Вход',
    shortTitle: '03:00 ВХОД',
    realTimeSpan: '0:00–0:03',
    shiftClock: '03:00',
    remainingToStart: '06:00',
    durationSec: 180,
    description: 'Лента диспетчерской: сессия test/test 02:07–02:48, выгрузка 0 байт, 26 записей в очереди.',
  },
  {
    id: 'prologue_2',
    title: 'Завязка · Сцена 2. Вскрытие',
    shortTitle: '03:05 ВСКРЫТИЕ',
    realTimeSpan: '0:03–0:07',
    shiftClock: '03:05',
    remainingToStart: '05:55',
    durationSec: 240,
    description: 'Запуск пакета: падение на #0x1F3, сопоставление 4 записей и 4 типов исключений, иерархия Exception.',
  },
  {
    id: 'prologue_3',
    title: 'Завязка · Сцена 3. Отбито',
    shortTitle: '03:14 ОТБИТО',
    realTimeSpan: '0:07–0:11',
    shiftClock: '03:14',
    remainingToStart: '05:46',
    durationSec: 240,
    description: 'Сборка механизма TRY · CATCH · FINALLY. Прогон пакета: прошло 1214, в отчёт 26, остановок 0.',
  },
  {
    id: 'prologue_4',
    title: 'Завязка · Сцена 4. Продолжение',
    shortTitle: '03:17 ПОВОРОТ',
    realTimeSpan: '0:11–0:15',
    shiftClock: '03:17',
    remainingToStart: '05:43',
    durationSec: 240,
    description: 'Лог оживает сам: 4 новых направления проб. АТАКИ ПРОДОЛЖАТСЯ. Распределение бригад.',
  },
  {
    id: 'battle_1',
    title: 'Бой 1 · «Перехват» (формат)',
    shortTitle: '04:00 БОЙ 1',
    realTimeSpan: '0:15–0:23',
    shiftClock: '04:00',
    remainingToStart: '05:00',
    durationSec: 480,
    battleNumber: 1,
    description: 'Прогон формата: поставить обработчик вокруг опасного места, чтобы одна запись не роняла весь пакет.',
  },
  {
    id: 'battle_2',
    title: 'Бой 2 · «Порядок» (иерархия и CS0160)',
    shortTitle: '05:00 БОЙ 2',
    realTimeSpan: '0:23–0:31',
    shiftClock: '05:00',
    remainingToStart: '04:00',
    durationSec: 480,
    battleNumber: 2,
    description: 'Несколько типов одновременно: порядок catch от частного к общему, недостижимый обработчик CS0160.',
  },
  {
    id: 'lull',
    title: 'Затишье · Две минуты без атак',
    shortTitle: '06:00 ЗАТИШЬЕ',
    realTimeSpan: '0:31–0:33',
    shiftClock: '06:00',
    remainingToStart: '03:00',
    durationSec: 120,
    description: 'Противник молчит, смена ждёт. «Пока тихо. Это и есть худшее.» Обзор приборной панели для комиссии.',
  },
  {
    id: 'battle_3',
    title: 'Бой 3 · «Гарантия» (ресурс и finally)',
    shortTitle: '07:00 БОЙ 3',
    realTimeSpan: '0:33–0:41',
    shiftClock: '07:00',
    remainingToStart: '02:00',
    durationSec: 480,
    battleNumber: 3,
    description: '1 240 соединений с базой: закрыть соединение в finally даже при падении и при раннем return.',
  },
  {
    id: 'battle_4',
    title: 'Бой 4 · «Честность» (след, throw и пустой catch)',
    shortTitle: '08:00 БОЙ 4',
    realTimeSpan: '0:41–0:49',
    shiftClock: '08:00',
    remainingToStart: '01:00',
    durationSec: 480,
    battleNumber: 4,
    description: 'Попытка спрятать след в журнале: пустой catch {}, разница между throw; и throw ex;, запись 26 мин в отчёт.',
  },
  {
    id: 'practice',
    title: 'Практика · Сборка своего патча',
    shortTitle: '08:05 ПРАКТИКА',
    realTimeSpan: '0:49–1:02',
    shiftClock: '08:05',
    remainingToStart: '00:55',
    durationSec: 780,
    description: 'Индивидуальная и бригадная сборка полного патча из 4 слотов на полигоне «Партер» и прогон пакета.',
  },
  {
    id: 'five_min',
    title: 'Пять минут до старта · Реальное время',
    shortTitle: '08:55 ОТСЧЁТ',
    realTimeSpan: '1:02–1:07',
    shiftClock: '08:55',
    remainingToStart: '00:05',
    durationSec: 300,
    description: 'Последние 5 минут идут секунда в секунду с реальным временем. Проверка щита 6/6 и распределение 4 волн.',
  },
  {
    id: 'start_0900',
    title: '09:00 · СТАРТ ПРОДАЖ',
    shortTitle: '09:00 СТАРТ',
    realTimeSpan: '1:07–1:16',
    shiftClock: '09:00',
    remainingToStart: '00:00',
    durationSec: 540,
    description: 'Четыре волны одновременно. Табло из 1 240 клеток. Каждая пробитая волна — 30 человек без билета.',
  },
  {
    id: 'closed',
    title: '09:07 · Смена закрыта: Протокол и Рефлексия',
    shortTitle: '09:07 ПРОТОКОЛ',
    realTimeSpan: '1:16–1:24',
    shiftClock: '09:07',
    remainingToStart: '00:00',
    durationSec: 480,
    description: 'Разбор от числа выданных билетов на табло. Номинации смены и печать одностраничного протокола.',
  },
  {
    id: 'homework',
    title: '09:15 · Домашнее задание трёх уровней',
    shortTitle: '09:15 ЗАДАНИЕ',
    realTimeSpan: '1:24–1:30',
    shiftClock: '09:15',
    remainingToStart: '00:00',
    durationSec: 360,
    description: 'Выбор уровня домашнего задания: Обязательный (разбор боя), Повышенный (свой тип исключения), Высокий (аудит своего кода).',
  },
];

export interface TactMeta {
  id: BattleTactId;
  title: string;
  durationSec: number;
  actor: string;
  instruction: string;
}

export const BATTLE_TACTS: TactMeta[] = [
  {
    id: 'recon',
    title: '1. Разведка',
    durationSec: 60,
    actor: 'Атакующие (Аналитик)',
    instruction: 'Атакующие читают код и лог, выбирают уязвимую строку и точный тип исключения.',
  },
  {
    id: 'announce',
    title: '2. Объявление',
    durationSec: 60,
    actor: 'Докладчик атаки (стоя)',
    instruction: 'Докладчик атакующих встаёт у экрана: «Атакуем строку N, тип такой-то». Экраны бригад гаснут.',
  },
  {
    id: 'card',
    title: '3. Карта',
    durationSec: 60,
    actor: 'Картёр и Чтец',
    instruction: 'Картёр отправляет карту (строка, точный тип, одно утверждение). Чтец произносит дословно.',
  },
  {
    id: 'exchange',
    title: '4. Обмен и Запуск',
    durationSec: 90,
    actor: 'Защита + Полигон',
    instruction: 'Защита отвечает картой и слотом патча. Живой запуск полигона: экран штампует ПРОБИЛА или ОТБИТА.',
  },
  {
    id: 'counter',
    title: '5. Контратака и Патч',
    durationSec: 150,
    actor: 'Защита vs Атака',
    instruction: 'Защита уточняет патч, атака пытается пробить патч одним ходом (смена входного вектора).',
  },
  {
    id: 'verdict',
    title: '6. Вердикт и Журнал',
    durationSec: 60,
    actor: 'Арбитр (стоя) + Писарь',
    instruction: 'Арбитр стоя объявляет вердикт и очки, называет найденный пропуск (+1), зачитывает строку журнала.',
  },
];

export const INITIAL_SHIELD_RULES: ShieldRule[] = [
  {
    id: 1,
    code: 'АНАТОМИЯ',
    title: '1. Анатомия',
    text: 'Исключение — объект: тип, сообщение, адрес (строка и стек вызовов).',
    source: 'Завязка · Сцена 2',
    unlocked: false,
  },
  {
    id: 2,
    code: 'МЕХАНИЗМ',
    title: '2. Механизм',
    text: 'Три части, у каждой своя работа: try — зона, catch — перехват, finally — гарантия.',
    source: 'Завязка · Сцена 3',
    unlocked: false,
  },
  {
    id: 3,
    code: 'ПЕРЕХВАТ',
    title: '3. Перехват',
    text: 'Обработчик стоит вокруг опасного места, а не рядом; одна запись не роняет весь пакет.',
    source: 'Бой 1 · Перехват',
    unlocked: false,
  },
  {
    id: 4,
    code: 'ПОРЯДОК',
    title: '4. Порядок',
    text: 'От частного к общему. Иначе конкретный обработчик перекрыт и недостижим (CS0160).',
    source: 'Бой 2 · Порядок',
    unlocked: false,
  },
  {
    id: 5,
    code: 'ГАРАНТИЯ',
    title: '5. Гарантия',
    text: 'finally выполняется всегда — и при падении, и при штатном return.',
    source: 'Бой 3 · Гарантия',
    unlocked: false,
  },
  {
    id: 6,
    code: 'ЧЕСТНОСТЬ',
    title: '6. Честность',
    text: 'Не глотать: поймал — запиши в отчёт или пробрось через throw; (сохраняя стек).',
    source: 'Бой 4 · Честность',
    unlocked: false,
  },
];

export interface RoleDefinition {
  role: MemberRole;
  title: string;
  posture: 'за ноутбуком' | 'у экрана (стоя)';
  duty: string;
  ruleNote: string;
}

export const MEMBER_ROLES: RoleDefinition[] = [
  {
    role: 'аналитик',
    title: 'Аналитик',
    posture: 'за ноутбуком',
    duty: 'Читает код полигона и лог смены, находит уязвимую строку и точный тип исключения.',
    ruleNote: 'Ищет причину в коде, а не «по жизненному опыту».',
  },
  {
    role: 'картёр',
    title: 'Картёр',
    posture: 'за ноутбуком',
    duty: 'Формулирует карту атаки или защиты: номер строки, точный тип, одно утверждение.',
    ruleNote: 'Карта отправляется один раз за такт. Редактирование после отправки запрещено.',
  },
  {
    role: 'чтец',
    title: 'Чтец',
    posture: 'за ноутбуком',
    duty: 'Произносит отправленную карту вслух дословно, без пояснений и отсебятины.',
    ruleNote: 'Импровизация запрещена: выигрывает точность мысли, а не красноречие.',
  },
  {
    role: 'писарь',
    title: 'Писарь',
    posture: 'за ноутбуком',
    duty: 'Ведёт журнал смены: что заявлено, что проверено запуском, каков вердикт.',
    ruleNote: 'По записи смену можно восстановить через сутки без свидетелей.',
  },
  {
    role: 'докладчик',
    title: 'Докладчик',
    posture: 'у экрана (стоя)',
    duty: 'Объявляет позицию бригады стоя у экрана, подаёт апелляцию (до 30 секунд).',
    ruleNote: 'Выступает стоя — разворачивает внимание класса от ноутбуков к общей сцене.',
  },
  {
    role: 'арбитр',
    title: 'Арбитр',
    posture: 'у экрана (стоя)',
    duty: 'Судит раунд стоя по результату запуска, ведёт протокол боя, ищет пропущенный обеими сторонами дефект (+1).',
    ruleNote: 'В свой раунд не участвует в разработке позиции своей бригады.',
  },
];

export interface PolygonFileLine {
  line: number;
  code: string;
  vulnerable?: boolean;
  battleTag?: 1 | 2 | 3 | 4;
  humanNote?: string;
  exceptionHint?: string;
}

export interface PolygonFileSpec {
  id: PolygonFileId;
  title: string;
  subtitle: string;
  battleNumber: 1 | 2 | 3 | 4;
  lines: PolygonFileLine[];
}

export const POLYGON_FILES: Record<PolygonFileId, PolygonFileSpec> = {
  'Program.cs': {
    id: 'Program.cs',
    title: 'Program.cs',
    subtitle: 'Пакетный конвейер очереди (1 240 записей · старт 09:00)',
    battleNumber: 1,
    lines: [
      { line: 1, code: 'using System;' },
      { line: 2, code: 'using Parter.Ticketing;' },
      { line: 3, code: '' },
      { line: 4, code: 'public static class BatchRunner' },
      { line: 5, code: '{' },
      { line: 6, code: '    public static BatchReport ProcessQueue(TicketRequest[] queue)' },
      { line: 7, code: '    {' },
      { line: 8, code: '        var report = new BatchReport(total: 1240);' },
      { line: 9, code: '        foreach (var req in queue) // 1214 штатных + 26 мин от учётной записи "test"' },
      { line: 10, code: '        {' },
      {
        line: 11,
        code: '            // [СЛОТ 1] Без try внутри цикла первая же мина рвёт весь пакет из 1240 записей',
        humanNote: '← поставить try ВНУТРИ foreach, а не снаружи!',
      },
      {
        line: 12,
        code: '            var booking = Booking.Parse(req);       // Бой 1: FormatException ("два")',
        vulnerable: true,
        battleTag: 1,
        exceptionHint: 'FormatException',
      },
      {
        line: 13,
        code: '            var price   = Pricing.Calculate(req);   // Бой 2: DivideByZeroException (count = 0)',
        vulnerable: true,
        battleTag: 2,
        exceptionHint: 'DivideByZeroException',
      },
      {
        line: 14,
        code: '            var seat    = Seats.Assign(req);        // Бой 3: IndexOutOfRange + утечка DbConnection',
        vulnerable: true,
        battleTag: 3,
        exceptionHint: 'IndexOutOfRangeException',
      },
      {
        line: 15,
        code: '            var total   = Promo.Apply(req, price);  // Бой 4: NullReference + пустой catch {}',
        vulnerable: true,
        battleTag: 4,
        exceptionHint: 'NullReferenceException',
      },
      { line: 16, code: '            report.IssueTicket(req.Id, seat, total);' },
      { line: 17, code: '        }' },
      { line: 18, code: '        return report;' },
      { line: 19, code: '    }' },
      { line: 20, code: '}' },
    ],
  },
  'Booking.cs': {
    id: 'Booking.cs',
    title: 'Booking.cs',
    subtitle: 'Бой 1 «Перехват» · Разбор брони и количества билетов',
    battleNumber: 1,
    lines: [
      { line: 8, code: 'public static class Booking' },
      { line: 9, code: '{' },
      { line: 10, code: '    public static Order Parse(TicketRequest req)' },
      { line: 11, code: '    {' },
      {
        line: 12,
        code: '        int place = int.Parse(req.Place);   // мина #0x1F3: req.Place = "два"',
        vulnerable: true,
        battleTag: 1,
        humanNote: 'строка 12 · FormatException без try/catch',
        exceptionHint: 'FormatException',
      },
      { line: 13, code: '        int count = int.Parse(req.CountRaw);' },
      {
        line: 14,
        code: '        int share = req.TotalSum / count;   // контратака: count = 0 -> DivideByZeroException',
        vulnerable: true,
        battleTag: 1,
        humanNote: 'строка 14 · деление на count без проверки нуля',
        exceptionHint: 'DivideByZeroException',
      },
      { line: 15, code: '        return new Order(req.Id, place, count, share);' },
      { line: 16, code: '    }' },
      { line: 17, code: '}' },
    ],
  },
  'Pricing.cs': {
    id: 'Pricing.cs',
    title: 'Pricing.cs',
    subtitle: 'Бой 2 «Порядок» · Иерархия исключений и ошибка компилятора CS0160',
    battleNumber: 2,
    lines: [
      { line: 18, code: 'public static class Pricing' },
      { line: 19, code: '{' },
      { line: 20, code: '    public static int Calculate(TicketRequest req)' },
      { line: 21, code: '    {' },
      {
        line: 22,
        code: '        try { return int.Parse(req.Place) * (req.TotalSum / req.Count); }',
        vulnerable: true,
        battleTag: 2,
        exceptionHint: 'FormatException',
      },
      {
        line: 23,
        code: '        catch (Exception ex)                // ОШИБКА ПОРЯДКА: общий тип стоит первым!',
        vulnerable: true,
        battleTag: 2,
        humanNote: 'перекрывает все дочерние catch ниже -> CS0160',
        exceptionHint: 'Exception',
      },
      { line: 24, code: '        {' },
      { line: 25, code: '            return -1;' },
      { line: 26, code: '        }' },
      {
        line: 27,
        code: '        catch (FormatException ex)          // CS0160: предыдущий catch уже ловит все Exception',
        vulnerable: true,
        battleTag: 2,
        humanNote: 'недостижимый обработчик (Unreachable catch block)',
        exceptionHint: 'FormatException',
      },
      { line: 28, code: '        {' },
      { line: 29, code: '            AuditLog.ReportFormat(req.Id, ex); return 0;' },
      { line: 30, code: '        }' },
      {
        line: 31,
        code: '        // Строка 31: при req.Count == 0 требуется отдельный catch (DivideByZeroException) ДО Exception',
        vulnerable: true,
        battleTag: 2,
        exceptionHint: 'DivideByZeroException',
      },
      { line: 32, code: '    }' },
      { line: 33, code: '}' },
    ],
  },
  'Seats.cs': {
    id: 'Seats.cs',
    title: 'Seats.cs',
    subtitle: 'Бой 3 «Гарантия» · Пул из 1 240 соединений и блок finally',
    battleNumber: 3,
    lines: [
      { line: 6, code: 'public static class Seats' },
      { line: 7, code: '{' },
      {
        line: 8,
        code: '    private static readonly string[] Row = new string[6]; // места 1..6, мина: seat = 7',
        vulnerable: true,
        battleTag: 3,
        exceptionHint: 'IndexOutOfRangeException',
      },
      { line: 38, code: '    public static string Assign(TicketRequest req)' },
      { line: 39, code: '    {' },
      { line: 40, code: '        var conn = DbPool.Open();           // лимит пула: 64 соединения на 1240 человек' },
      {
        line: 41,
        code: '        string badge = Row[req.SeatIndex];  // при SeatIndex = 7 падает IndexOutOfRangeException',
        vulnerable: true,
        battleTag: 3,
        humanNote: 'строка 41 · при падении или раннем return conn.Close() не вызовется без finally!',
        exceptionHint: 'IndexOutOfRangeException',
      },
      { line: 42, code: '        if (req.IsVip) return badge;        // ранний выход: обходит строку 43 без finally!' },
      { line: 43, code: '        conn.Close();                       // досюда выполнение не доходит при мине' },
      { line: 44, code: '        return badge;' },
      { line: 45, code: '    }' },
      { line: 46, code: '}' },
    ],
  },
  'Promo.cs': {
    id: 'Promo.cs',
    title: 'Promo.cs',
    subtitle: 'Бой 4 «Честность» · Пустой catch {} и потеря стека при throw ex',
    battleNumber: 4,
    lines: [
      { line: 16, code: 'public static class Promo' },
      { line: 17, code: '{' },
      { line: 18, code: '    public static int Apply(TicketRequest req, int price)' },
      { line: 19, code: '    {' },
      {
        line: 20,
        code: '        try { return price - req.PromoCode.Trim().Length; } // req.PromoCode == null -> NullReferenceException',
        vulnerable: true,
        battleTag: 4,
        exceptionHint: 'NullReferenceException',
      },
      {
        line: 55,
        code: '        catch (NullReferenceException ex) { }               // ПУСТОЙ CATCH: 26 мин проглочены, в отчёте 0!',
        vulnerable: true,
        battleTag: 4,
        humanNote: 'строка 55 · заметание улик! Исключение исчезает без записи в отчёт',
        exceptionHint: 'NullReferenceException',
      },
      {
        line: 58,
        code: '        catch (Exception ex) { AuditLog.Write(ex); throw ex; } // строка 58 · throw ex СТИРАЕТ исходный стек вызовов!',
        vulnerable: true,
        battleTag: 4,
        humanNote: 'нужно throw; вместо throw ex; и запись всех 26 мин в AuditLog.ReportMine',
        exceptionHint: 'NullReferenceException',
      },
      { line: 59, code: '        return price;' },
      { line: 60, code: '    }' },
      { line: 61, code: '}' },
    ],
  },
};

export interface PatchSlotSpec {
  slot: 1 | 2 | 3 | 4;
  hotkey: '1' | '2' | '3' | '4';
  shortName: string;
  codeSnippet: string;
  description: string;
  solvesBattle: 1 | 2 | 3 | 4;
}

export const PATCH_SLOTS: PatchSlotSpec[] = [
  {
    slot: 1,
    hotkey: '1',
    shortName: 'try { ... } вокруг опасного вызова',
    codeSnippet: 'try { place = int.Parse(req.Place); } catch (FormatException ex) { report.LogMine(req.Id, ex); continue; }',
    description: 'Очерчивает опасную строку внутри цикла пакета и ловит FormatException без остановки очереди.',
    solvesBattle: 1,
  },
  {
    slot: 2,
    hotkey: '2',
    shortName: 'catch (Частный) -> catch (Общий)',
    codeSnippet: 'catch (FormatException ex) { ... } catch (DivideByZeroException ex) { ... } catch (Exception ex) { ... }',
    description: 'Выстраивает обработчики строго от частного типа к общему предку Exception (устраняет CS0160).',
    solvesBattle: 2,
  },
  {
    slot: 3,
    hotkey: '3',
    shortName: 'finally { conn.Close(); }',
    codeSnippet: 'var conn = DbPool.Open(); try { return Row[req.SeatIndex]; } finally { conn.Close(); }',
    description: 'Гарантирует освобождение соединения с БД и при падении на индексе, и при раннем return.',
    solvesBattle: 3,
  },
  {
    slot: 4,
    hotkey: '4',
    shortName: 'Отчёт 26 мин + throw; (честный стек)',
    codeSnippet: 'catch (NullReferenceException ex) { AuditLog.ReportMine(req.Id, ex); throw; }',
    description: 'Убирает пустой catch {}, фиксирует все 26 подозрительных записей в отчёт и сохраняет стек через throw;.',
    solvesBattle: 4,
  },
];

export interface ReferenceCardTemplate {
  battleNumber: 1 | 2 | 3 | 4;
  cardType: 'атака' | 'защита' | 'контратака';
  file: PolygonFileId;
  line: number;
  exceptionType: string;
  statement: string;
  patchSlot?: 1 | 2 | 3 | 4;
  arbiterMissedSpotHint: string;
}

export const REFERENCE_CARDS: ReferenceCardTemplate[] = [
  // Бой 1
  {
    battleNumber: 1,
    cardType: 'атака',
    file: 'Booking.cs',
    line: 12,
    exceptionType: 'FormatException',
    statement: 'place разбирается через int.Parse, place приходит из тела запроса без проверки ("два")',
    arbiterMissedSpotHint: 'Пропуск: int.TryParse дешевле исключения на потоке из 1240 запросов (+1 арбитру)',
  },
  {
    battleNumber: 1,
    cardType: 'защита',
    file: 'Booking.cs',
    line: 12,
    exceptionType: 'FormatException',
    statement: 'Ставим try и catch (FormatException) вокруг int.Parse(req.Place) с записью мины в отчёт',
    patchSlot: 1,
    arbiterMissedSpotHint: 'Пропуск: строка 14 делит на count без проверки нуля',
  },
  {
    battleNumber: 1,
    cardType: 'контратака',
    file: 'Booking.cs',
    line: 14,
    exceptionType: 'DivideByZeroException',
    statement: 'Строка 14 делит TotalSum на count, count приходит из ввода, ноль не отсечён',
    arbiterMissedSpotHint: 'Пропуск: при count < 0 цена билета становится отрицательной',
  },
  // Бой 2
  {
    battleNumber: 2,
    cardType: 'атака',
    file: 'Pricing.cs',
    line: 23,
    exceptionType: 'FormatException',
    statement: 'catch (Exception) на строке 23 стоит первым и перекрывает catch (FormatException) на строке 27 — ошибка CS0160',
    arbiterMissedSpotHint: 'Пропуск: на строке 25 catch (Exception) возвращает -1 без записи в журнал аудита',
  },
  {
    battleNumber: 2,
    cardType: 'защита',
    file: 'Pricing.cs',
    line: 27,
    exceptionType: 'FormatException',
    statement: 'Ставим частные catch (FormatException) и catch (DivideByZeroException) выше общего catch (Exception)',
    patchSlot: 2,
    arbiterMissedSpotHint: 'Пропуск: OverflowException при слишком большом числе в int.Parse не выделен отдельно',
  },
  {
    battleNumber: 2,
    cardType: 'контратака',
    file: 'Pricing.cs',
    line: 31,
    exceptionType: 'DivideByZeroException',
    statement: 'При req.Count = 0 на строке 22 возникает DivideByZeroException, который проваливается в общий обработчик',
    arbiterMissedSpotHint: 'Пропуск: оба числовых исключения наследуют SystemException',
  },
  // Бой 3
  {
    battleNumber: 3,
    cardType: 'атака',
    file: 'Seats.cs',
    line: 41,
    exceptionType: 'IndexOutOfRangeException',
    statement: 'Соединение открывается на строке 40 до try, при падении на строке 41 (SeatIndex = 7) conn.Close() не вызывается',
    arbiterMissedSpotHint: 'Пропуск: на строке 42 ранний return для VIP также оставляет соединение открытым без finally',
  },
  {
    battleNumber: 3,
    cardType: 'защита',
    file: 'Seats.cs',
    line: 41,
    exceptionType: 'IndexOutOfRangeException',
    statement: 'Переносим conn.Close() в блок finally, который выполняется и при падении на строке 41, и при return на 42',
    patchSlot: 3,
    arbiterMissedSpotHint: 'Пропуск: конструкция using (var conn = DbPool.Open()) эквивалентна try-finally',
  },
  {
    battleNumber: 3,
    cardType: 'контратака',
    file: 'Seats.cs',
    line: 42,
    exceptionType: 'IndexOutOfRangeException',
    statement: 'На строке 42 при req.IsVip == true происходит ранний return до conn.Close(), пул из 64 соединений исчерпывается',
    arbiterMissedSpotHint: 'Пропуск: перед обращением к Row[req.SeatIndex] нет проверки границ 0..Row.Length-1',
  },
  // Бой 4
  {
    battleNumber: 4,
    cardType: 'атака',
    file: 'Promo.cs',
    line: 55,
    exceptionType: 'NullReferenceException',
    statement: 'На строке 55 пустой блок catch { } глотает NullReferenceException — 26 мин исчезают, в отчёте 0 записей',
    arbiterMissedSpotHint: 'Пропуск: на строке 58 инструкция throw ex сбрасывает оригинальный стек вызовов строки 20',
  },
  {
    battleNumber: 4,
    cardType: 'защита',
    file: 'Promo.cs',
    line: 55,
    exceptionType: 'NullReferenceException',
    statement: 'Записываем все 26 падений в AuditLog.ReportMine и используем пустой throw; на строке 58 для сохранения стека',
    patchSlot: 4,
    arbiterMissedSpotHint: 'Пропуск: req.PromoCode?.Trim() предотвратил бы NullReferenceException до входа в catch',
  },
  {
    battleNumber: 4,
    cardType: 'контратака',
    file: 'Promo.cs',
    line: 58,
    exceptionType: 'NullReferenceException',
    statement: 'На строке 58 написано throw ex вместо throw; — исходный адрес поломки на строке 20 стирается из StackTrace',
    arbiterMissedSpotHint: 'Пропуск: при повторном выбросе без внутренней обёртки теряется контекст ID заявки req.Id',
  },
];

export const PROLOGUE_LOG_LINES = [
  { time: '02:07:44', unit: 'auth', text: 'сессия "test" открыта · права: admin · 91.42.117.6', level: 'warn' as const },
  { time: '02:41:12', unit: 'queue', text: 'вставлено записей в пакет: 26 · выгрузка: 0 байт', level: 'danger' as const },
  { time: '02:48:57', unit: 'auth', text: 'сессия "test" закрыта · штатно · удалено: 0', level: 'warn' as const },
  { time: '02:49:00', unit: 'monitor', text: '26 записей не проходят контроль целостности', level: 'danger' as const },
  { time: '02:51:02', unit: 'тикет #7712', text: 'P1 · До старта 06:11 · В очереди: 1240 · Ответственный: не назначен', level: 'danger' as const },
];

export const PROLOGUE_SECOND_WAVE_LOGS = [
  { time: '03:17:10', unit: 'api/book', text: '400 · поле "count": ожидалось число > 0, пришло 0 (DivideByZeroException)' },
  { time: '03:17:10', unit: 'api/book', text: '400 · поле "promo": пусто (NullReferenceException)' },
  { time: '03:17:11', unit: 'api/book', text: '400 · поле "seat": ожидалось 1..6, пришло 7 (IndexOutOfRangeException)' },
  { time: '03:17:41', unit: 'monitor', text: '4 новых направления проб: формат · порядок · ресурс · след' },
];

export const PROLOGUE_MINES = [
  {
    id: 'mine_1',
    recordHex: '#0x1F3',
    field: 'place',
    badValue: '"два"',
    fileLine: 'Booking.cs:12',
    expectedType: 'FormatException',
    message: 'Входная строка "два" имела неверный формат при вызове int.Parse.',
  },
  {
    id: 'mine_2',
    recordHex: '#0x2A8',
    field: 'count',
    badValue: '0',
    fileLine: 'Pricing.cs:31',
    expectedType: 'DivideByZeroException',
    message: 'Попытка деления суммы заказа на ноль билетов (count = 0).',
  },
  {
    id: 'mine_3',
    recordHex: '#0x4D1',
    field: 'seat',
    badValue: '7 при шести местах',
    fileLine: 'Seats.cs:8',
    expectedType: 'IndexOutOfRangeException',
    message: 'Индекс 7 находится вне границ массива мест Row[6].',
  },
  {
    id: 'mine_4',
    recordHex: '#0x6E9',
    field: 'promo',
    badValue: 'пусто (null)',
    fileLine: 'Promo.cs:19',
    expectedType: 'NullReferenceException',
    message: 'Ссылка на объект req.PromoCode не указывает на экземпляр объекта.',
  },
];

export interface TeacherScriptLine {
  number: number;
  scene: 1 | 2 | 3 | 4;
  cue: string;
  words: string;
  wordCount: number;
}

// Дословный сценарий ведущего из Документа 03 (ровно 19 реплик, <= 130 слов)
export const TEACHER_SCRIPT_19: TeacherScriptLine[] = [
  { number: 1, scene: 1, cue: 'На экране лента сессии 02:07–02:48', words: 'Сессия открыта в 02:07. Закрыта в 02:48. Сорок одна минута.', wordCount: 10 },
  { number: 2, scene: 1, cue: 'После голосования клиентов (пауза)', words: 'Верно. В систему вошли.', wordCount: 4 },
  { number: 3, scene: 1, cue: 'Факт выгрузки 0 байт', words: 'Он ничего не украл. Выгрузка — ноль.', wordCount: 6 },
  { number: 4, scene: 1, cue: 'Улика в очереди', words: 'Он оставил двадцать шесть записей.', wordCount: 5 },
  { number: 5, scene: 2, cue: 'Открытие очереди из 1240 строк', words: 'Старт в девять. В очереди тысяча двести сорок.', wordCount: 8 },
  { number: 6, scene: 2, cue: 'Падение пакета на FormatException · Booking.cs:12', words: 'У падения есть имя и адрес.', wordCount: 6 },
  { number: 7, scene: 2, cue: 'После сопоставления 4 мин и 4 типов', words: 'Четыре записи. Четыре разных падения. Имя — это тип. Адрес — строка.', wordCount: 10 },
  { number: 8, scene: 2, cue: 'Показ дерева иерархии Exception', words: 'Все типы — родня. Общий предок — Exception.', wordCount: 6 },
  { number: 9, scene: 3, cue: 'Показ разреза механизма', words: 'В смене три инструмента: TRY, CATCH, FINALLY.', wordCount: 7 },
  { number: 10, scene: 3, cue: 'Подсветка трёх частей по очереди', words: 'TRY очерчивает зону. CATCH ловит тип. FINALLY убирает за собой — всегда.', wordCount: 11 },
  { number: 11, scene: 3, cue: 'Пакет дошёл: прошло 1214, в отчёт 26', words: 'Двадцать шесть — в отчёт. Тысяча двести четырнадцать — билеты.', wordCount: 8 },
  { number: 12, scene: 3, cue: 'Падение тяжёлого штампа на ленту', words: 'Отбито.', wordCount: 1 },
  { number: 13, scene: 4, cue: 'Через 3 секунды лог оживает сам (03:17:10)', words: 'Он меняет способ.', wordCount: 3 },
  { number: 14, scene: 4, cue: 'Смысл ночной разведки', words: 'Ночная атака была проверкой. Он смотрел, как вы ответите.', wordCount: 9 },
  { number: 15, scene: 4, cue: 'Поворот', words: 'Вы ответили. Теперь он знает.', wordCount: 5 },
  { number: 16, scene: 4, cue: 'Показ 4 направлений проб', words: 'Вы закрыли одну дверь. Он пойдёт в те три, что остались открытыми.', wordCount: 12 },
  { number: 17, scene: 4, cue: 'Крупная строка АТАКИ ПРОДОЛЖАТСЯ', words: 'Атаки продолжатся.', wordCount: 2 },
  { number: 18, scene: 4, cue: 'Мотивация деления на 3 бригады', words: 'Четыре боя. Три бригады. Три линии обороны.', wordCount: 7 },
  { number: 19, scene: 4, cue: 'Появление 4-значного кода партии', words: 'Код партии. Сорок секунд.', wordCount: 4 },
];

export interface WorldPreset {
  id: WorldId;
  serviceName: string;
  queueTotal: number;
  minesCount: number;
  startClock: string;
  stakeLabel: string;
  unitLabel: string;
  intrusionNote: string;
}

export const WORLD_PRESETS: Record<WorldId, WorldPreset> = {
  tickets: {
    id: 'tickets',
    serviceName: 'Сервис продажи билетов «Партер»',
    queueTotal: 1240,
    minesCount: 26,
    startClock: '09:00',
    stakeLabel: '1 240 человек в очереди с ночи',
    unitLabel: 'билетов выдано',
    intrusionNote: 'Сессия test/test (02:07–02:48). Выгрузка: 0 байт. Оставлено 26 записей с битыми полями.',
  },
  game_server: {
    id: 'game_server',
    serviceName: 'Игровой сервер «Арена-Матч»',
    queueTotal: 1240,
    minesCount: 26,
    startClock: '09:00',
    stakeLabel: '1 240 профилей в лобби турнира',
    unitLabel: 'игроков в матче',
    intrusionNote: 'Оставлено 26 «битых» профилей, роняющих загрузку турнирного пакета.',
  },
  food_delivery: {
    id: 'food_delivery',
    serviceName: 'Диспетчерская доставки «Конвейер»',
    queueTotal: 1240,
    minesCount: 26,
    startClock: '09:00',
    stakeLabel: '1 240 предзаказов утреннего пика',
    unitLabel: 'заказов отгружено',
    intrusionNote: 'Вставлено 26 заказов с нулевым делителем и пустыми промокодами.',
  },
  clinic: {
    id: 'clinic',
    serviceName: 'Регистратура «МедСмена»',
    queueTotal: 1240,
    minesCount: 26,
    startClock: '09:00',
    stakeLabel: '1 240 талонов открытия записи',
    unitLabel: 'талонов выдано',
    intrusionNote: 'Оставлено 26 талонов с некорректным номером кабинета и пустой датой.',
  },
};

export interface DefenseSlide {
  number: number;
  timeRange: string;
  onSlide: string;
  speech: string;
}

export const DEFENSE_SLIDES_12: DefenseSlide[] = [
  {
    number: 1,
    timeRange: '0:00–0:15',
    onSlide: 'АПТАЙМ · НОЧНАЯ СМЕНА',
    speech: 'Урок на 90 минут. Тема — механизм исключений. Формат — ночная смена диспетчерской службы.',
  },
  {
    number: 2,
    timeRange: '0:15–0:30',
    onSlide: 'ИГРА-ПРОВЕРКА  →  [ ИГРА-ИЗУЧЕНИЕ ]',
    speech: 'Обычная предметная игра проверяет выученное. Мне нужна была игра, которая учит — производит понятие в момент нужды.',
  },
  {
    number: 3,
    timeRange: '0:30–0:50',
    onSlide: '02:07:44  auth  сессия "test" открыта · В очереди: 1 240',
    speech: 'Три часа ночи. В сервис вошли с забытой тестовой учётной записи. В девять утра — старт, тысяча двести сорок человек в очереди.',
  },
  {
    number: 4,
    timeRange: '0:50–1:10',
    onSlide: 'ВЫГРУЗКА — 0 БАЙТ  ·  ОСТАВЛЕНО 26 ЗАПИСЕЙ',
    speech: 'Он ничего не украл. Он оставил двадцать шесть записей, на которых сервис обязан упасть.',
  },
  {
    number: 5,
    timeRange: '1:10–1:25',
    onSlide: 'ОТБИТО · 1214 ИЗ 1240 БИЛЕТОВ ВЫДАНО · В ОТЧЁТ: 26',
    speech: 'На десятой минуте атаку отбивают. Это заслуженная победа: группа нашла тип, поставила защиту, проверила запуском.',
  },
  {
    number: 6,
    timeRange: '1:25–1:40',
    onSlide: 'АТАКИ ПРОДОЛЖАТСЯ · 4 НАПРАВЛЕНИЯ ПРОБ',
    speech: 'Через три минуты лог оживает снова. Он сменил способ. Вы закрыли одну дверь — он идёт в остальные. Защита от атаки не равна защите от класса атак.',
  },
  {
    number: 7,
    timeRange: '1:40–1:55',
    onSlide: 'БРИГАДЫ МЕХАНИЗМА:  ▲ TRY   ·   ⬡ CATCH   ·   ■ FINALLY',
    speech: 'Отсюда — три бригады: TRY, CATCH, FINALLY. Это не ряды, это части механизма, который группа только что собрала руками.',
  },
  {
    number: 8,
    timeRange: '1:55–2:08',
    onSlide: '8 МИНУТ БОЯ: РАЗВЕДКА → ОБЪЯВЛЕНИЕ → КАРТА → ОБМЕН → КОНТРАТАКА → ВЕРДИКТ',
    speech: 'Восемь минут боя: разведка, объявление стоя, карта, обмен с живым запуском на полигоне, контратака, вердикт арбитра.',
  },
  {
    number: 9,
    timeRange: '2:08–2:20',
    onSlide: 'ЩИТ 6/6: АНАТОМИЯ · МЕХАНИЗМ · ПЕРЕХВАТ · ПОРЯДОК · ГАРАНТИЯ · ЧЕСТНОСТЬ',
    speech: 'Шесть правил собираются по ходу смены. Пока щит не собран целиком, кнопка СТАРТ физически заблокирована.',
  },
  {
    number: 10,
    timeRange: '2:20–2:32',
    onSlide: 'ПРИБОР БВ-1 · ЧАСЫ СМЕНЫ 03:00 → 09:00 · 08:55 В РЕАЛЬНОМ ВРЕМЕНИ',
    speech: 'Часы урока — это часы смены: с трёх ночи до девяти утра. Последние пять минут идут секунда в секунду с реальным временем.',
  },
  {
    number: 11,
    timeRange: '2:32–2:45',
    onSlide: 'ТАБЛО 1 240 КЛЕТОК · ОДНА ПОПЫТКА · ПРОБИТАЯ ВОЛНА = −30 ЧЕЛОВЕК',
    speech: 'В 09:00 — старт. Одна попытка. Четыре волны одновременно. Каждая пробитая волна — тридцать человек без билета, дыра видна с последнего ряда.',
  },
  {
    number: 12,
    timeRange: '2:45–3:00',
    onSlide: 'ПРОТОКОЛ СМЕНЫ · БИЛЕТОВ ВЫДАНО: 1210 ИЗ 1240',
    speech: 'Итог урока измеряется не очками, а числом людей, которые ушли с билетами. Спасибо.',
  },
];

export const COMMISSION_QA = [
  {
    q: 'Это игра или урок?',
    a: 'Урок открытия нового знания в игровой форме. Оценки в ходе игры не выставляются: игра — обучение, контроль переносится на домашнее задание трёх уровней и разбор протокола.',
  },
  {
    q: 'Не слишком ли сложно за 90 минут?',
    a: 'Сложность в темпе, а не в материале. Полигон ограничен четырьмя слотами патчей — синтаксис не отнимает время у инженерной мысли.',
  },
  {
    q: 'Что если сеть упадёт?',
    a: 'Три режима в один клик: Полный (сервер + клиенты), Ручной (экран ведёт преподаватель) и Автономный (один экран + бумажные карты). Состояние смены не теряется.',
  },
  {
    q: 'Не учите ли вы взламывать?',
    a: 'Группа всегда на стороне защиты. Роль атакующего — red team, легальное тестирование на устойчивость. Стенд учебный.',
  },
  {
    q: 'Почему 26 записей и 1 240 человек в очереди?',
    a: '26 записей достаточно, чтобы пакет падал многократно без try-catch, и достаточно мало для ручного аудита в отчёте. 1 240 клеток наглядно читаются на табло с последнего ряда.',
  },
];

export const KNOWN_EXCEPTION_TYPES = [
  'FormatException',
  'DivideByZeroException',
  'IndexOutOfRangeException',
  'NullReferenceException',
  'SystemException',
  'Exception',
  'CS0160',
  'finally',
  'throw;',
  'throw ex;',
];
