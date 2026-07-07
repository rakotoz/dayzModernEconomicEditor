import React from 'react';
import { Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ExtensionIcon from '@mui/icons-material/Extension';
import DiamondIcon from '@mui/icons-material/Diamond';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleNavCollapsed, toggleThemeMode, setLanguage } from '../store/slices/appSlice';
import { Language } from '../store/persistence';

const EXPANDED_WIDTH = 96;
const COLLAPSED_WIDTH = 56;

export const NavRail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);
    const expansionModAvailable = useAppSelector((state) => state.app.expansionModAvailable);
    const brdkModAvailable = useAppSelector((state) => state.app.brdkModAvailable);
    const collapsed = useAppSelector((state) => state.app.navCollapsed);
    const themeMode = useAppSelector((state) => state.app.themeMode);
    const language = useAppSelector((state) => state.app.language);

    const NAV_ITEMS = [
        { path: '/projects', label: t('nav.projects'), icon: <FolderIcon /> },
        { path: '/editor', label: t('nav.editor'), icon: <EditNoteIcon /> },
        ...(expansionModAvailable && currentProjectId
            ? [{ path: '/expansion', label: t('nav.expansion'), icon: <ExtensionIcon /> }]
            : []),
        ...(brdkModAvailable && currentProjectId
            ? [{ path: '/brdk', label: t('nav.brdk'), icon: <DiamondIcon /> }]
            : []),
    ];

    const handleToggleLanguage = () => {
        const next: Language = language === 'ru' ? 'en' : 'ru';
        dispatch(setLanguage(next));
    };

    return (
        <Box
            sx={{
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.15s ease',
            }}
        >
            <List sx={{ py: 1, flex: 1, overflow: 'auto' }}>
                {NAV_ITEMS.map((item) => {
                    const disabled = item.path === '/editor' && !currentProjectId;
                    const selected = location.pathname === item.path;
                    const tooltipTitle = disabled ? t('nav.selectProjectFirst') : collapsed ? item.label : '';
                    return (
                        <Tooltip key={item.path} title={tooltipTitle} placement="right">
                            <span>
                                <ListItemButton
                                    selected={selected}
                                    disabled={disabled}
                                    onClick={() => navigate(item.path)}
                                    sx={{ flexDirection: 'column', py: 1.5, gap: 0.5, px: 0.5 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center' }}>{item.icon}</ListItemIcon>
                                    {!collapsed && (
                                        <ListItemText
                                            primary={item.label}
                                            slotProps={{ primary: { sx: { fontSize: 11, textAlign: 'center' } } }}
                                        />
                                    )}
                                </ListItemButton>
                            </span>
                        </Tooltip>
                    );
                })}
            </List>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    py: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Tooltip title={t('nav.language')} placement="right">
                    <IconButton size="small" onClick={handleToggleLanguage} sx={{ fontSize: 11, fontWeight: 'bold' }}>
                        {language === 'ru' ? 'RU' : 'EN'}
                    </IconButton>
                </Tooltip>
                <Tooltip title={themeMode === 'dark' ? t('nav.lightTheme') : t('nav.darkTheme')} placement="right">
                    <IconButton size="small" onClick={() => dispatch(toggleThemeMode())}>
                        {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => dispatch(toggleNavCollapsed())}>
                    {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                </IconButton>
            </Box>
        </Box>
    );
};
