import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { attachShiftServer, createApiMiddleware } from './server/gameServer';

function uptimeShiftServerPlugin(): Plugin {
  return {
    name: 'uptime-shift-server',
    configureServer(server) {
      if (!server.httpServer) return;
      const shiftServer = attachShiftServer(server.httpServer as any);
      server.middlewares.use(createApiMiddleware(shiftServer));
    },
    configurePreviewServer(server) {
      if (!server.httpServer) return;
      const shiftServer = attachShiftServer(server.httpServer as any);
      server.middlewares.use(createApiMiddleware(shiftServer));
    },
  };
}

export default defineConfig({
  plugins: [react(), uptimeShiftServerPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
