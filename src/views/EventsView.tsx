import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Checkbox,
    CircularProgress,
    Divider,
    FormControlLabel,
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
import {
    EventChild,
    EventEntry,
    EVENT_LIMIT_OPTIONS,
    EVENT_POSITION_OPTIONS,
    parseEventsXml,
    serializeEventsXml,
} from '../dayzConfig/eventsXml';
import { basenamePath } from '../dayzConfig/pathUtils';

interface ChildRow extends EventChild {
    childId: string;
}

interface EventRow extends Omit<EventEntry, 'children'> {
    id: string;
    children: ChildRow[];
}

const toRows = (entries: EventEntry[]): EventRow[] =>
    entries.map((e) => ({
        ...e,
        id: nanoid(),
        children: e.children.map((c) => ({ ...c, childId: nanoid() })),
    }));

const toEntries = (rows: EventRow[]): EventEntry[] =>
    rows.map(({ id, children, ...rest }) => ({
        ...rest,
        children: children.map(({ childId, ...c }) => c),
    }));

const emptyEvent = (): EventRow => ({
    id: nanoid(),
    name: 'NewEvent',
    nominal: 0,
    min: 0,
    max: 0,
    lifetime: 60,
    restock: 0,
    saferadius: 0,
    distanceradius: 0,
    cleanupradius: 0,
    secondary: '',
    flags: { deletable: false, init_random: false, remove_damaged: false },
    position: 'fixed',
    limit: 'mixed',
    active: true,
    children: [],
});

const emptyChild = (): ChildRow => ({ childId: nanoid(), type: '', min: 0, max: 0, lootmin: 0, lootmax: 0 });

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

