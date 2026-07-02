// src/components/Sidebar.tsx
import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setCurrentConfig } from '../store/slices/appSlice';
import { RootState } from '../store/store';
import { SERVER_CONFIG_ID } from '../dayzConfig/serverConfig';

export const Sidebar = () => {
    const dispatch = useAppDispatch();
    const mods = useAppSelector((state: RootState) => state.app.mods);
    const currentConfig = useAppSelector((state: RootState) => state.app.currentConfig);

    return (
        <Box
            sx={{
                width: 280,
                flexShrink: 0,
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'auto',
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Конфиги
                </Typography>
            </Box>

            <Divider />

            <List sx={{ overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
                    Сервер
                </Typography>
                <ListItemButton
                    selected={currentConfig?.id === SERVER_CONFIG_ID}
                    sx={{ pl: 4 }}
                    onClick={() => dispatch(setCurrentConfig({ id: SERVER_CONFIG_ID, name: 'Параметры сервера', path: '' }))}
                >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        <DnsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Параметры сервера" />
                </ListItemButton>

                {mods.length > 0 && <Divider sx={{ my: 1 }} />}

                {mods.map((mod: any) => (
                    <Box key={mod.name}>
                        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
                            {mod.name}
                        </Typography>
                        {mod.configs?.map((config: any) => (
                            <ListItemButton
                                key={config.id}
                                sx={{ pl: 4 }}
                                selected={currentConfig?.id === config.id}
                                onClick={() => dispatch(setCurrentConfig(config))}
                            >
                                <ListItemText primary={config.name} />
                            </ListItemButton>
                        ))}
                    </Box>
                ))}
            </List>
        </Box>
    );
};
