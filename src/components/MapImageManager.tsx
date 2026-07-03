import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import MapIcon from '@mui/icons-material/Map';
import { useTranslation } from 'react-i18next';
import { getMapAssetUrlByKey } from '../data/dayzMaps';
import { mapImageUrl } from '../utils/assetUrl';

const IMAGE_FILTER = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];

interface MapImageManagerProps {
    mapKey: string;
    onResolved?: (path: string | null) => void;
}

export const MapImageManager = ({ mapKey, onResolved }: MapImageManagerProps) => {
    const { t } = useTranslation();
    const [imagePath, setImagePath] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);
    const [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState('');

    const assetUrl = getMapAssetUrlByKey(mapKey);

    const refresh = async () => {
        setChecking(true);
        setError(null);
        const res = await window.api.getMapImagePath(mapKey);
        setChecking(false);
        if (!res.success) {
            setError(res.error ?? null);
            return;
        }
        setImagePath(res.data ?? null);
        onResolved?.(res.data ?? null);
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapKey]);

    const applyResult = (path: string | null) => {
        setImagePath(path);
        onResolved?.(path);
    };

    const handleDownloadAddon = async () => {
        if (!assetUrl) return;
        setBusy(true);
        setBusyLabel(t('mapImage.downloadingAddon'));
        setError(null);
        const res = await window.api.downloadMapAddon(mapKey, assetUrl);
        setBusy(false);
        setBusyLabel(null);
        if (!res.success) {
            setError(res.error ?? t('mapImage.downloadError'));
            return;
        }
        applyResult(res.data ?? null);
    };

    const handleBrowse = async () => {
        const path = await window.api.openFileDialog(IMAGE_FILTER);
        if (!path) return;
        setBusy(true);
        setBusyLabel(null);
        setError(null);
        const res = await window.api.importMapImage(mapKey, path);
        setBusy(false);
        if (!res.success) {
            setError(res.error ?? t('mapImage.importError'));
            return;
        }
        applyResult(res.data ?? null);
    };

    const handleDownloadUrl = async () => {
        if (!downloadUrl.trim()) return;
        setBusy(true);
        setBusyLabel(null);
        setError(null);
        const res = await window.api.downloadMapImage(mapKey, downloadUrl.trim());
        setBusy(false);
        if (!res.success) {
            setError(res.error ?? t('mapImage.downloadError'));
            return;
        }
        applyResult(res.data ?? null);
    };

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('mapImage.title')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box
                    sx={{
                        width: 72,
                        height: 72,
                        flexShrink: 0,
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {checking || busy ? (
                        <CircularProgress size={20} />
                    ) : imagePath ? (
                        <Box
                            component="img"
                            src={mapImageUrl(imagePath)}
                            alt=""
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <MapIcon color="disabled" />
                    )}
                </Box>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" noWrap title={imagePath ?? ''}>
                        {busy && busyLabel
                            ? busyLabel
                            : checking
                              ? t('mapImage.checking')
                              : imagePath
                                ? t('mapImage.found')
                                : t('mapImage.missing')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        {assetUrl && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<CloudDownloadIcon fontSize="small" />}
                                onClick={handleDownloadAddon}
                                disabled={busy}
                            >
                                {t('mapImage.downloadFromStore')}
                            </Button>
                        )}
                        <Button size="small" startIcon={<UploadFileIcon fontSize="small" />} onClick={handleBrowse} disabled={busy}>
                            {t('mapImage.browse')}
                        </Button>
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder={t('mapImage.urlPlaceholder')}
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    disabled={busy}
                />
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon fontSize="small" />}
                    onClick={handleDownloadUrl}
                    disabled={busy || !downloadUrl.trim()}
                >
                    {t('mapImage.download')}
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
        </Box>
    );
};
