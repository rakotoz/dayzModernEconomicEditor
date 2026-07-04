import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import { GlobalVar, parseGlobalsXml, serializeGlobalsXml } from '../dayzConfig/globalsXml';
import { basenamePath } from '../dayzConfig/pathUtils';

interface VarRow extends GlobalVar {
    rowId: string;
}

const toRows = (vars: GlobalVar[]): VarRow[] => vars.map((v) => ({ ...v, rowId: nanoid() }));
const toVars = (rows: VarRow[]): GlobalVar[] => rows.map(({ rowId, ...v }) => v);

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

export const GlobalsView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [rows, setRows] = useState<VarRow[]>([]);
    const [dirty, setDirty] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('globals.readFileError'));
            setStatus('error');
            return;
        }
        try {
            const parsed = toRows(parseGlobalsXml(res.data));
            setRows(parsed);
            setSelectedId(parsed[0]?.rowId ?? null);
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { globalsXmlPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('globals.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'globals.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('globals.scanError'));
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
        if (project.globalsXmlPath) {
            loadFile(project.globalsXmlPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'globals.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const selected = rows.find((r) => r.rowId === selectedId) ?? null;

    const patchSelected = (patch: Partial<GlobalVar>) => {
        if (!selected) return;
        setRows((prev) => prev.map((r) => (r.rowId === selected.rowId ? { ...r, ...patch } : r)));
        setDirty(true);
    };

    const handleAdd = () => {
        const row: VarRow = { rowId: nanoid(), name: 'NewVariable', type: '0', value: '0' };
        setRows((prev) => [...prev, row]);
        setSelectedId(row.rowId);
        setDirty(true);
    };

    const handleRemove = (rowId: string) => {
        setRows((prev) => prev.filter((r) => r.rowId !== rowId));
        if (selectedId === rowId) setSelectedId(null);
        setDirty(true);
    };

    const handleSave = async () => {
        if (!filePath) return;
        setSaving(true);
        setSaveError(null);
        const xml = serializeGlobalsXml(toVars(rows));
        const res = await window.api.writeFile(filePath, xml);
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('globals.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.name.toLowerCase().includes(q));
    }, [rows, search]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('globals.detecting') : t('globals.loading')}</Typography>
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
                    {t('globals.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('globals.pickerNotFound') : t('globals.pickerFound', { count: candidates.length })}.{' '}
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
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    gap: 2,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('globals.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath} • {t('globals.recordsCount', { count: rows.length })}
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

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ width: 300, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1.5 }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={t('globals.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredRows.map((r) => (
                            <ListItemButton
                                key={r.rowId}
                                selected={r.rowId === selectedId}
                                onClick={() => setSelectedId(r.rowId)}
                            >
                                <ListItemText primary={r.name || t('globals.noName')} secondary={r.value} />
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(r.rowId);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAdd}>
                            {t('globals.addVariable')}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                    {!selected ? (
                        <Typography color="text.secondary">{t('globals.selectHint')}</Typography>
                    ) : (
                        <Paper variant="outlined" sx={{ p: 2, maxWidth: 480 }}>
                            <Stack spacing={2}>
                                <TextField
                                    label={t('globals.fields.name')}
                                    size="small"
                                    fullWidth
                                    value={selected.name}
                                    onChange={(e) => patchSelected({ name: e.target.value })}
                                />
                                <TextField
                                    select
                                    label={t('globals.fields.type')}
                                    size="small"
                                    fullWidth
                                    value={selected.type}
                                    onChange={(e) => patchSelected({ type: e.target.value })}
                                    helperText={t('globals.typeHelper')}
                                >
                                    <MenuItem value="0">0 — {t('globals.typeInt')}</MenuItem>
                                    <MenuItem value="1">1 — {t('globals.typeFloat')}</MenuItem>
                                </TextField>
                                <TextField
                                    label={t('globals.fields.value')}
                                    size="small"
                                    fullWidth
                                    value={selected.value}
                                    onChange={(e) => patchSelected({ value: e.target.value })}
                                />
                            </Stack>
                        </Paper>
                    )}
                </Box>
            </Box>

            <Snackbar
                open={savedNotice}
                autoHideDuration={2500}
                onClose={() => setSavedNotice(false)}
                message={t('common.saved')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            />
        </Box>
    );
};
