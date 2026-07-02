import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    Divider,
    FormControlLabel,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import {
    ServerConfigValues,
    SERVER_CONFIG_FIELDS,
    SERVER_CONFIG_GROUPS,
    parseServerConfig,
    patchServerConfig,
} from '../dayzConfig/serverConfig';

type ViewStatus = 'detecting' | 'picker' | 'loading' | 'ready' | 'error';

const CFG_FILTER = [{ name: 'Конфиги сервера', extensions: ['cfg'] }];

const basename = (filePath: string) => filePath.split(/[\\/]/).pop() ?? filePath;

export const ServerConfigView = () => {
    const dispatch = useAppDispatch();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);
    const [rawText, setRawText] = useState('');
    const [savedValues, setSavedValues] = useState<ServerConfigValues>({});
    const [values, setValues] = useState<ServerConfigValues>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? 'Не удалось прочитать файл');
            setStatus('error');
            return;
        }
        const parsed = parseServerConfig(res.data);
        setRawText(res.data);
        setSavedValues(parsed);
        setValues(parsed);
        setFilePath(path);
        setStatus('ready');
        if (persist && project) {
            dispatch(updateProject({ id: project.id, changes: { serverConfigPath: path } }));
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFilesByExtension(project.path, ['cfg']);
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? 'Не удалось просканировать папку проекта');
            setStatus('error');
            return;
        }
        const exact = res.data.find((p) => basename(p).toLowerCase() === 'serverdz.cfg');
        if (exact) {
            await loadFile(exact, true);
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
        if (project.serverConfigPath) {
            loadFile(project.serverConfigPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog(CFG_FILTER);
        if (path) {
            await loadFile(path, true);
        }
    };

    const handleChangeFile = () => {
        setFilePath(null);
        detect();
    };

    const handleFieldChange = (key: string, value: string | number | boolean) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const isDirty = SERVER_CONFIG_FIELDS.some((f) => values[f.key] !== savedValues[f.key]);

    const handleSave = async () => {
        if (!filePath) return;
        const changes: ServerConfigValues = {};
        for (const field of SERVER_CONFIG_FIELDS) {
            if (values[field.key] !== undefined && values[field.key] !== savedValues[field.key]) {
                changes[field.key] = values[field.key];
            }
        }
        if (Object.keys(changes).length === 0) return;

        setSaving(true);
        setSaveError(null);
        const patched = patchServerConfig(rawText, changes);
        const res = await window.api.writeFile(filePath, patched);
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? 'Не удалось сохранить файл');
            return;
        }
        setRawText(patched);
        setSavedValues(values);
        setSavedNotice(true);
    };

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">
                    {status === 'detecting' ? 'Ищем serverDZ.cfg в папке проекта…' : 'Загружаем файл…'}
                </Typography>
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
                    Повторить поиск
                </Button>
            </Box>
        );
    }

    if (status === 'picker') {
        return (
            <Box sx={{ p: 3, maxWidth: 560 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Не удалось однозначно найти serverDZ.cfg
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    В папке проекта {candidates.length === 0 ? 'не найдено .cfg файлов' : `найдено ${candidates.length} .cfg файлов`}.
                    Выберите нужный или укажите файл вручную.
                </Typography>

                {candidates.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                        {candidates.map((c, i) => (
                            <React.Fragment key={c}>
                                {i > 0 && <Divider />}
                                <ButtonBase
                                    onClick={() => loadFile(c, true)}
                                    sx={{ width: '100%', justifyContent: 'flex-start', p: 1.5, gap: 1.5 }}
                                >
                                    <InsertDriveFileIcon fontSize="small" color="action" />
                                    <Stack sx={{ alignItems: 'flex-start' }}>
                                        <Typography variant="body2">{basename(c)}</Typography>
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
                    Выбрать файл вручную
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Параметры сервера
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={handleChangeFile}>
                        Сменить файл
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={!isDirty || saving}
                        onClick={handleSave}
                    >
                        Сохранить
                    </Button>
                </Stack>
            </Stack>

            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {saveError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
                        {saveError}
                    </Alert>
                )}
                <Stack spacing={3}>
                    {SERVER_CONFIG_GROUPS.map((group) => {
                        const fields = SERVER_CONFIG_FIELDS.filter((f) => f.group === group);
                        return (
                            <Paper key={group} variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    {group}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                        gap: 2,
                                        alignItems: 'start',
                                    }}
                                >
                                    {fields.map((field) => {
                                        const value = values[field.key];
                                        const notFound = value === undefined;
                                        if (field.type === 'boolean') {
                                            return (
                                                <FormControlLabel
                                                    key={field.key}
                                                    disabled={notFound}
                                                    control={
                                                        <Switch
                                                            checked={Boolean(value)}
                                                            onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                                                        />
                                                    }
                                                    label={notFound ? `${field.label} (нет в файле)` : field.label}
                                                />
                                            );
                                        }
                                        return (
                                            <TextField
                                                key={field.key}
                                                label={field.label}
                                                type={field.type === 'number' ? 'number' : 'text'}
                                                value={notFound ? '' : value}
                                                disabled={notFound}
                                                helperText={notFound ? 'Не найдено в файле' : field.helperText}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        field.key,
                                                        field.type === 'number' ? Number(e.target.value) || 0 : e.target.value
                                                    )
                                                }
                                                fullWidth
                                            />
                                        );
                                    })}
                                </Box>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>

            <Snackbar
                open={savedNotice}
                autoHideDuration={2500}
                onClose={() => setSavedNotice(false)}
                message="Сохранено"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            />
        </Box>
    );
};
