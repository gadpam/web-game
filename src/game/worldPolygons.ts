import { POLYGON_FILES, PROLOGUE_LOG_LINES } from './constants';
import { PolygonFileId, PolygonFileSpec, WorldId } from '../types/game';

export interface PolygonTreeNode {
  branchPrefix: '├──' | '└──';
  fileId: PolygonFileId;
  shortDesc: string;
  keyLine: number;
  exceptionType: string;
  battleNumber: 1 | 2 | 3 | 4;
}

export function getPolygonTreeNodes(world: WorldId): {
  rootTitle: string;
  nodes: PolygonTreeNode[];
} {
  if (world === 'game_server') {
    return {
      rootTitle: 'Полигон «Арена-Матч»',
      nodes: [
        {
          branchPrefix: '├──',
          fileId: 'Program.cs',
          shortDesc: 'сценарий: лобби из 1240 профилей турнира',
          keyLine: 12,
          exceptionType: 'BatchRunner',
          battleNumber: 1,
        },
        {
          branchPrefix: '├──',
          fileId: 'Booking.cs',
          shortDesc: 'разбор MMR профиля (строка 12 — FormatException)',
          keyLine: 12,
          exceptionType: 'FormatException',
          battleNumber: 1,
        },
        {
          branchPrefix: '├──',
          fileId: 'Pricing.cs',
          shortDesc: 'расчёт рейтинга отряда (строка 31 — DivideByZeroException)',
          keyLine: 31,
          exceptionType: 'DivideByZeroException',
          battleNumber: 2,
        },
        {
          branchPrefix: '├──',
          fileId: 'Seats.cs',
          shortDesc: 'слоты сервера (строка 8 / 41 — IndexOutOfRangeException)',
          keyLine: 41,
          exceptionType: 'IndexOutOfRangeException',
          battleNumber: 3,
        },
        {
          branchPrefix: '└──',
          fileId: 'Promo.cs',
          shortDesc: 'турнирный токен (строка 19 / 55 — NullReferenceException)',
          keyLine: 55,
          exceptionType: 'NullReferenceException',
          battleNumber: 4,
        },
      ],
    };
  }

  if (world === 'food_delivery') {
    return {
      rootTitle: 'Полигон «Конвейер»',
      nodes: [
        {
          branchPrefix: '├──',
          fileId: 'Program.cs',
          shortDesc: 'сценарий: пакет из 1240 заказов горячего часа',
          keyLine: 12,
          exceptionType: 'BatchRunner',
          battleNumber: 1,
        },
        {
          branchPrefix: '├──',
          fileId: 'Booking.cs',
          shortDesc: 'разбор адреса заказа (строка 12 — FormatException)',
          keyLine: 12,
          exceptionType: 'FormatException',
          battleNumber: 1,
        },
        {
          branchPrefix: '├──',
          fileId: 'Pricing.cs',
          shortDesc: 'расчёт тарифа курьеров (строка 31 — DivideByZeroException)',
          keyLine: 31,
          exceptionType: 'DivideByZeroException',
          battleNumber: 2,
        },
        {
          branchPrefix: '├──',
          fileId: 'Seats.cs',
          shortDesc: 'ячейки термобоксов (строка 8 / 41 — IndexOutOfRangeException)',
          keyLine: 41,
          exceptionType: 'IndexOutOfRangeException',
          battleNumber: 3,
        },
        {
          branchPrefix: '└──',
          fileId: 'Promo.cs',
          shortDesc: 'купон скидки (строка 19 / 55 — NullReferenceException)',
          keyLine: 55,
          exceptionType: 'NullReferenceException',
          battleNumber: 4,
        },
      ],
    };
  }

  if (world === 'clinic') {
    return {
      rootTitle: 'Полигон «МедСмена»',
      nodes: [
        {
          branchPrefix: '├──',
          fileId: 'Program.cs',
          shortDesc: 'сценарий: реестр из 1240 талонов к 08:00',
          keyLine: 12,
          exceptionType: 'BatchRunner',
          battleNumber: 1,
        },
        {
          branchPrefix: '├──',
          fileId: 'Booking.cs',
          shortDesc: 'разбор номера кабинета (строка 12 — FormatException)',
          keyLine: 12,
          exceptionType: 'FormatException',
          battleNumber: 1,
        },
        {
          branchPrefix: '├──',
          fileId: 'Pricing.cs',
          shortDesc: 'расчёт квоты смены (строка 31 — DivideByZeroException)',
          keyLine: 31,
          exceptionType: 'DivideByZeroException',
          battleNumber: 2,
        },
        {
          branchPrefix: '├──',
          fileId: 'Seats.cs',
          shortDesc: 'окна приёма (строка 8 / 41 — IndexOutOfRangeException)',
          keyLine: 41,
          exceptionType: 'IndexOutOfRangeException',
          battleNumber: 3,
        },
        {
          branchPrefix: '└──',
          fileId: 'Promo.cs',
          shortDesc: 'код полиса ОМС (строка 19 / 55 — NullReferenceException)',
          keyLine: 55,
          exceptionType: 'NullReferenceException',
          battleNumber: 4,
        },
      ],
    };
  }

  return {
    rootTitle: 'Полигон «Партер»',
    nodes: [
      {
        branchPrefix: '├──',
        fileId: 'Program.cs',
        shortDesc: 'сценарий: очередь из 1240 записей',
        keyLine: 12,
        exceptionType: 'BatchRunner',
        battleNumber: 1,
      },
      {
        branchPrefix: '├──',
        fileId: 'Booking.cs',
        shortDesc: 'разбор брони (строка 12 — FormatException)',
        keyLine: 12,
        exceptionType: 'FormatException',
        battleNumber: 1,
      },
      {
        branchPrefix: '├──',
        fileId: 'Pricing.cs',
        shortDesc: 'расчёт цены (строка 31 — DivideByZeroException)',
        keyLine: 31,
        exceptionType: 'DivideByZeroException',
        battleNumber: 2,
      },
      {
        branchPrefix: '├──',
        fileId: 'Seats.cs',
        shortDesc: 'места (строка 8 / 41 — IndexOutOfRangeException)',
        keyLine: 41,
        exceptionType: 'IndexOutOfRangeException',
        battleNumber: 3,
      },
      {
        branchPrefix: '└──',
        fileId: 'Promo.cs',
        shortDesc: 'промокод (строка 19 / 55 — NullReferenceException)',
        keyLine: 55,
        exceptionType: 'NullReferenceException',
        battleNumber: 4,
      },
    ],
  };
}

