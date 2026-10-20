import { createServer } from 'http';
import { existsSync, readFileSync, statSync } from 'fs';
import { extname, join, normalize } from 'path';
import { attachShiftServer, createApiMiddleware } from './gameServer';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = join(process.cwd(), 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function createStandaloneServer() {
  let apiMiddleware: ReturnType<typeof createApiMiddleware> | null = null;

  const httpServer = createServer((req, res) => {
    const fallback = () => {
      const rawPath = (req.url || '/').split('?')[0];
      const safePath = normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
      let filePath = join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(DIST_DIR, 'index.html');
      }

      if (existsSync(filePath) && !statSync(filePath).isDirectory()) {
        const ext = extname(filePath);
        res.statusCode = 200;
        res.setHeader(
          'Content-Type',
          MIME_TYPES[ext] || 'application/octet-stream'
        );
        res.end(readFileSync(filePath));
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('dist/ build not found. Run npm run build first.');
      }
    };

    if (apiMiddleware) {
      apiMiddleware(req, res, fallback);
    } else {
      fallback();
    }
  });

  const shiftServer = attachShiftServer(httpServer);
  apiMiddleware = createApiMiddleware(shiftServer);

  return { httpServer, shiftServer };
}

if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  const { httpServer } = createStandaloneServer();
  httpServer.listen(PORT, HOST, () => {
    console.log(
      `[АПТАЙМ · Ночная смена] Локальный сервер партии запущен: http://${HOST}:${PORT}`
    );
  });
}
