import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import { Project, ConfigFile } from '../../types';
import { loadPersistedState, ThemeMode, Language } from '../persistence';

export interface AppState {
    projects: Project[];
    currentProjectId: string | null;
    currentConfig: ConfigFile | null;
    mods: any[];
    navCollapsed: boolean;
    sidebarCollapsed: boolean;
    themeMode: ThemeMode;
    language: Language;
    // Определяется на диске при открытии проекта (см. MainTemplate), не персистится —
    // структура папок мода могла измениться с прошлого запуска.
    expansionModAvailable: boolean;
    // Аналогично expansionModAvailable, но для набора модов BRDK (папка profiles/BRDK_MODS).
    brdkModAvailable: boolean;
    // Инкрементируется при каждом setCurrentProjectId, даже если id совпадает с уже открытым
    // проектом (повторное «Открыть» после «К проектам») — AppShell использует это как доп.
    // зависимость эффекта детекции, т.к. project?.id/path и т.д. в этом случае не меняются.
    projectOpenNonce: number;
}

const persisted = loadPersistedState();

const initialState: AppState = {
    projects: persisted.projects ?? [],
    currentProjectId: persisted.currentProjectId ?? null,
    currentConfig: null,
    mods: [],
    navCollapsed: persisted.navCollapsed ?? false,
    sidebarCollapsed: persisted.sidebarCollapsed ?? false,
    themeMode: persisted.themeMode ?? 'dark',
    language: persisted.language ?? 'ru',
    expansionModAvailable: false,
    brdkModAvailable: false,
    projectOpenNonce: 0,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        addProject: {
            reducer: (state: AppState, action: PayloadAction<Project>) => {
                state.projects.push(action.payload);
            },
            prepare: (project: Omit<Project, 'id'>) => ({
                payload: { ...project, id: nanoid() } as Project,
            }),
        },
        updateProject: (
            state: AppState,
            action: PayloadAction<{ id: string; changes: Partial<Omit<Project, 'id'>> }>
        ) => {
            const project = state.projects.find((p) => p.id === action.payload.id);
            if (project) {
                Object.assign(project, action.payload.changes);
            }
        },
        removeProject: (state: AppState, action: PayloadAction<string>) => {
            state.projects = state.projects.filter((p) => p.id !== action.payload);
            if (state.currentProjectId === action.payload) {
                state.currentProjectId = null;
                state.currentConfig = null;
                state.mods = [];
            }
        },
        setCurrentProjectId: (state: AppState, action: PayloadAction<string | null>) => {
            state.currentProjectId = action.payload;
            state.currentConfig = null;
            state.mods = [];
            state.expansionModAvailable = false;
            state.brdkModAvailable = false;
            state.projectOpenNonce += 1;
        },
        setExpansionModAvailable: (state: AppState, action: PayloadAction<boolean>) => {
            state.expansionModAvailable = action.payload;
        },
        setBrdkModAvailable: (state: AppState, action: PayloadAction<boolean>) => {
            state.brdkModAvailable = action.payload;
        },
        setCurrentConfig: (state: AppState, action: PayloadAction<ConfigFile | null>) => {
            state.currentConfig = action.payload;
        },
        setMods: (state: AppState, action: PayloadAction<any[]>) => {
            state.mods = action.payload;
        },
        toggleNavCollapsed: (state: AppState) => {
            state.navCollapsed = !state.navCollapsed;
        },
        toggleSidebarCollapsed: (state: AppState) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        toggleThemeMode: (state: AppState) => {
            state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark';
        },
        setLanguage: (state: AppState, action: PayloadAction<Language>) => {
            state.language = action.payload;
        },
    },
});

export const {
    addProject,
    updateProject,
    removeProject,
    setCurrentProjectId,
    setExpansionModAvailable,
    setBrdkModAvailable,
    setCurrentConfig,
    setMods,
    toggleNavCollapsed,
    toggleSidebarCollapsed,
    toggleThemeMode,
    setLanguage,
} = appSlice.actions;

export const selectCurrentProject = (state: { app: AppState }): Project | null =>
    state.app.projects.find((p) => p.id === state.app.currentProjectId) ?? null;

export default appSlice.reducer;
