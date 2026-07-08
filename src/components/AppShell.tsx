import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { NavRail } from './NavRail';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, setExpansionModAvailable, setBrdkModAvailable } from '../store/slices/appSlice';
import { detectExpansionMod } from '../dayzConfig/expansionMod';
import { detectBrdkMod } from '../dayzConfig/brdkMod';
import { loadEconomyClassNamesByFileCached } from '../dayzConfig/typesXml';

export const AppShell = () => {
    const dispatch = useAppDispatch();
    const currentProject = useAppSelector(selectCurrentProject);
    const projectOpenNonce = useAppSelector((state) => state.app.projectOpenNonce);

    // Проверяем наличие мода Expansion один раз при открытии проекта, независимо от того,
    // на каком маршруте (/editor, /expansion...) находится пользователь — NavRail должен
    // знать о доступности пункта меню сразу, а не только при заходе в редактор.
    // projectOpenNonce в зависимостях — иначе повторное «Открыть» того же самого проекта
    // (после «К проектам») не меняет ни один из остальных примитивов и эффект не перезапустится,
    // а expansionModAvailable уже сброшен в false редьюсером setCurrentProjectId — вкладка
    // Expansion пропадала бы навсегда после первого возврата к списку проектов.
    useEffect(() => {
        if (!currentProject) return;
        let cancelled = false;
        detectExpansionMod(currentProject).then((found) => {
            if (!cancelled) dispatch(setExpansionModAvailable(found));
            // Прогреваем кэш classname'ов economy сразу, как только известно, что мод стоит —
            // ClassName-пикер в Market/Traders откроется уже без ожидания парсинга types.xml.
            if (!cancelled && found) loadEconomyClassNamesByFileCached(currentProject);
        });
        detectBrdkMod(currentProject).then((found) => {
            if (!cancelled) dispatch(setBrdkModAvailable(found));
        });
        return () => {
            cancelled = true;
        };
    }, [currentProject?.id, currentProject?.path, currentProject?.profileFolderName, currentProject?.missionFolder, projectOpenNonce, dispatch]);

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <NavRail />
            <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
                <Outlet />
            </Box>
        </Box>
    );
};
