import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { NavRail } from './NavRail';

export const AppShell = () => (
    <Box sx={{ display: 'flex', height: '100vh' }}>
        <NavRail />
        <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
            <Outlet />
        </Box>
    </Box>
);
