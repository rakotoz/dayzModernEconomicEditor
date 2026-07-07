import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    List,
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
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import {
    emptyNpc,
    ExpansionQuestNpc,
    findExpansionNpcsDir,
    nextNpcId,
    parseNpcFile,
    serializeNpcFile,
} from '../dayzConfig/expansionQuestNpcs';
import { basenamePath } from '../dayzConfig/pathUtils';

interface NpcRow {
    rowId: string;
    filePath: string;
    hadBom: boolean;
    npc: ExpansionQuestNpc;
}

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

const boolField = (v: unknown) => v === 1 || v === true;
const toBoolInt = (checked: boolean) => (checked ? 1 : 0);

const Vec3Fields = ({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) => {
    const v = value && value.length === 3 ? value : [0, 0, 0];
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                    <TextField
                        key={axis}
                        label={axis}
                        size="small"
                        type="number"
                        value={v[i]}
                        onChange={(e) => {
                            const next = [...v];
                            next[i] = Number(e.target.value) || 0;
                            onChange(next);
                        }}
                        sx={{ width: 110 }}
                    />
                ))}
            </Stack>
        </Box>
    );
};

export const ExpansionQuestNpcsView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [npcsDir, setNpcsDir] = useState<string | null>(null);

    const [rows, setRows] = useState<NpcRow[]>([]);
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const dir = await findExpansionNpcsDir(project);
        if (!dir) {
            setErrorMessage(t('expansionNpcs.dirNotFound'));
            setStatus('error');
            return;
        }
        setNpcsDir(dir);
        setStatus('loading');

        const filesRes = await window.api.findFilesByExtension(dir, ['json']);
        if (!filesRes.success || !filesRes.data) {
            setErrorMessage(filesRes.error ?? t('expansionNpcs.scanError'));
            setStatus('error');
            return;
        }

        const loaded = await Promise.all(
            filesRes.data.map(async (filePath) => {
                const res = await window.api.readFile(filePath);
                if (!res.success || res.data === undefined) return null;
                try {
                    const { hadBom, npc } = parseNpcFile(res.data);
                    return { rowId: nanoid(), filePath, hadBom, npc } as NpcRow;
                } catch {
                    return null;
                }
            })
        );

        const validRows = loaded.filter((r): r is NpcRow => r !== null).sort((a, b) => a.npc.ID - b.npc.ID);
        setRows(validRows);
        setDirtyPaths(new Set());
        setSelectedId(validRows[0]?.rowId ?? null);
        setStatus('ready');
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const selected = rows.find((r) => r.rowId === selectedId) ?? null;

    const patchSelected = (patch: Partial<ExpansionQuestNpc>) => {
        if (!selected) return;
        setRows((prev) => prev.map((r) => (r.rowId === selected.rowId ? { ...r, npc: { ...r.npc, ...patch } } : r)));
        setDirtyPaths((prev) => new Set(prev).add(selected.filePath));
    };

    const handleAddNpc = () => {
        if (!npcsDir) return;
        const id = nextNpcId(rows.map((r) => r.npc));
        const filePath = `${npcsDir}/QuestNPC_${id}.json`;
        const row: NpcRow = { rowId: nanoid(), filePath, hadBom: false, npc: emptyNpc(id) };
        setRows((prev) => [...prev, row]);
        setDirtyPaths((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleRemoveNpc = async (row: NpcRow) => {
        await window.api.deleteFile(row.filePath);
        setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
        setDirtyPaths((prev) => {
            const next = new Set(prev);
            next.delete(row.filePath);
            return next;
        });
        if (selectedId === row.rowId) setSelectedId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const path of dirtyPaths) {
            const row = rows.find((r) => r.filePath === path);
            if (!row) continue;
            const content = serializeNpcFile(row.npc, row.hadBom);
            const res = await window.api.writeFile(path, content);
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? t('expansionNpcs.saveError')}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('\n'));
            return;
        }
        setDirtyPaths(new Set());
        setSavedNotice(true);
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.npc.NPCName?.toLowerCase().includes(q) || String(r.npc.ID).includes(q));
    }, [rows, search]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('expansionNpcs.detecting') : t('expansionNpcs.loading')}</Typography>
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

    const n = selected?.npc;
    const waypoints = n?.Waypoints ?? [];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('expansionNpcs.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={npcsDir ?? ''}>
                        {npcsDir} • {t('expansionNpcs.recordsCount', { count: rows.length })}
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
                <Box sx={{ width: 300, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1.5 }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={t('expansionNpcs.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
                        />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredRows.map((r) => (
                            <ListItemButton key={r.rowId} selected={r.rowId === selectedId} onClick={() => setSelectedId(r.rowId)}>
                                <ListItemText primary={`#${r.npc.ID} ${r.npc.NPCName || ''}`} secondary={dirtyPaths.has(r.filePath) ? t('common.unsaved') : basenamePath(r.filePath)} />
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveNpc(r);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))}
                        {filteredRows.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {t('expansionNpcs.nothingFound')}
                            </Typography>
                        )}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddNpc}>
                            {t('expansionNpcs.addNpc')}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {!n ? (
                        <Typography color="text.secondary">{t('expansionNpcs.selectHint')}</Typography>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionNpcs.sections.basic')}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="ID" size="small" type="number" value={n.ID} onChange={(e) => patchSelected({ ID: Number(e.target.value) || 0 })} sx={{ width: 100 }} />
                                        <TextField label="NPCName" size="small" fullWidth value={n.NPCName ?? ''} onChange={(e) => patchSelected({ NPCName: e.target.value })} />
                                    </Stack>
                                    <TextField label="ClassName" size="small" fullWidth value={n.ClassName ?? ''} onChange={(e) => patchSelected({ ClassName: e.target.value })} />
                                    <TextField label="DefaultNPCText" size="small" fullWidth multiline value={n.DefaultNPCText ?? ''} onChange={(e) => patchSelected({ DefaultNPCText: e.target.value })} />
                                    <TextField label="NPCLoadoutFile" size="small" fullWidth value={n.NPCLoadoutFile ?? ''} onChange={(e) => patchSelected({ NPCLoadoutFile: e.target.value })} />
                                    <TextField label="NPCFaction" size="small" fullWidth value={n.NPCFaction ?? ''} onChange={(e) => patchSelected({ NPCFaction: e.target.value })} />
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="NPCType" size="small" type="number" value={n.NPCType ?? 0} onChange={(e) => patchSelected({ NPCType: Number(e.target.value) || 0 })} />
                                        <FormControlLabel control={<Checkbox checked={boolField(n.Active)} onChange={(e) => patchSelected({ Active: toBoolInt(e.target.checked) })} />} label="Active" />
                                    </Stack>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionNpcs.sections.placement')}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Vec3Fields label="Position" value={n.Position} onChange={(v) => patchSelected({ Position: v })} />
                                    <Vec3Fields label="Orientation" value={n.Orientation} onChange={(v) => patchSelected({ Orientation: v })} />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionNpcs.sections.emotes')}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
                                    <TextField label="NPCEmoteID" size="small" type="number" value={n.NPCEmoteID ?? 0} onChange={(e) => patchSelected({ NPCEmoteID: Number(e.target.value) || 0 })} />
                                    <TextField label="NPCInteractionEmoteID" size="small" type="number" value={n.NPCInteractionEmoteID ?? 0} onChange={(e) => patchSelected({ NPCInteractionEmoteID: Number(e.target.value) || 0 })} />
                                    <TextField label="NPCQuestStartEmoteID" size="small" type="number" value={n.NPCQuestStartEmoteID ?? 0} onChange={(e) => patchSelected({ NPCQuestStartEmoteID: Number(e.target.value) || 0 })} />
                                    <TextField label="NPCQuestCompleteEmoteID" size="small" type="number" value={n.NPCQuestCompleteEmoteID ?? 0} onChange={(e) => patchSelected({ NPCQuestCompleteEmoteID: Number(e.target.value) || 0 })} />
                                    <TextField label="NPCQuestCancelEmoteID" size="small" type="number" value={n.NPCQuestCancelEmoteID ?? 0} onChange={(e) => patchSelected({ NPCQuestCancelEmoteID: Number(e.target.value) || 0 })} />
                                </Box>
                                <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={boolField(n.NPCEmoteIsStatic)} onChange={(e) => patchSelected({ NPCEmoteIsStatic: toBoolInt(e.target.checked) })} />} label="NPCEmoteIsStatic" />
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionNpcs.sections.waypoints')}
                                </Typography>
                                <Stack spacing={1}>
                                    {waypoints.map((p, i) => (
                                        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                            <Vec3Fields
                                                label={`#${i + 1}`}
                                                value={p}
                                                onChange={(v) => {
                                                    const next = [...waypoints];
                                                    next[i] = v;
                                                    patchSelected({ Waypoints: next });
                                                }}
                                            />
                                            <IconButton size="small" onClick={() => patchSelected({ Waypoints: waypoints.filter((_, j) => j !== i) })}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => patchSelected({ Waypoints: [...waypoints, [0, 0, 0]] })}>
                                        {t('expansionNpcs.addWaypoint')}
                                    </Button>
                                </Stack>
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
