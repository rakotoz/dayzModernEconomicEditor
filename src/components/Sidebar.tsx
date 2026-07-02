// src/components/Sidebar.tsx
import React from 'react';
import { Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Tooltip } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import TableChartIcon from '@mui/icons-material/TableChart';
import EventIcon from '@mui/icons-material/Event';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setCurrentConfig, toggleSidebarCollapsed } from '../store/slices/appSlice';
import { RootState } from '../store/store';
import { SERVER_CONFIG_ID } from '../dayzConfig/serverConfig';
import { ECONOMY_CONFIG_ID } from '../dayzConfig/economyCore';
import { EVENTS_CONFIG_ID } from '../dayzConfig/eventsXml';

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 56;

const SECTIONS = [
    {
        title: 'Сервер',
        items: [{ id: SERVER_CONFIG_ID, name: 'Параметры сервера', icon: <DnsIcon fontSize="small" /> }],
    },
    {
        title: 'Экономика',
        items: [{ id: ECONOMY_CONFIG_ID, name: 'Экономика (types.xml)', label: 'Типы предметов', icon: <TableChartIcon fontSize="small" /> }],
    },
    {
        title: 'События',
        items: [{ id: EVENTS_CONFIG_ID, name: 'События (events.xml)', label: 'События', icon: <EventIcon fontSize="small" /> }],
    },
];

export const Sidebar = () => {
    const dispatch = useAppDispatch();
    const currentConfig = useAppSelector((state: RootState) => state.app.currentConfig);
    const collapsed = useAppSelector((state: RootState) => state.app.sidebarCollapsed);

    return (
        <Box
            sx={{
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                flexShrink: 0,
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'auto',
                transition: 'width 0.15s ease',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', p: 1 }}>
                {!collapsed && (
                    <Typography variant="h6" sx={{ fontWeight: 'bold', pl: 1 }}>
                        Конфиги
                    </Typography>
                )}
                <IconButton size="small" onClick={() => dispatch(toggleSidebarCollapsed())}>
                    {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                </IconButton>
            </Box>

            <Divider />

            <List sx={{ overflow: 'auto' }}>
                {SECTIONS.map((section, sectionIndex) => (
                    <React.Fragment key={section.title}>
                        {sectionIndex > 0 && <Divider sx={{ my: 1 }} />}
                        {!collapsed && (
                            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
                                {section.title}
                            </Typography>
                        )}
                        {section.items.map((item) => (
                            <Tooltip key={item.id} title={collapsed ? item.label ?? item.name : ''} placement="right">
                                <ListItemButton
                                    selected={currentConfig?.id === item.id}
                                    sx={{ pl: collapsed ? 2 : 4, justifyContent: collapsed ? 'center' : 'flex-start' }}
                                    onClick={() => dispatch(setCurrentConfig({ id: item.id, name: item.name, path: '' }))}
                                >
                                    <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 32 }}>{item.icon}</ListItemIcon>
                                    {!collapsed && <ListItemText primary={item.label ?? item.name} />}
                                </ListItemButton>
                            </Tooltip>
                        ))}
                    </React.Fragment>
                ))}
            </List>
        </Box>
    );
};
