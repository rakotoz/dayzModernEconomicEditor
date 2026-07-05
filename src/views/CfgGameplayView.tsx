import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, ButtonBase, CircularProgress, Divider, Paper, Snackbar, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import { JsonValue, parseJsonConfigFile, serializeJsonConfigFile, setJsonPath } from '../dayzConfig/cfgGameplay';
import { RecursiveJsonForm } from '../components/RecursiveJsonForm';
import { basenamePath } from '../dayzConfig/pathUtils';

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

// Порядок и подписи секций верхнего уровня cfggameplay.json — задаём явно, чтобы порядок
// на экране не прыгал в зависимости от порядка ключей в файле у конкретного пользователя.
const SECTION_KEYS = ['PlayerData', 'WorldsData', 'BaseBuildingData', 'UIData', 'MapData', 'VehicleData', 'GeneralData'];
const SECTION_LABELS: Record<string, string> = {
    PlayerData: 'Player Data',
    WorldsData: 'Worlds Data',
    BaseBuildingData: 'Base Building Data',
    UIData: 'UI Data',
    MapData: 'Map Data',
    VehicleData: 'Vehicle Data',
    GeneralData: 'General Data',
};

export const CfgGameplayView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);
    const [hadBom, setHadBom] = useState(false);

    const [data, setData] = useState<Record<string, JsonValue> | null>(null);
    const [dirty, setDirty] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('cfgGameplay.readFileError'));
            setStatus('error');
            return;
        }
        try {
            const parsed = parseJsonConfigFile(res.data);
            setData(parsed.data);
            setHadBom(parsed.hadBom);
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { cfgGameplayPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('cfgGameplay.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfggameplay.json');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('cfgGameplay.scanError'));
            setStatus('error');
            return;
        }
        if (res.data.length === 1) {
            await loadFile(res.data[0], true);
            return;
        }
        setCandidates(res.data);
        setStatus('picker');
    };

    useEffect(() => {
        if (!project) return;
        if (project.cfgGameplayPath) {
            loadFile(project.cfgGameplayPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfggameplay.json', extensions: ['json'] }]);
        if (path) await loadFile(path, true);
    };

    const handleChange = (path: string[], value: JsonValue) => {
        setData((prev) => (prev ? setJsonPath(prev, path, value) : prev));
        setDirty(true);
    };

    const handleSave = async () => {
        if (!filePath || !data) return;
        setSaving(true);
        setSaveError(null);
        const res = await window.api.writeFile(filePath, serializeJsonConfigFile(data, hadBom));
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('cfgGameplay.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('cfgGameplay.detecting') : t('cfgGameplay.loading')}</Typography>
            </Stack>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMessage}
                </Alert>
                <Button startIcon={<RefreshIcon />} onClick={detect}>
                    {t('common.retry')}
                </Button>
            </Box>
        );
    }

    if (status === 'picker') {
        return (
            <Box sx={{ p: 3, maxWidth: 560 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    {t('cfgGameplay.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('cfgGameplay.pickerNotFound') : t('cfgGameplay.pickerFound', { count: candidates.length })}.{' '}
                    {t('common.chooseOrBrowse')}
                </Typography>
                {candidates.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                        {candidates.map((c, i) => (
                            <React.Fragment key={c}>
                                {i > 0 && <Divider />}
                                <ButtonBase onClick={() => loadFile(c, true)} sx={{ width: '100%', justifyContent: 'flex-start', p: 1.5, gap: 1.5 }}>
                                    <InsertDriveFileIcon fontSize="small" color="action" />
                                    <Stack sx={{ alignItems: 'flex-start' }}>
                                        <Typography variant="body2">{basenamePath(c)}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {c}
                                        </Typography>
                                    </Stack>
                                </ButtonBase>
                            </React.Fragment>
                        ))}
                    </Paper>
                )}
                <Button variant="contained" onClick={handleManualBrowse}>
                    {t('common.browseManually')}
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
                        {t('cfgGameplay.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath}
                    </Typography>
                </Box>
                <Button size="small" onClick={detect}>
                    {t('common.changeFile')}
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={!dirty || saving} onClick={handleSave}>
                    {t('common.save')}
                </Button>
            </Stack>

            {saveError && (
                <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {data &&
                    (() => {
                        const known = SECTION_KEYS.filter((k) => k in data);
                        const extra = Object.keys(data).filter(
                            (k) => !known.includes(k) && data[k] !== null && typeof data[k] === 'object' && !Array.isArray(data[k])
                        );
                        return <RecursiveJsonForm data={data} onChange={handleChange} sectionKeys={[...known, ...extra]} sectionLabels={SECTION_LABELS} />;
                    })()}
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
