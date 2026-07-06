import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

// Стратегия: скачиваем обновление в фоне молча (файл ставится один раз, ждать пользователю
// нечего), но НЕ перезапускаем приложение автоматически — пользователь может быть посреди
// правки квеста/конфига. Разворачиваем только уведомление с кнопкой «Перезапустить и
// обновить», реальная установка происходит через quitAndInstall по явному клику.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

export type UpdaterStatus =
    | { state: 'checking' }
    | { state: 'available'; version: string }
    | { state: 'not-available' }
    | { state: 'downloading'; percent: number }
    | { state: 'downloaded'; version: string }
    | { state: 'error'; message: string };

const broadcast = (status: UpdaterStatus) => {
    for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('updater:status', status);
    }
};

export const setupAutoUpdater = () => {
    // В dev-режиме (не запакованное приложение) electron-updater не может ничего найти —
    // проверка бессмысленна и только шумит в консоли.
    if (!app.isPackaged) return;

    autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => broadcast({ state: 'available', version: info.version }));
    autoUpdater.on('update-not-available', () => broadcast({ state: 'not-available' }));
    autoUpdater.on('download-progress', (progress) => broadcast({ state: 'downloading', percent: Math.round(progress.percent) }));
    autoUpdater.on('update-downloaded', (info) => broadcast({ state: 'downloaded', version: info.version }));
    autoUpdater.on('error', (error) => broadcast({ state: 'error', message: error.message }));

    ipcMain.handle('updater:check-now', () => autoUpdater.checkForUpdates());
    ipcMain.handle('updater:quit-and-install', () => autoUpdater.quitAndInstall());

    // Первая проверка вскоре после старта, затем раз в 4 часа — сервер редактируется не
    // ежеминутно, частые проверки не нужны.
    autoUpdater.checkForUpdates().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
};
