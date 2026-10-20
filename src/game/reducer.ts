import {
  BATTLE_TACTS,
  PHASES,
  POLYGON_FILES,
  PROLOGUE_MINES,
} from './constants';
import {
  buildArbiterOralFormula,
  computeBattle4RolesByRating,
  computeNominations,
  createInitialSession,
  evaluatePolygonRun,
  evaluatePracticeSuite,
  evaluateStart0900Waves,
  isShieldComplete,
  syncBrigadeRolesWithBattle,
  validateCardInput,
} from './engine';
import {
  AppMode,
  BattleRole,
  BattleTactId,
  BrigadeId,
  Card,
  MemberRole,
  PhaseId,
  PolygonFileId,
  SessionState,
  ThemeMode,
  WorldId,
} from '../types/game';

export type GameAction =
  | { type: 'SET_PHASE'; phase: PhaseId }
  | { type: 'NEXT_PHASE' }
  | { type: 'PREV_PHASE' }
  | { type: 'SET_TACT'; tact: BattleTactId }
  | { type: 'NEXT_TACT' }
  | { type: 'TOGGLE_TIMER' }
  | { type: 'ADD_TIME_30S' }
  | { type: 'TICK_SECOND' }
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_THEME'; theme: ThemeMode }
  | { type: 'SET_WORLD'; world: WorldId }
  | { type: 'TOGGLE_DIM_SCREENS' }
  | { type: 'SELECT_POLYGON_FILE'; file: PolygonFileId }
  | { type: 'SELECT_LINE'; line: number }
  | { type: 'TOGGLE_PATCH_SLOT'; slot: 1 | 2 | 3 | 4 }
  | { type: 'SET_COUNTER_VECTOR'; vector: string | null }
  | {
      type: 'SUBMIT_CARD';
      brigade: BrigadeId;
      role: MemberRole;
      cardType: 'атака' | 'защита' | 'контратака';
      file: PolygonFileId;
      line: number;
      exceptionType: string;
      statement: string;
      patchSlot?: 1 | 2 | 3 | 4;
    }
  | { type: 'RUN_POLYGON' }
  | {
      type: 'SUBMIT_VERDICT';
      result: 'ПРОБИЛА' | 'ОТБИТА' | 'НЕ ПРИНЯТА';
      legalAttackBonus?: boolean;
      counterHeldBonus?: boolean;
      rejectReason?: string;
      journalLine: string;
    }
  | { type: 'AWARD_MISSED_SPOT'; note: string }
  | { type: 'START_APPEAL' }
  | { type: 'TOGGLE_ARBITER_STOP'; reason?: string }
  | { type: 'TOGGLE_PRACTICE_SLOT'; slot: 1 | 2 | 3 | 4 }
  | {
      type: 'UPDATE_PRACTICE_CONFIG';
      customExceptionName?: string;
      includeInnerException?: boolean;
      includeRecordIdProperty?: boolean;
    }
  | { type: 'RUN_PRACTICE_SUITE' }
  | {
      type: 'ADJUST_BRIGADE_SCORE';
      brigade: BrigadeId;
      delta: number;
      reason: string;
    }
  | { type: 'TOGGLE_SHIELD_RULE'; ruleId: number }
  | { type: 'UNLOCK_ALL_SHIELD' }
  | { type: 'PROLOGUE_VOTE'; option: 'broken' | 'intrusion' | 'dataLost' }
  | { type: 'PROLOGUE_REVEAL_POLL' }
  | { type: 'PROLOGUE_CRASH_BATCH' }
  | { type: 'PROLOGUE_MATCH_MINE'; mineId: string; exceptionType: string }
  | { type: 'PROLOGUE_TOGGLE_MECHANISM'; part: BrigadeId }
  | { type: 'PROLOGUE_REPEL_BATCH' }
  | { type: 'PROLOGUE_TRIGGER_SECOND_WAVE' }
  | { type: 'SET_BATTLE4_LEADER_ROLE'; role: BattleRole }
  | { type: 'SET_WAVE_SLOT'; waveId: 1 | 2 | 3 | 4; slot: 1 | 2 | 3 | 4 | null }
  | { type: 'SET_WAVE_HOLDER'; waveId: 1 | 2 | 3 | 4; holder: BrigadeId | 'АРБИТР' }
  | { type: 'TOGGLE_SLOW_GROUP_MODE' }
  | { type: 'TRIGGER_START_0900' }
  | { type: 'STEP_WAVE_0900' }
  | {
      type: 'ADD_JOURNAL_ENTRY';
      actor: string;
      claimed: string;
      verified: string;
      result: string;
    }
  | {
      type: 'JOIN_PLAYER';
      name: string;
      brigade: BrigadeId;
      role: MemberRole;
    }
  | { type: 'IMPORT_SESSION_STATE'; imported: SessionState }
  | { type: 'LOAD_DEMO_1210' }
  | { type: 'RESET_SESSION' };

