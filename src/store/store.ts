import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import { savePersistedState } from './persistence';

export const store = configureStore({
    reducer: {
        app: appReducer,
    },
});

store.subscribe(() => {
    const { projects, currentProjectId, navCollapsed, sidebarCollapsed } = store.getState().app;
    savePersistedState({ projects, currentProjectId, navCollapsed, sidebarCollapsed });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
