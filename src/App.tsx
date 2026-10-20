import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArbiterPanel } from './components/ArbiterPanel';
import { BrigadeClient } from './components/BrigadeClient';
import { HallScreen } from './components/HallScreen';
import { HostPanel } from './components/HostPanel';
import { LoginModal } from './components/LoginModal';
import { MaterialsScreen } from './components/MaterialsScreen';
import { TopInstrumentBar } from './components/TopInstrumentBar';
import { createInitialSession } from './game/engine';
import { GameAction, gameReducer } from './game/reducer';
import { instrumentAudio } from './game/sound';
import {
  BrigadeId,
  MemberRole,
  ScreenView,
  SessionState,
  ThemeMode,
} from './types/game';

export const App: React.FC = () => {
  const [state, setState] = useState<SessionState>(() => {
    const savedTheme = (localStorage.getItem('uptime_theme') as ThemeMode) || 'night';
    const initial = createInitialSession('4826');
    return { ...initial, theme: savedTheme };
  });

  const [activeScreen, setActiveScreen] = useState<ScreenView>('hall');
  const [activeBrigade, setActiveBrigade] = useState<BrigadeId>('TRY');
  const [activeRole, setActiveRole] = useState<MemberRole>('картёр');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const modeRef = useRef(state.mode);
  modeRef.current = state.mode;
  const lastGestureTsRef = useRef<number>(0);

  // Синхронизация темы оформления с корневым HTML-атрибутом и localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    try {
      localStorage.setItem('uptime_theme', state.theme);
    } catch {
      // ignore storage errors
    }
  }, [state.theme]);

  // Звуковой отклик на 4 физических жеста из Документа 08
  useEffect(() => {
    if (!state.lastGesture) return;
    if (state.lastGesture.timestamp === lastGestureTsRef.current) return;
    lastGestureTsRef.current = state.lastGesture.timestamp;

    const g = state.lastGesture;
    if (g.type === 'card-drop') {
      instrumentAudio.playCardDrop();
    } else if (g.type === 'verdict-stamp') {
      instrumentAudio.playStampImpact(g.outcome || 'ОТБИТА');
    } else if (g.type === 'lamp-burn') {
      instrumentAudio.playLampBurn();
    } else if (g.type === 'plate-rise') {
      instrumentAudio.playPlateRise();
    }
  }, [state.lastGesture]);

  // Подключение к WebSocket серверу смены (/ws) — относительный URL для работы в любом окружении
  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      if (closedByUnmount) return;
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!closedByUnmount) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (modeRef.current === 'АВТОНОМНЫЙ') return;
          try {
            const msg = JSON.parse(String(event.data));
            if (msg && msg.type === 'STATE_SYNC' && msg.state) {
              setState((prev) => ({
                ...msg.state,
                theme: prev.theme,
              }));
            }
          } catch {
            // ignore malformed message
          }
        };

        ws.onclose = () => {
          if (!closedByUnmount) {
            setWsConnected(false);
            reconnectTimer = setTimeout(connectWs, 2500);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Локальный диспетчер + отправка на сервер
  const dispatch = useCallback((action: GameAction) => {
    setState((prev) => gameReducer(prev, action));
    if (
      action.type !== 'SET_THEME' &&
      modeRef.current !== 'АВТОНОМНЫЙ' &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(JSON.stringify({ type: 'DISPATCH', action }));
    }
  }, []);

  // Локальный секундный тик, если режим АВТОНОМНЫЙ или нет связи с сервером
  useEffect(() => {
    const timer = setInterval(() => {
      if (!wsConnected || state.mode === 'АВТОНОМНЫЙ') {
        setState((prev) =>
          prev.timerRunning ? gameReducer(prev, { type: 'TICK_SECOND' }) : prev
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [wsConnected, state.mode]);

  // Горячие клавиши из раздела 8 Документа 06 (ТЗ приложение)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setLoginModalOpen(false);
        setEmergencyModalOpen((v) => !v);
        return;
      }

      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        instrumentAudio.playRelayClick();
        dispatch({ type: 'TOGGLE_TIMER' });
      } else if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        const num = Number(e.key) as 1 | 2 | 3 | 4;
        instrumentAudio.playRelayClick();
        dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: num });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'RUN_POLYGON' });
      } else if (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'н') {
        dispatch({
          type: 'SUBMIT_VERDICT',
          result: 'ПРОБИЛА',
          legalAttackBonus: true,
          journalLine: 'Вердикт по горячей клавише [Y]: защита пробита',
        });
      } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'т') {
        dispatch({
          type: 'SUBMIT_VERDICT',
          result: 'ОТБИТА',
          legalAttackBonus: true,
          journalLine: 'Вердикт по горячей клавише [N]: атака отбита обработчиком',
        });
      } else if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'й') {
        dispatch({
          type: 'AWARD_MISSED_SPOT',
          note: 'Арбитр зафиксировал пропуск обеих сторон [Q]',
        });
      } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к') {
        instrumentAudio.playRelayClick();
        dispatch({ type: 'NEXT_TACT' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    instrumentAudio.enabled = next;
    setSoundEnabled(next);
    if (next) instrumentAudio.playRelayClick();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopInstrumentBar
        state={state}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        activeBrigade={activeBrigade}
        activeRole={activeRole}
        wsConnected={wsConnected}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenEmergency={() => setEmergencyModalOpen(true)}
        dispatch={dispatch}
      />

      <main style={{ flex: 1 }}>
        {activeScreen === 'hall' && (
          <HallScreen
            state={state}
            dispatch={dispatch}
            onNavigateScreen={setActiveScreen}
          />
        )}

        {activeScreen === 'brigade' && (
          <BrigadeClient
            state={state}
            activeBrigade={activeBrigade}
            setActiveBrigade={setActiveBrigade}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            dispatch={dispatch}
          />
        )}

        {activeScreen === 'arbiter' && (
          <ArbiterPanel state={state} dispatch={dispatch} />
        )}

        {activeScreen === 'host' && (
          <HostPanel state={state} dispatch={dispatch} />
        )}

        {activeScreen === 'materials' && (
          <MaterialsScreen state={state} dispatch={dispatch} />
        )}
      </main>

      {loginModalOpen && (
        <LoginModal
          state={state}
          activeBrigade={activeBrigade}
          activeRole={activeRole}
          onApplyIdentity={(b, r, scr) => {
            setActiveBrigade(b);
            setActiveRole(r);
            setActiveScreen(scr);
          }}
          onClose={() => setLoginModalOpen(false)}
          dispatch={dispatch}
        />
      )}

      {/* Аварийное меню смены (по клавише Esc) */}
      {emergencyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 12, 0.85)',
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
              maxWidth: '520px',
              width: '100%',
              padding: '22px 26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="brass-nameplate">АВАРИЙНОЕ МЕНЮ СМЕНЫ [ESC]</span>
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(false)}
                className="instrument-btn"
              >
                Закрыть
              </button>
            </div>

            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Быстрые запасные ходы на случай нехватки времени или отказа сети на
              конкурсной площадке (Документ 00, п. 10 и Документ 05, п. 8):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_MODE', mode: 'РУЧНОЙ' });
                  setEmergencyModalOpen(false);
                }}
                className="instrument-btn btn-warning"
              >
                1. Переключить в режим РУЧНОЙ (клиенты подводят — экран ведёт ведущий)
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_MODE', mode: 'АВТОНОМНЫЙ' });
                  setEmergencyModalOpen(false);
                }}
                className="instrument-btn btn-warning"
              >
                2. Переключить в режим АВТОНОМНЫЙ (работа без сети на одном ПК)
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'UNLOCK_ALL_SHIELD' });
                  dispatch({ type: 'SET_PHASE', phase: 'five_min' });
                  setEmergencyModalOpen(false);
                }}
                className="instrument-btn btn-action"
              >
                3. Собрать Щит 6/6 и перейти к фазе «08:55 Пять минут до старта»
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'UNLOCK_ALL_SHIELD' });
                  dispatch({ type: 'TRIGGER_START_0900' });
                  setActiveScreen('hall');
                  setEmergencyModalOpen(false);
                }}
                className="instrument-btn btn-stable"
              >
                4. Немедленный СТАРТ 09:00 на табло из 1 240 клеток
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'LOAD_DEMO_1210' });
                  setActiveScreen('materials');
                  setEmergencyModalOpen(false);
                }}
                className="instrument-btn"
              >
                5. Открыть готовый Протокол смены (1210 из 1240 билетов)
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'RESET_SESSION' });
                  setEmergencyModalOpen(false);
                }}
                className="instrument-btn btn-incident"
              >
                6. Полный сброс партии к 03:00 (Сцена 1 «Вход»)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
