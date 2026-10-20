import React, { useState } from 'react';
import {
  getBrigadeRotationRows,
  getMemberRoleForBattle,
  getMemberSlotForRole,
  MemberSlotNumber,
  verifyRotationMatrixInvariants,
} from '../game/roleRotation';
import { BrigadeId, MemberRole, SessionState } from '../types/game';

interface RoleRotationMatrixProps {
  state: SessionState;
  activeBrigade: BrigadeId;
  activeRole?: MemberRole;
  onSelectBrigade?: (brigade: BrigadeId) => void;
  onSelectRole?: (role: MemberRole) => void;
  showAllBrigadesDefault?: boolean;
}

export const RoleRotationMatrix: React.FC<RoleRotationMatrixProps> = ({
  state,
  activeBrigade,
  activeRole,
  onSelectBrigade,
  onSelectRole,
  showAllBrigadesDefault = false,
}) => {
  const [showAll18, setShowAll18] = useState<boolean>(showAllBrigadesDefault);
  const currentBattleNum = state.currentBattleNumber;
  const activeSlot: MemberSlotNumber | null = activeRole
    ? getMemberSlotForRole(activeRole, currentBattleNum)
    : null;

  const invariants = verifyRotationMatrixInvariants();
  const brigadesToRender: BrigadeId[] = showAll18
    ? ['TRY', 'CATCH', 'FINALLY']
    : [activeBrigade];

  const handleSelectSlot = (brigade: BrigadeId, slot: MemberSlotNumber) => {
    if (onSelectBrigade && brigade !== activeBrigade) {
      onSelectBrigade(brigade);
    }
    if (onSelectRole) {
      const nextRole = getMemberRoleForBattle(slot, currentBattleNum);
      onSelectRole(nextRole);
    }
  };

  return (
    <div
      className="material-armor screw-corners"
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="brass-nameplate">
              МАТРИЦА РОТАЦИИ 6 РОЛЕЙ × 4 БОЯ · 18 ДЕЖУРНЫХ (ДОКУМЕНТ 01, П. 2)
            </span>
            <span
              className="mono"
              style={{
                fontSize: '13px',
                color: invariants.valid ? 'var(--color-stable)' : 'var(--color-incident)',
                fontWeight: 800,
              }}
            >
              Латинский квадрат: совмещений 0 · повторов 0 · 18 чел.
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            «Один человек — одна роль в бою. В следующем бою роли внутри бригады
            перераспределяются. Докладчик и Арбитр работают стоя у экрана.»
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [1, 2, 3, 4, 5, 6] as MemberSlotNumber[]
          ).map((slot) => {
            const isSelected = activeSlot === slot && !showAll18;
            const roleNow = getMemberRoleForBattle(slot, currentBattleNum);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => handleSelectSlot(activeBrigade, slot)}
                className={`instrument-btn mono ${isSelected ? 'btn-action' : ''}`}
                style={{ fontSize: '13px', padding: '5px 10px' }}
                title={`Выбрать дежурного ${activeBrigade}-${slot} (в Бою ${currentBattleNum} роль: ${roleNow})`}
              >
                {activeBrigade}-{slot} ({roleNow})
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAll18((p) => !p)}
            className={`instrument-btn ${showAll18 ? 'btn-warning' : ''}`}
            style={{ fontSize: '13px' }}
          >
            {showAll18 ? 'Только моя бригада (6 чел.)' : 'Все 3 бригады (18 чел.)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {brigadesToRender.map((bId) => {
          const b = state.brigades[bId];
          const rows = getBrigadeRotationRows(bId);
          return (
            <div
              key={bId}
              className="material-paper"
              style={{ padding: '12px 14px', overflowX: 'auto' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 900 }}>
                  {b.shapeSymbol} БРИГАДА {b.name} — 6 ДЕЖУРНЫХ (ТЕКУЩИЙ БОЙ №
                  {currentBattleNum}: {b.battleRole})
                </div>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
                  Клик по ячейке включает выбранную роль в Клиенте бригады
                </span>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--border-metal)',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '6px 8px' }}>Дежурный</th>
                    {([1, 2, 3, 4] as const).map((bNum) => {
                      const battleMeta = state.battles[bNum];
                      const isCurrentBattle = bNum === currentBattleNum;
                      return (
                        <th
                          key={bNum}
                          style={{
                            padding: '6px 8px',
                            background: isCurrentBattle
                              ? 'rgba(79, 195, 247, 0.14)'
                              : 'transparent',
                          }}
                        >
                          <div>
                            Бой {bNum} «{battleMeta.codeName}» ({battleMeta.shiftClock})
                          </div>
                          <div
                            className="mono"
                            style={{ fontSize: '13px', color: 'var(--color-warning)' }}
                          >
                            {battleMeta.attacker === bId
                              ? 'АТАКА'
                              : battleMeta.defender === bId
                              ? 'ЗАЩИТА'
                              : 'АРБИТР'}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isRowActive = bId === activeBrigade && activeSlot === row.slot;
                    return (
                      <tr
                        key={row.callSign}
                        style={{
                          borderBottom: '1px solid var(--border-metal)',
                          background: isRowActive
                            ? 'rgba(79, 195, 247, 0.08)'
                            : 'transparent',
                        }}
                      >
                        <td
                          className="mono"
                          style={{
                            padding: '8px',
                            fontWeight: 900,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleSelectSlot(bId, row.slot)}
                        >
                          {b.shapeSymbol} {row.callSign}
                        </td>
                        {([1, 2, 3, 4] as const).map((bNum) => {
                          const cell = row.cells[bNum];
                          const isStanding = cell.posture === 'у экрана (стоя)';
                          const isActiveCell =
                            bId === activeBrigade &&
                            bNum === currentBattleNum &&
                            activeRole === cell.role;
                          return (
                            <td
                              key={bNum}
                              onClick={() => {
                                if (onSelectBrigade && bId !== activeBrigade) {
                                  onSelectBrigade(bId);
                                }
                                if (onSelectRole) {
                                  onSelectRole(cell.role);
                                }
                              }}
                              style={{
                                padding: '8px',
                                cursor: 'pointer',
                                background: isActiveCell
                                  ? 'rgba(53, 208, 160, 0.2)'
                                  : bNum === currentBattleNum
                                  ? 'rgba(79, 195, 247, 0.08)'
                                  : 'transparent',
                                borderLeft: isStanding
                                  ? '3px solid var(--color-warning)'
                                  : '1px solid var(--border-metal)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <strong style={{ fontSize: '14px' }}>{cell.title}</strong>
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: '13px',
                                    color: isStanding
                                      ? 'var(--color-warning)'
                                      : 'var(--text-caption)',
                                    fontWeight: isStanding ? 800 : 400,
                                  }}
                                >
                                  {isStanding ? 'СТОЯ У ЭКРАНА' : 'ноутбук'}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};
