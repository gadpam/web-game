export interface DefenseTimingSegment {
  id: 1 | 2 | 3 | 4 | 5 | 6;
  rangeLabel: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  title: string;
  slides: number[];
  policy: 'normal' | 'never_cut' | 'cut_if_late';
  policyNote: string;
}

export interface DefenseSlideSpec {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  timeRange: string;
  startSec: number;
  endSec: number;
  segmentId: 1 | 2 | 3 | 4 | 5 | 6;
  onSlide: string;
  speech: string;
  extendedSpeech: string;
  rehearsalCheckpointId: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  visualCaption: string;
}

export const DEFENSE_TIMING_SEGMENTS: DefenseTimingSegment[] = [
  {
    id: 1,
    rangeLabel: '0:00–0:30',
    startSec: 0,
    endSec: 30,
    durationSec: 30,
    title: '1. Проблема: игра-проверка vs игра-изучение',
    slides: [1, 2],
    policy: 'normal',
    policyNote: 'Вход без раскачки: почему синтаксис try-catch знают, а защиту не ставят.',
  },
  {
    id: 2,
    rangeLabel: '0:30–1:10',
    startSec: 30,
    endSec: 70,
    durationSec: 40,
    title: '2. Мир и ночное вторжение',
    slides: [3, 4],
    policy: 'normal',
    policyNote: 'Ставка 1 240 человек к 09:00, вход под test/test, выгрузка 0 байт, 26 мин.',
  },
  {
    id: 3,
    rangeLabel: '1:10–1:40',
    startSec: 70,
    endSec: 100,
    durationSec: 30,
    title: '3. Победа («Отбито») и поворот («Атаки продолжатся»)',
    slides: [5, 6],
    policy: 'never_cut',
    policyNote: 'НИКОГДА НЕ РЕЗАТЬ: поворот «Защита от атаки ≠ защита от класса атак» — смысл урока.',
  },
  {
    id: 4,
    rangeLabel: '1:40–2:20',
    startSec: 100,
    endSec: 140,
    durationSec: 40,
    title: '4. Четыре боя, три бригады механизма и Щит 6/6',
    slides: [7, 8, 9],
    policy: 'cut_if_late',
    policyNote: 'РЕЗАТЬ ЗДЕСЬ ПРИ НЕХВАТКЕ ВРЕМЕНИ: можно пройти тезисно за 20 с.',
  },
  {
    id: 5,
    rangeLabel: '2:20–2:45',
    startSec: 140,
    endSec: 165,
    durationSec: 25,
    title: '5. Часы БВ-1 (1:1) и Старт в 09:00',
    slides: [10, 11],
    policy: 'normal',
    policyNote: 'Последние 5 минут в реальном времени и табло 1 240 клеток (дыра = −30 человек).',
  },
  {
    id: 6,
    rangeLabel: '2:45–3:00',
    startSec: 165,
    endSec: 180,
    durationSec: 15,
    title: '6. Итог числом (1210 из 1240)',
    slides: [12],
    policy: 'normal',
    policyNote: 'Точка выступления: итог урока измеряется не очками, а числом людей с билетами.',
  },
];

