import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, ButtonBase, Checkbox, CircularProgress, Divider, FormControlLabel, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import { CfgWeather, parseCfgWeather, serializeCfgWeather, WeatherCategory, WeatherCategoryKey, WEATHER_CATEGORY_KEYS } from '../dayzConfig/cfgWeather';
import { basenamePath } from '../dayzConfig/pathUtils';

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

const CATEGORY_LABELS: Record<WeatherCategoryKey, string> = {
    overcast: 'Overcast',
    fog: 'Fog',
    rain: 'Rain',
    windMagnitude: 'Wind Magnitude',
    windDirection: 'Wind Direction',
    snowfall: 'Snowfall',
};

// Одна категория погоды (overcast/fog/rain/...) — везде одинаковая структура из 4 групп полей,
// плюс необязательные thresholds (только у rain и snowfall). Значения показываем как есть —
// это уже численно нормализованный вид, отображение "0.0" может стать "0" при сохранении,
// но само значение не меняется (see cfgWeather.ts).
const WeatherCategoryCard = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: WeatherCategory;
    onChange: (patch: Partial<WeatherCategory>) => void;
}) => {
    const { t } = useTranslation();

    const numField = (label: string, val: number, onChangeField: (v: number) => void) => (
        <TextField label={label} size="small" type="number" value={val} onChange={(e) => onChangeField(Number(e.target.value) || 0)} sx={{ width: 100 }} />
    );

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                {label}
            </Typography>
            <Stack spacing={1.5}>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        {t('cfgWeather.current')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        {numField('actual', value.current.actual, (v) => onChange({ current: { ...value.current, actual: v } }))}
                        {numField('time', value.current.time, (v) => onChange({ current: { ...value.current, time: v } }))}
                        {numField('duration', value.current.duration, (v) => onChange({ current: { ...value.current, duration: v } }))}
                    </Stack>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        {t('cfgWeather.limits')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        {numField('min', value.limits.min, (v) => onChange({ limits: { ...value.limits, min: v } }))}
                        {numField('max', value.limits.max, (v) => onChange({ limits: { ...value.limits, max: v } }))}
                    </Stack>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        {t('cfgWeather.timeLimits')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        {numField('min', value.timelimits.min, (v) => onChange({ timelimits: { ...value.timelimits, min: v } }))}
                        {numField('max', value.timelimits.max, (v) => onChange({ timelimits: { ...value.timelimits, max: v } }))}
                    </Stack>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        {t('cfgWeather.changeLimits')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        {numField('min', value.changelimits.min, (v) => onChange({ changelimits: { ...value.changelimits, min: v } }))}
                        {numField('max', value.changelimits.max, (v) => onChange({ changelimits: { ...value.changelimits, max: v } }))}
                    </Stack>
                </Box>
                {value.thresholds && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            {t('cfgWeather.thresholds')}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {numField('min', value.thresholds.min, (v) => onChange({ thresholds: { ...value.thresholds!, min: v } }))}
                            {numField('max', value.thresholds.max, (v) => onChange({ thresholds: { ...value.thresholds!, max: v } }))}
                            {numField('end', value.thresholds.end, (v) => onChange({ thresholds: { ...value.thresholds!, end: v } }))}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Paper>
    );
};

export const CfgWeatherView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [data, setData] = useState<CfgWeather | null>(null);
    const [dirty, setDirty] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('cfgWeather.readFileError'));
            setStatus('error');
            return;
        }
        try {
            setData(parseCfgWeather(res.data));
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { cfgWeatherPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('cfgWeather.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfgweather.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('cfgWeather.scanError'));
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
        if (project.cfgWeatherPath) {
            loadFile(project.cfgWeatherPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfgweather.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const patchCategory = (key: WeatherCategoryKey, patch: Partial<WeatherCategory>) => {
        setData((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
        setDirty(true);
    };

    const patchRoot = (patch: Partial<CfgWeather>) => {
        setData((prev) => (prev ? { ...prev, ...patch } : prev));
        setDirty(true);
    };

    const handleSave = async () => {
        if (!filePath || !data) return;
        setSaving(true);
        setSaveError(null);
        const res = await window.api.writeFile(filePath, serializeCfgWeather(data));
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('cfgWeather.saveError'));
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
                <Typography color="text.secondary">{status === 'detecting' ? t('cfgWeather.detecting') : t('cfgWeather.loading')}</Typography>
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
                    {t('cfgWeather.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('cfgWeather.pickerNotFound') : t('cfgWeather.pickerFound', { count: candidates.length })}.{' '}
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

    const w = data!;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('cfgWeather.title')}
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
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            {t('cfgWeather.general')}
                        </Typography>
                        <Stack direction="row" spacing={3}>
                            <FormControlLabel control={<Checkbox checked={w.enable} onChange={(e) => patchRoot({ enable: e.target.checked })} />} label={t('cfgWeather.enabled')} />
                            <FormControlLabel control={<Checkbox checked={w.reset} onChange={(e) => patchRoot({ reset: e.target.checked })} />} label={t('cfgWeather.resetOnRestart')} />
                        </Stack>
                    </Paper>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, alignItems: 'start' }}>
                        {WEATHER_CATEGORY_KEYS.map((key) => (
                            <WeatherCategoryCard key={key} label={CATEGORY_LABELS[key]} value={w[key]} onChange={(patch) => patchCategory(key, patch)} />
                        ))}
                    </Box>

                    <Paper variant="outlined" sx={{ p: 2, maxWidth: 400 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                            {t('cfgWeather.storm')}
                        </Typography>
                        <Stack direction="row" spacing={1.5}>
                            <TextField label="density" size="small" type="number" value={w.storm.density} onChange={(e) => patchRoot({ storm: { ...w.storm, density: Number(e.target.value) || 0 } })} />
                            <TextField label="threshold" size="small" type="number" value={w.storm.threshold} onChange={(e) => patchRoot({ storm: { ...w.storm, threshold: Number(e.target.value) || 0 } })} />
                            <TextField label="timeout" size="small" type="number" value={w.storm.timeout} onChange={(e) => patchRoot({ storm: { ...w.storm, timeout: Number(e.target.value) || 0 } })} />
                        </Stack>
                    </Paper>
                </Stack>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
