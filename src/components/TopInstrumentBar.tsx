import React, { useState } from 'react';
import { WORLD_PRESETS } from '../game/constants';
import { getUnlockedShieldCount } from '../game/engine';
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
  onSelectScreen: (screen: ScreenView) => void;
  activeBrigade: BrigadeId;
  activeRole: MemberRole;
  onOpenLogin: () => void;
  onChangeMode: (mode: AppMode) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onLoadDemoPreset: () => void;
  onOpenEmergencyMenu: () => void;
  wsConnected: boolean;
  syncedWindowCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleProjectorMode: () => void;
  onOpenProjectorWindow: () => void;
}

const SCREEN_TABS: { id: ScreenView; label: string; hotkey: string }[] = [
  { id: 'hall', label: 'Экран зала', hotkey: 'F1' },
  { id: 'brigade', label: 'Клиент бригады', hotkey: 'F2' },
  { id: 'arbiter', label: 'Панель арбитра', hotkey: 'F3' },
  { id: 'host', label: 'Панель ведущего', hotkey: 'F4' },
  { id: 'materials', label: 'Материалы смены', hotkey: 'F5' },
];

export const TopInstrumentBar: React.FC<TopInstrumentBarProps> = ({
  state,
  activeScreen,
  onSelectScreen,
  activeBrigade,
  activeRole,
  onOpenLogin,
  onChangeMode,
  onChangeTheme,
  onLoadDemoPreset,
  onOpenEmergencyMenu,
  wsConnected,
  syncedWindowCount,
  soundEnabled,
  onToggleSound,
  onToggleProjectorMode,
  onOpenProjectorWindow,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const worldMeta = WORLD_PRESETS[state.world];
  const shieldCount = getUnlockedShieldCount(state);

  return (
    <header
      className="material-armor no-print"
      style={{
        padding: '6px 14px',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        position: 'relative',
        zIndex: 40,
      }}
    >
      {/* Левая колодка: шильдик прибора + код партии + компактный индикатор связи */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          className="brass-nameplate"
          title="Учебная игра-расследование по обработке исключений C#"
        >
          <span>▲⬡■</span>
          <span>АПТАЙМ · {worldMeta.serviceName.toUpperCase()}</span>
        </div>

        <button
          type="button"
          onClick={onOpenLogin}
          className="instrument-btn mono"
          title="Вход по 4-значному коду партии и выбор бригады/роли"
          style={{ padding: '4px 9px', fontSize: '13px' }}
        >
          <span style={{ color: 'var(--text-caption)' }}>КОД</span>
          <strong style={{ color: 'var(--color-warning)', fontSize: '14px' }}>
            {state.code}
          </strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            · {activeBrigade} ({activeRole})
          </span>
        </button>

        <div
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            padding: '3px 8px',
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid var(--border-metal)',
            borderRadius: '2px',
          }}
          title={
            wsConnected
              ? 'Синхронизация с сервером партии и между окнами активна'
              : 'Автономный локальный контур (BroadcastChannel + localStorage между окнами без сети)'
          }
        >
          <span
            className={`fuse-lamp ${
              wsConnected || syncedWindowCount > 1 ? 'lamp-on' : 'lamp-warn'
            }`}
            style={{ width: '9px', height: '9px' }}
          />
          <span>{state.mode}</span>
          <span>·</span>
          <span>ОКОН:{syncedWindowCount}</span>
          <span>·</span>
          <span
            style={{
              color:
                shieldCount === 6
                  ? 'var(--color-stable)'
                  : 'var(--color-warning)',
              fontWeight: 800,
            }}
          >
            ЩИТ {shieldCount}/6
          </span>
        </div>
      </div>

      {/* Центральная колодка: 5 чистых однострочных клавиш экранов */}
      <nav
        aria-label="Экраны приложения Аптайм"
        style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}
      >
        {SCREEN_TABS.map((tab) => {
          const isActive = activeScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectScreen(tab.id)}
              className={`instrument-btn ${isActive ? 'btn-action' : ''}`}
              style={{
                padding: '5px 11px',
                fontSize: '13px',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '11px',
                  color: isActive ? 'var(--color-action)' : 'var(--text-caption)',
                }}
              >
                {tab.hotkey}
              </span>
              <span style={{ fontWeight: 800 }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Правая колодка: всего 2 аккуратные клавиши (Проектор и выдвижной Пульт) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={onToggleProjectorMode}
          className="instrument-btn"
          style={{ padding: '5px 10px', fontSize: '12.5px' }}
          title="Чистый проекторный режим без верхней шапки [F]"
        >
          Проектор [F]
        </button>

        <button
          type="button"
          onClick={() => setDrawerOpen((p) => !p)}
          className={`instrument-btn ${drawerOpen ? 'btn-warning' : ''}`}
          style={{ padding: '5px 10px', fontSize: '12.5px' }}
          title="Открыть служебный пульт: режим, тема, звук, демо-пресет 1210/1240, второе окно"
        >
          ⚙ Пульт {drawerOpen ? '▴' : '▾'}
        </button>
      </div>

      {/* Выдвижная приборная кассета служебных настроек (не загромождает сцену) */}
      {drawerOpen && (
        <div
          className="material-armor gesture-card-drop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: '14px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '340px',
            zIndex: 80,
            border: '1px solid var(--color-warning)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-metal)',
              paddingBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 900,
                color: 'var(--color-warning)',
                letterSpacing: '0.08em',
              }}
            >
              СЛУЖЕБНЫЙ ПУЛЬТ СМЕНЫ
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="instrument-btn"
              style={{ padding: '2px 7px', fontSize: '11px' }}
            >
              Закрыть ✕
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--text-caption)',
                  marginBottom: '3px',
                }}
              >
                РЕЖИМ КОНТУРА:
              </label>
              <select
                aria-label="Режим работы приложения"
                value={state.mode}
                onChange={(e) => onChangeMode(e.target.value as AppMode)}
                className="instrument-btn mono"
                style={{ width: '100%', padding: '5px 8px', fontSize: '12px' }}
              >
                <option value="ПОЛНЫЙ">ПОЛНЫЙ (Сеть)</option>
                <option value="РУЧНОЙ">РУЧНОЙ (Голос)</option>
                <option value="АВТОНОМНЫЙ">АВТОНОМНЫЙ</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--text-caption)',
                  marginBottom: '3px',
                }}
              >
                ТЕМА ПРИБОРА:
              </label>
              <select
                aria-label="Тема оформления прибора"
                value={state.theme}
                onChange={(e) => onChangeTheme(e.target.value as ThemeMode)}
                className="instrument-btn"
                style={{ width: '100%', padding: '5px 8px', fontSize: '12px' }}
              >
                <option value="night">Ночная смена</option>
                <option value="light">Светлый прибор</option>
                <option value="paper">Бумажный штаб</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={onToggleSound}
              className={`instrument-btn mono ${soundEnabled ? 'btn-stable' : ''}`}
              style={{ fontSize: '12px', flex: 1 }}
            >
              {soundEnabled ? 'ЗВУК ВКЛ' : 'ЗВУК ВЫКЛ'}
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenProjectorWindow();
                setDrawerOpen(false);
              }}
              className="instrument-btn btn-action"
              style={{ fontSize: '12px', flex: 1 }}
            >
              Окно проектора ↗
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                onLoadDemoPreset();
                setDrawerOpen(false);
              }}
              className="instrument-btn btn-warning"
              style={{ fontSize: '12px', flex: 1 }}
            >
              Демо 1210/1240
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenEmergencyMenu();
                setDrawerOpen(false);
              }}
              className="instrument-btn btn-incident"
              style={{ fontSize: '12px', flex: 1 }}
            >
              Авария [Esc]
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
