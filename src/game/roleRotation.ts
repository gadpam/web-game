import { MEMBER_ROLES } from './constants';
import { BrigadeId, MemberRole } from '../types/game';

export type MemberSlotNumber = 1 | 2 | 3 | 4 | 5 | 6;

export const ROTATION_ROLE_ORDER: MemberRole[] = [
  'аналитик',
  'картёр',
  'чтец',
  'писарь',
  'докладчик',
  'арбитр',
];

export interface ParticipantBattleRoleCell {
  battleNumber: 1 | 2 | 3 | 4;
  role: MemberRole;
  title: string;
  posture: 'за ноутбуком' | 'у экрана (стоя)';
  duty: string;
}

export interface BrigadeParticipantRow {
  brigade: BrigadeId;
  slot: MemberSlotNumber;
  callSign: string;
  cells: Record<1 | 2 | 3 | 4, ParticipantBattleRoleCell>;
}

/**
 * Латинский циклический сдвиг:
 * - В каждом из 4 боёв 6 участников бригады занимают ровно 6 разных ролей (0 совмещений).
 * - За 4 боя ни один участник не повторяет свою прежнюю роль (0 повторов).
 */
export function getMemberRoleForBattle(
  memberSlot: MemberSlotNumber,
  battleNumber: 1 | 2 | 3 | 4
): MemberRole {
  const index = (memberSlot - 1 + (battleNumber - 1)) % ROTATION_ROLE_ORDER.length;
  return ROTATION_ROLE_ORDER[index];
}

export function getMemberSlotForRole(
  role: MemberRole,
  battleNumber: 1 | 2 | 3 | 4
): MemberSlotNumber {
  const roleIdx = ROTATION_ROLE_ORDER.indexOf(role);
  const safeRoleIdx = roleIdx === -1 ? 0 : roleIdx;
  const zeroBasedSlot =
    (safeRoleIdx - (battleNumber - 1) + ROTATION_ROLE_ORDER.length) %
    ROTATION_ROLE_ORDER.length;
  return (zeroBasedSlot + 1) as MemberSlotNumber;
}

export function getBrigadeRotationRows(
  brigade: BrigadeId
): BrigadeParticipantRow[] {
  const slots: MemberSlotNumber[] = [1, 2, 3, 4, 5, 6];
  const battles: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return slots.map((slot) => {
    const cells = {} as Record<1 | 2 | 3 | 4, ParticipantBattleRoleCell>;
    for (const bNum of battles) {
      const role = getMemberRoleForBattle(slot, bNum);
      const meta =
        MEMBER_ROLES.find((r) => r.role === role) || MEMBER_ROLES[0];
      cells[bNum] = {
        battleNumber: bNum,
        role,
        title: meta.title,
        posture: meta.posture,
        duty: meta.duty,
      };
    }
    return {
      brigade,
      slot,
      callSign: `${brigade}-${slot}`,
      cells,
    };
  });
}

export function verifyRotationMatrixInvariants(): {
  valid: boolean;
  totalParticipants: number;
  collisionsInBattle: number;
  repeatsAcrossBattles: number;
} {
  const brigades: BrigadeId[] = ['TRY', 'CATCH', 'FINALLY'];
  const battles: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  let collisionsInBattle = 0;
  let repeatsAcrossBattles = 0;
  let totalParticipants = 0;

  for (const bId of brigades) {
    const rows = getBrigadeRotationRows(bId);
    totalParticipants += rows.length;

    // 1. Проверка отсутствия совмещений ролей внутри одного боя
    for (const bNum of battles) {
      const seenInBattle = new Set<MemberRole>();
      for (const row of rows) {
        const role = row.cells[bNum].role;
        if (seenInBattle.has(role)) {
          collisionsInBattle += 1;
        }
        seenInBattle.add(role);
      }
    }

    // 2. Проверка отсутствия повторов роли у одного участника за 4 боя
    for (const row of rows) {
      const seenForParticipant = new Set<MemberRole>();
      for (const bNum of battles) {
        const role = row.cells[bNum].role;
        if (seenForParticipant.has(role)) {
          repeatsAcrossBattles += 1;
        }
        seenForParticipant.add(role);
      }
    }
  }

  return {
    valid:
      totalParticipants === 18 &&
      collisionsInBattle === 0 &&
      repeatsAcrossBattles === 0,
    totalParticipants,
    collisionsInBattle,
    repeatsAcrossBattles,
  };
}
