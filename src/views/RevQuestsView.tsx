import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Divider, FormControlLabel, IconButton, InputAdornment, List, ListItemButton, ListItemText, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
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
    emptyObjective, emptyQuest, emptyReward, findRevObjectivesDir, findRevQuestsDir, nextNumericId,
    OBJECTIVE_TYPES, parseRevJson, RevObjective, RevObjectiveRef, RevQuest, RevReward, serializeRevJson,
} from '../dayzConfig/revQuests';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { basenamePath } from '../dayzConfig/pathUtils';

const boolField = (v: unknown) => v === 1 || v === true;

// ---- переиспользуемые редакторы (module-level, чтобы не терять фокус) ----
const NumberChips = ({ label, values, onChange }: { label: string; values: number[]; onChange: (v: number[]) => void }) => {
    const [d, setD] = useState('');
    const add = () => { const n = Number(d); if (d.trim() === '' || Number.isNaN(n)) return; onChange([...values, n]); setD(''); };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, my: 0.5 }}>
                {values.map((v, i) => <Chip key={i} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />)}
            </Stack>
            <Stack direction="row" spacing={1}><TextField size="small" type="number" placeholder="ID" value={d} onChange={(e) => setD(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 100 }} /><Button size="small" onClick={add}>+</Button></Stack>
        </Box>
    );
};
const StringChips = ({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (v: string[]) => void }) => {
    const [d, setD] = useState('');
    const add = () => { if (!d.trim()) return; onChange([...values, d.trim()]); setD(''); };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label} <Typography component="span" variant="caption" color="text.disabled">· {values.length}</Typography></Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, my: 0.5 }}>
                {values.map((v, i) => <Chip key={`${v}-${i}`} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />)}
            </Stack>
            <Stack direction="row" spacing={1}><TextField size="small" placeholder={placeholder} value={d} onChange={(e) => setD(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 220 }} /><Button size="small" onClick={add}>+</Button></Stack>
        </Box>
    );
};
const Vec3 = ({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) => {
    const v = value && value.length >= 3 ? value : [0, 0, 0];
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {['X', 'Y', 'Z'].map((ax, i) => <TextField key={ax} label={ax} size="small" type="number" value={v[i] ?? 0} onChange={(e) => { const n = [...v]; n[i] = Number(e.target.value) || 0; onChange(n); }} sx={{ width: 110 }} />)}
            </Stack>
        </Box>
    );
};
const CollectionsEditor = ({ items, onChange }: { items: RevObjective['Collections']; onChange: (v: RevObjective['Collections']) => void }) => (
    <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">Предметы (Collections)</Typography>
        {(items ?? []).map((c, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField label="ClassName" size="small" value={c.ClassName} onChange={(e) => { const n = [...items]; n[i] = { ...c, ClassName: e.target.value }; onChange(n); }} sx={{ flex: 1 }} />
                <TextField label="Кол-во" size="small" type="number" value={c.Amount} onChange={(e) => { const n = [...items]; n[i] = { ...c, Amount: Number(e.target.value) || 0 }; onChange(n); }} sx={{ width: 100 }} />
                <IconButton size="small" onClick={() => onChange(items.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
            </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...(items ?? []), { Amount: 1, ClassName: '', QuantityPercent: -1 }])}>Добавить предмет</Button>
    </Stack>
);
const LootEditor = ({ items, onChange }: { items: RevObjective['Loot']; onChange: (v: RevObjective['Loot']) => void }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">Loot</Typography>
        <Stack spacing={1} sx={{ mt: 0.5 }}>
            {(items ?? []).map((l, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 1 }}>
                        <TextField label="ClassName" size="small" value={l.ClassName} onChange={(e) => { const n = [...items]; n[i] = { ...l, ClassName: e.target.value }; onChange(n); }} sx={{ gridColumn: 'span 2' }} />
                        <TextField label="Min" size="small" type="number" value={l.Min} onChange={(e) => { const n = [...items]; n[i] = { ...l, Min: Number(e.target.value) || 0 }; onChange(n); }} />
                        <TextField label="Max" size="small" type="number" value={l.Max} onChange={(e) => { const n = [...items]; n[i] = { ...l, Max: Number(e.target.value) || 0 }; onChange(n); }} />
                        <TextField label="Chance" size="small" type="number" value={l.Chance} onChange={(e) => { const n = [...items]; n[i] = { ...l, Chance: Number(e.target.value) }; onChange(n); }} />
                    </Box>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} sx={{ mt: 0.5 }} onClick={() => onChange(items.filter((_, j) => j !== i))}>Удалить</Button>
                </Paper>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...(items ?? []), { ClassName: '', Chance: 1, Min: 1, Max: 1, QuantityPercent: -1 }])}>Добавить лут</Button>
        </Stack>
    </Box>
);

