import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { SERVER_CONFIG_ID } from '../dayzConfig/serverConfig';
import { ECONOMY_CONFIG_ID } from '../dayzConfig/economyCore';
import { EVENTS_CONFIG_ID } from '../dayzConfig/eventsXml';
import { EVENT_SPAWNS_CONFIG_ID } from '../dayzConfig/eventSpawnsXml';
import { EVENT_GROUPS_CONFIG_ID } from '../dayzConfig/eventGroupsXml';
import { USER_DEFINITIONS_CONFIG_ID } from '../dayzConfig/userDefinitions';
import { GLOBALS_CONFIG_ID } from '../dayzConfig/globalsXml';
import { PLAYER_SPAWNS_CONFIG_ID } from '../dayzConfig/playerSpawnPoints';
import { CFG_GAMEPLAY_CONFIG_ID } from '../dayzConfig/cfgGameplay';
import { CFG_WEATHER_CONFIG_ID } from '../dayzConfig/cfgWeather';
import { ServerConfigView } from '../views/ServerConfigView';
import { TypesXmlView } from '../views/TypesXmlView';
import { EventsView } from '../views/EventsView';
import { EventSpawnsView } from '../views/EventSpawnsView';
import { EventGroupsView } from '../views/EventGroupsView';
import { UserDefinitionsView } from '../views/UserDefinitionsView';
import { GlobalsView } from '../views/GlobalsView';
import { PlayerSpawnsView } from '../views/PlayerSpawnsView';
import { CfgGameplayView } from '../views/CfgGameplayView';
import { CfgWeatherView } from '../views/CfgWeatherView';

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

    if (currentConfig.id === EVENT_SPAWNS_CONFIG_ID) {
        return <EventSpawnsView />;
    }

    if (currentConfig.id === EVENT_GROUPS_CONFIG_ID) {
        return <EventGroupsView />;
    }

    if (currentConfig.id === USER_DEFINITIONS_CONFIG_ID) {
        return <UserDefinitionsView />;
    }

    if (currentConfig.id === GLOBALS_CONFIG_ID) {
        return <GlobalsView />;
    }

    if (currentConfig.id === PLAYER_SPAWNS_CONFIG_ID) {
        return <PlayerSpawnsView />;
    }

    if (currentConfig.id === CFG_GAMEPLAY_CONFIG_ID) {
        return <CfgGameplayView />;
    }

    if (currentConfig.id === CFG_WEATHER_CONFIG_ID) {
        return <CfgWeatherView />;
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
