import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { SERVER_CONFIG_ID } from '../dayzConfig/serverConfig';
import { ECONOMY_CONFIG_ID } from '../dayzConfig/economyCore';
import { EVENTS_CONFIG_ID } from '../dayzConfig/eventsXml';
import { ServerConfigView } from '../views/ServerConfigView';
import { TypesXmlView } from '../views/TypesXmlView';
import { EventsView } from '../views/EventsView';

export const Editor = () => {
    const { t } = useTranslation();
    const currentConfig = useAppSelector((state: RootState) => state.app.currentConfig);

    if (!currentConfig) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>{t('editor.selectConfig')}</Typography>
            </Box>
        );
    }

    if (currentConfig.id === SERVER_CONFIG_ID) {
        return <ServerConfigView />;
    }

    if (currentConfig.id === ECONOMY_CONFIG_ID) {
        return <TypesXmlView />;
    }

    if (currentConfig.id === EVENTS_CONFIG_ID) {
        return <EventsView />;
    }

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {currentConfig.name}
            </Typography>
            <TextField
                multiline
                fullWidth
                defaultValue="XML content here..."
                sx={{ flex: 1, fontFamily: 'monospace' }}
                slotProps={{
                    input: {
                        style: {
                            height: '100%',
                        },
                    },
                }}
            />
        </Box>
    );
};
