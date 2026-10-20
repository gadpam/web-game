import React from 'react';
import { GameAction } from '../game/reducer';
import {
  DIDACTIC_CYCLE_STEPS,
  DidacticStepNumber,
  getDidacticContextForState,
} from '../game/techMap';
import { SessionState } from '../types/game';

interface DidacticCycleStripProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
}

export const DidacticCycleStrip: React.FC<DidacticCycleStripProps> = ({
  state,
  dispatch,
}) => {
  const ctx = getDidacticContextForState(state);

  const stepDetailMap: Record<DidacticStepNumber, string> = {
    1: ctx.needText,
    2: ctx.toolText,
    3: ctx.applyText,
    4: ctx.consequenceText,
    5: ctx.nameText,
  };

  const handleStepClick = (step: DidacticStepNumber) => {
    if (state.phase.startsWith('prologue_')) {
      if (step === 1) dispatch({ type: 'SET_PHASE', phase: 'prologue_1' });
      else if (step === 2) dispatch({ type: 'SET_PHASE', phase: 'prologue_2' });
      else if (step === 3) dispatch({ type: 'SET_PHASE', phase: 'prologue_3' });
      else dispatch({ type: 'SET_PHASE', phase: 'prologue_4' });
      return;
    }

    if (state.phase.startsWith('battle_')) {
      if (step === 1) dispatch({ type: 'SET_TACT', tact: 'recon' });
      else if (step === 2) dispatch({ type: 'SET_TACT', tact: 'card' });
      else if (step === 3) dispatch({ type: 'SET_TACT', tact: 'exchange' });
      else if (step === 4) dispatch({ type: 'SET_TACT', tact: 'counter' });
      else dispatch({ type: 'SET_TACT', tact: 'verdict' });
      return;
    }

    if (step === 3) dispatch({ type: 'SET_PHASE', phase: 'practice' });
    else if (step === 4) dispatch({ type: 'SET_PHASE', phase: 'start_0900' });
    else if (step === 5) dispatch({ type: 'SET_PHASE', phase: 'closed' });
  };

  return (
    <div
      className="material-armor no-print"
      style={{
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="brass-nameplate" style={{ fontSize: '12px' }}>
            ЦИКЛ ОТКРЫТИЯ ПОНЯТИЯ (ДОК. 00 П. 5 · ДОК. 10 П. 2)
          </span>
          <span className="mono" style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
            {ctx.contextTitle}
          </span>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
          «Ни одно понятие не вводится раньше, чем в нём возникла нужда»
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '6px',
        }}
      >
        {DIDACTIC_CYCLE_STEPS.map((st) => {
          const isActive = ctx.activeStep.step === st.step;
          return (
            <button
              key={st.step}
              type="button"
              onClick={() => handleStepClick(st.step)}
              className="instrument-btn"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '7px 10px',
                borderColor: isActive ? 'var(--color-action)' : 'var(--border-metal)',
                background: isActive
                  ? 'rgba(79, 195, 247, 0.16)'
                  : 'rgba(0, 0, 0, 0.28)',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: isActive ? 'var(--color-action)' : 'var(--text-main)',
                }}
              >
                {st.title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                  marginTop: '3px',
                }}
              >
                {stepDetailMap[st.step]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