function applyPhaseChange(state: SessionState, nextPhaseId: PhaseId): SessionState {
  const phaseMeta = PHASES.find((p) => p.id === nextPhaseId) || PHASES[0];
  let currentBattleNumber = state.currentBattleNumber;
  let brigades = { ...state.brigades };
  let battles = { ...state.battles };
  let selectedPolygonFile = state.selectedPolygonFile;
  let selectedLine = state.selectedLine;

  if (phaseMeta.battleNumber) {
    currentBattleNumber = phaseMeta.battleNumber;
    if (currentBattleNumber === 4) {
      const roles4 = computeBattle4RolesByRating(brigades, 'ЗАЩИТА');
      battles = {
        ...battles,
        4: {
          ...battles[4],
          attacker: roles4.attacker,
          defender: roles4.defender,
          arbiter: roles4.arbiter,
        },
      };
    }
    const activeBattle = battles[currentBattleNumber];
    brigades = syncBrigadeRolesWithBattle(brigades, activeBattle);
    selectedPolygonFile = activeBattle.defaultFile;
    selectedLine = activeBattle.targetLine;
  }

  return {
    ...state,
    phase: nextPhaseId,
    shiftClock: phaseMeta.shiftClock,
    remainingToStart: phaseMeta.remainingToStart,
    phaseRemainingSec: phaseMeta.durationSec,
    currentBattleNumber,
    brigades,
    battles,
    selectedPolygonFile,
    selectedLine,
    lastGesture: {
      type: 'plate-rise',
      label: phaseMeta.shortTitle,
      timestamp: Date.now(),
    },
  };
}

