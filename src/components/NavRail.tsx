import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useLocation, useNavigate } from 'react-router';
import { useAppSelector } from '../store/hooks';

const NAV_ITEMS = [
    { path: '/projects', label: 'Проекты', icon: <FolderIcon /> },
    { path: '/editor', label: 'Параметры сервера', icon: <EditNoteIcon /> },
];

export const NavRail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentProjectId = useAppSelector((state) => state.app.currentProjectId);

    return (
        <Box
            sx={{
                width: 96,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                height: '100%',
                overflow: 'auto',
            }}
        >
            <List sx={{ py: 1 }}>
                {NAV_ITEMS.map((item) => {
                    const disabled = item.path === '/editor' && !currentProjectId;
                    const selected = location.pathname === item.path;
                    return (
                        <Tooltip key={item.path} title={disabled ? 'Сначала выберите проект' : ''} placement="right">
                            <span>
                                <ListItemButton
                                    selected={selected}
                                    disabled={disabled}
                                    onClick={() => navigate(item.path)}
                                    sx={{ flexDirection: 'column', py: 1.5, gap: 0.5 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center' }}>{item.icon}</ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        slotProps={{ primary: { sx: { fontSize: 11, textAlign: 'center' } } }}
                                    />
                                </ListItemButton>
                            </span>
                        </Tooltip>
                    );
                })}
            </List>
        </Box>
    );
};
