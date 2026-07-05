import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { NavRail } from './NavRail';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, setExpansionModAvailable } from '../store/slices/appSlice';
import { detectExpansionMod } from '../dayzConfig/expansionMod';

export const AppShell = () => {
    const dispatch = useAppDispatch();
    const currentProject = useAppSelector(selectCurrentProject);

    // Проверяем наличие мода Expansion один раз при открытии проекта, независимо от того,
    // на каком маршруте (/editor, /expansion...) находится пользователь — NavRail должен
    // знать о доступности пункта меню сразу, а не только при заходе в редактор.
    useEffect(() => {
        if (!currentProject) return;
        let cancelled = false;
        detectExpansionMod(currentProject).then((found) => {
            if (!cancelled) dispatch(setExpansionModAvailable(found));
        });
        return () => {
            cancelled = true;
        };
    }, [currentProject?.id, currentProject?.path, currentProject?.profileFolderName, currentProject?.missionFolder, dispatch]);

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <NavRail />
            <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
                <Outlet />
            </Box>
        </Box>
    );
};
