
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type UserConfig } from 'vite';

const hmrDisabled = process.env.DISABLE_HMR === 'true';
const websocketOptions: NonNullable<UserConfig['server']>['ws'] = hmrDisabled
  ? false
  : { host: 'localhost', protocol: 'ws', clientPort: 3000 };

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: !hmrDisabled,
      ws: websocketOptions,

      // Disable file watching when DISABLE_HMR is true.
      watch: hmrDisabled ? null : {},

      // Forward frontend API requests to the Spring Boot backend.
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/actuator': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
