import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

// electron-vite — замена electron-forge/plugin-vite: собирает main/preload/renderer в out/,
// откуда их дальше пакует electron-builder (см. electron-builder.yml). Пути и имя перемен-
// ной ELECTRON_RENDERER_URL — соглашения electron-vite, использованы в src/main.ts как есть.
export default defineConfig({
    main: {
        // 'electron' — devDependency (как и положено, рантайм даёт его сам бинарник Electron,
        // а не node_modules), поэтому externalizeDepsPlugin (смотрит только dependencies) его
        // не подхватывает сам — добавляем в external вручную, иначе плагин затянет пакет
        // 'electron' (npm-инсталлятор бинарника) прямо в бандл main-процесса.
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: ['electron'],
                input: resolve(__dirname, 'src/main.ts'),
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: ['electron'],
                input: resolve(__dirname, 'src/preload.ts'),
                output: {
                    format: 'cjs',
                },
            },
        },
    },
    renderer: {
        root: '.',
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'index.html'),
            },
        },
    },
});
