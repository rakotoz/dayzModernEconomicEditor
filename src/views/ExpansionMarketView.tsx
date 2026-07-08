import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
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
import {
    emptyMarketCategory,
    emptyMarketItem,
    findExpansionMarketDir,
    MarketItem,
    parseMarketCategory,
    serializeMarketCategory,
} from '../dayzConfig/expansionMarket';
import { EconomyClassNameGroup, loadEconomyClassNamesByFileCached } from '../dayzConfig/typesXml';
import { basenamePath } from '../dayzConfig/pathUtils';
import { ClassNamePickerDialog } from '../components/ClassNamePickerDialog';

// ClassName выбирается из списка предметов экономики (types.xml) — либо быстрым набором
// в поле (freeSolo, на случай classname'ов вне types.xml — валюты, техника и т.п.), либо
// через кнопку-иконку, открывающую модалку с деревом по файлам и поиском (видно, откуда
// берётся предмет — этого не даёт плоский автокомплит).
const ClassNameEditCell = ({ params, groups }: { params: GridRenderEditCellParams; groups: EconomyClassNameGroup[] }) => {
    const { id, field, value, api } = params;
    const { t } = useTranslation();
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
            <IconButton size="small" title={t('classNamePicker.browse')} onClick={() => setPickerOpen(true)}>
                <ListAltIcon fontSize="small" />
            </IconButton>
            <ClassNamePickerDialog
                open={pickerOpen}
                groups={groups}
                onClose={() => setPickerOpen(false)}
                onSelect={(name) => api.setEditCellValue({ id, field, value: name })}
            />
        </Box>
    );
};

interface CategoryRow {
    rowId: string;
    filePath: string;
    hadBom: boolean;
    displayName: string;
    icon: string;
    color: string;
    initStockPercent: number;
    isExchange: number;
    items: (MarketItem & { itemId: string })[];
}

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

const toArrayField = (v: string[]) => v.join(', ');
const fromArrayField = (v: string) =>
    v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

