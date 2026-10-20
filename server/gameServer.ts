import { existsSync, readFileSync } from 'fs';
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import { join } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createInitialSession } from '../src/game/engine';
import { GameAction, gameReducer } from '../src/game/reducer';
import { SessionState } from '../src/types/game';

export interface ShiftServerInstance {
  getState: () => SessionState;
  dispatch: (action: GameAction) => SessionState;
  close: () => void;
}

export function attachShiftServer(httpServer: HttpServer): ShiftServerInstance {
  let state: SessionState = createInitialSession('4826');
  const wss = new WebSocketServer({ noServer: true });

  const broadcastState = () => {
    const payload = JSON.stringify({ type: 'STATE_SYNC', state });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  const dispatch = (action: GameAction): SessionState => {
    state = gameReducer(state, action);
    broadcastState();
    return state;
  };

  // Серверный тик часов смены (раз в секунду, когда таймер запущен)
  const interval = setInterval(() => {
    if (state.timerRunning) {
      state = gameReducer(state, { type: 'TICK_SECOND' });
      broadcastState();
    }
  }, 1000);

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    if (url.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'STATE_SYNC', state }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg && msg.type === 'DISPATCH' && msg.action) {
          dispatch(msg.action as GameAction);
        } else if (msg && msg.type) {
          dispatch(msg as GameAction);
        }
      } catch {
        // Ignore malformed messages
      }
    });
  });

  return {
    getState: () => state,
    dispatch,
    close: () => {
      clearInterval(interval);
      wss.close();
    },
  };
}

export function createApiMiddleware(shiftServer: ShiftServerInstance) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';
    if (url === '/api/state' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(shiftServer.getState()));
      return;
    }

    if (url === '/api/portable' && req.method === 'GET') {
      const portablePath = join(process.cwd(), 'dist', 'uptime-portable.html');
      if (existsSync(portablePath)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="uptime-portable.html"'
        );
        res.end(readFileSync(portablePath));
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error:
              'Портативная сборка dist/uptime-portable.html ещё не создана. Выполните npm run build.',
          })
        );
      }
      return;
    }

    if (url === '/api/action' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const action = JSON.parse(body) as GameAction;
          const nextState = shiftServer.dispatch(action);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(nextState));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }

    next();
  };
}
