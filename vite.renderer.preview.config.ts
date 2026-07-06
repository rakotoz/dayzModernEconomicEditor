import { defineConfig } from 'vite';

// Только для локального browser-preview (mcp Claude_Preview) — реальная сборка renderer'а
// идёт через electron.vite.config.ts. Этот файл не участвует в электрон-сборке/паблише.
export default defineConfig({
    root: '.',
});