const ObjectiveTypeForm = ({ o, onChange }: { o: RevObjective; onChange: (patch: Partial<RevObjective>) => void }) => {
    const type = o.ObjectiveType;
    if (type === 'Travel') return (
        <Stack spacing={1.5}>
            <Vec3 label="Position" value={o.Position ?? []} onChange={(v) => onChange({ Position: v })} />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <TextField label="MaxDistance" size="small" type="number" value={o.MaxDistance ?? 5} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                <TextField label="MarkerName" size="small" value={o.MarkerName ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ flex: 1 }} />
                <FormControlLabel control={<Checkbox size="small" checked={boolField(o.ShowMarker)} onChange={(e) => onChange({ ShowMarker: e.target.checked ? 1 : 0 })} />} label="Метка" />
            </Stack>
        </Stack>
    );
    if (type === 'Hunt') return (
        <Stack spacing={1.5}>
            <TextField label="Count" size="small" type="number" value={o.Count ?? 1} onChange={(e) => onChange({ Count: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
            <StringChips label="TargetClasses (кого убивать)" placeholder="ClassName" values={o.TargetClasses ?? []} onChange={(v) => onChange({ TargetClasses: v })} />
        </Stack>
    );
    if (type === 'Collect' || type === 'Delivery') return (
        <Stack spacing={1.5}>
            <CollectionsEditor items={o.Collections ?? []} onChange={(v) => onChange({ Collections: v })} />
            {type === 'Delivery' && (
                <>
                    <FormControlLabel
                        control={<Checkbox size="small" checked={boolField(o.GiveOnAccept)} onChange={(e) => onChange({ GiveOnAccept: e.target.checked ? 1 : 0 })} />}
                        label="Выдать эти предметы игроку при взятии квеста (курьер)"
                    />
                    <Alert severity="info" sx={{ py: 0 }}>
                        Курьер: при взятии игрок получает предметы выше (если галка включена) и несёт их <b>приёмщику</b> — это NPC из поля <b>QuestTurnInIDs</b> (карточка «NPC и ранг»); поставь туда другого NPC, не квестодателя. При сдаче предметы забираются.
                    </Alert>
                    <TextField label="Метка на карте (необязательно)" size="small" value={o.MarkerName ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ maxWidth: 320 }} />
                </>
            )}
            {type === 'Collect' && <FormControlLabel control={<Checkbox size="small" checked={boolField(o.NeedAnyCollection)} onChange={(e) => onChange({ NeedAnyCollection: e.target.checked ? 1 : 0 })} />} label="Хватит любого из списка (NeedAnyCollection)" />}
        </Stack>
    );
    if (type === 'Treasure') return (
        <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                <TextField label="ContainerName" size="small" value={o.ContainerName ?? ''} onChange={(e) => onChange({ ContainerName: e.target.value })} sx={{ minWidth: 200 }} />
                <TextField label="MarkerName" size="small" value={o.MarkerName ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ width: 160 }} />
                <TextField label="MaxDistance" size="small" type="number" value={o.MaxDistance ?? 5} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) || 0 })} sx={{ width: 120 }} />
                <TextField label="LootItemsAmount" size="small" type="number" value={o.LootItemsAmount ?? 3} onChange={(e) => onChange({ LootItemsAmount: Number(e.target.value) || 0 })} sx={{ width: 140 }} />
                <FormControlLabel control={<Checkbox size="small" checked={boolField(o.DigInStash)} onChange={(e) => onChange({ DigInStash: e.target.checked ? 1 : 0 })} />} label="Закопан (лопата)" />
            </Stack>
            <Box>
                <Typography variant="caption" color="text.secondary">Точки схрона (TreasurePositions)</Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {(o.TreasurePositions ?? []).map((p, i) => (
                        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Vec3 label={`#${i + 1}`} value={[p.X, p.Y, p.Z]} onChange={(v) => { const n = [...o.TreasurePositions]; n[i] = { X: v[0], Y: v[1], Z: v[2] }; onChange({ TreasurePositions: n }); }} />
                            <IconButton size="small" onClick={() => onChange({ TreasurePositions: o.TreasurePositions.filter((_, j) => j !== i) })}><DeleteIcon fontSize="small" /></IconButton>
                        </Stack>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ TreasurePositions: [...(o.TreasurePositions ?? []), { X: 0, Y: 0, Z: 0 }] })}>Добавить точку</Button>
                </Stack>
            </Box>
            <LootEditor items={o.Loot ?? []} onChange={(v) => onChange({ Loot: v })} />
        </Stack>
    );
    if (type === 'Action') return (
        <Stack spacing={1.5}>
            <TextField label="ExecutionAmount" size="small" type="number" value={o.ExecutionAmount ?? 1} onChange={(e) => onChange({ ExecutionAmount: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
            <StringChips label="ActionNames" placeholder="ActionFillBottleBase" values={o.ActionNames ?? []} onChange={(v) => onChange({ ActionNames: v })} />
            <StringChips label="AllowedClassNames (на каких предметах)" placeholder="ClassName" values={o.AllowedClassNames ?? []} onChange={(v) => onChange({ AllowedClassNames: v })} />
        </Stack>
    );
    if (type === 'Craft') return (
        <Stack spacing={1.5}>
            <TextField label="ExecutionAmount" size="small" type="number" value={o.ExecutionAmount ?? 1} onChange={(e) => onChange({ ExecutionAmount: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
            <StringChips label="CraftItems (что скрафтить)" placeholder="ClassName" values={o.CraftItems ?? []} onChange={(v) => onChange({ CraftItems: v })} />
        </Stack>
    );
    return <Typography variant="body2" color="text.secondary">Тип «{type}» без доп. полей.</Typography>;
};

interface QuestRow { rowId: string; filePath: string; hadBom: boolean; raw: Record<string, JsonValue>; quest: RevQuest }
interface ObjEntry { filePath: string; hadBom: boolean; raw: Record<string, JsonValue>; data: RevObjective }
type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

export const RevQuestsView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [questsDir, setQuestsDir] = useState<string | null>(null);
    const [objectivesDir, setObjectivesDir] = useState<string | null>(null);

    const [rows, setRows] = useState<QuestRow[]>([]);
    const [objIndex, setObjIndex] = useState<Map<number, ObjEntry>>(new Map());
    const [dirtyQuests, setDirtyQuests] = useState<Set<string>>(new Set());
    const [dirtyObjIds, setDirtyObjIds] = useState<Set<number>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const qDir = await findRevQuestsDir(project);
        const oDir = await findRevObjectivesDir(project);
        if (!qDir || !oDir) { setErrorMessage('Не найдена папка Rev_Quests (Quests/Objectives)'); setStatus('error'); return; }
        setQuestsDir(qDir); setObjectivesDir(oDir);
        setStatus('loading');

        const [qFiles, oFiles] = await Promise.all([window.api.findFilesByExtension(qDir, ['json']), window.api.findFilesByExtension(oDir, ['json'])]);
        // objectives
        const idx = new Map<number, ObjEntry>();
        if (oFiles.success && oFiles.data) {
            await Promise.all(oFiles.data.map(async (fp) => {
                const res = await window.api.readFile(fp);
                if (!res.success || res.data === undefined) return;
                try { const { hadBom, data } = parseRevJson(res.data); const d = data as unknown as RevObjective; if (typeof d.ID === 'number') idx.set(d.ID, { filePath: fp, hadBom, raw: data, data: d }); } catch { /* skip */ }
            }));
        }
        // quests
        const loaded = await Promise.all((qFiles.data ?? []).map(async (fp) => {
            const res = await window.api.readFile(fp);
            if (!res.success || res.data === undefined) return null;
            try { const { hadBom, data } = parseRevJson(res.data); return { rowId: nanoid(), filePath: fp, hadBom, raw: data, quest: data as unknown as RevQuest } as QuestRow; } catch { return null; }
        }));
        const valid = loaded.filter((r): r is QuestRow => r !== null).sort((a, b) => (a.quest.ID ?? 0) - (b.quest.ID ?? 0));
        setRows(valid);
        setObjIndex(idx);
        setDirtyQuests(new Set());
        setDirtyObjIds(new Set());
        setSelectedId(valid[0]?.rowId ?? null);
        setStatus('ready');
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [project?.id]);

    const selected = rows.find((r) => r.rowId === selectedId) ?? null;

    const patchQuest = (p: Partial<RevQuest>) => {
        if (!selected) return;
        setRows((prev) => prev.map((r) => (r.rowId === selected.rowId ? { ...r, quest: { ...r.quest, ...p } } : r)));
        setDirtyQuests((prev) => new Set(prev).add(selected.filePath));
    };
    const patchObjective = (id: number, p: Partial<RevObjective>) => {
        setObjIndex((prev) => { const e = prev.get(id); if (!e) return prev; const n = new Map(prev); n.set(id, { ...e, data: { ...e.data, ...p } }); return n; });
        setDirtyObjIds((prev) => new Set(prev).add(id));
    };

    const allObjIds = () => Array.from(objIndex.keys());

    const handleAddObjective = () => {
        if (!selected || !objectivesDir) return;
        const id = nextNumericId(allObjIds());
        const type = 'Travel';
        const data = emptyObjective(id, type);
        setObjIndex((prev) => new Map(prev).set(id, { filePath: `${objectivesDir}/${id}.json`, hadBom: false, raw: {}, data }));
        setDirtyObjIds((prev) => new Set(prev).add(id));
        patchQuest({ Objectives: [...(selected.quest.Objectives ?? []), { ID: id, ObjectiveType: type }] });
    };

    const handleAddQuest = () => {
        if (!questsDir) return;
        const id = nextNumericId(rows.map((r) => r.quest.ID ?? 0));
        const filePath = `${questsDir}/${id}.json`;
        const row: QuestRow = { rowId: nanoid(), filePath, hadBom: false, raw: {}, quest: emptyQuest(id) };
        setRows((prev) => [...prev, row]);
        setDirtyQuests((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleRemoveQuest = async (row: QuestRow) => {
        await window.api.deleteFile(row.filePath);
        setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
        setDirtyQuests((prev) => { const n = new Set(prev); n.delete(row.filePath); return n; });
        if (selectedId === row.rowId) setSelectedId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const path of dirtyQuests) {
            const row = rows.find((r) => r.filePath === path);
            if (!row) continue;
            const res = await window.api.writeFile(path, serializeRevJson({ ...row.raw, ...row.quest } as Record<string, JsonValue>, row.hadBom));
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? 'ошибка'}`);
        }
        for (const id of dirtyObjIds) {
            const e = objIndex.get(id);
            if (!e) continue;
            const res = await window.api.writeFile(e.filePath, serializeRevJson({ ...e.raw, ...e.data } as Record<string, JsonValue>, e.hadBom));
            if (!res.success) failures.push(`obj ${id}: ${res.error ?? 'ошибка'}`);
        }
        setSaving(false);
        if (failures.length > 0) { setSaveError(failures.join('\n')); return; }
        setDirtyQuests(new Set());
        setDirtyObjIds(new Set());
        setSavedNotice(true);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => (r.quest.Title ?? '').toLowerCase().includes(q) || String(r.quest.ID).includes(q));
    }, [rows, search]);

    const totalDirty = dirtyQuests.size + dirtyObjIds.size;

    if (!project) return null;
    if (status === 'detecting' || status === 'loading') return <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}><CircularProgress size={28} /><Typography color="text.secondary">Загрузка квестов…</Typography></Stack>;
    if (status === 'error') return <Box sx={{ p: 3 }}><Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert><Button startIcon={<RefreshIcon />} onClick={load}>{t('common.retry')}</Button></Box>;

    const q = selected?.quest;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack direction="row" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Квесты</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{rows.length} квестов • {objIndex.size} целей</Typography>
                </Box>
                <Button size="small" onClick={load}>{t('common.changeFile')}</Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={totalDirty === 0 || saving} onClick={handleSave}>{t('common.save')} {totalDirty > 0 && `(${totalDirty})`}</Button>
            </Stack>
            {saveError && <Alert severity="error" sx={{ mx: 2, mt: 2, whiteSpace: 'pre-line' }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ width: 280, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1.5 }}><TextField size="small" fullWidth placeholder="Поиск квеста…" value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }} /></Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filtered.map((r) => (
                            <ListItemButton key={r.rowId} selected={r.rowId === selectedId} onClick={() => setSelectedId(r.rowId)}>
                                <ListItemText primary={`#${r.quest.ID} ${r.quest.Title ?? ''}`} secondary={dirtyQuests.has(r.filePath) ? t('common.unsaved') : basenamePath(r.filePath)} />
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemoveQuest(r); }}><DeleteIcon fontSize="small" /></IconButton>
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}><Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddQuest}>Добавить квест</Button></Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 2 }}>
                    {!q ? <Typography color="text.secondary">Выберите квест слева</Typography> : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 2, alignItems: 'start' }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>Основное</Typography>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="ID" size="small" type="number" value={q.ID} onChange={(e) => patchQuest({ ID: Number(e.target.value) || 0 })} sx={{ width: 90 }} />
                                        <TextField label="Title" size="small" fullWidth value={q.Title ?? ''} onChange={(e) => patchQuest({ Title: e.target.value })} />
                                    </Stack>
                                    <TextField label="ObjectiveText (короткая строка цели)" size="small" fullWidth value={q.ObjectiveText ?? ''} onChange={(e) => patchQuest({ ObjectiveText: e.target.value })} />
                                    <TextField label="Описание: до принятия" size="small" fullWidth multiline value={q.DescriptionStart ?? ''} onChange={(e) => patchQuest({ DescriptionStart: e.target.value })} />
                                    <TextField label="Описание: в процессе" size="small" fullWidth multiline value={q.DescriptionInProgress ?? ''} onChange={(e) => patchQuest({ DescriptionInProgress: e.target.value })} />
                                    <TextField label="Описание: готов к сдаче" size="small" fullWidth multiline value={q.DescriptionInEnd ?? ''} onChange={(e) => patchQuest({ DescriptionInEnd: e.target.value })} />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>Поведение</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 0.5 }}>
                                    {(['Repeatable', 'IsDailyQuest', 'IsWeeklyQuest', 'IsGroupQuest', 'AutoStartOnFirstJoin', 'CancelQuestOnPlayerDeath', 'Autocomplete', 'SequentialObjectives', 'Active'] as const).map((f) => (
                                        <FormControlLabel key={f} control={<Checkbox size="small" checked={boolField(q[f])} onChange={(e) => patchQuest({ [f]: e.target.checked ? 1 : 0 } as Partial<RevQuest>)} />} label={f} />
                                    ))}
                                </Box>
                                <TextField label="FollowUpQuest" size="small" type="number" value={q.FollowUpQuest ?? 0} onChange={(e) => patchQuest({ FollowUpQuest: Number(e.target.value) })} sx={{ width: 160, mt: 1.5 }} />
                                <Box sx={{ mt: 1.5 }}><NumberChips label="PreQuestIDs (цепочка)" values={q.PreQuestIDs ?? []} onChange={(v) => patchQuest({ PreQuestIDs: v })} /></Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>NPC и ранг</Typography>
                                <Stack spacing={1.5}>
                                    <NumberChips label="QuestGiverIDs (где взять)" values={q.QuestGiverIDs ?? []} onChange={(v) => patchQuest({ QuestGiverIDs: v })} />
                                    <NumberChips label="QuestTurnInIDs (где сдать)" values={q.QuestTurnInIDs ?? []} onChange={(v) => patchQuest({ QuestTurnInIDs: v })} />
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="RankPointsReward" size="small" type="number" value={q.RankPointsReward ?? 0} onChange={(e) => patchQuest({ RankPointsReward: Number(e.target.value) || 0 })} />
                                        <TextField label="RequiredRank (-1 = нет)" size="small" type="number" value={q.RequiredRank ?? -1} onChange={(e) => patchQuest({ RequiredRank: Number(e.target.value) })} />
                                    </Stack>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>Награды</Typography>
                                <Stack spacing={1}>
                                    {(q.Rewards ?? []).map((r: RevReward, i) => (
                                        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                            <TextField label="ClassName" size="small" value={r.ClassName} onChange={(e) => { const n = [...q.Rewards]; n[i] = { ...r, ClassName: e.target.value }; patchQuest({ Rewards: n }); }} sx={{ flex: 1 }} />
                                            <TextField label="Кол-во" size="small" type="number" value={r.Amount} onChange={(e) => { const n = [...q.Rewards]; n[i] = { ...r, Amount: Number(e.target.value) || 0 }; patchQuest({ Rewards: n }); }} sx={{ width: 90 }} />
                                            <TextField label="Chance" size="small" type="number" value={r.Chance} onChange={(e) => { const n = [...q.Rewards]; n[i] = { ...r, Chance: Number(e.target.value) }; patchQuest({ Rewards: n }); }} sx={{ width: 90 }} />
                                            <IconButton size="small" onClick={() => patchQuest({ Rewards: q.Rewards.filter((_, j) => j !== i) })}><DeleteIcon fontSize="small" /></IconButton>
                                        </Stack>
                                    ))}
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => patchQuest({ Rewards: [...(q.Rewards ?? []), emptyReward()] })}>Добавить награду</Button>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Цели ({q.Objectives?.length ?? 0})</Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddObjective}>Добавить цель</Button>
                                </Stack>
                                <Stack spacing={1.5}>
                                    {(q.Objectives ?? []).map((ref: RevObjectiveRef, i) => {
                                        const entry = objIndex.get(ref.ID);
                                        return (
                                            <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                                                    <TextField select label="Тип" size="small" value={ref.ObjectiveType} onChange={(e) => {
                                                        const nt = e.target.value;
                                                        const next = [...q.Objectives]; next[i] = { ...ref, ObjectiveType: nt }; patchQuest({ Objectives: next });
                                                        if (entry) patchObjective(ref.ID, { ObjectiveType: nt });
                                                    }} sx={{ width: 150 }}>
                                                        {OBJECTIVE_TYPES.map((tp) => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
                                                    </TextField>
                                                    <TextField label="ID цели" size="small" type="number" value={ref.ID} onChange={(e) => { const id = Number(e.target.value) || 0; const next = [...q.Objectives]; next[i] = { ...ref, ID: id }; patchQuest({ Objectives: next }); }} sx={{ width: 100 }} />
                                                    <IconButton size="small" onClick={() => patchQuest({ Objectives: q.Objectives.filter((_, j) => j !== i) })}><DeleteIcon fontSize="small" /></IconButton>
                                                </Stack>
                                                {entry ? (
                                                    <Stack spacing={1.5}>
                                                        <Stack direction="row" spacing={1.5}>
                                                            <TextField label="ObjectiveText" size="small" fullWidth value={entry.data.ObjectiveText ?? ''} onChange={(e) => patchObjective(ref.ID, { ObjectiveText: e.target.value })} />
                                                            <TextField label="TimeLimit" size="small" type="number" value={entry.data.TimeLimit ?? -1} onChange={(e) => patchObjective(ref.ID, { TimeLimit: Number(e.target.value) })} sx={{ width: 120 }} />
                                                        </Stack>
                                                        <ObjectiveTypeForm o={entry.data} onChange={(p) => patchObjective(ref.ID, p)} />
                                                        {dirtyObjIds.has(ref.ID) && <Typography variant="caption" color="warning.main">● цель изменена</Typography>}
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">Файл цели #{ref.ID} не найден (Objectives/{ref.ID}.json).</Typography>
                                                )}
                                            </Paper>
                                        );
                                    })}
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
