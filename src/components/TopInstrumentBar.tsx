import React from 'react';
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

const SCREEN_TABS: { id: ScreenView; label: string; subtitle: string }[] = [
  { id: 'hall', label: 'Экран зала', subtitle: 'Проектор 62/38' },
  { id: 'brigade', label: 'Клиент бригады', subtitle: 'Карта + Полигон' },
  { id: 'arbiter', label: 'Панель арбитра', subtitle: 'Вердикт + Журнал' },
  { id: 'host', label: 'Панель ведущего', subtitle: 'Таймер + Скрипт' },
  { id: 'materials', label: 'Материалы смены', subtitle: 'А4 + 12 слайдов' },
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
  const worldMeta = WORLD_PRESETS[state.world];
  const shieldCount = getUnlockedShieldCount(state);

  return (
    <header
      className="material-armor no-print"
      style={{
        padding: '8px 16px',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      {/* Левая колодка: шильдик прибора + код партии + статус канала и окон */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          style={{ padding: '5px 10px' }}
        >
          <span style={{ color: 'var(--text-caption)' }}>КОД:</span>
          <strong style={{ color: 'var(--color-warning)', fontSize: '15px' }}>
            {state.code}
          </strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            [{activeBrigade} · {activeRole}]
          </span>
        </button>

        <div
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            padding: '4px 8px',
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
            style={{ width: '8px', height: '8px' }}
          />
          <span>{wsConnected ? 'СЕТЬ ОК' : 'АВТОНОМ'}</span>
          <span>·</span>
          <span>ОКОН: {syncedWindowCount}</span>
          <span>·</span>
          <span>ЩИТ {shieldCount}/6</span>
        </div>
      </div>

      {/* Центральная колодка: переключение 5 экранов ТЗ */}
      <nav
        aria-label="Экраны приложения Аптайм"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
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
                padding: '6px 11px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '1px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                {tab.label}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: isActive ? 'var(--color-action)' : 'var(--text-caption)',
                  fontWeight: 500,
                }}
              >
                {tab.subtitle}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Правая колодка: Режим, Тема, Звук, Проектор [F], Окно проектора ↗, Демо 1210/1240, Esc */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select
          aria-label="Режим работы приложения"
          value={state.mode}
          onChange={(e) => onChangeMode(e.target.value as AppMode)}
          className="instrument-btn mono"
          style={{ padding: '6px 8px' }}
        >
          <option value="ПОЛНЫЙ">Режим: ПОЛНЫЙ</option>
          <option value="РУЧНОЙ">Режим: РУЧНОЙ</option>
          <option value="АВТОНОМНЫЙ">Режим: АВТОНОМНЫЙ</option>
        </select>

        <select
          aria-label="Тема оформления прибора"
          value={state.theme}
          onChange={(e) => onChangeTheme(e.target.value as ThemeMode)}
          className="instrument-btn"
          style={{ padding: '6px 8px' }}
        >
          <option value="night">Тема: Ночная смена</option>
          <option value="light">Тема: Светлый прибор</option>
          <option value="paper">Тема: Бумажный штаб</option>
        </select>

        <button
          type="button"
          onClick={onToggleSound}
          className={`instrument-btn mono ${soundEnabled ? 'btn-stable' : ''}`}
          title="Щелчки тумблеров и сигнал старта 09:00 (Web Audio API)"
        >
          {soundEnabled ? 'ЗВУК ВКЛ' : 'ЗВУК ВЫКЛ'}
        </button>

        <button
          type="button"
          onClick={onToggleProjectorMode}
          className="instrument-btn"
          title="Чистый проекторный режим без верхней панели в текущем окне [F]"
        >
          Проектор [F]
        </button>

        <button
          type="button"
          onClick={onOpenProjectorWindow}
          className="instrument-btn btn-action"
          title="Открыть второе синхронизированное окно в режиме чистого Экрана зала для вывода на проектор (работает и без сети)"
        >
          Окно проектора ↗
        </button>

        <button
          type="button"
          onClick={onLoadDemoPreset}
          className="instrument-btn btn-warning"
          title="Загрузить эталонное состояние 08:58 (1210 из 1240, 14/12/11 очков) для комиссии"
        >
          Демо 1210/1240
        </button>

        <button
          type="button"
          onClick={onOpenEmergencyMenu}
          className="instrument-btn btn-incident"
          title="Аварийное меню переключения режима (Esc)"
        >
          Авария [Esc]
        </button>
      </div>
    </header>
  );
};
