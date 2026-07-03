import { Project } from '../types';

const STORAGE_KEY = 'dayz-editor-projects-state';

export type ThemeMode = 'light' | 'dark';
export type Language = 'ru' | 'en';

export interface PersistedState {
    projects: Project[];
    currentProjectId: string | null;
    navCollapsed: boolean;
    sidebarCollapsed: boolean;
    themeMode: ThemeMode;
    language: Language;
}

export const loadPersistedState = (): Partial<PersistedState> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

export const savePersistedState = (state: PersistedState) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // localStorage может быть недоступен (например, в приватном режиме) — молча пропускаем
    }
};
