import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import {
    emptyTraderDefinition,
    findExpansionMarketDir,
    findExpansionTradersDir,
    parseTraderCategories,
    parseTraderDefinition,
    serializeTraderCategories,
    serializeTraderDefinition,
    TraderCategoryBehavior,
    TraderDefinition,
} from '../dayzConfig/expansionMarket';
import { EconomyClassNameGroup, loadEconomyClassNamesByFileCached } from '../dayzConfig/typesXml';
import { basenamePath } from '../dayzConfig/pathUtils';
import { ClassNamePickerDialog } from '../components/ClassNamePickerDialog';

interface TraderRow {
    rowId: string;
    filePath: string;
    hadBom: boolean;
    trader: TraderDefinition;
}

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

const StringChipList = ({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        if (!draft.trim()) return;
        onChange([...values, draft.trim()]);
        setDraft('');
    };
    return (
        <Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mb: 0.5 }}>
                {values.map((v, i) => (
                    <Chip key={`${v}-${i}`} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ flex: 1, maxWidth: 260 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

const CATEGORY_BEHAVIORS: { value: TraderCategoryBehavior; labelKey: string }[] = [
    { value: 0, labelKey: 'buyOnly' },
    { value: 1, labelKey: 'buySell' },
    { value: 2, labelKey: 'sellOnly' },
    { value: 3, labelKey: 'hidden' },
];

// Categories трейдера — не просто список имён, у каждой категории есть флаг направления
// торговли (только покупка/продажа/оба/скрыта), закодированный суффиксом ":N" в самой строке
// (см. parseTraderCategories). Раньше это редактировалось как обычный StringChipList и флаг
// было невозможно выставить иначе как руками в JSON — теперь у каждой строки свой выбор.
const TraderCategoryList = ({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: string[] }) => {
    const { t } = useTranslation();
    const entries = useMemo(() => parseTraderCategories(value), [value]);
    const [draftName, setDraftName] = useState('');
    const [draftBehavior, setDraftBehavior] = useState<TraderCategoryBehavior>(1);

    const updateEntries = (next: typeof entries) => onChange(serializeTraderCategories(next));

    const add = () => {
        if (!draftName.trim()) return;
        updateEntries([...entries, { name: draftName.trim(), behavior: draftBehavior }]);
        setDraftName('');
        setDraftBehavior(1);
    };
    const remove = (i: number) => updateEntries(entries.filter((_, j) => j !== i));
    const patchBehavior = (i: number, behavior: TraderCategoryBehavior) => updateEntries(entries.map((e, j) => (j === i ? { ...e, behavior } : e)));

    return (
        <Box>
            <Stack spacing={0.5} sx={{ mb: 1 }}>
                {entries.map((e, i) => (
                    <Stack key={`${e.name}-${i}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip label={e.name} size="small" sx={{ minWidth: 140 }} />
                        <TextField
                            select
                            size="small"
                            value={e.behavior}
                            onChange={(ev) => patchBehavior(i, Number(ev.target.value) as TraderCategoryBehavior)}
                            sx={{ width: 190 }}
                            slotProps={{ select: { native: true } }}
                        >
                            {CATEGORY_BEHAVIORS.map((b) => (
                                <option key={b.value} value={b.value}>
                                    {t(`expansionTraders.categoryBehavior.${b.labelKey}`)}
                                </option>
                            ))}
                        </TextField>
                        <IconButton size="small" onClick={() => remove(i)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ))}
                {entries.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                        —
                    </Typography>
                )}
            </Stack>
            <Stack direction="row" spacing={1}>
                <Autocomplete
                    freeSolo
                    options={options.filter((o) => !entries.some((e) => e.name === o))}
                    inputValue={draftName}
                    onInputChange={(_, v) => setDraftName(v)}
                    onChange={(_, v) => v && setDraftName(v)}
                    renderInput={(params) => <TextField {...params} size="small" placeholder="Category" sx={{ maxWidth: 220 }} />}
                    sx={{ display: 'inline-block', width: 220 }}
                />
                <TextField
                    select
                    size="small"
                    value={draftBehavior}
                    onChange={(e) => setDraftBehavior(Number(e.target.value) as TraderCategoryBehavior)}
                    sx={{ width: 190 }}
                    slotProps={{ select: { native: true } }}
                >
                    {CATEGORY_BEHAVIORS.map((b) => (
                        <option key={b.value} value={b.value}>
                            {t(`expansionTraders.categoryBehavior.${b.labelKey}`)}
                        </option>
                    ))}
                </TextField>
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

const KeyValueList = ({
    value,
    onChange,
    groups,
}: {
    value: Record<string, number>;
    onChange: (v: Record<string, number>) => void;
    groups: EconomyClassNameGroup[];
}) => {
    const { t } = useTranslation();
    const [keyDraft, setKeyDraft] = useState('');
    const [valDraft, setValDraft] = useState('1');
    const [pickerOpen, setPickerOpen] = useState(false);
    const keyOptions = useMemo(() => groups.flatMap((g) => g.names), [groups]);
    const entries = Object.entries(value);
    const add = () => {
        if (!keyDraft.trim()) return;
        onChange({ ...value, [keyDraft.trim()]: Number(valDraft) || 0 });
        setKeyDraft('');
        setValDraft('1');
    };
    const remove = (k: string) => {
        const next = { ...value };
        delete next[k];
        onChange(next);
    };
    return (
        <Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mb: 0.5 }}>
                {entries.map(([k, v]) => (
                    <Chip key={k} label={`${k}: ${v}`} size="small" onDelete={() => remove(k)} />
                ))}
                {entries.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                        —
                    </Typography>
                )}
            </Stack>
            <Stack direction="row" spacing={1}>
                <Autocomplete
                    freeSolo
                    options={keyOptions}
                    inputValue={keyDraft}
                    onInputChange={(_, v) => setKeyDraft(v)}
                    sx={{ flex: 1, maxWidth: 220 }}
                    renderInput={(params) => <TextField {...params} size="small" placeholder="ClassName" />}
                />
                <IconButton size="small" title={t('classNamePicker.browse')} onClick={() => setPickerOpen(true)}>
                    <ListAltIcon fontSize="small" />
                </IconButton>
                <TextField size="small" type="number" value={valDraft} onChange={(e) => setValDraft(e.target.value)} sx={{ width: 80 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
            <ClassNamePickerDialog open={pickerOpen} groups={groups} onClose={() => setPickerOpen(false)} onSelect={(name) => setKeyDraft(name)} />
        </Box>
    );
};

export const ExpansionTradersView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [tradersDir, setTradersDir] = useState<string | null>(null);

    const [rows, setRows] = useState<TraderRow[]>([]);
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [marketCategoryNames, setMarketCategoryNames] = useState<string[]>([]);
    const [classNameGroups, setClassNameGroups] = useState<EconomyClassNameGroup[]>([]);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const dir = await findExpansionTradersDir(project);
        if (!dir) {
            setErrorMessage(t('expansionTraders.dirNotFound'));
            setStatus('error');
            return;
        }
        setTradersDir(dir);
        setStatus('loading');

        loadEconomyClassNamesByFileCached(project).then(setClassNameGroups);

        const marketDir = await findExpansionMarketDir(project);
        if (marketDir) {
            const marketFilesRes = await window.api.findFilesByExtension(marketDir, ['json']);
            if (marketFilesRes.success && marketFilesRes.data) {
                setMarketCategoryNames(marketFilesRes.data.map((p) => basenamePath(p).replace(/\.json$/i, '')));
            }
        }

        const filesRes = await window.api.findFilesByExtension(dir, ['json']);
        if (!filesRes.success || !filesRes.data) {
            setErrorMessage(filesRes.error ?? t('expansionTraders.scanError'));
            setStatus('error');
            return;
        }

        const loaded = await Promise.all(
            filesRes.data.map(async (filePath) => {
                const res = await window.api.readFile(filePath);
                if (!res.success || res.data === undefined) return null;
                try {
                    const { hadBom, data } = parseTraderDefinition(res.data);
                    return { rowId: nanoid(), filePath, hadBom, trader: data } as TraderRow;
                } catch {
                    return null;
                }
            })
        );

        const validRows = loaded.filter((r): r is TraderRow => r !== null).sort((a, b) => a.trader.DisplayName.localeCompare(b.trader.DisplayName));
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

    const patchSelected = (patch: Partial<TraderDefinition>) => {
        if (!selected) return;
        setRows((prev) => prev.map((r) => (r.rowId === selected.rowId ? { ...r, trader: { ...r.trader, ...patch } } : r)));
        setDirtyPaths((prev) => new Set(prev).add(selected.filePath));
    };

    const handleAddTrader = () => {
        if (!tradersDir) return;
        const trader = emptyTraderDefinition();
        const filePath = `${tradersDir}/${trader.DisplayName.replace(/\s+/g, '_')}.json`;
        const row: TraderRow = { rowId: nanoid(), filePath, hadBom: false, trader };
        setRows((prev) => [...prev, row]);
        setDirtyPaths((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleRemoveTrader = async (row: TraderRow) => {
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
            const content = serializeTraderDefinition(row.trader, row.hadBom);
            const res = await window.api.writeFile(path, content);
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? t('expansionTraders.saveError')}`);
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
        return rows.filter((r) => r.trader.DisplayName.toLowerCase().includes(q));
    }, [rows, search]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('expansionTraders.detecting') : t('expansionTraders.loading')}</Typography>
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

    const trader = selected?.trader;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('expansionTraders.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={tradersDir ?? ''}>
                        {tradersDir} • {t('expansionTraders.recordsCount', { count: rows.length })}
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
                            placeholder={t('expansionTraders.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
                        />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredRows.map((r) => (
                            <ListItemButton key={r.rowId} selected={r.rowId === selectedId} onClick={() => setSelectedId(r.rowId)}>
                                <ListItemText primary={r.trader.DisplayName} secondary={dirtyPaths.has(r.filePath) ? t('common.unsaved') : basenamePath(r.filePath)} />
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTrader(r);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))}
                        {filteredRows.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {t('expansionTraders.nothingFound')}
                            </Typography>
                        )}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddTrader}>
                            {t('expansionTraders.addTrader')}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {!trader ? (
                        <Typography color="text.secondary">{t('expansionTraders.selectHint')}</Typography>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionTraders.sections.basic')}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <TextField label="DisplayName" size="small" fullWidth value={trader.DisplayName} onChange={(e) => patchSelected({ DisplayName: e.target.value })} />
                                    <TextField label="TraderIcon" size="small" fullWidth value={trader.TraderIcon} onChange={(e) => patchSelected({ TraderIcon: e.target.value })} />
                                    <TextField label="RequiredFaction" size="small" fullWidth value={trader.RequiredFaction} onChange={(e) => patchSelected({ RequiredFaction: e.target.value })} />
                                    <TextField label="RequiredCompletedQuestID" size="small" type="number" value={trader.RequiredCompletedQuestID} onChange={(e) => patchSelected({ RequiredCompletedQuestID: Number(e.target.value) })} sx={{ width: 220 }} />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionTraders.sections.reputation')}
                                </Typography>
                                <Stack direction="row" spacing={1.5}>
                                    <TextField label="MinRequiredReputation" size="small" type="number" value={trader.MinRequiredReputation} onChange={(e) => patchSelected({ MinRequiredReputation: Number(e.target.value) || 0 })} />
                                    <TextField label="MaxRequiredReputation" size="small" type="number" value={trader.MaxRequiredReputation} onChange={(e) => patchSelected({ MaxRequiredReputation: Number(e.target.value) || 0 })} />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionTraders.sections.currency')}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <StringChipList values={trader.Currencies} onChange={(v) => patchSelected({ Currencies: v })} />
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="DisplayCurrencyValue" size="small" type="number" value={trader.DisplayCurrencyValue} onChange={(e) => patchSelected({ DisplayCurrencyValue: Number(e.target.value) || 0 })} />
                                        <TextField label="DisplayCurrencyName" size="small" value={trader.DisplayCurrencyName} onChange={(e) => patchSelected({ DisplayCurrencyName: e.target.value })} />
                                    </Stack>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionTraders.sections.categories')}
                                </Typography>
                                <TraderCategoryList value={trader.Categories} onChange={(v) => patchSelected({ Categories: v })} options={marketCategoryNames} />
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionTraders.sections.directItems')}
                                </Typography>
                                <KeyValueList value={trader.Items} onChange={(v) => patchSelected({ Items: v })} groups={classNameGroups} />
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
