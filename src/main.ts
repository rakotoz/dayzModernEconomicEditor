import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { parseStringPromise, Builder } from 'xml2js';

const execFileAsync = promisify(execFile);

if (require('electron-squirrel-startup')) {
    app.quit();
}

// Собственная схема для локальных ресурсов приложения: страница renderer в dev-режиме
// загружается по http://, и Chromium блокирует в ней file://-подресурсы, поэтому картинки
// карт отдаём через dayzasset://maps/<имя файла>.
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'dayzasset',
        privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true },
    },
]);

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
        },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    // mainWindow.webContents.openDevTools();
};

// IPC Handlers
ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    return result.filePaths[0] || null;
});

ipcMain.handle('open-file-dialog', async (event, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters && filters.length > 0 ? filters : [{ name: 'XML Files', extensions: ['xml'] }],
    });
    return result.filePaths[0] || null;
});

ipcMain.handle('find-files-by-extension', async (event, dirPath: string, extensions: string[]) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const normalizedExtensions = extensions.map((ext) => ext.toLowerCase());
        const matches = entries
            .filter(
                (entry) =>
                    entry.isFile() && normalizedExtensions.includes(path.extname(entry.name).toLowerCase().slice(1)),
            )
            .map((entry) => path.join(dirPath, entry.name));
        return { success: true, data: matches };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('find-file-recursive', async (event, rootPath: string, fileName: string, maxDepth = 6) => {
    const target = fileName.toLowerCase();
    const results: string[] = [];
    const skipDirs = new Set(['.git', 'node_modules', '.idea', '.vscode']);

    const walk = async (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        let entries: import('node:fs').Dirent[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (skipDirs.has(entry.name) || entry.name.startsWith('.')) continue;
                await walk(path.join(dir, entry.name), depth + 1);
            } else if (entry.isFile() && entry.name.toLowerCase() === target) {
                results.push(path.join(dir, entry.name));
            }
        }
    };

    try {
        await walk(rootPath, 0);
        return { success: true, data: results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('path-exists', async (event, targetPath: string) => {
    try {
        await fs.access(targetPath);
        return { success: true, data: true };
    } catch {
        return { success: true, data: false };
    }
});

ipcMain.handle('find-dir-recursive', async (event, rootPath: string, dirName: string, maxDepth = 6) => {
    const target = dirName.toLowerCase();
    const results: string[] = [];
    const skipDirs = new Set(['.git', 'node_modules', '.idea', '.vscode']);

    const walk = async (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        let entries: import('node:fs').Dirent[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            if (entry.name.toLowerCase() === target) {
                results.push(full);
                continue;
            }
            if (skipDirs.has(entry.name)) continue;
            await walk(full, depth + 1);
        }
    };

    try {
        await walk(rootPath, 0);
        return { success: true, data: results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file', async (event, filePath: string) => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: content };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath: string, content: string) => {
    try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('parse-xml', async (event, xmlContent: string) => {
    try {
        const result = await parseStringPromise(xmlContent);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Хранилище данных приложения — видимая пользователю папка в «Документах» (карты и прочие
// ресурсы, не привязанные к конкретному проекту: разные проекты с одной картой используют
// один файл). Создаётся лениво при первом обращении.
const getStorageRoot = () => path.join(app.getPath('documents'), 'DayZModernEconomicEditor');

const getAppDataDir = async (...segments: string[]) => {
    const dir = path.join(getStorageRoot(), ...segments);
    await fs.mkdir(dir, { recursive: true });
    return dir;
};

// Ранние версии складывали карты в userData — переносим уже скачанное в новую папку,
// чтобы не качать большие архивы повторно.
const migrateLegacyMaps = async () => {
    try {
        const legacyDir = path.join(app.getPath('userData'), 'maps');
        const entries = await fs.readdir(legacyDir).catch(() => [] as string[]);
        if (entries.length === 0) return;
        const mapsDir = await getAppDataDir('maps');
        for (const name of entries) {
            const dest = path.join(mapsDir, name);
            try {
                await fs.access(dest);
            } catch {
                await fs.copyFile(path.join(legacyDir, name), dest).catch(() => {});
            }
        }
    } catch {
        // миграция некритична — при неудаче карту можно скачать заново
    }
};

const setupAssetProtocol = () => {
    protocol.handle('dayzasset', async (request) => {
        try {
            const url = new URL(request.url);
            if (url.host !== 'maps') return new Response('Not found', { status: 404 });
            const fileName = decodeURIComponent(url.pathname).replace(/^\/+/, '');
            if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                return new Response('Bad request', { status: 400 });
            }
            const mapsDir = await getAppDataDir('maps');
            return net.fetch(pathToFileURL(path.join(mapsDir, fileName)).toString());
        } catch {
            return new Response('Internal error', { status: 500 });
        }
    });
};

ipcMain.handle('get-storage-dir', async () => {
    try {
        return { success: true, data: await getAppDataDir() };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

const MAP_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

ipcMain.handle('get-map-image-path', async (event, mapKey: string) => {
    try {
        const dir = await getAppDataDir('maps');
        for (const ext of MAP_IMAGE_EXTENSIONS) {
            const candidate = path.join(dir, mapKey + ext);
            try {
                await fs.access(candidate);
                return { success: true, data: candidate };
            } catch {
                // файла с этим расширением нет — пробуем следующее
            }
        }
        return { success: true, data: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-map-image', async (event, mapKey: string, sourcePath: string) => {
    try {
        const dir = await getAppDataDir('maps');
        const ext = MAP_IMAGE_EXTENSIONS.includes(path.extname(sourcePath).toLowerCase())
            ? path.extname(sourcePath).toLowerCase()
            : '.png';
        const dest = path.join(dir, mapKey + ext);
        await fs.copyFile(sourcePath, dest);
        return { success: true, data: dest };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Архивы карт (.rar/.zip из GitHub-релиза) распаковываем системным tar.exe: он собран
// поверх libarchive и читает оба формата, что избавляет от нативных npm-зависимостей.
const getTarPath = () =>
    process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';

ipcMain.handle('download-map-addon', async (event, mapKey: string, url: string) => {
    const workDir = path.join(app.getPath('temp'), 'dayz-editor', `addon-${Date.now()}`);
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
            return { success: false, error: 'Поддерживаются только https ссылки' };
        }
        await fs.mkdir(workDir, { recursive: true });

        const res = await fetch(url);
        if (!res.ok) {
            return { success: false, error: `HTTP ${res.status} ${res.statusText}` };
        }
        const archivePath = path.join(workDir, 'addon' + (path.extname(parsed.pathname).toLowerCase() || '.rar'));
        await fs.writeFile(archivePath, Buffer.from(await res.arrayBuffer()));

        const tar = getTarPath();
        const { stdout } = await execFileAsync(tar, ['-tf', archivePath], { maxBuffer: 10 * 1024 * 1024 });
        const entries = stdout
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        const pngEntry = entries.find((e) => e.toLowerCase().endsWith('.png'));
        if (!pngEntry) {
            return { success: false, error: 'В архиве не найдено PNG-изображение карты' };
        }

        await execFileAsync(tar, ['-xf', archivePath, '-C', workDir, pngEntry], { maxBuffer: 1024 * 1024 });
        const extractedPath = path.join(workDir, ...pngEntry.split('/'));

        const mapsDir = await getAppDataDir('maps');
        const dest = path.join(mapsDir, mapKey + '.png');
        await fs.copyFile(extractedPath, dest);
        return { success: true, data: dest };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
});

ipcMain.handle('download-map-image', async (event, mapKey: string, url: string) => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return { success: false, error: 'Поддерживаются только http(s) ссылки' };
        }
        const res = await fetch(url);
        if (!res.ok) {
            return { success: false, error: `HTTP ${res.status} ${res.statusText}` };
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const urlExt = path.extname(parsed.pathname).toLowerCase();
        const ext = MAP_IMAGE_EXTENSIONS.includes(urlExt) ? urlExt : '.png';
        const dir = await getAppDataDir('maps');
        const dest = path.join(dir, mapKey + ext);
        await fs.writeFile(dest, buffer);
        return { success: true, data: dest };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

app.on('ready', () => {
    setupAssetProtocol();
    migrateLegacyMaps();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
