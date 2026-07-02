import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { parseStringPromise, Builder } from 'xml2js';

if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true,
        },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    mainWindow.webContents.openDevTools();
};

// IPC Handlers
ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    return result.filePaths[0] || null;
});

ipcMain.handle(
    'open-file-dialog',
    async (event, filters?: { name: string; extensions: string[] }[]) => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: filters && filters.length > 0 ? filters : [{ name: 'XML Files', extensions: ['xml'] }],
        });
        return result.filePaths[0] || null;
    }
);

ipcMain.handle('find-files-by-extension', async (event, dirPath: string, extensions: string[]) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const normalizedExtensions = extensions.map((ext) => ext.toLowerCase());
        const matches = entries
            .filter((entry) => entry.isFile() && normalizedExtensions.includes(path.extname(entry.name).toLowerCase().slice(1)))
            .map((entry) => path.join(dirPath, entry.name));
        return { success: true, data: matches };
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

app.on('ready', createWindow);

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