export const EventsView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [events, setEvents] = useState<EventRow[]>([]);
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
            setErrorMessage(res.error ?? t('events.readFileError'));
            setStatus('error');
            return;
        }
        try {
            const rows = toRows(parseEventsXml(res.data));
            setEvents(rows);
            setSelectedId(rows[0]?.id ?? null);
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { eventsXmlPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('events.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'events.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('events.scanError'));
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
        if (project.eventsXmlPath) {
            loadFile(project.eventsXmlPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'events.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

    const updateSelected = (patch: Partial<EventRow>) => {
        setEvents((prev) => prev.map((e) => (e.id === selectedId ? { ...e, ...patch } : e)));
        setDirty(true);
    };

    const updateSelectedFlag = (flag: keyof EventRow['flags'], value: boolean) => {
        if (!selectedEvent) return;
        updateSelected({ flags: { ...selectedEvent.flags, [flag]: value } });
    };

    const updateChild = (childId: string, patch: Partial<ChildRow>) => {
        if (!selectedEvent) return;
        updateSelected({
            children: selectedEvent.children.map((c) => (c.childId === childId ? { ...c, ...patch } : c)),
        });
    };

    const addChild = () => {
        if (!selectedEvent) return;
        updateSelected({ children: [...selectedEvent.children, emptyChild()] });
    };

    const removeChild = (childId: string) => {
        if (!selectedEvent) return;
        updateSelected({ children: selectedEvent.children.filter((c) => c.childId !== childId) });
    };

    const handleAddEvent = () => {
        const row = emptyEvent();
        setEvents((prev) => [...prev, row]);
        setSelectedId(row.id);
        setDirty(true);
    };

    const handleRemoveEvent = () => {
        if (!selectedEvent) return;
        setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
        setSelectedId(null);
        setDirty(true);
    };

    const handleSave = async () => {
        if (!filePath) return;
        setSaving(true);
        setSaveError(null);
        const xml = serializeEventsXml(toEntries(events));
        const res = await window.api.writeFile(filePath, xml);
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('events.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    const filteredEvents = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return events;
        return events.filter((e) => e.name.toLowerCase().includes(q));
    }, [events, search]);

    const secondaryOptions = useMemo(() => {
        const names = events.filter((e) => e.id !== selectedId).map((e) => e.name);
        if (selectedEvent?.secondary) names.push(selectedEvent.secondary);
        return Array.from(new Set(names)).sort();
    }, [events, selectedId, selectedEvent?.secondary]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('events.detecting') : t('events.loading')}</Typography>
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
                    {t('events.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('events.pickerNotFound') : t('events.pickerFound', { count: candidates.length })}.{' '}
                    {t('common.chooseOrBrowse')}
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
                        {t('events.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath} • {t('events.recordsCount', { count: events.length })}
                    </Typography>
                </Box>
                <Button size="small" onClick={detect}>
                    {t('common.changeFile')}
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!dirty || saving}
                    onClick={handleSave}
                >
                    {t('common.save')}
                </Button>
            </Stack>

            {saveError && (
                <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box
                    sx={{
                        width: 280,
                        flexShrink: 0,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Box sx={{ p: 1.5 }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={t('events.searchPlaceholder')}
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
                    <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredEvents.map((e) => (
                            <ListItemButton
                                key={e.id}
                                selected={e.id === selectedId}
                                onClick={() => setSelectedId(e.id)}
                            >
                                <ListItemText primary={e.name || t('events.noName')} />
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Stack direction="row" spacing={1} sx={{ p: 1 }}>
                        <Button size="small" startIcon={<AddIcon />} onClick={handleAddEvent}>
                            {t('common.add')}
                        </Button>
                        <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            disabled={!selectedEvent}
                            onClick={handleRemoveEvent}
                        >
                            {t('common.delete')}
                        </Button>
                    </Stack>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {!selectedEvent ? (
                        <Typography color="text.secondary">{t('events.selectEventHint')}</Typography>
                    ) : (
                        <Stack spacing={3}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                                    <TextField
                                        label={t('events.fields.name')}
                                        value={selectedEvent.name}
                                        onChange={(e) => updateSelected({ name: e.target.value })}
                                        sx={{ flex: 1 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedEvent.active}
                                                onChange={(e) => updateSelected({ active: e.target.checked })}
                                            />
                                        }
                                        label={t('events.fields.active')}
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                        gap: 2,
                                    }}
                                >
                                    <TextField
                                        label={t('events.fields.nominal')}
                                        type="number"
                                        value={selectedEvent.nominal}
                                        onChange={(e) => updateSelected({ nominal: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        label={t('events.fields.min')}
                                        type="number"
                                        value={selectedEvent.min}
                                        onChange={(e) => updateSelected({ min: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        label={t('events.fields.max')}
                                        type="number"
                                        value={selectedEvent.max}
                                        onChange={(e) => updateSelected({ max: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        label={t('events.fields.lifetime')}
                                        type="number"
                                        value={selectedEvent.lifetime}
                                        onChange={(e) => updateSelected({ lifetime: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        label={t('events.fields.restock')}
                                        type="number"
                                        value={selectedEvent.restock}
                                        onChange={(e) => updateSelected({ restock: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        label={t('events.fields.saferadius')}
                                        type="number"
                                        value={selectedEvent.saferadius}
                                        onChange={(e) => updateSelected({ saferadius: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        label={t('events.fields.distanceradius')}
                                        type="number"
                                        value={selectedEvent.distanceradius}
                                        onChange={(e) =>
                                            updateSelected({ distanceradius: Number(e.target.value) || 0 })
                                        }
                                    />
                                    <TextField
                                        label={t('events.fields.cleanupradius')}
                                        type="number"
                                        value={selectedEvent.cleanupradius}
                                        onChange={(e) => updateSelected({ cleanupradius: Number(e.target.value) || 0 })}
                                    />
                                    <TextField
                                        select
                                        label={t('events.fields.position')}
                                        value={selectedEvent.position}
                                        onChange={(e) => updateSelected({ position: e.target.value })}
                                    >
                                        {Array.from(new Set([...EVENT_POSITION_OPTIONS, selectedEvent.position])).map(
                                            (opt) => (
                                                <MenuItem key={opt} value={opt}>
                                                    {opt}
                                                </MenuItem>
                                            ),
                                        )}
                                    </TextField>
                                    <TextField
                                        select
                                        label={t('events.fields.limit')}
                                        value={selectedEvent.limit}
                                        onChange={(e) => updateSelected({ limit: e.target.value })}
                                    >
                                        {Array.from(new Set([...EVENT_LIMIT_OPTIONS, selectedEvent.limit])).map(
                                            (opt) => (
                                                <MenuItem key={opt} value={opt}>
                                                    {opt}
                                                </MenuItem>
                                            ),
                                        )}
                                    </TextField>
                                    <TextField
                                        select
                                        label={t('events.fields.secondary')}
                                        value={selectedEvent.secondary}
                                        onChange={(e) => updateSelected({ secondary: e.target.value })}
                                    >
                                        <MenuItem value="">
                                            <em>{t('events.fields.secondaryNone')}</em>
                                        </MenuItem>
                                        {secondaryOptions.map((opt) => (
                                            <MenuItem key={opt} value={opt}>
                                                {opt}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Box>

                                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                                    {t('events.flags')}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedEvent.flags.deletable}
                                                onChange={(e) => updateSelectedFlag('deletable', e.target.checked)}
                                            />
                                        }
                                        label="deletable"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedEvent.flags.init_random}
                                                onChange={(e) => updateSelectedFlag('init_random', e.target.checked)}
                                            />
                                        }
                                        label="init_random"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedEvent.flags.remove_damaged}
                                                onChange={(e) => updateSelectedFlag('remove_damaged', e.target.checked)}
                                            />
                                        }
                                        label="remove_damaged"
                                    />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack
                                    direction="row"
                                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
                                >
                                    <Typography variant="subtitle2">
                                        {t('events.children', { count: selectedEvent.children.length })}
                                    </Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={addChild}>
                                        {t('events.addChild')}
                                    </Button>
                                </Stack>
                                <Stack spacing={1.5}>
                                    {selectedEvent.children.map((c) => (
                                        <Stack
                                            key={c.childId}
                                            direction="row"
                                            spacing={1}
                                            sx={{ alignItems: 'center' }}
                                        >
                                            <TextField
                                                label={t('events.childFields.type')}
                                                size="small"
                                                value={c.type}
                                                onChange={(e) => updateChild(c.childId, { type: e.target.value })}
                                                sx={{ flex: 2 }}
                                            />
                                            <TextField
                                                label={t('events.childFields.min')}
                                                size="small"
                                                type="number"
                                                value={c.min}
                                                onChange={(e) =>
                                                    updateChild(c.childId, { min: Number(e.target.value) || 0 })
                                                }
                                                sx={{ width: 90 }}
                                            />
                                            <TextField
                                                label={t('events.childFields.max')}
                                                size="small"
                                                type="number"
                                                value={c.max}
                                                onChange={(e) =>
                                                    updateChild(c.childId, { max: Number(e.target.value) || 0 })
                                                }
                                                sx={{ width: 90 }}
                                            />
                                            <TextField
                                                label={t('events.childFields.lootMin')}
                                                size="small"
                                                type="number"
                                                value={c.lootmin}
                                                onChange={(e) =>
                                                    updateChild(c.childId, { lootmin: Number(e.target.value) || 0 })
                                                }
                                                sx={{ width: 90 }}
                                            />
                                            <TextField
                                                label={t('events.childFields.lootMax')}
                                                size="small"
                                                type="number"
                                                value={c.lootmax}
                                                onChange={(e) =>
                                                    updateChild(c.childId, { lootmax: Number(e.target.value) || 0 })
                                                }
                                                sx={{ width: 90 }}
                                            />
                                            <IconButton size="small" onClick={() => removeChild(c.childId)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                    {selectedEvent.children.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('events.noChildren')}
                                        </Typography>
                                    )}
                                </Stack>
                            </Paper>
                        </Stack>
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
