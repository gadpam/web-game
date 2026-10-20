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
  AppMode,
  BrigadeId,
  MemberRole,
  ScreenView,
  SessionState,
  ThemeMode,
} from './types/game';

export const App: React.FC = () => {
  const [state, setState] = useState<SessionState>(() =>
    createInitialSession('4826')
  );
  const [activeScreen, setActiveScreen] = useState<ScreenView>('hall');
  const [activeBrigade, setActiveBrigade] = useState<BrigadeId>('TRY');
  const [activeRole, setActiveRole] = useState<MemberRole>('аналитик');
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [emergencyOpen, setEmergencyOpen] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [projectorCleanMode, setProjectorCleanMode] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const localModeRef = useRef<AppMode>(state.mode);
  localModeRef.current = state.mode;

  // Синхронизация атрибута темы на корневом документе
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Отправка действия: со звуковым откликом + отправкой на сервер (если не АВТОНОМНЫЙ)
  const dispatch = useCallback((action: GameAction) => {
    if (action.type === 'SUBMIT_CARD') {
      instrumentAudio.playCardDrop();
    } else if (action.type === 'SUBMIT_VERDICT') {
      if (action.result === 'ПРОБИЛА') instrumentAudio.playStampImpact('ПРОБИЛА');
      else if (action.result === 'ОТБИТА') instrumentAudio.playStampImpact('ОТБИТА');
      else instrumentAudio.playRelayClick();
    } else if (
      action.type === 'SET_PHASE' ||
      action.type === 'NEXT_PHASE' ||
      action.type === 'PREV_PHASE'
    ) {
      instrumentAudio.playPlateRise();
    } else if (action.type !== 'TICK_SECOND') {
      instrumentAudio.playRelayClick();
    }

    setState((prev) => gameReducer(prev, action));

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
    if (state.mode === 'АВТОНОМНЫЙ') {
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

  // Локальный тик таймера на случай автономного режима или отсутствия WebSocket
  useEffect(() => {
    if (wsConnected && state.mode !== 'АВТОНОМНЫЙ') return;
    const timer = window.setInterval(() => {
      setState((prev) =>
        prev.timerRunning ? gameReducer(prev, { type: 'TICK_SECOND' }) : prev
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [wsConnected, state.mode]);

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
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onToggleProjectorMode={() => setProjectorCleanMode(true)}
        />
      ) : (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            top: '8px',
            right: '12px',
            zIndex: 50,
          }}
        >
          <button
            type="button"
            onClick={() => setProjectorCleanMode(false)}
            className="instrument-btn mono"
            style={{ opacity: 0.78, fontSize: '13px', padding: '4px 10px' }}
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
          <HostPanel state={state} dispatch={dispatch} />
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
                className="instrument-btn btn-action"
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
