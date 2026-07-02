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
    writeFile: (path: string, content: string) => Promise<ApiResult>;
    parseXml: (content: string) => Promise<ApiResult>;
    findFilesByExtension: (dirPath: string, extensions: string[]) => Promise<ApiResult<string[]>>;
}

declare global {
    interface Window {
        api: DayzEditorApi;
    }
}

export {};