export const DEFENSE_SLIDE_SPECS: DefenseSlideSpec[] = [
  {
    number: 1,
    timeRange: '0:00–0:15',
    startSec: 0,
    endSec: 15,
    segmentId: 1,
    onSlide: 'АПТАЙМ · НОЧНАЯ СМЕНА',
    speech:
      'Урок на 90 минут. Тема — механизм исключений. Формат — ночная смена диспетчерской службы.',
    extendedSpeech:
      'Тема урока — механизм исключений. Тема, которую обычно проходят за двадцать минут: показали try, показали catch, дали задачу.',
    rehearsalCheckpointId: 1,
    visualCaption: 'Тёмный приборный экран диспетчерской · ПОИТ, 3 курс · 03:00 → 09:00',
  },
  {
    number: 2,
    timeRange: '0:15–0:30',
    startSec: 15,
    endSec: 30,
    segmentId: 1,
    onSlide: 'ИГРА-ПРОВЕРКА  →  [ ИГРА-ИЗУЧЕНИЕ ]',
    speech:
      'Обычная предметная игра проверяет выученное. Мне нужна была игра, которая учит — производит понятие в момент нужды.',
    extendedSpeech:
      'Синтаксис осваивается быстро, а понимание — нет: ловят Exception, глотают ошибку и не читают стек. Поэтому урок построен вокруг «зачем и где»: Нужда → Инструмент → Применение → Последствие → Имя.',
    rehearsalCheckpointId: 1,
    visualCaption: 'Сравнение двух дидактических схем: вторая плита подсвечена',
  },
  {
    number: 3,
    timeRange: '0:30–0:50',
    startSec: 30,
    endSec: 50,
    segmentId: 2,
    onSlide: '02:07:44  auth  сессия "test" открыта · В очереди: 1 240',
    speech:
      'Три часа ночи. В сервис вошли с забытой тестовой учётной записи. В девять утра — старт, тысяча двести сорок человек в очереди.',
    extendedSpeech:
      'Смотрите: три часа ночи, диспетчерская службы продажи билетов «Партер». В сервис вошли с забытой тестовой учётной записи test/test с правами администратора. В девять утра старт, в очереди тысяча двести сорок человек.',
    rehearsalCheckpointId: 1,
    visualCaption: 'Лента лога 02:07–02:51 · красная строка тикета P1 #7712',
  },
  {
    number: 4,
    timeRange: '0:50–1:10',
    startSec: 50,
    endSec: 70,
    segmentId: 2,
    onSlide: 'ВЫГРУЗКА — 0 БАЙТ  ·  ОСТАВЛЕНО 26 ЗАПИСЕЙ',
    speech:
      'Он ничего не украл. Он оставил двадцать шесть записей, на которых сервис обязан упасть.',
    extendedSpeech:
      'Выгрузка — ноль байт: ничего не украли и ничего не удалили. Оставили двадцать шесть записей с испорченными полями ("два", 0, 7 при 6, пусто), на которых пакетная очередь обязана упасть.',
    rehearsalCheckpointId: 2,
    visualCaption: 'Два контрастных прибора: 0 БАЙТ (зелёный) и 26 ЗАПИСЕЙ-МИН (красный)',
  },
  {
    number: 5,
    timeRange: '1:10–1:25',
    startSec: 70,
    endSec: 85,
    segmentId: 3,
    onSlide: 'ОТБИТО · 1214 ИЗ 1240 БИЛЕТОВ ВЫДАНО · В ОТЧЁТ: 26',
    speech:
      'На десятой минуте атаку отбивают. Это заслуженная победа: группа нашла тип, поставила защиту, проверила запуском.',
    extendedSpeech:
      'На десятой минуте атаку отбивают. Это важный момент: группа получает заслуженную победу — нашла тип, поставила защиту try-catch-finally, проверила запуском. Двенадцатьсот четырнадцать билетов выдано.',
    rehearsalCheckpointId: 3,
    visualCaption: 'Зелёное табло 1214 из 1240 · тяжёлый штамп ОТБИТО',
  },
  {
    number: 6,
    timeRange: '1:25–1:40',
    startSec: 85,
    endSec: 100,
    segmentId: 3,
    onSlide: 'АТАКИ ПРОДОЛЖАТСЯ · 4 НАПРАВЛЕНИЯ ПРОБ',
    speech:
      'Через три минуты лог оживает снова. Он сменил способ. Вы закрыли одну дверь — он идёт в остальные. Защита от атаки не равна защите от класса атак.',
    extendedSpeech:
      'И через три минуты лог оживает снова. Противник сменил способ. Вы закрыли одну дверь — он идёт в остальные. Вот главный учебный сдвиг урока: защита от атаки не равна защите от класса атак.',
    rehearsalCheckpointId: 4,
    visualCaption: 'Крупная строка АТАКИ ПРОДОЛЖАТСЯ во всю ширину · 4 направления проб',
  },
  {
    number: 7,
    timeRange: '1:40–1:55',
    startSec: 100,
    endSec: 115,
    segmentId: 4,
    onSlide: 'БРИГАДЫ МЕХАНИЗМА:  ▲ TRY   ·   ⬡ CATCH   ·   ■ FINALLY',
    speech:
      'Отсюда — три бригады: TRY, CATCH, FINALLY. Это не ряды, это части механизма, который группа только что собрала руками.',
    extendedSpeech:
      'Отсюда же — три бригады. Они называются не по рядам, а по частям механизма, который группа только что собрала руками: TRY, CATCH, FINALLY. Деление на команды не объявляет преподаватель — к нему приводит сюжет.',
    rehearsalCheckpointId: 5,
    visualCaption: 'Три бронеплиты бригад с латунными шильдиками и клеймами форм (▲ ⬡ ■)',
  },
  {
    number: 8,
    timeRange: '1:55–2:08',
    startSec: 115,
    endSec: 128,
    segmentId: 4,
    onSlide: '8 МИНУТ БОЯ: РАЗВЕДКА → ОБЪЯВЛЕНИЕ → КАРТА → ОБМЕН → КОНТРАТАКА → ВЕРДИКТ',
    speech:
      'Восемь минут боя: разведка, объявление стоя, карта, обмен с живым запуском на полигоне, контратака, вердикт арбитра.',
    extendedSpeech:
      'Отсюда — четыре боя по 8 минут. Шесть тактов по кругу: разведка, объявление стоя у экрана, карта из трёх полей, обмен с живым запуском на полигоне, контратака одним ходом и вердикт арбитра.',
    rehearsalCheckpointId: 6,
    visualCaption: 'Схема 6 тактов боя по кругу и штампы живого запуска ПРОБИЛА / ОТБИТА',
  },
  {
    number: 9,
    timeRange: '2:08–2:20',
    startSec: 128,
    endSec: 140,
    segmentId: 4,
    onSlide: 'ЩИТ 6/6: АНАТОМИЯ · МЕХАНИЗМ · ПЕРЕХВАТ · ПОРЯДОК · ГАРАНТИЯ · ЧЕСТНОСТЬ',
    speech:
      'Шесть правил собираются по ходу смены. Пока щит не собран целиком, кнопка СТАРТ физически заблокирована.',
    extendedSpeech:
      'Шесть правил щита собираются по ходу смены: два из завязки и четыре из боёв. Пока щит не собран, старт не нажимается. Это встроенная ревизия в тот момент, когда она нужнее всего.',
    rehearsalCheckpointId: 7,
    visualCaption: 'Шесть строк Щита смены и предохранитель кнопки СТАРТ 09:00',
  },
  {
    number: 10,
    timeRange: '2:20–2:32',
    startSec: 140,
    endSec: 152,
    segmentId: 5,
    onSlide: 'ПРИБОР БВ-1 · ЧАСЫ СМЕНЫ 03:00 → 09:00 · 08:55 В РЕАЛЬНОМ ВРЕМЕНИ',
    speech:
      'Часы урока — это часы смены: с трёх ночи до девяти утра. Последние пять минут идут секунда в секунду с реальным временем.',
    extendedSpeech:
      'В фазе «Пять минут до» прибор БВ-1 показывает 08:55 и отсчитывает 5:00 в реальном времени 1:1. Впервые за урок игровые часы и настоящие совпадают.',
    rehearsalCheckpointId: 7,
    visualCaption: 'Корпус прибора БВ-1 с семисегментным индикатором 08:55 и шкалой с красной зоной',
  },
  {
    number: 11,
    timeRange: '2:32–2:45',
    startSec: 152,
    endSec: 165,
    segmentId: 5,
    onSlide: 'ТАБЛО 1 240 КЛЕТОК · ОДНА ПОПЫТКА · ПРОБИТАЯ ВОЛНА = −30 ЧЕЛОВЕК',
    speech:
      'В 09:00 — старт. Одна попытка. Четыре волны одновременно. Каждая пробитая волна — тридцать человек без билета, дыра видна с последнего ряда.',
    extendedSpeech:
      'В девять ноль-ноль — старт. Одна попытка. Каждая пробитая волна — тридцать человек без билета. Дыра на табло из 1 240 клеток видна с последнего ряда без единого пояснения.',
    rehearsalCheckpointId: 8,
    visualCaption: 'Матрица 1 240 клеток с наглядной красной брешью (−30 человек на волне 2)',
  },
  {
    number: 12,
    timeRange: '2:45–3:00',
    startSec: 165,
    endSec: 180,
    segmentId: 6,
    onSlide: 'ПРОТОКОЛ СМЕНЫ · БИЛЕТОВ ВЫДАНО: 1210 ИЗ 1240',
    speech:
      'Итог урока измеряется не очками, а числом людей, которые ушли с билетами. Спасибо.',
    extendedSpeech:
      'В конце на табло и в одностраничном протоколе смены остаётся одно число: сколько людей ушли с билетами — 1210 из 1240. Итог урока измеряется не очками, а этим числом. Спасибо.',
    rehearsalCheckpointId: 8,
    visualCaption: 'Одностраничный Протокол смены · крупная строка 1210 из 1240',
  },
];

export function getSlideForElapsedSeconds(elapsedSec: number): DefenseSlideSpec {
  const clamped = Math.max(0, Math.min(179, Math.floor(elapsedSec)));
  return (
    DEFENSE_SLIDE_SPECS.find(
      (s) => clamped >= s.startSec && clamped < s.endSec
    ) || DEFENSE_SLIDE_SPECS[DEFENSE_SLIDE_SPECS.length - 1]
  );
}

export function getTimingSegmentForElapsedSeconds(
  elapsedSec: number
): DefenseTimingSegment {
  const clamped = Math.max(0, Math.min(179, Math.floor(elapsedSec)));
  return (
    DEFENSE_TIMING_SEGMENTS.find(
      (seg) => clamped >= seg.startSec && clamped < seg.endSec
    ) || DEFENSE_TIMING_SEGMENTS[DEFENSE_TIMING_SEGMENTS.length - 1]
  );
}

export function formatDefenseClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
