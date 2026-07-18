import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, List, ListItemButton, ListItemText, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef, GridRenderEditCellParams } from '@mui/x-data-grid';
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
import { emptyTraderCategory, emptyTraderItem, findRevTraderCategoriesDir, parseTraderCategory, RevTraderItem, serializeTraderCategory } from '../dayzConfig/revTrader';
import { EconomyClassNameGroup, loadEconomyClassNamesByFileCached } from '../dayzConfig/typesXml';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { basenamePath } from '../dayzConfig/pathUtils';
import { ClassNamePickerDialog } from '../components/ClassNamePickerDialog';

// Ячейка ClassName: быстрый набор (freeSolo автокомплит по economy) + кнопка-модалка с деревом по файлам.
const ClassNameEditCell = ({ params, groups }: { params: GridRenderEditCellParams; groups: EconomyClassNameGroup[] }) => {
    const { id, field, value, api } = params;
    const [pickerOpen, setPickerOpen] = useState(false);
    const flatOptions = useMemo(() => groups.flatMap((g) => g.names), [groups]);
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Autocomplete
                freeSolo
                fullWidth
                size="small"
                options={flatOptions}
                value={(value as string) ?? ''}
                onChange={async (_, newValue) => {
                    await api.setEditCellValue({ id, field, value: newValue ?? '' });
                }}
                onInputChange={async (_, newValue, reason) => {
                    if (reason === 'input') await api.setEditCellValue({ id, field, value: newValue });
                }}
                renderInput={(inputParams) => <TextField {...inputParams} autoFocus variant="standard" sx={{ px: 1 }} />}
                sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={() => setPickerOpen(true)}>
                <ListAltIcon fontSize="small" />
            </IconButton>
            <ClassNamePickerDialog open={pickerOpen} groups={groups} onClose={() => setPickerOpen(false)} onSelect={(name) => api.setEditCellValue({ id, field, value: name })} />
        </Box>
    );
};

type ItemRow = RevTraderItem & { itemId: string };
interface CategoryRow {
    rowId: string;
    filePath: string;
    hadBom: boolean;
    raw: Record<string, JsonValue>;
    displayName: string;
    icon: string;
    canBuy: number;
    canSell: number;
    restockMinutes: number;
    items: ItemRow[];
}
type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

