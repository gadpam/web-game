export type BrigadeId = 'TRY' | 'CATCH' | 'FINALLY';

export type BrigadeShape = 'triangle' | 'hexagon' | 'square';

export type BattleRole = 'АТАКА' | 'ЗАЩИТА' | 'АРБИТР';

export type MemberRole =
  | 'аналитик'
  | 'картёр'
  | 'чтец'
  | 'писарь'
  | 'докладчик'
  | 'арбитр';

export type AppMode = 'ПОЛНЫЙ' | 'РУЧНОЙ' | 'АВТОНОМНЫЙ';

export type ThemeMode = 'night' | 'light' | 'paper';

export type ScreenView =
  | 'hall'
  | 'brigade'
  | 'arbiter'
  | 'host'
  | 'materials';

export type PhaseId =
  | 'prologue_1'
  | 'prologue_2'
  | 'prologue_3'
  | 'prologue_4'
  | 'battle_1'
  | 'battle_2'
  | 'lull'
  | 'battle_3'
  | 'battle_4'
  | 'practice'
  | 'five_min'
  | 'start_0900'
  | 'closed'
  | 'homework';

export type BattleTactId =
  | 'recon'
  | 'announce'
  | 'card'
  | 'exchange'
  | 'counter'
  | 'verdict';

export type WaveDirection = 'формат' | 'порядок' | 'ресурс' | 'след';

export type PolygonFileId =
  | 'Program.cs'
  | 'Booking.cs'
  | 'Pricing.cs'
  | 'Seats.cs'
  | 'Promo.cs';

export type WorldId = 'tickets' | 'game_server' | 'food_delivery' | 'clinic';

export interface ShieldRule {
  id: number;
  code: string;
  title: string;
  text: string;
  source: string;
  unlocked: boolean;
}

export interface Brigade {
  id: BrigadeId;
  name: BrigadeId;
  shape: BrigadeShape;
  shapeSymbol: '▲' | '⬡' | '■';
  subtitle: string;
  score: number;
  lamps: [boolean, boolean, boolean, boolean]; // 4 fuse lamps
  battleRole: BattleRole;
  assignedWave: WaveDirection;
  attacksWon: number;
  defensesWon: number;
}

export interface Player {
  id: string;
  name: string;
  brigade: BrigadeId;
  role: MemberRole;
  connected: boolean;
  joinedAt: string;
}

export interface Card {
  id: string;
  roundNumber: number;
  tact: BattleTactId;
  authorBrigade: BrigadeId;
  authorRole: MemberRole;
  cardType: 'атака' | 'защита' | 'контратака';
  file: PolygonFileId;
  line: number;
  exceptionType: string;
  statement: string;
  patchSlot?: 1 | 2 | 3 | 4;
  timestamp: string;
  valid: boolean;
  validationNote?: string;
}

export interface RunResult {
  id: string;
  roundNumber: number;
  timestamp: string;
  file: PolygonFileId;
  targetLine: number;
  exceptionType: string;
  appliedSlots: number[];
  outcome: 'ПРОБИЛА' | 'ОТБИТА';
  handlerTriggered: string | null;
  totalRecords: number;
  processedRecords: number;
  reportedMines: number;
  swallowedMines: number;
  openConnections: number;
  stackPreserved: boolean;
  compilerError: string | null;
  consoleLog: string[];
  durationMs: number;
}

export interface Verdict {
  id: string;
  roundNumber: number;
  result: 'ПРОБИЛА' | 'ОТБИТА' | 'НЕ ПРИНЯТА';
  rejectReason?: string;
  attackerDelta: number;
  defenderDelta: number;
  arbiterDelta: number;
  missedSpotNote?: string;
  journalLine: string;
  oralFormula: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  shiftTime: string;
  roundNumber: number | null;
  actor: string;
  claimed: string;
  verified: string;
  result: string;
  cardId?: string;
  verdictId?: string;
}

export interface WaveState {
  id: 1 | 2 | 3 | 4;
  direction: WaveDirection;
  title: string;
  exceptionType: string;
  file: PolygonFileId;
  line: number;
  holder: BrigadeId | 'АРБИТР';
  rewardCoins: 3 | 4 | 5;
  patchSlotRequired: 1 | 2 | 3 | 4;
  selectedSlot: 1 | 2 | 3 | 4 | null;
  status: 'ожидание' | 'идёт' | 'отбита' | 'пробила';
  lostPeople: number; // 0 or 30
}

export interface QueueState {
  total: number; // 1240
  issued: number;
  lost: number;
  reported: number;
  started: boolean;
  completed: boolean;
  slowGroupMode: boolean; // волны по одной с паузой 30 с
  currentWaveStep: number; // 0..4
  lossReasons: string[];
}

export interface BattleRound {
  number: 1 | 2 | 3 | 4;
  codeName: 'Перехват' | 'Порядок' | 'Гарантия' | 'Честность';
  waveDesc: string;
  topicDesc: string;
  holdGoal: string;
  shiftClock: string;
  defaultFile: PolygonFileId;
  targetLine: number;
  targetException: string;
  attackLineCode: string;
  rewardText: string;
  attacker: BrigadeId;
  defender: BrigadeId;
  arbiter: BrigadeId;
  tact: BattleTactId;
  tactRemainingSec: number;
  tactRunning: boolean;
  activeSlots: number[];
  counterAttackMode: string | null;
  attackCard: Card | null;
  defenseCard: Card | null;
  counterCard: Card | null;
  lastRun: RunResult | null;
  verdict: Verdict | null;
  appealUsed: boolean;
  appealRemainingSec: number;
  missedSpotAwarded: boolean;
  probedCount: number;
  repelledCount: number;
}

export interface PrologueState {
  pollVotes: {
    broken: number;
    intrusion: number;
    dataLost: number;
  };
  pollRevealed: boolean;
  batchCrashed: boolean;
  matchedMines: Record<string, string>; // mineId -> exceptionType
  hierarchyShown: boolean;
  mechanismParts: {
    TRY: boolean;
    CATCH: boolean;
    FINALLY: boolean;
  };
  batchRepelled: boolean;
  secondWaveTriggered: boolean;
}

export interface SessionState {
  code: string;
  hostPin: string;
  startedAt: string;
  phase: PhaseId;
  shiftClock: string;
  remainingToStart: string;
  phaseRemainingSec: number;
  timerRunning: boolean;
  mode: AppMode;
  theme: ThemeMode;
  world: WorldId;
  screensDimmedForStandingReport: boolean;
  selectedPolygonFile: PolygonFileId;
  selectedLine: number;
  shield: ShieldRule[];
  brigades: Record<BrigadeId, Brigade>;
  players: Player[];
  currentBattleNumber: 1 | 2 | 3 | 4;
  battles: Record<1 | 2 | 3 | 4, BattleRound>;
  prologue: PrologueState;
  waves: WaveState[];
  queue: QueueState;
  journal: JournalEntry[];
  nominations: {
    mostPreciseAnalysis: BrigadeId;
    bestJournal: BrigadeId;
    honestMistake: BrigadeId;
  };
  lastGesture: {
    type: 'card-drop' | 'verdict-stamp' | 'lamp-burn' | 'plate-rise';
    label?: string;
    outcome?: 'ПРОБИЛА' | 'ОТБИТА';
    timestamp: number;
  } | null;
}
