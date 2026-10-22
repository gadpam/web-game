import {
  ARENA_ROUNDS,
  ArenaStage,
  RoundNumber,
  RoundSubPhase,
  simulateClash,
  TeamId,
} from './arenaData';

export interface RoundHistoryRecord {
  roundNumber: RoundNumber;
  attackTeam: TeamId;
  defenseTeam: TeamId;
  attackId: 'A1' | 'A2' | 'A3';
  defenseId: 'D1' | 'D2' | 'D3' | 'D4';
  rouletteCorrect: boolean;
  alphaDelta: number;
  betaDelta: number;
  outcome: 'REPELLED' | 'PARTIAL' | 'BREACHED';
}

export interface ArenaGameState {
  stage: ArenaStage;
  roundNumber: RoundNumber;
  subPhase: RoundSubPhase;
  alphaName: string;
  betaName: string;
  alphaScore: number;
  betaScore: number;
  unlockedRules: RoundNumber[];
  roundHistory: Partial<Record<RoundNumber, RoundHistoryRecord>>;

  // Боевой выбор Атаки
  attackTargetLine: number | null;
  selectedAttackId: 'A1' | 'A2' | 'A3' | null;
  attackLocked: boolean;

  // Боевой выбор Защиты
  defenseTargetLine: number | null;
  selectedDefenseId: 'D1' | 'D2' | 'D3' | 'D4' | null;
  defenseLocked: boolean;

  // Изолированный демо-просмотр («А что если бы выбрали другой вариант?») — не влияет на счёт!
  sandboxAttackId: 'A1' | 'A2' | 'A3' | null;
  sandboxDefenseId: 'D1' | 'D2' | 'D3' | 'D4' | null;

  // Шаг трассировки
  traceStepIdx: number;
  clashPointsAwarded: boolean;

  // Контрольный блиц-вопрос случайному участнику
  rouletteAnsweringTeam: TeamId;
  roulettePlayerNum: 1 | 2 | 3 | 4 | 5 | 6;
  rouletteSelectedOptionId: string | null;
  roulettePointsAwarded: boolean;