export const RevTraderCategoriesView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [dir, setDir] = useState<string | null>(null);
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState<EconomyClassNameGroup[]>([]);
    const [bulkOpen, setBulkOpen] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const d = await findRevTraderCategoriesDir(project);
        if (!d) {
            setErrorMessage('Не найдена папка Rev_Trader/Categories в проекте');
            setStatus('error');
            return;
        }
        setDir(d);
        setStatus('loading');
        loadEconomyClassNamesByFileCached(project).then(setGroups);

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
                    const items = Array.isArray(data.Items) ? (data.Items as RevTraderItem[]) : [];
                    return {
                        rowId: nanoid(),
                        filePath,
                        hadBom,
                        raw: data,
                        displayName: typeof data.DisplayName === 'string' ? data.DisplayName : basenamePath(filePath).replace(/\.json$/i, ''),
                        icon: typeof data.Icon === 'string' ? data.Icon : '',
                        canBuy: typeof data.CanBuy === 'number' ? data.CanBuy : 1,
                        canSell: typeof data.CanSell === 'number' ? data.CanSell : 1,
                        restockMinutes: typeof data.RestockMinutes === 'number' ? data.RestockMinutes : 0,
                        items: items.map((it) => ({ ...it, itemId: nanoid() })),
                    } as CategoryRow;
                } catch {
                    return null;
                }
            })
        );
        const valid = loaded.filter((r): r is CategoryRow => r !== null).sort((a, b) => a.displayName.localeCompare(b.displayName));
        setCategories(valid);
        setDirtyPaths(new Set());
        setSelectedId(valid[0]?.rowId ?? null);
        setStatus('ready');
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const selected = categories.find((c) => c.rowId === selectedId) ?? null;

    const patchSelected = (patch: Partial<CategoryRow>) => {
        if (!selected) return;
        setCategories((prev) => prev.map((c) => (c.rowId === selected.rowId ? { ...c, ...patch } : c)));
        setDirtyPaths((prev) => new Set(prev).add(selected.filePath));
    };

    const handleAddCategory = () => {
        if (!dir) return;
        const base = emptyTraderCategory();
        const filePath = `${dir}/${base.DisplayName.replace(/\s+/g, '_')}.json`;
        const row: CategoryRow = { rowId: nanoid(), filePath, hadBom: false, raw: {}, displayName: base.DisplayName, icon: '', canBuy: 1, canSell: 1, restockMinutes: 0, items: [] };
        setCategories((prev) => [...prev, row]);
        setDirtyPaths((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleRemoveCategory = async (row: CategoryRow) => {
        await window.api.deleteFile(row.filePath);
        setCategories((prev) => prev.filter((c) => c.rowId !== row.rowId));
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
            const row = categories.find((c) => c.filePath === path);
            if (!row) continue;
            const data = {
                ...row.raw,
                DisplayName: row.displayName,
                Icon: row.icon,
                CanBuy: row.canBuy,
                CanSell: row.canSell,
                RestockMinutes: row.restockMinutes,
                Items: row.items.map(({ itemId, ...rest }) => rest),
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
        if (!q) return categories;
        return categories.filter((c) => c.displayName.toLowerCase().includes(q));
    }, [categories, search]);

    const columns: GridColDef<ItemRow>[] = useMemo(
        () => [
            { field: 'ClassName', headerName: 'ClassName', width: 240, editable: true, renderEditCell: (params) => <ClassNameEditCell params={params} groups={groups} /> },
            { field: 'BuyPrice', headerName: 'Покупка (-1 = нельзя)', type: 'number', width: 170, editable: true },
            { field: 'SellPrice', headerName: 'Продажа (-1 = нельзя)', type: 'number', width: 170, editable: true },
            { field: 'Stock', headerName: 'Сток (-1 = ∞)', type: 'number', width: 130, editable: true },
            { field: 'ReqRating', headerName: 'Реп.', type: 'number', width: 90, editable: true },
            {
                field: 'actions',
                type: 'actions',
                width: 60,
                getActions: (params) => [
                    <GridActionsCellItem key="delete" icon={<DeleteIcon fontSize="small" />} label={t('common.delete')} onClick={() => selected && patchSelected({ items: selected.items.filter((it) => it.itemId !== params.id) })} />,
                ],
            },
        ],
        [selected, t, groups]
    );

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">Загрузка категорий…</Typography>
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
                        Категории трейдера
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={dir ?? ''}>
                        {dir} • {categories.length} категорий
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
                        <TextField size="small" fullWidth placeholder="Поиск категории…" value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }} />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filtered.map((c) => (
                            <ListItemButton key={c.rowId} selected={c.rowId === selectedId} onClick={() => setSelectedId(c.rowId)}>
                                <ListItemText primary={c.displayName} secondary={`${c.items.length} тов. • ${dirtyPaths.has(c.filePath) ? t('common.unsaved') : basenamePath(c.filePath)}`} />
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemoveCategory(c); }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddCategory}>
                            Добавить категорию
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, p: 2, gap: 2 }}>
                    {!selected ? (
                        <Typography color="text.secondary">Выберите категорию слева</Typography>
                    ) : (
                        <>
                            <Paper variant="outlined" sx={{ p: 2, flexShrink: 0 }}>
                                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                                    <TextField label="DisplayName" size="small" value={selected.displayName} onChange={(e) => patchSelected({ displayName: e.target.value })} sx={{ minWidth: 220 }} />
                                    <TextField label="Icon" size="small" value={selected.icon} onChange={(e) => patchSelected({ icon: e.target.value })} sx={{ width: 160 }} />
                                    <TextField select label="CanBuy" size="small" value={selected.canBuy} onChange={(e) => patchSelected({ canBuy: Number(e.target.value) })} sx={{ width: 110 }}>
                                        <MenuItem value={1}>Да</MenuItem>
                                        <MenuItem value={0}>Нет</MenuItem>
                                    </TextField>
                                    <TextField select label="CanSell" size="small" value={selected.canSell} onChange={(e) => patchSelected({ canSell: Number(e.target.value) })} sx={{ width: 110 }}>
                                        <MenuItem value={1}>Да</MenuItem>
                                        <MenuItem value={0}>Нет</MenuItem>
                                    </TextField>
                                    <TextField label="Restock, мин" size="small" type="number" value={selected.restockMinutes} onChange={(e) => patchSelected({ restockMinutes: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                </Stack>
                            </Paper>

                            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        Товары ({selected.items.length})
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" startIcon={<ListAltIcon />} onClick={() => setBulkOpen(true)}>
                                            Добавить из списка
                                        </Button>
                                        <Button size="small" startIcon={<AddIcon />} onClick={() => patchSelected({ items: [...selected.items, { ...emptyTraderItem(), itemId: nanoid() }] })}>
                                            Добавить товар
                                        </Button>
                                    </Stack>
                                </Stack>
                                <Box sx={{ flex: 1, minHeight: 0 }}>
                                    <DataGrid
                                        rows={selected.items}
                                        columns={columns}
                                        getRowId={(row) => row.itemId}
                                        density="compact"
                                        disableRowSelectionOnClick
                                        processRowUpdate={(newRow) => {
                                            patchSelected({ items: selected.items.map((it) => (it.itemId === newRow.itemId ? newRow : it)) });
                                            return newRow;
                                        }}
                                        onProcessRowUpdateError={() => {}}
                                        sx={{ border: 0, height: '100%' }}
                                    />
                                </Box>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            <ClassNamePickerDialog
                open={bulkOpen}
                groups={groups}
                multiple
                onClose={() => setBulkOpen(false)}
                onSelectMultiple={(names) => {
                    if (!selected) return;
                    patchSelected({ items: [...selected.items, ...names.map((name) => ({ ...emptyTraderItem(), ClassName: name, itemId: nanoid() }))] });
                }}
            />

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
