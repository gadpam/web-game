import React, { useState } from 'react';
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
  compact?: boolean;
}

export const DidacticCycleStrip: React.FC<DidacticCycleStripProps> = ({
  state,
  dispatch,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
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
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span className="brass-nameplate" style={{ fontSize: '11.5px' }}>
            ЦИКЛ 1→5 (НУЖДА → ИМЯ)
          </span>
          <span
            className="mono"
            style={{ fontSize: '12.5px', color: 'var(--color-warning)' }}
          >
            {ctx.contextTitle}
          </span>
          <span
            style={{
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
            }}
          >
            · Сейчас: <strong>{ctx.activeStep.title}</strong> —{' '}
            {stepDetailMap[ctx.activeStep.step]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {DIDACTIC_CYCLE_STEPS.map((st) => {
            const isActive = ctx.activeStep.step === st.step;
            return (
              <button
                key={st.step}
                type="button"
                onClick={() => handleStepClick(st.step)}
                className={`instrument-btn mono ${isActive ? 'btn-action' : ''}`}
                style={{ padding: '3px 8px', fontSize: '11.5px' }}
                title={`${st.title}: ${stepDetailMap[st.step]}`}
              >
                {st.title}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="instrument-btn"
            style={{ padding: '3px 7px', fontSize: '11.5px' }}
          >
            {expanded ? 'Свернуть ▴' : 'Подробно ▾'}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="gesture-card-drop"
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
                  padding: '6px 9px',
                  borderColor: isActive
                    ? 'var(--color-action)'
                    : 'var(--border-metal)',
                  background: isActive
                    ? 'rgba(79, 195, 247, 0.16)'
                    : 'rgba(0, 0, 0, 0.28)',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    color: isActive
                      ? 'var(--color-action)'
                      : 'var(--text-main)',
                  }}
                >
                  {st.title}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: isActive
                      ? 'var(--text-main)'
                      : 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  {stepDetailMap[st.step]}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
