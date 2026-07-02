import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';

export const MainTemplate = () => {
    const navigate = useNavigate();
    const currentProject = useAppSelector(selectCurrentProject);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Stack
                direction="row"
                sx={{
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {currentProject?.name}
                </Typography>
                <Button size="small" onClick={() => navigate('/projects')}>
                    К проектам
                </Button>
            </Stack>
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Sidebar />
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Editor />
                </Box>
            </Box>
        </Box>
    );
};
