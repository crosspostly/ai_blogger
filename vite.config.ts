import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          // FIX: Cannot find name '__dirname'. __dirname is not available in ESM.
          // Using path.resolve('.') resolves to the current working directory,
          // which is the project root where vite is run.
          '@': path.resolve('.'),
        }
      }
    });