export function gameReducer(state: SessionState, action: GameAction): SessionState {
  switch (action.type) {
    case 'SET_PHASE': {
      return applyPhaseChange(state, action.phase);
    }

    case 'NEXT_PHASE': {
      const idx = PHASES.findIndex((p) => p.id === state.phase);
      const nextIdx = Math.min(PHASES.length - 1, idx + 1);
      return applyPhaseChange(state, PHASES[nextIdx].id);
    }

    case 'PREV_PHASE': {
      const idx = PHASES.findIndex((p) => p.id === state.phase);
      const prevIdx = Math.max(0, idx - 1);
      return applyPhaseChange(state, PHASES[prevIdx].id);
    }

    case 'SET_TACT': {
      const tactMeta = BATTLE_TACTS.find((t) => t.id === action.tact) || BATTLE_TACTS[0];
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const dimScreens = action.tact === 'announce' || action.tact === 'verdict';
      return {
        ...state,
        screensDimmedForStandingReport: dimScreens,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            tact: action.tact,
            tactRemainingSec: tactMeta.durationSec,
          },
        },
      };
    }

    case 'NEXT_TACT': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const idx = BATTLE_TACTS.findIndex((t) => t.id === battle.tact);
      const nextIdx = (idx + 1) % BATTLE_TACTS.length;
      const nextTact = BATTLE_TACTS[nextIdx];
      const dimScreens = nextTact.id === 'announce' || nextTact.id === 'verdict';
      return {
        ...state,
        screensDimmedForStandingReport: dimScreens,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            tact: nextTact.id,
            tactRemainingSec: nextTact.durationSec,
          },
        },
      };
    }

    case 'TOGGLE_TIMER': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const nextRunning = !state.timerRunning;
      return {
        ...state,
        timerRunning: nextRunning,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            tactRunning: nextRunning,
          },
        },
      };
    }

    case 'ADD_TIME_30S': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      return {
        ...state,
        phaseRemainingSec: state.phaseRemainingSec + 30,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            tactRemainingSec: battle.tactRemainingSec + 30,
          },
        },
      };
    }

    case 'TICK_SECOND': {
      if (!state.timerRunning) return state;
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      if (battle.arbiterStopActive) return state;

      const nextPhaseSec = Math.max(0, state.phaseRemainingSec - 1);
      let nextTactSec = Math.max(0, battle.tactRemainingSec - 1);
      let nextTactId = battle.tact;

      const isBattlePhase = state.phase.startsWith('battle_');
      if (isBattlePhase && nextTactSec === 0) {
        const curIdx = BATTLE_TACTS.findIndex((t) => t.id === battle.tact);
        if (curIdx < BATTLE_TACTS.length - 1) {
          const nextMeta = BATTLE_TACTS[curIdx + 1];
          nextTactId = nextMeta.id;
          nextTactSec = nextMeta.durationSec;
        }
      }

      let shiftClock = state.shiftClock;
      if (state.phase === 'five_min') {
        const elapsed = 300 - nextPhaseSec;
        const min = 55 + Math.min(4, Math.floor(elapsed / 60));
        const sec = elapsed % 60;
        shiftClock = `08:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      }

      return {
        ...state,
        shiftClock,
        phaseRemainingSec: nextPhaseSec,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            tact: nextTactId,
            tactRemainingSec: nextTactSec,
            appealRemainingSec:
              battle.appealUsed && battle.appealRemainingSec > 0
                ? battle.appealRemainingSec - 1
                : battle.appealRemainingSec,
          },
        },
      };
    }

    case 'SET_MODE': {
      return { ...state, mode: action.mode };
    }

    case 'SET_THEME': {
      return { ...state, theme: action.theme };
    }

    case 'SET_WORLD': {
      return { ...state, world: action.world };
    }

    case 'TOGGLE_DIM_SCREENS': {
      return {
        ...state,
        screensDimmedForStandingReport: !state.screensDimmedForStandingReport,
      };
    }

    case 'SELECT_POLYGON_FILE': {
      const firstLine = POLYGON_FILES[action.file]?.lines[0]?.line || 1;
      return {
        ...state,
        selectedPolygonFile: action.file,
        selectedLine: firstLine,
      };
    }

    case 'SELECT_LINE': {
      return {
        ...state,
        selectedLine: action.line,
      };
    }

    case 'TOGGLE_PATCH_SLOT': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const exists = battle.activeSlots.includes(action.slot);
      const activeSlots = exists
        ? battle.activeSlots.filter((s) => s !== action.slot)
        : [...battle.activeSlots, action.slot].sort();

      return {
        ...state,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            activeSlots,
          },
        },
      };
    }

    case 'SET_COUNTER_VECTOR': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      return {
        ...state,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            counterAttackMode: action.vector,
          },
        },
      };
    }

    case 'SUBMIT_CARD': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const check = validateCardInput({
        line: action.line,
        exceptionType: action.exceptionType,
        statement: action.statement,
      });

      const newCard: Card = {
        id: `card-${Date.now()}`,
        roundNumber: bNum,
        tact: battle.tact,
        authorBrigade: action.brigade,
        authorRole: action.role,
        cardType: action.cardType,
        file: action.file,
        line: action.line,
        exceptionType: action.exceptionType.trim(),
        statement: action.statement.trim(),
        patchSlot: action.patchSlot,
        timestamp: state.shiftClock,
        valid: check.valid,
        validationNote: check.reason,
      };

      let activeSlots = [...battle.activeSlots];
      if (action.patchSlot && !activeSlots.includes(action.patchSlot)) {
        activeSlots = [...activeSlots, action.patchSlot].sort();
      }

      const updatedBattle = {
        ...battle,
        activeSlots,
        attackCard: action.cardType === 'атака' ? newCard : battle.attackCard,
        defenseCard: action.cardType === 'защита' ? newCard : battle.defenseCard,
        counterCard: action.cardType === 'контратака' ? newCard : battle.counterCard,
      };

      const journalEntry = {
        id: `j-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: bNum,
        actor: `${action.brigade} (${action.role})`,
        claimed: `Карта [${action.cardType}]: ${action.file}:${action.line} · ${action.exceptionType} — «${action.statement.trim()}»`,
        verified: check.valid ? 'Принята по регламенту' : `Отклонена: ${check.reason}`,
        result: check.valid ? 'КАРТА В БОЮ' : 'НЕ ПРИНЯТА',
        cardId: newCard.id,
      };

      return {
        ...state,
        selectedPolygonFile: action.file,
        selectedLine: action.line,
        battles: {
          ...state.battles,
          [bNum]: updatedBattle,
        },
        journal: [journalEntry, ...state.journal],
        lastGesture: {
          type: 'card-drop',
          label: `${action.brigade} · СТРОКА ${action.line}`,
          timestamp: Date.now(),
        },
      };
    }

    case 'RUN_POLYGON': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const runResult = evaluatePolygonRun(
        bNum,
        battle.activeSlots,
        battle.counterAttackMode
      );

      const updatedBattle = {
        ...battle,
        lastRun: runResult,
        probedCount:
          runResult.outcome === 'ПРОБИЛА' ? battle.probedCount + 1 : battle.probedCount,
        repelledCount:
          runResult.outcome === 'ОТБИТА' ? battle.repelledCount + 1 : battle.repelledCount,
      };

      const journalEntry = {
        id: `j-run-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: bNum,
        actor: 'Полигон «Партер»',
        claimed: `${runResult.file}:${runResult.targetLine} · слоты [${
          runResult.appliedSlots.length ? runResult.appliedSlots.join(', ') : 'нет'
        }]`,
        verified: `Прошло: ${runResult.processedRecords}/1240 · В отчёт: ${runResult.reportedMines}`,
        result: runResult.outcome,
      };

      return {
        ...state,
        battles: {
          ...state.battles,
          [bNum]: updatedBattle,
        },
        journal: [journalEntry, ...state.journal],
        lastGesture: {
          type: 'verdict-stamp',
          label: runResult.outcome,
          outcome: runResult.outcome,
          timestamp: Date.now(),
        },
      };
    }

    case 'SUBMIT_VERDICT': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const legalBonus = action.legalAttackBonus !== false ? 1 : 0;
      const counterBonus = action.counterHeldBonus ? 2 : 0;

      let attackerDelta = 0;
      let defenderDelta = 0;
      const arbiterDelta = 1;

      if (action.result === 'ПРОБИЛА') {
        attackerDelta = 2 + legalBonus;
        defenderDelta = 0;
      } else if (action.result === 'ОТБИТА') {
        attackerDelta = legalBonus;
        defenderDelta = 1 + counterBonus;
      }

      const targetLine =
        battle.attackCard?.line || battle.lastRun?.targetLine || battle.targetLine;
      const cleanJournal =
        action.journalLine.trim() ||
        (action.result === 'ПРОБИЛА'
          ? 'Защита не поставила корректный обработчик вокруг опасной строки'
          : 'Обработчик установлен верно, пакет из 1240 записей прошёл');

      const oralFormula = buildArbiterOralFormula({
        battleNumber: bNum,
        targetLine,
        result: action.result,
        attackerDelta,
        defenderDelta,
        journalLine: cleanJournal,
      });

      const verdict = {
        id: `verdict-${Date.now()}`,
        roundNumber: bNum,
        result: action.result,
        rejectReason: action.rejectReason,
        attackerDelta,
        defenderDelta,
        arbiterDelta,
        journalLine: cleanJournal,
        oralFormula,
        timestamp: state.shiftClock,
      };

      const brigades = {
        TRY: { ...state.brigades.TRY },
        CATCH: { ...state.brigades.CATCH },
        FINALLY: { ...state.brigades.FINALLY },
      };

      brigades[battle.attacker].score += attackerDelta;
      brigades[battle.defender].score += defenderDelta;
      brigades[battle.arbiter].score += arbiterDelta;

      if (action.result === 'ПРОБИЛА') {
        brigades[battle.attacker].attacksWon += 1;
      } else if (action.result === 'ОТБИТА') {
        brigades[battle.defender].defensesWon += 1;
      }

      const shieldRuleId = bNum + 2;
      const shield = state.shield.map((r) =>
        r.id === shieldRuleId ? { ...r, unlocked: true } : r
      );

      const battles = {
        ...state.battles,
        [bNum]: {
          ...battle,
          verdict,
          tact: 'verdict' as BattleTactId,
          arbiterStopActive: false,
        },
      };

      if (bNum < 4) {
        const roles4 = computeBattle4RolesByRating(brigades, 'ЗАЩИТА');
        battles[4] = {
          ...battles[4],
          attacker: roles4.attacker,
          defender: roles4.defender,
          arbiter: roles4.arbiter,
        };
      }

      const journalEntry = {
        id: `j-verdict-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: bNum,
        actor: `Арбитр ${battle.arbiter}`,
        claimed: `Вердикт боя ${bNum}: ${action.result} (${battle.attacker} +${attackerDelta}, ${battle.defender} +${defenderDelta}, ${battle.arbiter} +${arbiterDelta})`,
        verified: cleanJournal,
        result: action.result,
        verdictId: verdict.id,
      };

      const nextState: SessionState = {
        ...state,
        brigades,
        shield,
        battles,
        journal: [journalEntry, ...state.journal],
        lastGesture: {
          type: 'verdict-stamp',
          label: action.result,
          outcome: action.result === 'ПРОБИЛА' ? 'ПРОБИЛА' : 'ОТБИТА',
          timestamp: Date.now(),
        },
      };

      return {
        ...nextState,
        nominations: computeNominations(nextState),
      };
    }

    case 'AWARD_MISSED_SPOT': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      if (battle.missedSpotAwarded) return state;

      const brigades = {
        ...state.brigades,
        [battle.arbiter]: {
          ...state.brigades[battle.arbiter],
          score: state.brigades[battle.arbiter].score + 1,
        },
      };

      const note =
        action.note.trim() ||
        'Арбитр указал на уязвимость, которую пропустили обе стороны';

      const journalEntry = {
        id: `j-missed-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: bNum,
        actor: `Арбитр ${battle.arbiter}`,
        claimed: `Найденный пропуск: ${note}`,
        verified: 'Принято в протокол смены',
        result: '+1 АРБИТРУ',
      };

      return {
        ...state,
        brigades,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            missedSpotAwarded: true,
          },
        },
        journal: [journalEntry, ...state.journal],
      };
    }

    case 'START_APPEAL': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      if (battle.appealUsed) return state;

      const journalEntry = {
        id: `j-appeal-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: bNum,
        actor: `Докладчик (${battle.defender})`,
        claimed: 'Подана апелляция (30 секунд, одна на бой)',
        verified: 'Разбирается арбитром немедленно',
        result: 'АПЕЛЛЯЦИЯ',
      };

      return {
        ...state,
        timerRunning: true,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            appealUsed: true,
            appealRemainingSec: 30,
          },
        },
        journal: [journalEntry, ...state.journal],
      };
    }

    case 'TOGGLE_ARBITER_STOP': {
      const bNum = state.currentBattleNumber;
      const battle = state.battles[bNum];
      const nextStop = !battle.arbiterStopActive;
      const reason =
        action.reason?.trim() ||
        'Спорная формулировка карты — остановка боя арбитром для сверки с кодом';

      const journalEntry = {
        id: `j-arb-stop-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: bNum,
        actor: `Арбитр ${battle.arbiter}`,
        claimed: nextStop
          ? `Стоп-кран арбитра: ${reason}`
          : 'Бой возобновлён после разбора спорной карты арбитром',
        verified: 'Документ 10 (п. 7): право арбитра остановить бой на спорной карте',
        result: nextStop ? 'СТОП-БОЙ' : 'ПРОДОЛЖЕНИЕ',
      };

      return {
        ...state,
        timerRunning: nextStop ? false : state.timerRunning,
        battles: {
          ...state.battles,
          [bNum]: {
            ...battle,
            arbiterStopActive: nextStop,
            arbiterStopReason: reason,
          },
        },
        journal: [journalEntry, ...state.journal],
      };
    }

    case 'TOGGLE_PRACTICE_SLOT': {
      const exists = state.practice.enabledSlots.includes(action.slot);
      const enabledSlots = exists
        ? state.practice.enabledSlots.filter((s) => s !== action.slot)
        : [...state.practice.enabledSlots, action.slot].sort();
      return {
        ...state,
        practice: {
          ...state.practice,
          enabledSlots,
        },
      };
    }

    case 'UPDATE_PRACTICE_CONFIG': {
      return {
        ...state,
        practice: {
          ...state.practice,
          customExceptionName:
            action.customExceptionName !== undefined
              ? action.customExceptionName
              : state.practice.customExceptionName,
          includeInnerException:
            action.includeInnerException !== undefined
              ? action.includeInnerException
              : state.practice.includeInnerException,
          includeRecordIdProperty:
            action.includeRecordIdProperty !== undefined
              ? action.includeRecordIdProperty
              : state.practice.includeRecordIdProperty,
        },
      };
    }

    case 'RUN_PRACTICE_SUITE': {
      const res = evaluatePracticeSuite(state.practice);
      const shield = res.passed
        ? state.shield.map((r) => ({ ...r, unlocked: true }))
        : state.shield;
      const journalEntry = {
        id: `j-practice-${Date.now()}`,
        shiftTime: '08:25',
        roundNumber: null,
        actor: 'Практика (08:05)',
        claimed: `Комплексный прогон патча [слоты: ${state.practice.enabledSlots.join(', ')}] + ${state.practice.customExceptionName}`,
        verified: `Выдано: ${res.issued}/1240 · В отчёт: ${res.reported}/26`,
        result: res.passed ? 'ПАТЧ ГОТОВ' : 'ДОРАБОТКА',
      };
      return {
        ...state,
        shield,
        practice: {
          ...state.practice,
          lastSuitePassed: res.passed,
          lastSuiteIssued: res.issued,
          lastSuiteReported: res.reported,
          lastSuiteLog: res.log,
        },
        journal: [journalEntry, ...state.journal],
        lastGesture: {
          type: 'verdict-stamp',
          label: res.passed ? 'ПАТЧ ГОТОВ К 09:00' : 'ОШИБКА ПАТЧА',
          outcome: res.passed ? 'ОТБИТА' : 'ПРОБИЛА',
          timestamp: Date.now(),
        },
      };
    }

    case 'ADJUST_BRIGADE_SCORE': {
      const target = state.brigades[action.brigade];
      const brigades = {
        ...state.brigades,
        [action.brigade]: {
          ...target,
          score: Math.max(0, target.score + action.delta),
        },
      };

      const sign = action.delta >= 0 ? `+${action.delta}` : `${action.delta}`;
      const journalEntry = {
        id: `j-score-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: state.phase.startsWith('battle_') ? state.currentBattleNumber : null,
        actor: 'Ведущий смены',
        claimed: `Корректировка счёта бригады ${action.brigade}: ${sign}`,
        verified: action.reason || 'По регламенту смены',
        result: `${action.brigade} ${sign}`,
      };

      const nextState = {
        ...state,
        brigades,
        journal: [journalEntry, ...state.journal],
      };
      return {
        ...nextState,
        nominations: computeNominations(nextState),
      };
    }

    case 'TOGGLE_SHIELD_RULE': {
      const shield = state.shield.map((r) =>
        r.id === action.ruleId ? { ...r, unlocked: !r.unlocked } : r
      );
      return { ...state, shield };
    }

    case 'UNLOCK_ALL_SHIELD': {
      const shield = state.shield.map((r) => ({ ...r, unlocked: true }));
      const journalEntry = {
        id: `j-shield-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: null,
        actor: 'Смена АПТАЙМ',
        claimed: 'Ревизия перед стартом: собраны все 6 правил щита',
        verified: 'Анатомия · Механизм · Перехват · Порядок · Гарантия · Честность',
        result: 'ЩИТ 6/6',
      };
      return {
        ...state,
        shield,
        journal: [journalEntry, ...state.journal],
      };
    }

    case 'PROLOGUE_VOTE': {
      return {
        ...state,
        prologue: {
          ...state.prologue,
          pollVotes: {
            ...state.prologue.pollVotes,
            [action.option]: state.prologue.pollVotes[action.option] + 1,
          },
        },
      };
    }

    case 'PROLOGUE_REVEAL_POLL': {
      return {
        ...state,
        prologue: {
          ...state.prologue,
          pollRevealed: true,
        },
      };
    }

    case 'PROLOGUE_CRASH_BATCH': {
      return {
        ...state,
        prologue: {
          ...state.prologue,
          batchCrashed: true,
        },
        lastGesture: {
          type: 'verdict-stamp',
          label: 'FormatException · Booking.cs:12',
          outcome: 'ПРОБИЛА',
          timestamp: Date.now(),
        },
      };
    }

    case 'PROLOGUE_MATCH_MINE': {
      const nextMatched = {
        ...state.prologue.matchedMines,
        [action.mineId]: action.exceptionType,
      };
      const allMatched = PROLOGUE_MINES.every(
        (m) => nextMatched[m.id] === m.expectedType
      );
      const shield = allMatched
        ? state.shield.map((r) => (r.id === 1 ? { ...r, unlocked: true } : r))
        : state.shield;

      return {
        ...state,
        shield,
        prologue: {
          ...state.prologue,
          matchedMines: nextMatched,
          hierarchyShown: allMatched || state.prologue.hierarchyShown,
        },
      };
    }

    case 'PROLOGUE_TOGGLE_MECHANISM': {
      const nextParts = {
        ...state.prologue.mechanismParts,
        [action.part]: !state.prologue.mechanismParts[action.part],
      };
      return {
        ...state,
        prologue: {
          ...state.prologue,
          mechanismParts: nextParts,
        },
      };
    }

    case 'PROLOGUE_REPEL_BATCH': {
      const shield = state.shield.map((r) =>
        r.id === 1 || r.id === 2 ? { ...r, unlocked: true } : r
      );
      const journalEntry = {
        id: `j-pro-repel-${Date.now()}`,
        shiftTime: '03:14',
        roundNumber: null,
        actor: 'BatchRunner',
        claimed: 'Прогон пакета 1 240 записей с механизмом TRY-CATCH-FINALLY',
        verified: 'Прошло: 1214 · В отчёт: 26 · Остановок: 0',
        result: 'ОТБИТО',
      };
      return {
        ...state,
        shield,
        prologue: {
          ...state.prologue,
          mechanismParts: { TRY: true, CATCH: true, FINALLY: true },
          batchRepelled: true,
        },
        journal: [journalEntry, ...state.journal],
        lastGesture: {
          type: 'verdict-stamp',
          label: 'ОТБИТО · 1214 ИЗ 1240',
          outcome: 'ОТБИТА',
          timestamp: Date.now(),
        },
      };
    }

    case 'PROLOGUE_TRIGGER_SECOND_WAVE': {
      const journalEntry = {
        id: `j-pro-wave2-${Date.now()}`,
        shiftTime: '03:17',
        roundNumber: null,
        actor: 'monitor',
        claimed: 'Лог ожил: 4 новых направления проб (формат, порядок, ресурс, след)',
        verified: 'Защита от одной атаки не равна защите от класса атак',
        result: 'АТАКИ ПРОДОЛЖАТСЯ',
      };
      return {
        ...state,
        prologue: {
          ...state.prologue,
          secondWaveTriggered: true,
        },
        journal: [journalEntry, ...state.journal],
      };
    }

    case 'SET_BATTLE4_LEADER_ROLE': {
      const roles4 = computeBattle4RolesByRating(state.brigades, action.role);
      const battle4 = {
        ...state.battles[4],
        attacker: roles4.attacker,
        defender: roles4.defender,
        arbiter: roles4.arbiter,
      };
      const brigades =
        state.currentBattleNumber === 4
          ? syncBrigadeRolesWithBattle(state.brigades, battle4)
          : state.brigades;
      return {
        ...state,
        brigades,
        battles: {
          ...state.battles,
          4: battle4,
        },
      };
    }

    case 'SET_WAVE_SLOT': {
      const waves = state.waves.map((w) =>
        w.id === action.waveId ? { ...w, selectedSlot: action.slot } : w
      );
      return { ...state, waves };
    }

    case 'SET_WAVE_HOLDER': {
      const waves = state.waves.map((w) =>
        w.id === action.waveId ? { ...w, holder: action.holder } : w
      );
      return { ...state, waves };
    }

    case 'TOGGLE_SLOW_GROUP_MODE': {
      return {
        ...state,
        queue: {
          ...state.queue,
          slowGroupMode: !state.queue.slowGroupMode,
        },
      };
    }

    case 'TRIGGER_START_0900': {
      if (!isShieldComplete(state)) {
        return state;
      }

      const upTo = state.queue.slowGroupMode ? 1 : 4;
      const evalResult = evaluateStart0900Waves(state.waves, upTo);

      const brigades = {
        TRY: { ...state.brigades.TRY, lamps: [...state.brigades.TRY.lamps] as [boolean, boolean, boolean, boolean] },
        CATCH: { ...state.brigades.CATCH, lamps: [...state.brigades.CATCH.lamps] as [boolean, boolean, boolean, boolean] },
        FINALLY: { ...state.brigades.FINALLY, lamps: [...state.brigades.FINALLY.lamps] as [boolean, boolean, boolean, boolean] },
      };

      evalResult.updatedWaves.forEach((w) => {
        if (w.status === 'пробила' && w.holder !== 'АРБИТР') {
          const b = brigades[w.holder];
          const lastOnIdx = b.lamps.lastIndexOf(true);
          if (lastOnIdx !== -1) {
            b.lamps[lastOnIdx] = false;
          }
        }
      });

      const journalEntry = {
        id: `j-start0900-${Date.now()}`,
        shiftTime: '09:00',
        roundNumber: null,
        actor: 'СТАРТ ПРОДАЖ 09:00',
        claimed: `Запуск 4 волн на очереди из 1 240 человек`,
        verified:
          evalResult.lossReasons.length === 0
            ? 'Все 4 волны удержаны без потерь'
            : `Пробито: ${evalResult.lossReasons.join(', ')} (потеряно ${evalResult.lost} чел.)`,
        result: `${evalResult.issued} / 1240`,
      };

      return {
        ...state,
        phase: 'start_0900',
        shiftClock: '09:00',
        remainingToStart: '00:00',
        brigades,
        waves: evalResult.updatedWaves,
        queue: {
          ...state.queue,
          issued: evalResult.issued,
          lost: evalResult.lost,
          reported: 26,
          started: true,
          completed: upTo === 4,
          currentWaveStep: upTo,
          lossReasons: evalResult.lossReasons,
        },
        journal: [journalEntry, ...state.journal],
        lastGesture:
          evalResult.lost > 0
            ? {
                type: 'lamp-burn',
                label: `ПРОБИТО: −${evalResult.lost} ЧЕЛ.`,
                outcome: 'ПРОБИЛА',
                timestamp: Date.now(),
              }
            : {
                type: 'verdict-stamp',
                label: '1240 / 1240 · СТАРТ УДЕРЖАН',
                outcome: 'ОТБИТА',
                timestamp: Date.now(),
              },
      };
    }

    case 'STEP_WAVE_0900': {
      if (!isShieldComplete(state)) return state;
      const nextStep = Math.min(4, state.queue.currentWaveStep + 1);
      const evalResult = evaluateStart0900Waves(state.waves, nextStep);

      return {
        ...state,
        waves: evalResult.updatedWaves,
        queue: {
          ...state.queue,
          issued: evalResult.issued,
          lost: evalResult.lost,
          reported: 26,
          started: true,
          completed: nextStep === 4,
          currentWaveStep: nextStep,
          lossReasons: evalResult.lossReasons,
        },
      };
    }

    case 'ADD_JOURNAL_ENTRY': {
      if (!action.claimed.trim()) return state;
      const entry = {
        id: `j-manual-${Date.now()}`,
        shiftTime: state.shiftClock,
        roundNumber: state.phase.startsWith('battle_') ? state.currentBattleNumber : null,
        actor: action.actor.trim() || 'Писарь',
        claimed: action.claimed.trim(),
        verified: action.verified.trim() || 'Зафиксировано в журнале смены',
        result: action.result.trim() || 'ЗАПИСЬ',
      };
      return {
        ...state,
        journal: [entry, ...state.journal],
      };
    }

    case 'JOIN_PLAYER': {
      const filtered = state.players.filter(
        (p) => !(p.brigade === action.brigade && p.role === action.role)
      );
      const newPlayer = {
        id: `p-${Date.now()}`,
        name: action.name.trim() || `Дежурный ${action.brigade}`,
        brigade: action.brigade,
        role: action.role,
        connected: true,
        joinedAt: state.shiftClock,
      };
      return {
        ...state,
        players: [...filtered, newPlayer],
      };
    }

    case 'IMPORT_SESSION_STATE': {
      if (!action.imported || !action.imported.brigades) return state;
      return {
        ...action.imported,
        theme: state.theme,
      };
    }

    case 'LOAD_DEMO_1210': {
      const base = createInitialSession(state.code);
      const shield = base.shield.map((r) => ({ ...r, unlocked: true }));
      const brigades = {
        TRY: {
          ...base.brigades.TRY,
          score: 14,
          attacksWon: 2,
          defensesWon: 2,
        },
        CATCH: {
          ...base.brigades.CATCH,
          score: 12,
          lamps: [true, true, true, false] as [boolean, boolean, boolean, boolean],
          attacksWon: 1,
          defensesWon: 2,
        },
        FINALLY: {
          ...base.brigades.FINALLY,
          score: 11,
          attacksWon: 1,
          defensesWon: 1,
        },
      };

      const waves = base.waves.map((w) =>
        w.id === 2
          ? { ...w, selectedSlot: 1 as const, status: 'пробила' as const, lostPeople: 30 }
          : { ...w, status: 'отбита' as const, lostPeople: 0 }
      );

      const battles = {
        ...base.battles,
        1: { ...base.battles[1], activeSlots: [1], probedCount: 4, repelledCount: 6 },
        2: { ...base.battles[2], activeSlots: [2], probedCount: 6, repelledCount: 3 },
        3: { ...base.battles[3], activeSlots: [3], probedCount: 2, repelledCount: 7 },
        4: { ...base.battles[4], activeSlots: [4], probedCount: 3, repelledCount: 5 },
      };

      return {
        ...base,
        theme: state.theme,
        mode: state.mode,
        world: state.world,
        phase: 'start_0900',
        shiftClock: '09:07',
        remainingToStart: '00:00',
        shield,
        brigades,
        battles,
        waves,
        queue: {
          total: 1240,
          issued: 1210,
          lost: 30,
          reported: 26,
          started: true,
          completed: true,
          slowGroupMode: false,
          currentWaveStep: 4,
          lossReasons: ['волна 2 (порядок обработчиков)'],
        },
        journal: [
          {
            id: 'j-demo-5',
            shiftTime: '09:07',
            roundNumber: null,
            actor: 'ПРОТОКОЛ СМЕНЫ',
            claimed: 'Старт продаж завершён: выдано 1210 из 1240 билетов',
            verified: 'Пробито: волна 2 (порядок обработчиков) · потеряно 30 человек',
            result: '1210 / 1240',
          },
          {
            id: 'j-demo-4',
            shiftTime: '08:15',
            roundNumber: 4,
            actor: 'TRY',
            claimed: 'Строка 55, NullReferenceException: пустой catch {} заменён на AuditLog.ReportMine + throw;',
            verified: 'Запуск: 26 мин в отчёте, стек вызовов сохранён',
            result: 'ОТБИТА',
          },
          {
            id: 'j-demo-3',
            shiftTime: '07:14',
            roundNumber: 3,
            actor: 'FINALLY',
            claimed: 'Строка 41, IndexOutOfRangeException: conn.Close() перенесён в блок finally',
            verified: 'Запуск: утечек соединений 0 из 64 даже при раннем return',
            result: 'ОТБИТА',
          },
          {
            id: 'j-demo-2',
            shiftTime: '05:12',
            roundNumber: 2,
            actor: 'CATCH',
            claimed: 'Строка 23, CS0160: catch (Exception) стоял перед catch (FormatException)',
            verified: 'Запуск: пробила (недостижимый обработчик)',
            result: 'ПРОБИЛА',
          },
          {
            id: 'j-demo-1',
            shiftTime: '04:14',
            roundNumber: 1,
            actor: 'CATCH',
            claimed: 'Строка 12, FormatException: установлен try вокруг int.Parse(req.Place)',
            verified: 'Запуск: поймано, пакет прошёл, арбитр нашёл пропуск int.TryParse (+1)',
            result: 'ОТБИТА',
          },
          ...base.journal,
        ],
        nominations: {
          mostPreciseAnalysis: 'TRY',
          bestJournal: 'CATCH',
          honestMistake: 'FINALLY',
        },
      };
    }

    case 'RESET_SESSION': {
      const fresh = createInitialSession(state.code);
      return {
        ...fresh,
        theme: state.theme,
        mode: state.mode,
        world: state.world,
      };
    }

    default:
      return state;
  }
}