export const ExpansionMarketView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [marketDir, setMarketDir] = useState<string | null>(null);

    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [classNameGroups, setClassNameGroups] = useState<EconomyClassNameGroup[]>([]);
    const [bulkPickerOpen, setBulkPickerOpen] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const dir = await findExpansionMarketDir(project);
        if (!dir) {
            setErrorMessage(t('expansionMarket.dirNotFound'));
            setStatus('error');
            return;
        }
        setMarketDir(dir);
        setStatus('loading');

        loadEconomyClassNamesByFileCached(project).then(setClassNameGroups);

        const filesRes = await window.api.findFilesByExtension(dir, ['json']);
        if (!filesRes.success || !filesRes.data) {
            setErrorMessage(filesRes.error ?? t('expansionMarket.scanError'));
            setStatus('error');
            return;
        }

        const loaded = await Promise.all(
            filesRes.data.map(async (filePath) => {
                const res = await window.api.readFile(filePath);
                if (!res.success || res.data === undefined) return null;
                try {
                    const { hadBom, data } = parseMarketCategory(res.data);
                    return {
                        rowId: nanoid(),
                        filePath,
                        hadBom,
                        displayName: data.DisplayName ?? '',
                        icon: data.Icon ?? '',
                        color: data.Color ?? '',
                        initStockPercent: data.InitStockPercent ?? 0,
                        isExchange: data.IsExchange ?? 0,
                        items: (data.Items ?? []).map((it) => ({ ...it, itemId: nanoid() })),
                    } as CategoryRow;
                } catch {
                    return null;
                }
            })
        );

        const validRows = loaded
            .filter((r): r is CategoryRow => r !== null)
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
        setCategories(validRows);
        setDirtyPaths(new Set());
        setSelectedId(validRows[0]?.rowId ?? null);
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
        if (!marketDir) return;
        const base = emptyMarketCategory();
        const filePath = `${marketDir}/${base.DisplayName.replace(/\s+/g, '_')}.json`;
        const row: CategoryRow = {
            rowId: nanoid(),
            filePath,
            hadBom: false,
            displayName: base.DisplayName,
            icon: base.Icon,
            color: base.Color,
            initStockPercent: base.InitStockPercent,
            isExchange: base.IsExchange,
            items: [],
        };
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
                m_Version: 12,
                DisplayName: row.displayName,
                Icon: row.icon,
                Color: row.color,
                InitStockPercent: row.initStockPercent,
                IsExchange: row.isExchange,
                Items: row.items.map(({ itemId, ...rest }) => rest),
            };
            const content = serializeMarketCategory(data, row.hadBom);
            const res = await window.api.writeFile(path, content);
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? t('expansionMarket.saveError')}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('\n'));
            return;
        }
        setDirtyPaths(new Set());
        setSavedNotice(true);
    };

    const filteredCategories = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.displayName.toLowerCase().includes(q));
    }, [categories, search]);

    const columns: GridColDef<CategoryRow['items'][number]>[] = useMemo(
        () => [
            {
                field: 'ClassName',
                headerName: 'ClassName',
                width: 220,
                editable: true,
                renderEditCell: (params) => <ClassNameEditCell params={params} groups={classNameGroups} />,
            },
            { field: 'MaxPriceThreshold', headerName: 'MaxPrice', type: 'number', width: 100, editable: true },
            { field: 'MinPriceThreshold', headerName: 'MinPrice', type: 'number', width: 100, editable: true },
            { field: 'SellPricePercent', headerName: 'Sell %', type: 'number', width: 90, editable: true },
            { field: 'MaxStockThreshold', headerName: 'MaxStock', type: 'number', width: 90, editable: true },
            { field: 'MinStockThreshold', headerName: 'MinStock', type: 'number', width: 90, editable: true },
            { field: 'QuantityPercent', headerName: 'Quantity %', type: 'number', width: 100, editable: true },
            {
                field: 'SpawnAttachments',
                headerName: 'SpawnAttachments',
                width: 200,
                editable: true,
                valueGetter: (v: string[]) => toArrayField(v ?? []),
                valueSetter: (value, row) => ({ ...row, SpawnAttachments: fromArrayField(String(value)) }),
            },
            {
                field: 'Variants',
                headerName: 'Variants',
                width: 200,
                editable: true,
                valueGetter: (v: string[]) => toArrayField(v ?? []),
                valueSetter: (value, row) => ({ ...row, Variants: fromArrayField(String(value)) }),
            },
            {
                field: 'actions',
                type: 'actions',
                width: 60,
                getActions: (params) => [
                    <GridActionsCellItem
                        key="delete"
                        icon={<DeleteIcon fontSize="small" />}
                        label={t('common.delete')}
                        onClick={() => selected && patchSelected({ items: selected.items.filter((it) => it.itemId !== params.id) })}
                    />,
                ],
            },
        ],
        [selected, t, classNameGroups]
    );

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('expansionMarket.detecting') : t('expansionMarket.loading')}</Typography>
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
            <Stack
                direction="row"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('expansionMarket.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={marketDir ?? ''}>
                        {marketDir} • {t('expansionMarket.recordsCount', { count: categories.length })}
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
                            placeholder={t('expansionMarket.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
                        />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredCategories.map((c) => (
                            <ListItemButton key={c.rowId} selected={c.rowId === selectedId} onClick={() => setSelectedId(c.rowId)}>
                                <ListItemText primary={c.displayName} secondary={`${c.items.length} • ${dirtyPaths.has(c.filePath) ? t('common.unsaved') : basenamePath(c.filePath)}`} />
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveCategory(c);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        ))}
                        {filteredCategories.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {t('expansionMarket.nothingFound')}
                            </Typography>
                        )}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddCategory}>
                            {t('expansionMarket.addCategory')}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, p: 2, gap: 2 }}>
                    {!selected ? (
                        <Typography color="text.secondary">{t('expansionMarket.selectHint')}</Typography>
                    ) : (
                        <>
                            <Paper variant="outlined" sx={{ p: 2, flexShrink: 0 }}>
                                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                                    <TextField label="DisplayName" size="small" value={selected.displayName} onChange={(e) => patchSelected({ displayName: e.target.value })} sx={{ minWidth: 200 }} />
                                    <TextField label="Icon" size="small" value={selected.icon} onChange={(e) => patchSelected({ icon: e.target.value })} sx={{ width: 140 }} />
                                    <TextField label="Color" size="small" value={selected.color} onChange={(e) => patchSelected({ color: e.target.value })} sx={{ width: 120 }} />
                                    <TextField label="InitStockPercent" size="small" type="number" value={selected.initStockPercent} onChange={(e) => patchSelected({ initStockPercent: Number(e.target.value) || 0 })} sx={{ width: 140 }} />
                                    <TextField
                                        select
                                        label="IsExchange"
                                        size="small"
                                        value={selected.isExchange}
                                        onChange={(e) => patchSelected({ isExchange: Number(e.target.value) })}
                                        sx={{ width: 120 }}
                                        slotProps={{ select: { native: true } }}
                                    >
                                        <option value={0}>0</option>
                                        <option value={1}>1</option>
                                    </TextField>
                                </Stack>
                            </Paper>

                            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {t('expansionMarket.items')} ({selected.items.length})
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" startIcon={<ListAltIcon />} onClick={() => setBulkPickerOpen(true)}>
                                            {t('expansionMarket.addFromList')}
                                        </Button>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => patchSelected({ items: [...selected.items, { ...emptyMarketItem(), itemId: nanoid() }] })}
                                        >
                                            {t('expansionMarket.addItem')}
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
                open={bulkPickerOpen}
                groups={classNameGroups}
                multiple
                onClose={() => setBulkPickerOpen(false)}
                onSelectMultiple={(names) => {
                    if (!selected) return;
                    patchSelected({ items: [...selected.items, ...names.map((name) => ({ ...emptyMarketItem(), ClassName: name, itemId: nanoid() }))] });
                }}
            />

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
