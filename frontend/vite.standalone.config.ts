import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build « autonome » : tout inliné dans un seul index.html (JS + CSS + polices),
// pour visualiser/tester l'interface sans serveur ni backend.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-standalone',
    assetsInlineLimit: 100_000_000, // inline les polices woff2 en base64
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000,
  },
});
