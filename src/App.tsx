import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  acquireOrCheckClockLeader,
  createCrossWindowSyncBus,
  CrossWindowSyncBus,
  loadPersistedSessionState,
  parseLaunchParams,
  persistSessionState,
} from './game/syncBus';
import {
  AppMode,
  BrigadeId,
  MemberRole,
  ScreenView,
  SessionState,
  ThemeMode,
} from './types/game';

function triggerSoundForActionType(
  actionType?: string,
  verdictResult?: 'ПРОБИЛА' | 'ОТБИТА' | 'НЕ ПРИНЯТА'
): void {
  if (!actionType || actionType === 'TICK_SECOND') return;
  if (actionType === 'SUBMIT_CARD') {
    instrumentAudio.playCardDrop();
  } else if (actionType === 'SUBMIT_VERDICT') {
    if (verdictResult === 'ПРОБИЛА') instrumentAudio.playStampImpact('ПРОБИЛА');
    else if (verdictResult === 'ОТБИТА') instrumentAudio.playStampImpact('ОТБИТА');
    else instrumentAudio.playRelayClick();
  } else if (
    actionType === 'SET_PHASE' ||
    actionType === 'NEXT_PHASE' ||
    actionType === 'PREV_PHASE'
  ) {
    instrumentAudio.playPlateRise();
  } else {
    instrumentAudio.playRelayClick();
  }
}

