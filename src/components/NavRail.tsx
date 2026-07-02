import React from 'react';
import { Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useLocation, useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleNavCollapsed } from '../store/slices/appSlice';

const NAV_ITEMS = [
    { path: '/projects', label: 'Проекты', icon: <FolderIcon /> },
    { path: '/editor', label: 'Параметры сервера', icon: <EditNoteIcon /> },
];

const EXPANDED_WIDTH = 96;
const COLLAPSED_WIDTH = 56;

export const NavRail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);
    const collapsed = useAppSelector((state) => state.app.navCollapsed);

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
                    const tooltipTitle = disabled ? 'Сначала выберите проект' : collapsed ? item.label : '';
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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <IconButton size="small" onClick={() => dispatch(toggleNavCollapsed())}>
                    {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                </IconButton>
            </Box>
        </Box>
    );
};
