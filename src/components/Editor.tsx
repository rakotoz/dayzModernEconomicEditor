import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { SERVER_CONFIG_ID } from '../dayzConfig/serverConfig';
import { ServerConfigView } from '../views/ServerConfigView';

export const Editor = () => {
    const currentConfig = useAppSelector((state: RootState) => state.app.currentConfig);

    if (!currentConfig) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Выберите конфиг для редактирования</Typography>
            </Box>
        );
    }

    if (currentConfig.id === SERVER_CONFIG_ID) {
        return <ServerConfigView />;
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
