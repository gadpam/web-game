import { POLYGON_FILES, PROLOGUE_LOG_LINES } from './constants';
import { PolygonFileId, PolygonFileSpec, WorldId } from '../types/game';

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
            code: '            var profile = Booking.Parse(req);       // Бой 1: FormatException (MMR = "pro")',
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
      'Pricing.cs': POLYGON_FILES['Pricing.cs'],
      'Seats.cs': POLYGON_FILES['Seats.cs'],
      'Promo.cs': POLYGON_FILES['Promo.cs'],
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
      'Booking.cs': POLYGON_FILES['Booking.cs'],
      'Pricing.cs': POLYGON_FILES['Pricing.cs'],
      'Seats.cs': POLYGON_FILES['Seats.cs'],
      'Promo.cs': POLYGON_FILES['Promo.cs'],
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
    'Booking.cs': POLYGON_FILES['Booking.cs'],
    'Pricing.cs': POLYGON_FILES['Pricing.cs'],
    'Seats.cs': POLYGON_FILES['Seats.cs'],
    'Promo.cs': POLYGON_FILES['Promo.cs'],
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