  // Таймер раунда и тема
  timerSec: number;
  timerMaxSec: number;
  timerRunning: boolean;
  lightTheme: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'cs_exception_arena_state_v3';
const CHANNEL_NAME = 'cs_exception_arena_channel_v3';

export function getTeamsForRound(roundNumber: RoundNumber): {
  attacker: TeamId;
  defender: TeamId;
} {
  return roundNumber % 2 === 1
    ? { attacker: 'ALPHA', defender: 'BETA' }
    : { attacker: 'BETA', defender: 'ALPHA' };
}

export function createInitialArenaState(): ArenaGameState {
  return {
    stage: 'welcome',
    roundNumber: 1,
    subPhase: 'planning',
    alphaName: 'КОМАНДА АЛЬФА',
    betaName: 'КОМАНДА БЕТА',
    alphaScore: 0,
    betaScore: 0,
    unlockedRules: [],
    roundHistory: {},

    attackTargetLine: null,
    selectedAttackId: null,
    attackLocked: false,

    defenseTargetLine: null,
    selectedDefenseId: null,
    defenseLocked: false,

    sandboxAttackId: null,
    sandboxDefenseId: null,

    traceStepIdx: 0,
    clashPointsAwarded: false,

    rouletteAnsweringTeam: 'BETA',
    roulettePlayerNum: 2,
    rouletteSelectedOptionId: null,
    roulettePointsAwarded: false,

    timerSec: 45,
    timerMaxSec: 45,
    timerRunning: false,
    lightTheme: false,
    soundEnabled: true,
  };
}

export type ArenaAction =
  | { type: 'START_GAME' }
  | { type: 'GO_TO_WELCOME' }
  | { type: 'GO_TO_FINALE' }
  | { type: 'SELECT_ROUND'; roundNumber: RoundNumber }
  | { type: 'PICK_ATTACK_LINE'; line: number }
  | { type: 'PICK_ATTACK_OPTION'; optionId: 'A1' | 'A2' | 'A3'; lockImmediately?: boolean }
  | { type: 'TOGGLE_ATTACK_LOCK' }
  | { type: 'PICK_DEFENSE_LINE'; line: number }
  | { type: 'PICK_DEFENSE_OPTION'; optionId: 'D1' | 'D2' | 'D3' | 'D4'; lockImmediately?: boolean }
  | { type: 'TOGGLE_DEFENSE_LOCK' }
  | { type: 'LAUNCH_CLASH' }
  | { type: 'STEP_TRACE'; stepIdx: number }
  | { type: 'OPEN_ROULETTE' }
  | { type: 'SET_ROULETTE_PLAYER'; playerNum: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'SET_ROULETTE_TEAM'; team: TeamId }
  | { type: 'ANSWER_ROULETTE'; optionId: string }
  | { type: 'OPEN_SUMMARY' }
  | { type: 'SET_SANDBOX_VARIANT'; attackId?: 'A1' | 'A2' | 'A3'; defenseId?: 'D1' | 'D2' | 'D3' | 'D4' }
  | { type: 'TICK_TIMER' }
  | { type: 'TOGGLE_TIMER' }
  | { type: 'RESET_TIMER' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'RESET_ALL' }
  | { type: 'SYNC_FROM_REMOTE'; payload: ArenaGameState };

function prepareRoundFields(roundNumber: RoundNumber): Partial<ArenaGameState> {
  const playerRotation: (1 | 2 | 3 | 4 | 5 | 6)[] = [2, 4, 5, 3];
  const nextPlayer = playerRotation[(roundNumber - 1) % playerRotation.length];
  const { defender } = getTeamsForRound(roundNumber);

  return {
    stage: 'round',
    roundNumber,
    subPhase: 'planning',
    attackTargetLine: null,
    selectedAttackId: null,
    attackLocked: false,
    defenseTargetLine: null,
    selectedDefenseId: null,
    defenseLocked: false,
    sandboxAttackId: null,
    sandboxDefenseId: null,
    traceStepIdx: 0,
    clashPointsAwarded: false,
    rouletteAnsweringTeam: defender,
    roulettePlayerNum: nextPlayer,
    rouletteSelectedOptionId: null,
    roulettePointsAwarded: false,
    timerSec: 45,
    timerMaxSec: 45,
    timerRunning: true,
  };
}

export function arenaReducer(
  state: ArenaGameState,
  action: ArenaAction
): ArenaGameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        ...prepareRoundFields(1),
      };

    case 'GO_TO_WELCOME':
      return {
        ...state,
        stage: 'welcome',
        timerRunning: false,
      };

    case 'GO_TO_FINALE':
      return {
        ...state,
        stage: 'finale',
        timerRunning: false,
      };

    case 'SELECT_ROUND':
      return {
        ...state,
        ...prepareRoundFields(action.roundNumber),
      };

    case 'PICK_ATTACK_LINE':
      if (state.subPhase !== 'planning' || state.attackLocked) return state;
      return {
        ...state,
        attackTargetLine: action.line,
      };

    case 'PICK_ATTACK_OPTION': {
      if (state.subPhase !== 'planning') return state;
      const round =
        ARENA_ROUNDS.find((r) => r.number === state.roundNumber) ||
        ARENA_ROUNDS[0];
      const opt = round.attackOptions.find((a) => a.id === action.optionId);
      return {
        ...state,
        attackTargetLine: opt ? opt.targetLine : state.attackTargetLine ?? 4,
        selectedAttackId: action.optionId,
        attackLocked: action.lockImmediately ? true : state.attackLocked,
      };
    }

    case 'TOGGLE_ATTACK_LOCK':
      if (state.subPhase !== 'planning' || !state.selectedAttackId) return state;
      return {
        ...state,
        attackLocked: !state.attackLocked,
      };

    case 'PICK_DEFENSE_LINE':
      if (state.subPhase !== 'planning' || state.defenseLocked) return state;
      return {
        ...state,
        defenseTargetLine: action.line,
      };

    case 'PICK_DEFENSE_OPTION': {
      if (state.subPhase !== 'planning') return state;
      const round =
        ARENA_ROUNDS.find((r) => r.number === state.roundNumber) ||
        ARENA_ROUNDS[0];
      const opt = round.defenseOptions.find((d) => d.id === action.optionId);
      return {
        ...state,
        defenseTargetLine: opt ? opt.targetLine : state.defenseTargetLine ?? 3,
        selectedDefenseId: action.optionId,
        defenseLocked: action.lockImmediately ? true : state.defenseLocked,
      };
    }

    case 'TOGGLE_DEFENSE_LOCK':
      if (state.subPhase !== 'planning' || !state.selectedDefenseId) return state;
      return {
        ...state,
        defenseLocked: !state.defenseLocked,
      };

    case 'LAUNCH_CLASH': {
      const round =
        ARENA_ROUNDS.find((r) => r.number === state.roundNumber) ||
        ARENA_ROUNDS[0];
      const finalAttackId = state.selectedAttackId || 'A1';
      const finalDefenseId = state.selectedDefenseId || 'D1';
      const sim = simulateClash(round, finalAttackId, finalDefenseId);
      const { attacker } = getTeamsForRound(state.roundNumber);

      let alphaScore = state.alphaScore;
      let betaScore = state.betaScore;

      if (!state.clashPointsAwarded) {
        if (attacker === 'ALPHA') {
          alphaScore += sim.attackPointsEarned;
          betaScore += sim.defensePointsEarned;
        } else {
          betaScore += sim.attackPointsEarned;
          alphaScore += sim.defensePointsEarned;
        }
      }

      const unlockedRules = state.unlockedRules.includes(state.roundNumber)
        ? state.unlockedRules
        : [...state.unlockedRules, state.roundNumber];

      // По умолчанию право ответа на блиц-вопрос получает сторона, выигравшая технический ход
      const roundTechWinner: TeamId =
        sim.outcome === 'BREACHED'
          ? attacker
          : attacker === 'ALPHA'
          ? 'BETA'
          : 'ALPHA';

      return {
        ...state,
        selectedAttackId: finalAttackId,
        selectedDefenseId: finalDefenseId,
        sandboxAttackId: finalAttackId,
        sandboxDefenseId: finalDefenseId,
        attackLocked: true,
        defenseLocked: true,
        subPhase: 'tracing',
        traceStepIdx: 0,
        clashPointsAwarded: true,
        rouletteAnsweringTeam: roundTechWinner,
        alphaScore,
        betaScore,
        unlockedRules,
        timerRunning: false,
      };
    }

    case 'STEP_TRACE':
      return {
        ...state,
        traceStepIdx: action.stepIdx,
      };

    case 'OPEN_ROULETTE':
      return {
        ...state,
        subPhase: 'roulette',
      };

    case 'SET_ROULETTE_PLAYER':
      return {
        ...state,
        roulettePlayerNum: action.playerNum,
      };

    case 'SET_ROULETTE_TEAM':
      if (state.roulettePointsAwarded) return state;
      return {
        ...state,
        rouletteAnsweringTeam: action.team,
      };

    case 'ANSWER_ROULETTE': {
      if (state.roulettePointsAwarded) {
        return {
          ...state,
          rouletteSelectedOptionId: action.optionId,
        };
      }

      const round =
        ARENA_ROUNDS.find((r) => r.number === state.roundNumber) ||
        ARENA_ROUNDS[0];
      const chosen = round.rouletteQuestion.options.find(
        (o) => o.id === action.optionId
      );
      const isCorrect = Boolean(chosen?.isCorrect);
      const bonusPool = Math.round(round.maxPoints / 2);

      const { attacker, defender } = getTeamsForRound(state.roundNumber);
      // Всегда берём настоящий боевой ход команд (selectedAttackId / selectedDefenseId), а не sandbox!
      const sim = simulateClash(
        round,
        state.selectedAttackId || 'A1',
        state.selectedDefenseId || 'D1'
      );

      let alphaDelta = 0;
      let betaDelta = 0;
      if (isCorrect) {
        if (state.rouletteAnsweringTeam === 'ALPHA') alphaDelta = bonusPool;
        else betaDelta = bonusPool;
      }

      const prevAlphaClash =
        attacker === 'ALPHA' ? sim.attackPointsEarned : sim.defensePointsEarned;
      const prevBetaClash =
        attacker === 'BETA' ? sim.attackPointsEarned : sim.defensePointsEarned;

      const record: RoundHistoryRecord = {
        roundNumber: state.roundNumber,
        attackTeam: attacker,
        defenseTeam: defender,
        attackId: state.selectedAttackId || 'A1',
        defenseId: state.selectedDefenseId || 'D1',
        rouletteCorrect: isCorrect,
        alphaDelta: prevAlphaClash + alphaDelta,
        betaDelta: prevBetaClash + betaDelta,
        outcome: sim.outcome,
      };

      return {
        ...state,
        rouletteSelectedOptionId: action.optionId,
        roulettePointsAwarded: true,
        alphaScore: state.alphaScore + alphaDelta,
        betaScore: state.betaScore + betaDelta,
        roundHistory: {
          ...state.roundHistory,
          [state.roundNumber]: record,
        },
      };
    }

    case 'OPEN_SUMMARY':
      return {
        ...state,
        subPhase: 'summary',
        sandboxAttackId: state.sandboxAttackId ?? state.selectedAttackId ?? 'A1',
        sandboxDefenseId: state.sandboxDefenseId ?? state.selectedDefenseId ?? 'D1',
      };

    case 'SET_SANDBOX_VARIANT':
      return {
        ...state,
        traceStepIdx: 0,
        sandboxAttackId:
          action.attackId ??
          state.sandboxAttackId ??
          state.selectedAttackId ??
          'A1',
        sandboxDefenseId:
          action.defenseId ??
          state.sandboxDefenseId ??
          state.selectedDefenseId ??
          'D1',
      };

    case 'TICK_TIMER':
      if (!state.timerRunning || state.timerSec <= 0) return state;
      return {
        ...state,
        timerSec: state.timerSec - 1,
        timerRunning: state.timerSec - 1 > 0,
      };

    case 'TOGGLE_TIMER':
      return {
        ...state,
        timerRunning: !state.timerRunning,
      };

    case 'RESET_TIMER':
      return {
        ...state,
        timerSec: state.timerMaxSec,
        timerRunning: true,
      };

    case 'TOGGLE_THEME':
      return {
        ...state,
        lightTheme: !state.lightTheme,
      };

    case 'TOGGLE_SOUND':
      return {
        ...state,
        soundEnabled: !state.soundEnabled,
      };

    case 'RESET_ALL':
      return createInitialArenaState();

    case 'SYNC_FROM_REMOTE':
      return {
        ...action.payload,
      };

    default:
      return state;
  }
}

export function loadArenaState(): ArenaGameState {
  if (typeof window === 'undefined') return createInitialArenaState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialArenaState();
    const parsed = JSON.parse(raw);
    return {
      ...createInitialArenaState(),
      ...parsed,
    };
  } catch {
    return createInitialArenaState();
  }
}

export function saveArenaState(state: ArenaGameState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function createArenaSyncChannel(
  onRemoteState: (next: ArenaGameState) => void
): {
  publish: (next: ArenaGameState) => void;
  close: () => void;
} {
  let bc: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.type === 'ARENA_SYNC') {
          onRemoteState(ev.data.state);
        }
      };
    } catch {
      bc = null;
    }
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY && ev.newValue) {
      try {
        onRemoteState(JSON.parse(ev.newValue));
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return {
    publish: (next: ArenaGameState) => {
      saveArenaState(next);
      if (bc) {
        try {
          bc.postMessage({ type: 'ARENA_SYNC', state: next });
        } catch {
          // ignore
        }
      }
    },
    close: () => {
      if (bc) bc.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    },
  };
}
