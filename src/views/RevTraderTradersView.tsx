import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { emptyTraderDef, findRevTraderTradersDir, listRevTraderCategoryIds, parseTraderCategory, serializeTraderCategory } from '../dayzConfig/revTrader';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { basenamePath } from '../dayzConfig/pathUtils';

interface TraderRow {
    rowId: string;
    filePath: string;
    hadBom: boolean;
    raw: Record<string, JsonValue>;
    name: string;
    reqRating: number;
    reqQuestId: string;
    icon: string;
    categories: string[];
    objectClasses: string[];
}
type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

// компактный список строк (класснеймы объектов) — чипы + добавление
const Chips = ({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (v: string[]) => void }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        const v = draft.trim();
        if (!v) return;
        onChange([...values, v]);
        setDraft('');
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 1 }}>
                {values.map((v, i) => (
                    <Chip key={`${v}-${i}`} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 260 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

export const RevTraderTradersView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [dir, setDir] = useState<string | null>(null);
    const [traders, setTraders] = useState<TraderRow[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
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
        const d = await findRevTraderTradersDir(project);
        if (!d) {
            setErrorMessage('Не найдена папка Rev_Trader/Traders в проекте');
            setStatus('error');
            return;
        }
        setDir(d);
        setStatus('loading');
        listRevTraderCategoryIds(project).then(setCategoryIds);

        const filesRes = await window.api.findFilesByExtension(d, ['json']);
        if (!filesRes.success || !filesRes.data) {
            setErrorMessage(filesRes.error ?? 'Ошибка чтения папки');
            setStatus('error');
            return;
        }
        const loaded = await Promise.all(
            filesRes.data.map(async (filePath) => {
                const res = await window.api.readFile(filePath);
                if (!res.success || res.data === undefined) return null;
                try {
                    const { hadBom, data } = parseTraderCategory(res.data);
                    return {
                        rowId: nanoid(),
                        filePath,
                        hadBom,
                        raw: data,
                        name: typeof data.Name === 'string' ? data.Name : basenamePath(filePath).replace(/\.json$/i, ''),
                        reqRating: typeof data.ReqRating === 'number' ? data.ReqRating : 0,
                        reqQuestId: typeof data.ReqQuestId === 'string' ? data.ReqQuestId : '',
                        icon: typeof data.Icon === 'string' ? data.Icon : '',
                        categories: Array.isArray(data.Categories) ? (data.Categories as string[]) : [],
                        objectClasses: Array.isArray(data.ObjectClasses) ? (data.ObjectClasses as string[]) : [],
                    } as TraderRow;
                } catch {
                    return null;
                }
            })
        );
        const valid = loaded.filter((r): r is TraderRow => r !== null).sort((a, b) => a.name.localeCompare(b.name));
        setTraders(valid);
        setDirtyPaths(new Set());
        setSelectedId(valid[0]?.rowId ?? null);
        setStatus('ready');
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const selected = traders.find((tr) => tr.rowId === selectedId) ?? null;

    const patchSelected = (patch: Partial<TraderRow>) => {
        if (!selected) return;
        setTraders((prev) => prev.map((tr) => (tr.rowId === selected.rowId ? { ...tr, ...patch } : tr)));
        setDirtyPaths((prev) => new Set(prev).add(selected.filePath));
    };

    const handleAdd = () => {
        if (!dir) return;
        const base = emptyTraderDef();
        const filePath = `${dir}/${base.Name.replace(/\s+/g, '_')}.json`;
        const row: TraderRow = { rowId: nanoid(), filePath, hadBom: false, raw: {}, name: base.Name, reqRating: 0, reqQuestId: '', icon: '', categories: [], objectClasses: [] };
        setTraders((prev) => [...prev, row]);
        setDirtyPaths((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleRemove = async (row: TraderRow) => {
        await window.api.deleteFile(row.filePath);
        setTraders((prev) => prev.filter((tr) => tr.rowId !== row.rowId));
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
            const row = traders.find((tr) => tr.filePath === path);
            if (!row) continue;
            const data = {
                ...row.raw,
                Name: row.name,
                ReqRating: row.reqRating,
                ReqQuestId: row.reqQuestId,
                Icon: row.icon,
                Categories: row.categories,
                ObjectClasses: row.objectClasses,
            };
            const res = await window.api.writeFile(path, serializeTraderCategory(data as Record<string, JsonValue>, row.hadBom));
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? 'ошибка'}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('\n'));
            return;
        }
        setDirtyPaths(new Set());
        setSavedNotice(true);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return traders;
        return traders.filter((tr) => tr.name.toLowerCase().includes(q));
    }, [traders, search]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">Загрузка трейдеров…</Typography>
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
            <Stack direction="row" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Трейдеры
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={dir ?? ''}>
                        {dir} • {traders.length} трейдеров
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
                <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1.5 }}>
                        <TextField size="small" fullWidth placeholder="Поиск трейдера…" value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }} />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filtered.map((tr) => (
                            <ListItemButton key={tr.rowId} selected={tr.rowId === selectedId} onClick={() => setSelectedId(tr.rowId)}>
                                <ListItemText primary={tr.name} secondary={`${tr.categories.length} катег. • ${dirtyPaths.has(tr.filePath) ? t('common.unsaved') : basenamePath(tr.filePath)}`} />
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemove(tr); }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAdd}>
                            Добавить трейдера
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 2 }}>
                    {!selected ? (
                        <Typography color="text.secondary">Выберите трейдера слева</Typography>
                    ) : (
                        <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    Основное
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, rowGap: 2 }}>
                                    <TextField label="Имя" size="small" value={selected.name} onChange={(e) => patchSelected({ name: e.target.value })} sx={{ minWidth: 220 }} />
                                    <TextField label="Icon" size="small" value={selected.icon} onChange={(e) => patchSelected({ icon: e.target.value })} sx={{ width: 160 }} />
                                    <TextField label="Треб. репутация" size="small" type="number" value={selected.reqRating} onChange={(e) => patchSelected({ reqRating: Number(e.target.value) || 0 })} sx={{ width: 160 }} />
                                    <TextField label="Треб. квест (ID, пусто = нет)" size="small" value={selected.reqQuestId} onChange={(e) => patchSelected({ reqQuestId: e.target.value })} sx={{ width: 220 }} />
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    Категории <Typography component="span" variant="caption" color="text.secondary">(из папки Categories)</Typography>
                                </Typography>
                                <Autocomplete
                                    multiple
                                    freeSolo
                                    size="small"
                                    options={categoryIds}
                                    value={selected.categories}
                                    onChange={(_, v) => patchSelected({ categories: v as string[] })}
                                    renderInput={(params) => <TextField {...params} placeholder="Выберите или введите категорию" />}
                                />
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    Объекты-торговцы <Typography component="span" variant="caption" color="text.secondary">(класснеймы объектов в DayZ Editor)</Typography>
                                </Typography>
                                <Chips label="ObjectClasses" values={selected.objectClasses} placeholder="Rev_TraderObj_..." onChange={(v) => patchSelected({ objectClasses: v })} />
                            </Paper>
                        </Stack>
                    )}
                </Box>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
