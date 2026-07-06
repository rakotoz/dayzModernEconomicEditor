import React, { useEffect, useState } from 'react';
import { Alert, Button, LinearProgress, Snackbar, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UpdaterStatus } from '../autoUpdater';

// Не мешаем работе тихой проверкой: баннер показываем только на этапах, которые реально
// требуют внимания пользователя — идёт скачивание или обновление готово к установке.
// 'checking'/'available'/'not-available'/'error' происходят молча (см. src/autoUpdater.ts).
export const UpdateNotification = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<UpdaterStatus | null>(null);

    useEffect(() => {
        if (!window.api?.onUpdaterStatus) return;
        return window.api.onUpdaterStatus(setStatus);
    }, []);

    if (!status || status.state === 'checking' || status.state === 'not-available' || status.state === 'available' || status.state === 'error') {
        return null;
    }

    return (
        <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
            <Alert
                severity="info"
                icon={false}
                action={
                    status.state === 'downloaded' ? (
                        <Button color="inherit" size="small" onClick={() => window.api.quitAndInstallUpdate()}>
                            {t('updater.restartNow')}
                        </Button>
                    ) : undefined
                }
                sx={{ width: '100%' }}
            >
                {status.state === 'downloading' ? (
                    <Stack spacing={0.5} sx={{ minWidth: 220 }}>
                        <Typography variant="body2">{t('updater.downloading', { percent: status.percent })}</Typography>
                        <LinearProgress variant="determinate" value={status.percent} />
                    </Stack>
                ) : (
                    <Typography variant="body2">{t('updater.readyToInstall', { version: status.version })}</Typography>
                )}
            </Alert>
        </Snackbar>
    );
};