export const App: React.FC = () => {
  const windowId = useMemo(
    () => `win-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`,
    []
  );

  const launchConfig = useMemo(() => {
    if (typeof window === 'undefined') return {};
    return parseLaunchParams(window.location.search, window.location.hash);
  }, []);

  const [state, setState] = useState<SessionState>(() => {
    const persisted = loadPersistedSessionState();
    return persisted || createInitialSession('4826');
  });

  const [activeScreen, setActiveScreen] = useState<ScreenView>(
    () => launchConfig.screen || 'hall'
  );
  const [activeBrigade, setActiveBrigade] = useState<BrigadeId>(
    () => launchConfig.brigade || 'TRY'
  );
  const [activeRole, setActiveRole] = useState<MemberRole>(
    () => launchConfig.role || 'аналитик'
  );
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [emergencyOpen, setEmergencyOpen] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [syncedWindowCount, setSyncedWindowCount] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [projectorCleanMode, setProjectorCleanMode] = useState<boolean>(
    () => Boolean(launchConfig.projectorClean)
  );

  const wsRef = useRef<WebSocket | null>(null);
  const syncBusRef = useRef<CrossWindowSyncBus | null>(null);
  const stateRef = useRef<SessionState>(state);
  stateRef.current = state;

  const localModeRef = useRef<AppMode>(state.mode);
  localModeRef.current = state.mode;

  const activeScreenRef = useRef<ScreenView>(activeScreen);
  activeScreenRef.current = activeScreen;

  // Синхронизация атрибута темы на корневом документе
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Реакция на смену #hash (например, если в текущем окне перешли на #projector)
  useEffect(() => {
    const onHashChange = () => {
      const cfg = parseLaunchParams(window.location.search, window.location.hash);
      if (cfg.screen) setActiveScreen(cfg.screen);
      if (cfg.projectorClean !== undefined) {
        setProjectorCleanMode(cfg.projectorClean);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Межвкладочная шина синхронизации (BroadcastChannel + localStorage) — работает и без сервера/сети
  useEffect(() => {
    const bus = createCrossWindowSyncBus({
      windowId,
      getCurrentState: () => stateRef.current,
      onRemoteState: (remoteState, actionType) => {
        triggerSoundForActionType(actionType, remoteState.lastGesture?.outcome);
        setState(remoteState);
      },
      onPeersChanged: (count) => {
        setSyncedWindowCount(count);
      },
    });
    syncBusRef.current = bus;
    return () => {
      bus.close();
      syncBusRef.current = null;
    };
  }, [windowId]);

  // Отправка действия: со звуковым откликом + рассылкой в соседние окна + отправкой на сервер
  const dispatch = useCallback((action: GameAction) => {
    triggerSoundForActionType(
      action.type,
      action.type === 'SUBMIT_VERDICT' ? action.result : undefined
    );

    setState((prev) => {
      const next = gameReducer(prev, action);
      syncBusRef.current?.publishState(next, action.type);
      return next;
    });

    if (
      localModeRef.current !== 'АВТОНОМНЫЙ' &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(JSON.stringify(action));
    }
  }, []);

  // Подключение к серверу партии по WebSocket с автоматическим переподключением
  useEffect(() => {
    if (
      state.mode === 'АВТОНОМНЫЙ' ||
      window.location.protocol === 'file:'
    ) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    let closed = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!closed) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg?.type === 'STATE_SYNC' && msg.state) {
              persistSessionState(msg.state);
              setState(msg.state);
            }
          } catch {
            // Игнорируем некорректные пакеты
          }
        };

        ws.onclose = () => {
          if (!closed) {
            setWsConnected(false);
            reconnectTimer = window.setTimeout(connect, 2500);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [state.mode]);

  // Локальный тик таймера с защитой от двойного хода часов (Clock Leader Election между окнами)
  useEffect(() => {
    if (wsConnected && state.mode !== 'АВТОНОМНЫЙ') return;
    const timer = window.setInterval(() => {
      if (!stateRef.current.timerRunning) return;
      const isPreferredHost = activeScreenRef.current === 'host';
      const isLeader = acquireOrCheckClockLeader(windowId, isPreferredHost);
      if (!isLeader) return;

      setState((prev) => {
        if (!prev.timerRunning) return prev;
        const next = gameReducer(prev, { type: 'TICK_SECOND' });
        syncBusRef.current?.publishState(next, 'TICK_SECOND');
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [wsConnected, state.mode, windowId]);

  // Глобальные горячие клавиши ведущего и арбитра
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        setEmergencyOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_TIMER' });
      } else if (e.key === '1') {
        dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: 1 });
      } else if (e.key === '2') {
        dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: 2 });
      } else if (e.key === '3') {
        dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: 3 });
      } else if (e.key === '4') {
        dispatch({ type: 'TOGGLE_PATCH_SLOT', slot: 4 });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'RUN_POLYGON' });
      } else if (e.key === 'y' || e.key === 'Y' || e.key === 'н' || e.key === 'Н') {
        dispatch({
          type: 'SUBMIT_VERDICT',
          result: 'ПРОБИЛА',
          legalAttackBonus: true,
          counterHeldBonus: false,
          journalLine: 'Атака пробила защиту (подтверждено клавишей Y)',
        });
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
        dispatch({
          type: 'SUBMIT_VERDICT',
          result: 'ОТБИТА',
          legalAttackBonus: true,
          counterHeldBonus: false,
          journalLine: 'Защита удержала строку (подтверждено клавишей N)',
        });
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') {
        dispatch({
          type: 'AWARD_MISSED_SPOT',
          note: 'Арбитр указал на пропуск обеих сторон (+1 очко)',
        });
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        dispatch({ type: 'NEXT_TACT' });
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
        dispatch({
          type: 'TOGGLE_ARBITER_STOP',
          reason: 'Стоп-кран арбитра на спорной карте (клавиша S)',
        });
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        setProjectorCleanMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    instrumentAudio.enabled = next;
    if (next) instrumentAudio.playRelayClick();
  };

  const handleOpenProjectorWindow = useCallback(() => {
    persistSessionState(stateRef.current);
    const baseUrl = window.location.href.split('#')[0];
    const targetUrl = `${baseUrl}#projector`;
    window.open(targetUrl, '_blank');
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!projectorCleanMode ? (
        <TopInstrumentBar
          state={state}
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          activeBrigade={activeBrigade}
          activeRole={activeRole}
          onOpenLogin={() => setLoginOpen(true)}
          onChangeMode={(mode: AppMode) => dispatch({ type: 'SET_MODE', mode })}
          onChangeTheme={(theme: ThemeMode) =>
            dispatch({ type: 'SET_THEME', theme })
          }
          onLoadDemoPreset={() => {
            dispatch({ type: 'LOAD_DEMO_1210' });
            setActiveScreen('hall');
          }}
          onOpenEmergencyMenu={() => setEmergencyOpen(true)}
          wsConnected={wsConnected}
          syncedWindowCount={syncedWindowCount}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onToggleProjectorMode={() => setProjectorCleanMode(true)}
          onOpenProjectorWindow={handleOpenProjectorWindow}
        />
      ) : (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            top: '8px',
            right: '12px',
            zIndex: 50,
            display: 'flex',
            gap: '6px',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: '13px',
              padding: '4px 8px',
              background: 'rgba(8, 24, 42, 0.85)',
              border: '1px solid var(--border-metal)',
              color: 'var(--color-stable)',
            }}
          >
            ПРОЕКТОР · ОКОН: {syncedWindowCount}
          </span>
          <button
            type="button"
            onClick={() => setProjectorCleanMode(false)}
            className="instrument-btn mono"
            style={{ opacity: 0.82, fontSize: '13px', padding: '4px 10px' }}
          >
            Показать верхнюю панель [F]
          </button>
        </div>
      )}

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
            dispatch={dispatch}
            activeBrigade={activeBrigade}
            activeRole={activeRole}
            onSelectBrigade={setActiveBrigade}
            onSelectRole={setActiveRole}
          />
        )}

        {activeScreen === 'arbiter' && (
          <ArbiterPanel state={state} dispatch={dispatch} />
        )}

        {activeScreen === 'host' && (
          <HostPanel
            state={state}
            dispatch={dispatch}
            onOpenProjectorWindow={handleOpenProjectorWindow}
            syncedWindowCount={syncedWindowCount}
          />
        )}

        {activeScreen === 'materials' && (
          <MaterialsScreen state={state} dispatch={dispatch} />
        )}
      </main>

      {loginOpen && (
        <LoginModal
          state={state}
          activeBrigade={activeBrigade}
          activeRole={activeRole}
          onApplyIdentity={(brigade, role, nextScreen) => {
            setActiveBrigade(brigade);
            setActiveRole(role);
            setActiveScreen(nextScreen);
          }}
          onClose={() => setLoginOpen(false)}
          dispatch={dispatch}
        />
      )}

      {emergencyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Аварийное меню переключения режима"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 8, 15, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px',
          }}
        >
          <div
            className="material-armor screw-corners"
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-incident)',
                    fontWeight: 800,
                  }}
                >
                  АВАРИЙНОЕ ПЕРЕКЛЮЧЕНИЕ (ДОКУМЕНТ 06, РАЗДЕЛ 9 · КЛАВИША ESC)
                </div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 900 }}>
                  Продолжение смены при сбое сети или проектора
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEmergencyOpen(false)}
                className="instrument-btn"
              >
                Закрыть [Esc]
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  handleOpenProjectorWindow();
                  setEmergencyOpen(false);
                }}
                className="instrument-btn btn-action"
                style={{ justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span>
                  <strong>Два экрана на одном ПК (без сети):</strong> Открыть окно проектора ↗
                </span>
                <span className="mono">BroadcastChannel ({syncedWindowCount} ок.)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_MODE', mode: 'РУЧНОЙ' });
                  setEmergencyOpen(false);
                }}
                className="instrument-btn btn-warning"
                style={{ justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span>
                  <strong>Упал Wi-Fi в кабинете:</strong> Переключить в «РУЧНОЙ РЕЖИМ»
                </span>
                <span className="mono">Карты на бумаге → ввод у ведущего</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_MODE', mode: 'АВТОНОМНЫЙ' });
                  setEmergencyOpen(false);
                }}
                className="instrument-btn"
                style={{ justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span>
                  <strong>Нет локального сервера:</strong> Переключить в «АВТОНОМНЫЙ»
                </span>
                <span className="mono">Один ноутбук ведущего + проектор</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_THEME', theme: 'light' });
                  setEmergencyOpen(false);
                }}
                className="instrument-btn"
                style={{ justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span>
                  <strong>Слабый проектор / солнце в окна:</strong> Тема «Светлый прибор»
                </span>
                <span className="mono">Высокий контраст</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'LOAD_DEMO_1210' });
                  setActiveScreen('hall');
                  setEmergencyOpen(false);
                }}
                className="instrument-btn btn-stable"
                style={{ justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span>
                  <strong>Показ комиссии (08:58):</strong> Загрузить пресет 1210 из 1240
                </span>
                <span className="mono">TRY 14 · CATCH 12 · FINALLY 11</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
