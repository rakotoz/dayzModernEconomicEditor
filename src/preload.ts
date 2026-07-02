import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
        ipcRenderer.invoke('open-file-dialog', filters),
    readFile: (path: string) => ipcRenderer.invoke('read-file', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
    parseXml: (content: string) => ipcRenderer.invoke('parse-xml', content),
    findFilesByExtension: (dirPath: string, extensions: string[]) =>
        ipcRenderer.invoke('find-files-by-extension', dirPath, extensions),
    findFileRecursive: (rootPath: string, fileName: string, maxDepth?: number) =>
        ipcRenderer.invoke('find-file-recursive', rootPath, fileName, maxDepth),
});
