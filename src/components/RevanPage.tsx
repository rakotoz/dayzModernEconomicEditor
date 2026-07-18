import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { RevanConfigView } from '../views/RevanConfigView';

// Отдельная страница верхнего уровня (пункт NavRail), по аналогии с ExpansionPage/BrdkPage —
// конфиги наших модов Rev_* (profiles/Rev_mods/**).
export const RevanPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
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
                    {t('mainTemplate.backToProjects')}
                </Button>
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <RevanConfigView />
            </Box>
        </Box>
    );
};
