import React from 'react';
import { WORLD_PRESETS } from '../game/constants';
import { getUnlockedShieldCount } from '../game/engine';
import { GameAction } from '../game/reducer';
import {
  AppMode,
  BrigadeId,
  MemberRole,
  ScreenView,
  SessionState,
  ThemeMode,
} from '../types/game';

interface TopInstrumentBarProps {
  state: SessionState;
  activeScreen: ScreenView;
  setActiveScreen: (screen: ScreenView) => void;
  activeBrigade: BrigadeId;
  activeRole: MemberRole;
  wsConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenLogin: () => void;
  onOpenEmergency: () => void;
  dispatch: (action: GameAction) => void;
}

export const TopInstrumentBar: React.FC<TopInstrumentBarProps> = ({
  state,
  activeScreen,
  setActiveScreen,
  activeBrigade,
  activeRole,
  wsConnected,
  soundEnabled,
  onToggleSound,
  onOpenLogin,
  onOpenEmergency,
  dispatch,
}) => {
  const worldMeta = WORLD_PRESETS[state.world];
  const shieldCount = getUnlockedShieldCount(state);

  const screens: { id: ScreenView; label: string; sub: string }[] = [
    { id: 'hall', label: 'Экран зала', sub: 'проектор 62/38' },
    { id: 'brigade', label: 'Клиент бригады', sub: `${activeBrigade} · ${activeRole}` },
    { id: 'arbiter', label: 'Панель арбитра', sub: 'вердикт Y/N' },
    { id: 'host', label: 'Панель ведущего', sub: 'фазы и суфлёр' },
    { id: 'materials', label: 'Протокол и Защита', sub: 'A4 + 11 док.' },
  ];

  const modes: AppMode[] = ['ПОЛНЫЙ', 'РУЧНОЙ', 'АВТОНОМНЫЙ'];
  const themes: { id: ThemeMode; label: string }[] = [
    { id: 'night', label: 'Ночная смена' },
    { id: 'light', label: 'Светлый прибор' },
    { id: 'paper', label: 'Бумажный штаб' },
  ];

  return (
    <header
      className="material-armor no-print"
      style={{
        padding: '8px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
      }}
    >
      {/* Левый блок: марка прибора, код партии, статус связи */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="brass-nameplate"
            style={{ fontSize: '15px', padding: '4px 10px' }}
          >
            АПТАЙМ · НОЧНАЯ СМЕНА
          </span>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {worldMeta.serviceName}
          </span>
        </div>

        <div
          className="mono"
          style={{
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid var(--border-metal)',
            borderRadius: '2px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          title="4-значный код партии для входа бригад и арбитра"
        >
          <span style={{ color: 'var(--text-caption)' }}>КОД ПАРТИИ:</span>
          <strong style={{ color: 'var(--color-warning)', fontSize: '16px', letterSpacing: '0.12em' }}>
            {state.code}
          </strong>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                state.mode === 'АВТОНОМНЫЙ'
                  ? 'var(--color-warning)'
                  : wsConnected
                  ? 'var(--color-stable)'
                  : 'var(--color-action)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            ЩИТ {shieldCount}/6
          </span>
        </div>
      </div>

      {/* Центральный блок: переключение экранов */}
      <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {screens.map((scr) => {
          const active = activeScreen === scr.id;
          return (
            <button
              key={scr.id}
              type="button"
              onClick={() => setActiveScreen(scr.id)}
              className={`instrument-btn ${active ? 'btn-action' : ''}`}
              style={{
                padding: '6px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '1px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700 }}>{scr.label}</span>
              <span
                className="mono"
                style={{ fontSize: '13px', color: 'var(--text-caption)', fontWeight: 400 }}
              >
                {scr.sub}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Правый блок: Режим (Полный/Ручной/Автономный), Тема, Звук, Вход, Демо */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--border-metal)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
          title="Переключение режима проведения в один клик без потери состояния"
        >
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => dispatch({ type: 'SET_MODE', mode: m })}
              style={{
                background:
                  state.mode === m ? 'var(--color-action)' : 'var(--bg-card)',
                color: state.mode === m ? '#04101c' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 9px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <select
          aria-label="Тема оформления"
          value={state.theme}
          onChange={(e) =>
            dispatch({ type: 'SET_THEME', theme: e.target.value as ThemeMode })
          }
          className="instrument-btn"
          style={{ padding: '6px 10px', fontSize: '13px' }}
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              Тема: {t.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleSound}
          className="instrument-btn"
          style={{ fontSize: '13px' }}
          title="Звук реле и штампов приборной панели"
        >
          Звук: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
        </button>

        <button
          type="button"
          onClick={onOpenLogin}
          className="instrument-btn"
          style={{ fontSize: '13px' }}
        >
          Роль / Код
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'LOAD_DEMO_1210' })}
          className="instrument-btn btn-warning"
          style={{ fontSize: '13px' }}
          title="Загрузить эталонный финал 1210 / 1240 из документов 05 и 07"
        >
          Итог 1210/1240
        </button>

        <button
          type="button"
          onClick={onOpenEmergency}
          className="instrument-btn btn-incident"
          style={{ fontSize: '13px' }}
          title="Аварийное меню смены (клавиша Esc)"
        >
          Авар. [Esc]
        </button>
      </div>
    </header>
  );
};
