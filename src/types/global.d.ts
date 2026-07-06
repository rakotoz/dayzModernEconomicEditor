import type { UpdaterStatus } from '../autoUpdater';

export interface ApiResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface FileFilter {
    name: string;
    extensions: string[];
}

export interface DayzEditorApi {
    openFolderDialog: () => Promise<string | null>;
    openFileDialog: (filters?: FileFilter[]) => Promise<string | null>;
    readFile: (path: string) => Promise<ApiResult<string>>;
    pathExists: (path: string) => Promise<ApiResult<boolean>>;
    writeFile: (path: string, content: string) => Promise<ApiResult>;
    parseXml: (content: string) => Promise<ApiResult>;
    findFilesByExtension: (dirPath: string, extensions: string[]) => Promise<ApiResult<string[]>>;
    findFileRecursive: (rootPath: string, fileName: string, maxDepth?: number) => Promise<ApiResult<string[]>>;
    findDirRecursive: (rootPath: string, dirName: string, maxDepth?: number) => Promise<ApiResult<string[]>>;
    getMapImagePath: (mapKey: string) => Promise<ApiResult<string | null>>;
    importMapImage: (mapKey: string, sourcePath: string) => Promise<ApiResult<string>>;
    downloadMapImage: (mapKey: string, url: string) => Promise<ApiResult<string>>;
    downloadMapAddon: (mapKey: string, url: string) => Promise<ApiResult<string>>;
    getStorageDir: () => Promise<ApiResult<string>>;
    onUpdaterStatus: (callback: (status: UpdaterStatus) => void) => () => void;
    quitAndInstallUpdate: () => Promise<void>;
}

declare global {
    interface Window {
        api: DayzEditorApi;
    }
}

export {};