export function getWorldPolygonFiles(
  world: WorldId
): Record<PolygonFileId, PolygonFileSpec> {
  if (world === 'tickets') {
    return POLYGON_FILES;
  }

  if (world === 'game_server') {
    return {
      'Program.cs': {
        id: 'Program.cs',
        title: 'Program.cs',
        subtitle: 'Игровой сервер «Арена-Матч» · Загрузка 1 240 профилей турнира',
        battleNumber: 1,
        lines: [
          { line: 1, code: 'using System;' },
          { line: 2, code: 'using ArenaMatch.Tournament;' },
          { line: 3, code: '' },
          { line: 4, code: 'public static class MatchBatchLoader' },
          { line: 5, code: '{' },
          { line: 6, code: '    public static MatchReport LoadLobby(PlayerProfile[] queue)' },
          { line: 7, code: '    {' },
          { line: 8, code: '        var report = new MatchReport(total: 1240);' },
          { line: 9, code: '        foreach (var req in queue) // 1214 игроков + 26 битых профилей от "test"' },
          { line: 10, code: '        {' },
          {
            line: 11,
            code: '            // [СЛОТ 1] Без try внутри цикла один битый профиль роняет весь турнир',
            humanNote: '← поставить try ВНУТРИ foreach!',
          },
          {
            line: 12,
            code: '            var profile = Booking.Parse(req);       // Бой 1: FormatException (MMR = "два")',
            vulnerable: true,
            battleTag: 1,
            exceptionHint: 'FormatException',
          },
          {
            line: 13,
            code: '            var rating  = Pricing.Calculate(req);   // Бой 2: DivideByZeroException (squad = 0)',
            vulnerable: true,
            battleTag: 2,
            exceptionHint: 'DivideByZeroException',
          },
          {
            line: 14,
            code: '            var slot    = Seats.Assign(req);        // Бой 3: IndexOutOfRange + утечка сокета',
            vulnerable: true,
            battleTag: 3,
            exceptionHint: 'IndexOutOfRangeException',
          },
          {
            line: 15,
            code: '            var bonus   = Promo.Apply(req, rating); // Бой 4: NullReference + пустой catch {}',
            vulnerable: true,
            battleTag: 4,
            exceptionHint: 'NullReferenceException',
          },
          { line: 16, code: '            report.AdmitPlayer(req.Id, slot, bonus);' },
          { line: 17, code: '        }' },
          { line: 18, code: '        return report;' },
          { line: 19, code: '    }' },
          { line: 20, code: '}' },
        ],
      },
      'Booking.cs': {
        id: 'Booking.cs',
        title: 'Booking.cs',
        subtitle: 'Бой 1 «Перехват» · Разбор рейтинга MMR профиля игрока',
        battleNumber: 1,
        lines: [
          { line: 8, code: 'public static class Booking' },
          { line: 9, code: '{' },
          { line: 10, code: '    public static Order Parse(TicketRequest req)' },
          { line: 11, code: '    {' },
          {
            line: 12,
            code: '        int mmr = int.Parse(req.Place);     // мина #0x1F3: MMR = "два" вместо числа',
            vulnerable: true,
            battleTag: 1,
            humanNote: 'строка 12 · FormatException при разборе MMR',
            exceptionHint: 'FormatException',
          },
          { line: 13, code: '        int squadSize = int.Parse(req.CountRaw);' },
          {
            line: 14,
            code: '        int share = req.TotalSum / squadSize; // контратака: squadSize = 0 -> DivideByZeroException',
            vulnerable: true,
            battleTag: 1,
            humanNote: 'строка 14 · деление пула очков на 0 игроков',
            exceptionHint: 'DivideByZeroException',
          },
          { line: 15, code: '        return new Order(req.Id, mmr, squadSize, share);' },
          { line: 16, code: '    }' },
          { line: 17, code: '}' },
        ],
      },
      'Pricing.cs': {
        ...POLYGON_FILES['Pricing.cs'],
        subtitle: 'Бой 2 «Порядок» · Расчёт турнирного коэффициента и ошибка CS0160',
      },
      'Seats.cs': {
        ...POLYGON_FILES['Seats.cs'],
        subtitle: 'Бой 3 «Гарантия» · Слот арены (1..6) и освобождение сокета в finally',
      },
      'Promo.cs': {
        ...POLYGON_FILES['Promo.cs'],
        subtitle: 'Бой 4 «Честность» · Турнирный пропуск, пустой catch {} и throw;',
      },
    };
  }

  if (world === 'food_delivery') {
    return {
      'Program.cs': {
        id: 'Program.cs',
        title: 'Program.cs',
        subtitle: 'Диспетчерская доставки «Конвейер» · Пакет из 1 240 заказов пика',
        battleNumber: 1,
        lines: [
          { line: 1, code: 'using System;' },
          { line: 2, code: 'using Conveyor.Delivery;' },
          { line: 3, code: '' },
          { line: 4, code: 'public static class DispatchBatch' },
          { line: 5, code: '{' },
          { line: 6, code: '    public static BatchReport ProcessOrders(TicketRequest[] queue)' },
          { line: 7, code: '    {' },
          { line: 8, code: '        var report = new BatchReport(total: 1240);' },
          { line: 9, code: '        foreach (var req in queue) // 1214 заказов + 26 мин с битыми полями' },
          { line: 10, code: '        {' },
          {
            line: 11,
            code: '            // [СЛОТ 1] Без try внутри цикла один битый заказ останавливает отгрузку',
            humanNote: '← поставить try вокруг обработки одного заказа',
          },
          {
            line: 12,
            code: '            var order = Booking.Parse(req);       // Бой 1: FormatException (этаж = "два")',
            vulnerable: true,
            battleTag: 1,
            exceptionHint: 'FormatException',
          },
          {
            line: 13,
            code: '            var fee   = Pricing.Calculate(req);   // Бой 2: DivideByZeroException (курьеров = 0)',
            vulnerable: true,
            battleTag: 2,
            exceptionHint: 'DivideByZeroException',
          },
          {
            line: 14,
            code: '            var box   = Seats.Assign(req);        // Бой 3: IndexOutOfRange + пул соединений',
            vulnerable: true,
            battleTag: 3,
            exceptionHint: 'IndexOutOfRangeException',
          },
          {
            line: 15,
            code: '            var total = Promo.Apply(req, fee);    // Бой 4: NullReference + пустой catch {}',
            vulnerable: true,
            battleTag: 4,
            exceptionHint: 'NullReferenceException',
          },
          { line: 16, code: '            report.DispatchOrder(req.Id, box, total);' },
          { line: 17, code: '        }' },
          { line: 18, code: '        return report;' },
          { line: 19, code: '    }' },
          { line: 20, code: '}' },
        ],
      },
      'Booking.cs': {
        ...POLYGON_FILES['Booking.cs'],
        subtitle: 'Бой 1 «Перехват» · Разбор этажа и числа порций в заказе',
      },
      'Pricing.cs': {
        ...POLYGON_FILES['Pricing.cs'],
        subtitle: 'Бой 2 «Порядок» · Расчёт доставки на бригаду курьеров (CS0160)',
      },
      'Seats.cs': {
        ...POLYGON_FILES['Seats.cs'],
        subtitle: 'Бой 3 «Гарантия» · Термобоксы 1..6 и возврат коннекта в finally',
      },
      'Promo.cs': {
        ...POLYGON_FILES['Promo.cs'],
        subtitle: 'Бой 4 «Честность» · Купон горячего часа и честная запись в отчёт',
      },
    };
  }

  // clinic («МедСмена»)
  return {
    'Program.cs': {
      id: 'Program.cs',
      title: 'Program.cs',
      subtitle: 'Регистратура «МедСмена» · Очередь из 1 240 талонов утренней записи',
      battleNumber: 1,
      lines: [
        { line: 1, code: 'using System;' },
        { line: 2, code: 'using MedSmena.Registry;' },
        { line: 3, code: '' },
        { line: 4, code: 'public static class TalonRunner' },
        { line: 5, code: '{' },
        { line: 6, code: '    public static BatchReport IssueTalons(TicketRequest[] queue)' },
        { line: 7, code: '    {' },
        { line: 8, code: '        var report = new BatchReport(total: 1240);' },
        { line: 9, code: '        foreach (var req in queue) // 1214 пациентов + 26 битых записей' },
        { line: 10, code: '        {' },
        {
          line: 11,
          code: '            // [СЛОТ 1] Без try внутри цикла один битый талон блокирует регистратуру',
          humanNote: '← поставить try внутри цикла!',
        },
        {
          line: 12,
          code: '            var talon = Booking.Parse(req);       // Бой 1: FormatException (кабинет = "два")',
          vulnerable: true,
          battleTag: 1,
          exceptionHint: 'FormatException',
        },
        {
          line: 13,
          code: '            var quota = Pricing.Calculate(req);   // Бой 2: DivideByZeroException (врачей = 0)',
          vulnerable: true,
          battleTag: 2,
          exceptionHint: 'DivideByZeroException',
        },
        {
          line: 14,
          code: '            var slot  = Seats.Assign(req);        // Бой 3: IndexOutOfRange + утечка DbConnection',
          vulnerable: true,
          battleTag: 3,
          exceptionHint: 'IndexOutOfRangeException',
        },
        {
          line: 15,
          code: '            var code  = Promo.Apply(req, quota);  // Бой 4: NullReference + пустой catch {}',
          vulnerable: true,
          battleTag: 4,
          exceptionHint: 'NullReferenceException',
        },
        { line: 16, code: '            report.IssueTalon(req.Id, slot, code);' },
        { line: 17, code: '        }' },
        { line: 18, code: '        return report;' },
        { line: 19, code: '    }' },
        { line: 20, code: '}' },
      ],
    },
    'Booking.cs': {
      ...POLYGON_FILES['Booking.cs'],
      subtitle: 'Бой 1 «Перехват» · Разбор номера кабинета и окна приёма',
    },
    'Pricing.cs': {
      ...POLYGON_FILES['Pricing.cs'],
      subtitle: 'Бой 2 «Порядок» · Квота дежурных врачей и порядок catch (CS0160)',
    },
    'Seats.cs': {
      ...POLYGON_FILES['Seats.cs'],
      subtitle: 'Бой 3 «Гарантия» · Окна 1..6 регистратуры и закрытие БД в finally',
    },
    'Promo.cs': {
      ...POLYGON_FILES['Promo.cs'],
      subtitle: 'Бой 4 «Честность» · Проверка полиса ОМС без проглатывания ошибок',
    },
  };
}

export function getWorldPrologueLogs(world: WorldId) {
  if (world === 'tickets') return PROLOGUE_LOG_LINES;
  const labelMap: Record<WorldId, string> = {
    tickets: 'очередь билетов',
    game_server: 'лобби турнира',
    food_delivery: 'пакет доставки',
    clinic: 'реестр талонов',
  };
  return PROLOGUE_LOG_LINES.map((l, idx) =>
    idx === 1
      ? {
          ...l,
          text: `вставлено записей в ${labelMap[world]}: 26 · выгрузка: 0 байт`,
        }
      : l
  );
}
