// src/components/Sidebar.tsx
import React from 'react';
import { Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Tooltip } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import TableChartIcon from '@mui/icons-material/TableChart';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setCurrentConfig, toggleSidebarCollapsed } from '../store/slices/appSlice';
import { RootState } from '../store/store';
import { SERVER_CONFIG_ID } from '../dayzConfig/serverConfig';
import { ECONOMY_CONFIG_ID } from '../dayzConfig/economyCore';
import { EVENTS_CONFIG_ID } from '../dayzConfig/eventsXml';
import { EVENT_SPAWNS_CONFIG_ID } from '../dayzConfig/eventSpawnsXml';

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 56;

export const Sidebar = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentConfig = useAppSelector((state: RootState) => state.app.currentConfig);
    const collapsed = useAppSelector((state: RootState) => state.app.sidebarCollapsed);

    const SECTIONS = [
        {
            title: t('sidebar.server'),
            items: [{ id: SERVER_CONFIG_ID, name: t('sidebar.serverParams'), icon: <DnsIcon fontSize="small" /> }],
        },
        {
            title: t('sidebar.economy'),
            items: [
                {
                    id: ECONOMY_CONFIG_ID,
                    name: t('sidebar.economyFull'),
                    label: t('sidebar.itemTypes'),
                    icon: <TableChartIcon fontSize="small" />,
                },
            ],
        },
        {
            title: t('sidebar.events'),
            items: [
                {
                    id: EVENTS_CONFIG_ID,
                    name: t('sidebar.eventsFull'),
                    label: t('sidebar.events'),
                    icon: <EventIcon fontSize="small" />,
                },
                {
                    id: EVENT_SPAWNS_CONFIG_ID,
                    name: t('sidebar.eventSpawnsFull'),
                    label: t('sidebar.eventSpawns'),
                    icon: <PlaceIcon fontSize="small" />,
                },
            ],
        },
    ];

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
                        {t('sidebar.configs')}
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
