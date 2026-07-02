import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import { Project, ConfigFile } from '../../types';
import { loadPersistedState } from '../persistence';

export interface AppState {
    projects: Project[];
    currentProjectId: string | null;
    currentConfig: ConfigFile | null;
    mods: any[];
    navCollapsed: boolean;
    sidebarCollapsed: boolean;
}

const persisted = loadPersistedState();

const initialState: AppState = {
    projects: persisted.projects ?? [],
    currentProjectId: persisted.currentProjectId ?? null,
    currentConfig: null,
    mods: [],
    navCollapsed: persisted.navCollapsed ?? false,
    sidebarCollapsed: persisted.sidebarCollapsed ?? false,
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
    },
});

export const {
    addProject,
    updateProject,
    removeProject,
    setCurrentProjectId,
    setCurrentConfig,
    setMods,
    toggleNavCollapsed,
    toggleSidebarCollapsed,
} = appSlice.actions;

export const selectCurrentProject = (state: { app: AppState }): Project | null =>
    state.app.projects.find((p) => p.id === state.app.currentProjectId) ?? null;

export default appSlice.reducer;
