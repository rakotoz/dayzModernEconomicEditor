import React from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { AppShell } from './components/AppShell';
import { MainTemplate } from './components/MainTemplate';
import { ProjectsView } from './views/ProjectsView';
import { useAppSelector } from './store/hooks';

const EditorRoute = () => {
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);
    return currentProjectId ? <MainTemplate /> : <Navigate to="/projects" replace />;
};

const router = createHashRouter([
    {
        path: '/',
        element: <AppShell />,
        children: [
            { index: true, element: <Navigate to="/projects" replace /> },
            { path: 'projects', element: <ProjectsView /> },
            { path: 'editor', element: <EditorRoute /> },
        ],
    },
]);

export default router;
