import React, { useState } from 'react';
import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { ExpansionQuestsView } from '../views/ExpansionQuestsView';
import { ExpansionQuestNpcsView } from '../views/ExpansionQuestNpcsView';

type ExpansionSection = 'quests' | 'npcs';

// Отдельная страница верхнего уровня (пункт NavRail), а не часть Sidebar/Editor —
// по требованию: Expansion должен быть в главном меню, а не спрятан среди конфигов проекта.
// Внутри — своё подменю разделов (сейчас: квесты, квестовые NPC).
export const ExpansionPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const currentProject = useAppSelector(selectCurrentProject);
    const [section, setSection] = useState<ExpansionSection>('quests');

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

            <Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="quests" label={t('expansion.sections.quests')} />
                <Tab value="npcs" label={t('expansion.sections.npcs')} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                {section === 'quests' ? <ExpansionQuestsView /> : <ExpansionQuestNpcsView />}
            </Box>
        </Box>
    );
};
