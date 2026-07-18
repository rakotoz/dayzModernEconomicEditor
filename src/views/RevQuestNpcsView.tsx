import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, List, ListItemButton, ListItemText, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { emptyNpc, findRevNpcsDir, nextNumericId, parseRevJson, RevNpc, serializeRevJson } from '../dayzConfig/revQuests';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { basenamePath } from '../dayzConfig/pathUtils';

interface Row { rowId: string; filePath: string; hadBom: boolean; raw: Record<string, JsonValue>; npc: RevNpc }
type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

const Vec3 = ({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) => {
    const v = value && value.length >= 3 ? value : [0, 0, 0];
    const axes = label === 'Orientation' ? ['yaw', 'pitch', 'roll'] : ['X', 'Y', 'Z'];
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {axes.map((ax, i) => (
                    <TextField key={ax} label={ax} size="small" type="number" value={v[i] ?? 0} onChange={(e) => { const n = [...v]; n[i] = Number(e.target.value) || 0; onChange(n); }} sx={{ width: 120 }} />
                ))}
            </Stack>
        </Box>
    );
};

export const RevQuestNpcsView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [dir, setDir] = useState<string | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
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
        const d = await findRevNpcsDir(project);
        if (!d) { setErrorMessage('Не найдена папка Rev_Quests/QuestNPCs'); setStatus('error'); return; }
        setDir(d);
        setStatus('loading');
        const filesRes = await window.api.findFilesByExtension(d, ['json']);
        if (!filesRes.success || !filesRes.data) { setErrorMessage(filesRes.error ?? 'Ошибка чтения'); setStatus('error'); return; }
        const loaded = await Promise.all(filesRes.data.map(async (filePath) => {
            const res = await window.api.readFile(filePath);
            if (!res.success || res.data === undefined) return null;
            try {
                const { hadBom, data } = parseRevJson(res.data);
                return { rowId: nanoid(), filePath, hadBom, raw: data, npc: data as unknown as RevNpc } as Row;
            } catch { return null; }
        }));
        const valid = loaded.filter((r): r is Row => r !== null).sort((a, b) => (a.npc.ID ?? 0) - (b.npc.ID ?? 0));
        setRows(valid);
        setDirtyPaths(new Set());
        setSelectedId(valid[0]?.rowId ?? null);
        setStatus('ready');
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [project?.id]);

    const selected = rows.find((r) => r.rowId === selectedId) ?? null;
    const patch = (p: Partial<RevNpc>) => {
        if (!selected) return;
        setRows((prev) => prev.map((r) => (r.rowId === selected.rowId ? { ...r, npc: { ...r.npc, ...p } } : r)));
        setDirtyPaths((prev) => new Set(prev).add(selected.filePath));
    };

    const handleAdd = () => {
        if (!dir) return;
        const id = nextNumericId(rows.map((r) => r.npc.ID ?? 0));
        const filePath = `${dir}/${id}.json`;
        const row: Row = { rowId: nanoid(), filePath, hadBom: false, raw: {}, npc: emptyNpc(id) };
        setRows((prev) => [...prev, row]);
        setDirtyPaths((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleRemove = async (row: Row) => {
        await window.api.deleteFile(row.filePath);
        setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
        setDirtyPaths((prev) => { const n = new Set(prev); n.delete(row.filePath); return n; });
        if (selectedId === row.rowId) setSelectedId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const path of dirtyPaths) {
            const row = rows.find((r) => r.filePath === path);
            if (!row) continue;
            const data = { ...row.raw, ...row.npc };
            const res = await window.api.writeFile(path, serializeRevJson(data as Record<string, JsonValue>, row.hadBom));
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? 'ошибка'}`);
        }
        setSaving(false);
        if (failures.length > 0) { setSaveError(failures.join('\n')); return; }
        setDirtyPaths(new Set());
        setSavedNotice(true);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => (r.npc.NPCName ?? '').toLowerCase().includes(q) || String(r.npc.ID).includes(q));
    }, [rows, search]);

    if (!project) return null;
    if (status === 'detecting' || status === 'loading') return <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}><CircularProgress size={28} /><Typography color="text.secondary">Загрузка NPC…</Typography></Stack>;
    if (status === 'error') return <Box sx={{ p: 3 }}><Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert><Button startIcon={<RefreshIcon />} onClick={load}>{t('common.retry')}</Button></Box>;

    const n = selected?.npc;
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack direction="row" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Квестовые NPC</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={dir ?? ''}>{dir} • {rows.length} NPC</Typography>
                </Box>
                <Button size="small" onClick={load}>{t('common.changeFile')}</Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={dirtyPaths.size === 0 || saving} onClick={handleSave}>{t('common.save')} {dirtyPaths.size > 0 && `(${dirtyPaths.size})`}</Button>
            </Stack>
            {saveError && <Alert severity="error" sx={{ mx: 2, mt: 2, whiteSpace: 'pre-line' }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1.5 }}><TextField size="small" fullWidth placeholder="Поиск NPC…" value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }} /></Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filtered.map((r) => (
                            <ListItemButton key={r.rowId} selected={r.rowId === selectedId} onClick={() => setSelectedId(r.rowId)}>
                                <ListItemText primary={`#${r.npc.ID} ${r.npc.NPCName ?? ''}`} secondary={dirtyPaths.has(r.filePath) ? t('common.unsaved') : basenamePath(r.filePath)} />
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemove(r); }}><DeleteIcon fontSize="small" /></IconButton>
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}><Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAdd}>Добавить NPC</Button></Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 2 }}>
                    {!n ? <Typography color="text.secondary">Выберите NPC слева</Typography> : (
                        <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Основное</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, rowGap: 2 }}>
                                    <TextField label="ID" size="small" type="number" value={n.ID} onChange={(e) => patch({ ID: Number(e.target.value) || 0 })} sx={{ width: 90 }} />
                                    <TextField label="Имя (NPCName)" size="small" value={n.NPCName ?? ''} onChange={(e) => patch({ NPCName: e.target.value })} sx={{ minWidth: 200 }} />
                                    <TextField label="ClassName" size="small" value={n.ClassName ?? ''} onChange={(e) => patch({ ClassName: e.target.value })} sx={{ minWidth: 220 }} />
                                    <TextField select label="Тип" size="small" value={n.NPCType ?? 0} onChange={(e) => patch({ NPCType: Number(e.target.value) })} sx={{ width: 160 }}>
                                        <MenuItem value={0}>Человек</MenuItem>
                                        <MenuItem value={1}>Доска объявлений</MenuItem>
                                    </TextField>
                                    <TextField label="Лоадаут (NPCLoadout)" size="small" value={n.NPCLoadout ?? ''} onChange={(e) => patch({ NPCLoadout: e.target.value })} sx={{ width: 200 }} />
                                    <TextField select label="Active" size="small" value={n.Active ?? 1} onChange={(e) => patch({ Active: Number(e.target.value) })} sx={{ width: 110 }}>
                                        <MenuItem value={1}>Да</MenuItem>
                                        <MenuItem value={0}>Нет</MenuItem>
                                    </TextField>
                                </Box>
                                <TextField label="Реплика (DefaultNPCText)" size="small" fullWidth multiline value={n.DefaultNPCText ?? ''} onChange={(e) => patch({ DefaultNPCText: e.target.value })} sx={{ mt: 2 }} />
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Позиция</Typography>
                                <Stack spacing={2}>
                                    <Vec3 label="Position" value={n.Position ?? [0, 0, 0]} onChange={(v) => patch({ Position: v })} />
                                    <Vec3 label="Orientation" value={n.Orientation ?? [0, 0, 0]} onChange={(v) => patch({ Orientation: v })} />
                                </Stack>
                            </Paper>
                        </Stack>
                    )}
                </Box>
            </Box>
            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
