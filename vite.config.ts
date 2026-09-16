import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


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

export default defineConfig({
  plugins: [
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
})
