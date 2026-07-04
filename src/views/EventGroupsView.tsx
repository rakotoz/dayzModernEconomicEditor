import React, { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
    ListItemButton,
    ListItemText,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import {
    EventGroupChild,
    EventGroupEntry,
    parseEventGroupsXml,
    serializeEventGroupsXml,
} from '../dayzConfig/eventGroupsXml';
import { basenamePath } from '../dayzConfig/pathUtils';

interface ChildRow extends EventGroupChild {
    childId: string;
}

interface GroupRow {
    id: string;
    name: string;
    posHint: EventGroupEntry['posHint'];
    children: ChildRow[];
}

const toRows = (entries: EventGroupEntry[]): GroupRow[] =>
    entries.map((g) => ({
        id: nanoid(),
        name: g.name,
        posHint: g.posHint,
        children: g.children.map((c) => ({ ...c, childId: nanoid() })),
    }));

const toEntries = (rows: GroupRow[]): EventGroupEntry[] =>
    rows.map(({ id, children, ...rest }) => ({
        ...rest,
        children: children.map(({ childId, ...c }) => c),
    }));

const emptyGroup = (): GroupRow => ({ id: nanoid(), name: 'NewGroup', posHint: null, children: [] });
const emptyChild = (): ChildRow => ({
    childId: nanoid(),
    type: '',
    x: 0,
    y: 0,
    z: 0,
    a: 0,
    deloot: false,
    lootmin: 1,
    lootmax: 3,
});

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

export const EventGroupsView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [groups, setGroups] = useState<GroupRow[]>([]);
    const [dirty, setDirty] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('eventGroups.readFileError'));
            setStatus('error');
            return;
        }
        try {
            const rows = toRows(parseEventGroupsXml(res.data));
            setGroups(rows);
            setSelectedGroupId(rows[0]?.id ?? null);
            setSelectedChildId(rows[0]?.children[0]?.childId ?? null);
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { eventGroupsXmlPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('eventGroups.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfgeventgroups.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('eventGroups.scanError'));
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
        if (project.eventGroupsXmlPath) {
            loadFile(project.eventGroupsXmlPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfgeventgroups.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
    const selectedChild = selectedGroup?.children.find((c) => c.childId === selectedChildId) ?? null;

    const updateGroup = (groupId: string, patch: Partial<GroupRow>) => {
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
        setDirty(true);
    };

    const updateChild = (patch: Partial<EventGroupChild>) => {
        if (!selectedGroup || !selectedChild) return;
        updateGroup(selectedGroup.id, {
            children: selectedGroup.children.map((c) => (c.childId === selectedChildId ? { ...c, ...patch } : c)),
        });
    };

    const handleAddGroup = () => {
        const row = emptyGroup();
        setGroups((prev) => [...prev, row]);
        setSelectedGroupId(row.id);
        setSelectedChildId(null);
        setDirty(true);
    };

    const handleRemoveGroup = (groupId: string) => {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (selectedGroupId === groupId) {
            setSelectedGroupId(null);
            setSelectedChildId(null);
        }
        setDirty(true);
    };

    const handleAddChild = (groupId: string) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;
        const child = emptyChild();
        updateGroup(groupId, { children: [...group.children, child] });
        setSelectedGroupId(groupId);
        setSelectedChildId(child.childId);
    };

    const handleRemoveChild = (groupId: string, childId: string) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;
        updateGroup(groupId, { children: group.children.filter((c) => c.childId !== childId) });
        if (selectedChildId === childId) setSelectedChildId(null);
    };

    const handleSave = async () => {
        if (!filePath) return;
        setSaving(true);
        setSaveError(null);
        const xml = serializeEventGroupsXml(toEntries(groups));
        const res = await window.api.writeFile(filePath, xml);
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('eventGroups.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    const filteredGroups = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return groups;
        return groups.filter((g) => g.name.toLowerCase().includes(q));
    }, [groups, search]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('eventGroups.detecting') : t('eventGroups.loading')}</Typography>
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
                    {t('eventGroups.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('eventGroups.pickerNotFound') : t('eventGroups.pickerFound', { count: candidates.length })}.{' '}
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
                        {t('eventGroups.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath} • {t('eventGroups.recordsCount', { count: groups.length })}
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
                <Box
                    sx={{
                        width: 320,
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
                            placeholder={t('eventGroups.searchPlaceholder')}
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
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {filteredGroups.map((g) => (
                            <Accordion
                                key={g.id}
                                disableGutters
                                expanded={selectedGroupId === g.id}
                                onChange={(_, exp) => {
                                    setSelectedGroupId(exp ? g.id : null);
                                }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography sx={{ fontWeight: 'bold', flex: 1 }} noWrap>
                                        {g.name || t('eventGroups.noName')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                        {g.children.length}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    {g.children.map((c) => (
                                        <ListItemButton
                                            key={c.childId}
                                            dense
                                            selected={c.childId === selectedChildId}
                                            sx={{ pl: 3 }}
                                            onClick={() => {
                                                setSelectedGroupId(g.id);
                                                setSelectedChildId(c.childId);
                                            }}
                                        >
                                            <ListItemText primary={c.type || t('eventGroups.noType')} />
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveChild(g.id, c.childId);
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </ListItemButton>
                                    ))}
                                    <Stack direction="row" spacing={1} sx={{ px: 2, py: 1 }}>
                                        <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddChild(g.id)}>
                                            {t('eventGroups.addChild')}
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleRemoveGroup(g.id)}
                                        >
                                            {t('eventGroups.removeGroup')}
                                        </Button>
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddGroup}>
                            {t('eventGroups.addGroup')}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {!selectedGroup ? (
                        <Typography color="text.secondary">{t('eventGroups.selectGroupHint')}</Typography>
                    ) : (
                        <Stack spacing={2} sx={{ maxWidth: 640 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <TextField
                                    label={t('eventGroups.groupName')}
                                    size="small"
                                    fullWidth
                                    value={selectedGroup.name}
                                    onChange={(e) => updateGroup(selectedGroup.id, { name: e.target.value })}
                                />
                            </Paper>

                            {!selectedChild ? (
                                <Typography color="text.secondary" variant="body2">
                                    {t('eventGroups.selectChildHint')}
                                </Typography>
                            ) : (
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                        {t('eventGroups.childInfo')}
                                    </Typography>
                                    <TextField
                                        label={t('eventGroups.childFields.type')}
                                        size="small"
                                        fullWidth
                                        value={selectedChild.type}
                                        onChange={(e) => updateChild({ type: e.target.value })}
                                        sx={{ mb: 2 }}
                                    />
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1.5 }}>
                                        <TextField
                                            label={t('eventGroups.childFields.x')}
                                            size="small"
                                            type="number"
                                            value={selectedChild.x}
                                            onChange={(e) => updateChild({ x: Number(e.target.value) || 0 })}
                                        />
                                        <TextField
                                            label={t('eventGroups.childFields.y')}
                                            size="small"
                                            type="number"
                                            value={selectedChild.y}
                                            onChange={(e) => updateChild({ y: Number(e.target.value) || 0 })}
                                        />
                                        <TextField
                                            label={t('eventGroups.childFields.z')}
                                            size="small"
                                            type="number"
                                            value={selectedChild.z}
                                            onChange={(e) => updateChild({ z: Number(e.target.value) || 0 })}
                                        />
                                        <TextField
                                            label={t('eventGroups.childFields.a')}
                                            size="small"
                                            type="number"
                                            value={selectedChild.a}
                                            onChange={(e) => updateChild({ a: Number(e.target.value) || 0 })}
                                        />
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedChild.deloot}
                                                onChange={(e) => updateChild({ deloot: e.target.checked })}
                                            />
                                        }
                                        label={t('eventGroups.childFields.deloot')}
                                    />
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1.5, mt: 1 }}>
                                        <TextField
                                            label={t('eventGroups.childFields.lootMin')}
                                            size="small"
                                            type="number"
                                            value={selectedChild.lootmin}
                                            onChange={(e) => updateChild({ lootmin: Number(e.target.value) || 0 })}
                                        />
                                        <TextField
                                            label={t('eventGroups.childFields.lootMax')}
                                            size="small"
                                            type="number"
                                            value={selectedChild.lootmax}
                                            onChange={(e) => updateChild({ lootmax: Number(e.target.value) || 0 })}
                                        />
                                    </Box>
                                </Paper>
                            )}
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
