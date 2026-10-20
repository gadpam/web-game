import React, { useState } from 'react';
import { MEMBER_ROLES } from '../game/constants';
import { GameAction } from '../game/reducer';
import {
  BrigadeId,
  MemberRole,
  ScreenView,
  SessionState,
} from '../types/game';

interface LoginModalProps {
  state: SessionState;
  activeBrigade: BrigadeId;
  activeRole: MemberRole;
  onApplyIdentity: (
    brigade: BrigadeId,
    role: MemberRole,
    screen: ScreenView,
    playerName: string
  ) => void;
  onClose: () => void;
  dispatch: (action: GameAction) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  state,
  activeBrigade,
  activeRole,
  onApplyIdentity,
  onClose,
  dispatch,
}) => {
  const [enteredCode, setEnteredCode] = useState(state.code);
  const [playerName, setPlayerName] = useState('Дежурный смены');
  const [brigade, setBrigade] = useState<BrigadeId>(activeBrigade);
  const [role, setRole] = useState<MemberRole>(activeRole);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      enteredCode.trim() !== state.code &&
      enteredCode.trim() !== state.hostPin
    ) {
      setError(
        `Неверный код партии. На экране зала указан код ${state.code} (код ведущего: ${state.hostPin}).`
      );
      return;
    }
    setError(null);
    if (enteredCode.trim() === state.hostPin) {
      onApplyIdentity(brigade, role, 'host', playerName);
      onClose();
      return;
    }
    dispatch({
      type: 'JOIN_PLAYER',
      name: playerName,
      brigade,
      role,
    });
    const nextScreen: ScreenView = role === 'арбитр' ? 'arbiter' : 'brigade';
    onApplyIdentity(brigade, role, nextScreen, playerName);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 12, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        className="material-armor screw-corners"
        style={{
          maxWidth: '580px',
          width: '100%',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="brass-nameplate">ВХОД В СМЕНУ «АПТАЙМ»</span>
          <button
            type="button"
            onClick={onClose}
            className="instrument-btn"
          >
            Закрыть [Esc]
          </button>
        </div>

        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Введите 4-значный код партии (на экране зала:{' '}
          <strong className="mono" style={{ color: 'var(--color-warning)' }}>
            {state.code}
          </strong>
          , постоянный код ведущего:{' '}
          <strong className="mono" style={{ color: 'var(--color-action)' }}>
            {state.hostPin}
          </strong>
          ), выберите бригаду и свою роль. Один человек — одна роль; повторный
          вход с той же ролью вытесняет предыдущую сессию.
        </div>

        <form
          onSubmit={handleJoin}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                4-ЗНАЧНЫЙ КОД
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                className="instrument-btn mono"
                style={{
                  width: '100%',
                  fontSize: '22px',
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--text-caption)',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                ПОЗЫВНОЙ / ИМЯ ДЕЖУРНОГО
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="instrument-btn"
                style={{ width: '100%', fontSize: '16px', padding: '10px 12px' }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--text-caption)',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              ВЫБОР БРИГАДЫ МЕХАНИЗМА (ФОРМА = ПРИНАДЛЕЖНОСТЬ)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['TRY', 'CATCH', 'FINALLY'] as BrigadeId[]).map((bId) => {
                const b = state.brigades[bId];
                return (
                  <button
                    key={bId}
                    type="button"
                    onClick={() => setBrigade(bId)}
                    className={`instrument-btn ${
                      brigade === bId ? 'btn-action' : ''
                    }`}
                    style={{ justifyContent: 'center', padding: '10px' }}
                  >
                    <span style={{ fontSize: '18px' }}>{b.shapeSymbol}</span>
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                color: 'var(--text-caption)',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              ВЫБОР РОЛИ В БРИГАДЕ (6 РОЛЕЙ)
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}
            >
              {MEMBER_ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  className={`instrument-btn ${
                    role === r.role ? 'btn-warning' : ''
                  }`}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>
                    {r.title} ({r.posture})
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      fontWeight: 400,
                    }}
                  >
                    {r.duty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 93, 93, 0.16)',
                borderLeft: '4px solid var(--color-incident)',
                color: 'var(--color-incident)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '6px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
              Активных подключений в партии: {state.players.length}
            </span>
            <button
              type="submit"
              className="instrument-btn btn-stable"
              style={{ fontSize: '16px', padding: '10px 22px' }}
            >
              Подключиться к смене
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
