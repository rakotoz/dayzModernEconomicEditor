import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('api', {
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
        ipcRenderer.invoke('open-file-dialog', filters),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path),
    pathExists: (path: string) => ipcRenderer.invoke('path-exists', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
    deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
    parseXml: (content: string) => ipcRenderer.invoke('parse-xml', content),
    findFilesByExtension: (dirPath: string, extensions: string[]) =>
        ipcRenderer.invoke('find-files-by-extension', dirPath, extensions),
    findFileRecursive: (rootPath: string, fileName: string, maxDepth?: number) =>
        ipcRenderer.invoke('find-file-recursive', rootPath, fileName, maxDepth),
    findDirRecursive: (rootPath: string, dirName: string, maxDepth?: number) =>
        ipcRenderer.invoke('find-dir-recursive', rootPath, dirName, maxDepth),
    getMapImagePath: (mapKey: string) => ipcRenderer.invoke('get-map-image-path', mapKey),
    importMapImage: (mapKey: string, sourcePath: string) => ipcRenderer.invoke('import-map-image', mapKey, sourcePath),
    downloadMapImage: (mapKey: string, url: string) => ipcRenderer.invoke('download-map-image', mapKey, url),
    downloadMapAddon: (mapKey: string, url: string) => ipcRenderer.invoke('download-map-addon', mapKey, url),
    getStorageDir: () => ipcRenderer.invoke('get-storage-dir'),
    onUpdaterStatus: (callback: (status: unknown) => void) => {
        const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
        ipcRenderer.on('updater:status', listener);
        return () => ipcRenderer.removeListener('updater:status', listener);
    },
    quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quit-and-install'),
});
