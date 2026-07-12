import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, List, ListItemButton, ListItemText, Snackbar, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { BrdkConfigFile, findBrdkModsDir, listBrdkConfigFiles, parseBrdkConfigFile, serializeBrdkConfigFile } from '../dayzConfig/brdkConfig';
import { JsonValue, setJsonPath } from '../dayzConfig/cfgGameplay';
import { RecursiveJsonForm } from '../components/RecursiveJsonForm';
import { BrdkMakeStashView } from './BrdkMakeStashView';
import { BrdkGoldRushView } from './BrdkGoldRushView';
import { BrdkSuperHousesView } from './BrdkSuperHousesView';
import { BrdkZmbPresetView } from './BrdkZmbPresetView';
import { BrdkMapCleanerView } from './BrdkMapCleanerView';
import { BrdkGammaRayView } from './BrdkGammaRayView';
import { BrdkArtsView } from './BrdkArtsView';
import { BrdkAdminMenuView } from './BrdkAdminMenuView';

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

interface LoadedFile {
    hadBom: boolean;
    data: Record<string, JsonValue>;
}

// Профильные JSON-конфиги набора модов BRDK (profiles/BRDK_MODS/*.json) — структура у каждого
// мода своя и заранее не типизирована на нашей стороне (см. cfgGameplay.ts про тот же подход),
// поэтому редактируем универсальным RecursiveJsonForm, а не отдельным UI под каждый файл.
export const BrdkConfigView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [brdkModsDir, setBrdkModsDir] = useState<string | null>(null);

    const [files, setFiles] = useState<BrdkConfigFile[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<Record<string, LoadedFile>>({});
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const dir = await findBrdkModsDir(project);
        if (!dir) {
            setErrorMessage(t('brdkConfig.dirNotFound'));
            setStatus('error');
            return;
        }
        setBrdkModsDir(dir);
        setStatus('loading');

        const list = await listBrdkConfigFiles(dir);
        setFiles(list);
        setLoaded({});
        setDirtyPaths(new Set());
        setSelectedPath(list[0]?.filePath ?? null);
        setStatus('ready');
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    useEffect(() => {
        if (!selectedPath || loaded[selectedPath]) return;
        let cancelled = false;
        window.api.readFile(selectedPath).then((res) => {
            if (cancelled || !res.success || res.data === undefined) return;
            try {
                const parsed = parseBrdkConfigFile(res.data);
                setLoaded((prev) => ({ ...prev, [selectedPath]: parsed }));
            } catch (e: any) {
                setErrorMessage(e.message ?? t('brdkConfig.parseFileError'));
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPath]);

    const selectedFile = selectedPath ? loaded[selectedPath] : undefined;

    const handleChange = (path: string[], value: JsonValue) => {
        if (!selectedPath || !selectedFile) return;
        setLoaded((prev) => ({ ...prev, [selectedPath]: { ...selectedFile, data: setJsonPath(selectedFile.data, path, value) } }));
        setDirtyPaths((prev) => new Set(prev).add(selectedPath));
    };

    const handleFullChange = (next: Record<string, JsonValue>) => {
        if (!selectedPath || !selectedFile) return;
        setLoaded((prev) => ({ ...prev, [selectedPath]: { ...selectedFile, data: next } }));
        setDirtyPaths((prev) => new Set(prev).add(selectedPath));
    };

    const selectedEntry = files.find((f) => f.filePath === selectedPath);
    // Для каждого известного файла BRDK общая RecursiveJsonForm сваливала бы разнородные поля
    // в одну кучу — по просьбе пользователя у каждого из них свой экран с понятными вкладками
    // вместо generic-формы; для незнакомых файлов (новые моды BRDK в будущем) остаётся fallback.
    const DEDICATED_VIEWS: Record<string, React.ComponentType<{ data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void }>> = {
        MakeStash: BrdkMakeStashView,
        Arts: BrdkArtsView,
        BRDK_AdminMenu: BrdkAdminMenuView,
        GoldRush: BrdkGoldRushView,
        SuperHouses: BrdkSuperHousesView,
        ZmbPreset: BrdkZmbPresetView,
        MapCleaner: BrdkMapCleanerView,
        GammaRay: BrdkGammaRayView,
    };
    const DedicatedView = selectedEntry ? DEDICATED_VIEWS[selectedEntry.label] : undefined;
    // Экраны с собственными вкладками сами управляют скроллом/отступами внутри себя —
    // внешняя обёртка не должна добавлять padding и общий overflow поверх них.
    const isTabbedView = Boolean(selectedEntry && ['MakeStash', 'Arts', 'GoldRush', 'SuperHouses', 'ZmbPreset', 'GammaRay'].includes(selectedEntry.label));

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const path of dirtyPaths) {
            const file = loaded[path];
            if (!file) continue;
            const res = await window.api.writeFile(path, serializeBrdkConfigFile(file.data, file.hadBom));
            if (!res.success) failures.push(`${path}: ${res.error ?? t('brdkConfig.saveError')}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('\n'));
            return;
        }
        setDirtyPaths(new Set());
        setSavedNotice(true);
    };

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('brdkConfig.detecting') : t('brdkConfig.loading')}</Typography>
            </Stack>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                    {errorMessage}
                </Alert>
                <Button startIcon={<RefreshIcon />} onClick={load}>
                    {t('common.retry')}
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('brdkConfig.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={brdkModsDir ?? ''}>
                        {brdkModsDir} • {t('brdkConfig.filesCount', { count: files.length })}
                    </Typography>
                </Box>
                <Button size="small" onClick={load}>
                    {t('common.changeFile')}
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={dirtyPaths.size === 0 || saving} onClick={handleSave}>
                    {t('common.save')} {dirtyPaths.size > 0 && `(${dirtyPaths.size})`}
                </Button>
            </Stack>

            {saveError && (
                <Alert severity="error" sx={{ mx: 2, mt: 2, whiteSpace: 'pre-line' }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ width: 240, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {files.map((f) => (
                            <ListItemButton key={f.filePath} selected={f.filePath === selectedPath} onClick={() => setSelectedPath(f.filePath)}>
                                <ListItemText primary={f.label} secondary={dirtyPaths.has(f.filePath) ? t('common.unsaved') : undefined} />
                            </ListItemButton>
                        ))}
                        {files.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {t('brdkConfig.noFiles')}
                            </Typography>
                        )}
                    </List>
                    <Divider />
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: isTabbedView && selectedFile ? 'hidden' : 'auto', p: isTabbedView && selectedFile ? 0 : 2 }}>
                    {!selectedPath ? (
                        <Typography color="text.secondary">{t('brdkConfig.selectHint')}</Typography>
                    ) : !selectedFile ? (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                            <CircularProgress size={24} />
                        </Stack>
                    ) : DedicatedView ? (
                        <DedicatedView data={selectedFile.data} onChange={handleFullChange} />
                    ) : (
                        <RecursiveJsonForm data={selectedFile.data} onChange={handleChange} />
                    )}
                </Box>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
