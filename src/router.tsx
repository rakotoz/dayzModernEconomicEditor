import React from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { AppShell } from './components/AppShell';
import { MainTemplate } from './components/MainTemplate';
import { ExpansionPage } from './components/ExpansionPage';
import { BrdkPage } from './components/BrdkPage';
import { ProjectsView } from './views/ProjectsView';
import { useAppSelector } from './store/hooks';

const EditorRoute = () => {
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);
    return currentProjectId ? <MainTemplate /> : <Navigate to="/projects" replace />;
};

const ExpansionRoute = () => {
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);
    const expansionModAvailable = useAppSelector((state) => state.app.expansionModAvailable);
    if (!currentProjectId) return <Navigate to="/projects" replace />;
    if (!expansionModAvailable) return <Navigate to="/editor" replace />;
    return <ExpansionPage />;
};

const BrdkRoute = () => {
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);
    const brdkModAvailable = useAppSelector((state) => state.app.brdkModAvailable);
    if (!currentProjectId) return <Navigate to="/projects" replace />;
    if (!brdkModAvailable) return <Navigate to="/editor" replace />;
    return <BrdkPage />;
};

const router = createHashRouter([
    {
        path: '/',
        element: <AppShell />,
        children: [
            { index: true, element: <Navigate to="/projects" replace /> },
            { path: 'projects', element: <ProjectsView /> },
            { path: 'editor', element: <EditorRoute /> },
            { path: 'expansion', element: <ExpansionRoute /> },
            { path: 'brdk', element: <BrdkRoute /> },
        ],
    },
]);

export default router;
