import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { developmentStorageUrl } from './src/lib/dev-storage-routing'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  // Ordinary `pnpm dev` and the launcher share the same local API routing.
  // Reusing a server started in another terminal remains safe on LAN/HTTPS.
  define: command === 'serve'
    ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/__digis_api') }
    : {},
  plugins: [
    {
      name: 'digis-dev-identity',
      configureServer(server) {
        server.middlewares.use('/__digis_dev_identity', (_request, response) => {
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify({ service: 'digis-web', root: path.resolve(__dirname) }));
        });
      },
    },
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used — do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Same-origin dev API works on localhost, LAN phones and HTTPS tunnels.
    // This is a development proxy only; production uses VITE_API_BASE_URL.
    proxy: {
      '/__digis_api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/__digis_api/, ''),
        configure(proxy) {
          proxy.on('proxyRes', response => {
            const location = response.headers.location;
            if (location) response.headers.location = developmentStorageUrl(location);
          });
        },
      },
    },
    // Allow the HTTPS dev tunnel used as Chapa's return_url (Chapa requires a
    // public https host; localhost is rejected). host:true binds 0.0.0.0 so the
    // tunnel container can reach Vite on the host.
    host: true,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
    watch: {
      // Playwright writes test-results/playwright-report during e2e runs —
      // without this, those writes trigger HMR reloads that abort in-flight
      // API requests and reload pages mid-test (flaky e2e).
      ignored: ['**/test-results/**', '**/playwright-report/**', '**/e2e/.screenshots/**'],
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
}))
