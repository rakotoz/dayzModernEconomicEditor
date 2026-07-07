import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Autocomplete,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Divider,
    InputAdornment,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { DataGrid, GridColDef, GridRenderCellParams, GridRenderEditCellParams, GridToolbar } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import { parseEconomyCoreTypesFiles } from '../dayzConfig/economyCore';
import { humanizeFileLabel, parseTypesXml, serializeTypesXml, TypeEntry } from '../dayzConfig/typesXml';
import { dirnamePath, joinPath, basenamePath } from '../dayzConfig/pathUtils';
import { DAYZ_CATEGORIES, DAYZ_TAGS, DAYZ_USAGES, DAYZ_VALUES } from '../data/dayzEconomyReference';

// Многозначная ячейка (usage/value/tags): список чипов в режиме просмотра, Autocomplete
// с multiple+freeSolo в режиме редактирования (freeSolo — моды добавляют свои значения,
// которых нет в справочнике DAYZ_*, их нельзя терять).
const MultiSelectCell = ({ params }: { params: GridRenderCellParams<EconomyRow, string[]> }) => {
    const list = params.value ?? [];
    if (list.length === 0) return null;
    return (
        <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden', py: 0.5 }}>
            {list.map((v) => (
                <Chip key={v} label={v} size="small" />
            ))}
        </Stack>
    );
};

const MultiSelectEditCell = ({ params, options }: { params: GridRenderEditCellParams<EconomyRow, string[]>; options: string[] }) => {
    const { id, field, value, api } = params;
    return (
        <Autocomplete
            multiple
            freeSolo
            fullWidth
            size="small"
            options={options}
            value={value ?? []}
            onChange={async (_, newValue) => {
                await api.setEditCellValue({ id, field, value: newValue });
            }}
            renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => <Chip label={option} size="small" {...getTagProps({ index })} key={option} />)
            }
            renderInput={(inputParams) => <TextField {...inputParams} autoFocus variant="standard" sx={{ px: 1 }} />}
            sx={{ width: '100%' }}
        />
    );
};

interface EconomyRow {
    id: string;
    __fileKey: string;
    __sourcePath: string;
    __category: string;
    name: string;
    category: string;
    nominal: number;
    min: number;
    quantmin: number;
    quantmax: number;
    lifetime: number;
    restock: number;
    cost: number;
    count_in_cargo: boolean;
    count_in_hoarder: boolean;
    count_in_map: boolean;
    count_in_player: boolean;
    crafted: boolean;
    deloot: boolean;
    usage: string[];
    value: string[];
    tags: string[];
}


const entriesToRows = (
    entries: TypeEntry[],
    fileKey: string,
    sourcePath: string,
    noCategoryLabel: string
): EconomyRow[] =>
    entries.map((e, index) => ({
        id: `${fileKey}::${e.name || 'unnamed'}::${index}`,
        __fileKey: fileKey,
        __sourcePath: sourcePath,
        __category: e.category || noCategoryLabel,
        name: e.name,
        category: e.category,
        nominal: e.nominal,
        min: e.min,
        quantmin: e.quantmin,
        quantmax: e.quantmax,
        lifetime: e.lifetime,
        restock: e.restock,
        cost: e.cost,
        count_in_cargo: e.flags.count_in_cargo,
        count_in_hoarder: e.flags.count_in_hoarder,
        count_in_map: e.flags.count_in_map,
        count_in_player: e.flags.count_in_player,
        crafted: e.flags.crafted,
        deloot: e.flags.deloot,
        usage: e.usage,
        value: e.value,
        tags: e.tags,
    }));

const rowsToEntries = (rows: EconomyRow[]): TypeEntry[] =>
    rows.map((r) => ({
        name: r.name,
        category: r.category,
        nominal: r.nominal,
        min: r.min,
        quantmin: r.quantmin,
        quantmax: r.quantmax,
        lifetime: r.lifetime,
        restock: r.restock,
        cost: r.cost,
        flags: {
            count_in_cargo: r.count_in_cargo,
            count_in_hoarder: r.count_in_hoarder,
            count_in_map: r.count_in_map,
            count_in_player: r.count_in_player,
            crafted: r.crafted,
            deloot: r.deloot,
        },
        usage: r.usage,
        value: r.value,
        tags: r.tags,
    }));

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

const CategoryGrid = ({
    rows,
    columns,
    onRowUpdate,
}: {
    rows: EconomyRow[];
    columns: GridColDef<EconomyRow>[];
    onRowUpdate: (newRow: EconomyRow, oldRow: EconomyRow) => EconomyRow;
}) => {
    // Заголовок таблицы (compact density) ~39px, строка ~36px — проверено в живом гриде.
    // Футер с пагинацией скрыт: внутри категории строк почти всегда меньше 100, а его 52px
    // при малом числе строк "съедали" всю высоту и прятали строки. При множестве колонок
    // (их тут 16) появляется горизонтальный скроллбар — он оверлеем перекрывает низ последней
    // строки, а не добавляет высоту, поэтому под него нужен отдельный запас.
    const height = Math.min(rows.length * 36 + 40 + 16, 480);
    return (
        <Box sx={{ height, width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                density="compact"
                disableRowSelectionOnClick
                processRowUpdate={onRowUpdate}
                onProcessRowUpdateError={() => {}}
                hideFooter
                sx={{ border: 0, height: '100%' }}
            />
        </Box>
    );
};

export const TypesXmlView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [economyCorePath, setEconomyCorePath] = useState<string | null>(null);
    const [loadWarnings, setLoadWarnings] = useState<string[]>([]);

    const [rows, setRows] = useState<EconomyRow[]>([]);
    const [dirtySourcePaths, setDirtySourcePaths] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const [searchInput, setSearchInput] = useState('');
    const [searchText, setSearchText] = useState('');
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const timer = setTimeout(() => setSearchText(searchInput), 250);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadEconomyCore = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const coreRes = await window.api.readFile(path);
        if (!coreRes.success || coreRes.data === undefined) {
            setErrorMessage(coreRes.error ?? t('economy.readCoreError'));
            setStatus('error');
            return;
        }

        let fileInfos;
        try {
            fileInfos = parseEconomyCoreTypesFiles(coreRes.data);
        } catch (e: any) {
            setErrorMessage(e.message ?? t('economy.parseCoreError'));
            setStatus('error');
            return;
        }

        // db/types.xml — база economy-движка DayZ, сервер грузит её независимо от того,
        // объявлена ли она в cfgeconomycore.xml. Добавляем неявно, если ещё не объявлена явно.
        const hasExplicitDb = fileInfos.some(
            (info) => info.folder.toLowerCase() === 'db' && info.fileName.toLowerCase() === 'types.xml',
        );
        const allFileInfos = hasExplicitDb
            ? fileInfos.map((info) => ({ ...info, optional: false }))
            : [
                  { folder: 'db', fileName: 'types.xml', optional: true },
                  ...fileInfos.map((info) => ({ ...info, optional: false })),
              ];

        const missionRoot = dirnamePath(path);
        const resolved = allFileInfos.map((info) => ({
            fileKey: `${info.folder}/${info.fileName}`,
            sourcePath: joinPath(missionRoot, info.folder, info.fileName),
            optional: info.optional,
        }));

        const results = await Promise.all(
            resolved.map(async ({ fileKey, sourcePath, optional }) => {
                const res = await window.api.readFile(sourcePath);
                if (!res.success || res.data === undefined) {
                    return {
                        fileKey,
                        sourcePath,
                        warning: optional ? undefined : `${fileKey}: ${res.error ?? t('economy.readFileError')}`,
                    };
                }
                try {
                    const entries = parseTypesXml(res.data);
                    return {
                        fileKey,
                        sourcePath,
                        rows: entriesToRows(entries, fileKey, sourcePath, t('economy.noCategory')),
                    };
                } catch (e: any) {
                    return { fileKey, sourcePath, warning: `${fileKey}: ${e.message ?? t('economy.parseFileError')}` };
                }
            }),
        );

        const allRows: EconomyRow[] = [];
        const warnings: string[] = [];
        for (const r of results) {
            if (r.rows) allRows.push(...r.rows);
            if (r.warning) warnings.push(r.warning);
        }

        if (allRows.length === 0) {
            setErrorMessage(t('economy.noTypesFound'));
            setStatus('error');
            return;
        }

        setRows(allRows);
        setDirtySourcePaths(new Set());
        setLoadWarnings(warnings);
        setEconomyCorePath(path);
        setStatus('ready');

        if (persist && project) {
            dispatch(updateProject({ id: project.id, changes: { economyCorePath: path } }));
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfgeconomycore.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('economy.scanError'));
            setStatus('error');
            return;
        }
        if (res.data.length === 1) {
            await loadEconomyCore(res.data[0], true);
            return;
        }
        setCandidates(res.data);
        setStatus('picker');
    };

    useEffect(() => {
        if (!project) return;
        if (project.economyCorePath) {
            loadEconomyCore(project.economyCorePath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfgeconomycore.xml', extensions: ['xml'] }]);
        if (path) await loadEconomyCore(path, true);
    };

    const categoryOptions = useMemo(() => {
        const fromData = rows.map((r) => r.category).filter(Boolean);
        return Array.from(new Set([...DAYZ_CATEGORIES, ...fromData])).sort();
    }, [rows]);

    const columns: GridColDef<EconomyRow>[] = useMemo(
        () => [
            { field: 'name', headerName: t('economy.columns.name'), width: 240, editable: true },
            {
                field: 'category',
                headerName: t('economy.columns.category'),
                width: 140,
                editable: true,
                type: 'singleSelect',
                valueOptions: categoryOptions,
            },
            { field: 'nominal', headerName: t('economy.columns.nominal'), type: 'number', width: 100, editable: true },
            { field: 'min', headerName: t('economy.columns.min'), type: 'number', width: 90, editable: true },
            { field: 'quantmin', headerName: t('economy.columns.quantmin'), type: 'number', width: 100, editable: true },
            { field: 'quantmax', headerName: t('economy.columns.quantmax'), type: 'number', width: 100, editable: true },
            {
                field: 'usage',
                headerName: t('economy.columns.usage'),
                width: 240,
                editable: true,
                sortable: false,
                filterable: false,
                renderCell: (params) => <MultiSelectCell params={params} />,
                renderEditCell: (params) => <MultiSelectEditCell params={params} options={DAYZ_USAGES} />,
            },
            {
                field: 'value',
                headerName: t('economy.columns.value'),
                width: 180,
                editable: true,
                sortable: false,
                filterable: false,
                renderCell: (params) => <MultiSelectCell params={params} />,
                renderEditCell: (params) => <MultiSelectEditCell params={params} options={DAYZ_VALUES} />,
            },
            {
                field: 'tags',
                headerName: t('economy.columns.tags'),
                width: 180,
                editable: true,
                sortable: false,
                filterable: false,
                renderCell: (params) => <MultiSelectCell params={params} />,
                renderEditCell: (params) => <MultiSelectEditCell params={params} options={DAYZ_TAGS} />,
            },
            { field: 'lifetime', headerName: t('economy.columns.lifetime'), type: 'number', width: 120, editable: true },
            { field: 'restock', headerName: t('economy.columns.restock'), type: 'number', width: 110, editable: true },
            { field: 'cost', headerName: t('economy.columns.cost'), type: 'number', width: 90, editable: true },
            { field: 'count_in_cargo', headerName: t('economy.columns.countInCargo'), type: 'boolean', width: 110, editable: true },
            { field: 'count_in_hoarder', headerName: t('economy.columns.countInHoarder'), type: 'boolean', width: 110, editable: true },
            { field: 'count_in_map', headerName: t('economy.columns.countInMap'), type: 'boolean', width: 100, editable: true },
            { field: 'count_in_player', headerName: t('economy.columns.countInPlayer'), type: 'boolean', width: 100, editable: true },
            { field: 'crafted', headerName: t('economy.columns.crafted'), type: 'boolean', width: 90, editable: true },
            { field: 'deloot', headerName: t('economy.columns.deloot'), type: 'boolean', width: 90, editable: true },
        ],
        [categoryOptions, t],
    );

    const searchColumns: GridColDef<EconomyRow>[] = useMemo(
        () => [
            {
                field: '__fileKey',
                headerName: t('economy.columns.file'),
                width: 200,
                valueGetter: (value: string) => humanizeFileLabel(value),
            },
            ...columns,
        ],
        [columns, t],
    );

    const handleRowUpdate = (newRow: EconomyRow, oldRow: EconomyRow) => {
        setRows((prev) => prev.map((r) => (r.id === oldRow.id ? newRow : r)));
        setDirtySourcePaths((prev) => new Set(prev).add(oldRow.__sourcePath));
        return newRow;
    };

    const isDirty = dirtySourcePaths.size > 0;

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const sourcePath of dirtySourcePaths) {
            const fileRows = rows.filter((r) => r.__sourcePath === sourcePath);
            const xml = serializeTypesXml(rowsToEntries(fileRows));
            const res = await window.api.writeFile(sourcePath, xml);
            if (!res.success) failures.push(`${basenamePath(sourcePath)}: ${res.error ?? t('economy.saveError')}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('; '));
            return;
        }
        setDirtySourcePaths(new Set());
        setSavedNotice(true);
    };

    const filteredRows = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.name.toLowerCase().includes(q));
    }, [rows, searchText]);

    const fileGroups = useMemo(() => {
        const map = new Map<string, EconomyRow[]>();
        for (const row of filteredRows) {
            if (!map.has(row.__fileKey)) map.set(row.__fileKey, []);
            map.get(row.__fileKey)!.push(row);
        }
        return Array.from(map.entries())
            .map(([fileKey, groupRows]) => ({ fileKey, rows: groupRows }))
            .sort((a, b) => a.fileKey.localeCompare(b.fileKey));
    }, [filteredRows]);

    const isSearching = searchText.trim() !== '';

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">
                    {status === 'detecting' ? t('economy.detecting') : t('economy.loadingFiles')}
                </Typography>
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
                    {t('economy.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('economy.pickerNotFound') : t('economy.pickerFound', { count: candidates.length })}.{' '}
                    {t('common.chooseOrBrowse')}
                </Typography>

                {candidates.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                        {candidates.map((c, i) => (
                            <React.Fragment key={c}>
                                {i > 0 && <Divider />}
                                <ButtonBase
                                    onClick={() => loadEconomyCore(c, true)}
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
                        {t('economy.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={economyCorePath ?? ''}>
                        {t('economy.recordsInFiles', { count: rows.length, files: new Set(rows.map((r) => r.__fileKey)).size })}
                    </Typography>
                </Box>
                <TextField
                    size="small"
                    placeholder={t('economy.searchPlaceholder')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    sx={{ minWidth: 260 }}
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
                <Button size="small" onClick={detect}>
                    {t('common.changeFile')}
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!isDirty || saving}
                    onClick={handleSave}
                >
                    {t('common.save')} {isDirty && `(${dirtySourcePaths.size})`}
                </Button>
            </Stack>

            {(saveError || loadWarnings.length > 0) && (
                <Box sx={{ px: 2, pt: 2 }}>
                    {saveError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
                            {saveError}
                        </Alert>
                    )}
                    {loadWarnings.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>{t('economy.loadWarningsTitle', { count: loadWarnings.length })}</AlertTitle>
                            {loadWarnings.slice(0, 10).join('; ')}
                            {loadWarnings.length > 10 && ` ${t('economy.andMore', { count: loadWarnings.length - 10 })}`}
                        </Alert>
                    )}
                </Box>
            )}

            {isSearching ? (
                <Box sx={{ flex: 1, minHeight: 0, p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('economy.foundCount', { count: filteredRows.length })}
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <DataGrid
                            rows={filteredRows}
                            columns={searchColumns}
                            density="compact"
                            disableRowSelectionOnClick
                            processRowUpdate={handleRowUpdate}
                            onProcessRowUpdateError={() => {}}
                            showToolbar
                            slots={{ toolbar: GridToolbar }}
                            sx={{ border: 0, height: '100%' }}
                        />
                    </Box>
                </Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {fileGroups.length === 0 && (
                        <Typography color="text.secondary" sx={{ p: 2 }}>
                            {t('economy.nothingFound')}
                        </Typography>
                    )}

                    {fileGroups.map((fileGroup) => {
                        const fileExpanded = !!expandedFiles[fileGroup.fileKey];
                        const categoryMap = new Map<string, EconomyRow[]>();
                        for (const row of fileGroup.rows) {
                            if (!categoryMap.has(row.__category)) categoryMap.set(row.__category, []);
                            categoryMap.get(row.__category)!.push(row);
                        }
                        const categoryGroups = Array.from(categoryMap.entries())
                            .map(([category, categoryRows]) => ({ category, rows: categoryRows }))
                            .sort((a, b) => a.category.localeCompare(b.category));

                        return (
                            <Accordion
                                key={fileGroup.fileKey}
                                expanded={fileExpanded}
                                onChange={(_, expanded) =>
                                    setExpandedFiles((prev) => ({ ...prev, [fileGroup.fileKey]: expanded }))
                                }
                                disableGutters
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 'bold' }} noWrap>
                                            {humanizeFileLabel(fileGroup.fileKey)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {fileGroup.fileKey}
                                        </Typography>
                                        <Typography color="text.secondary">({fileGroup.rows.length})</Typography>
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {fileExpanded &&
                                        categoryGroups.map((catGroup) => {
                                            const catKey = `${fileGroup.fileKey}|${catGroup.category}`;
                                            const catExpanded = !!expandedCategories[catKey];
                                            return (
                                                <Accordion
                                                    key={catKey}
                                                    expanded={catExpanded}
                                                    onChange={(_, expanded) =>
                                                        setExpandedCategories((prev) => ({
                                                            ...prev,
                                                            [catKey]: expanded,
                                                        }))
                                                    }
                                                    disableGutters
                                                    sx={{ ml: 1, boxShadow: 'none', bgcolor: 'action.hover' }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Typography variant="body2">{catGroup.category}</Typography>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{ ml: 1 }}
                                                        >
                                                            ({catGroup.rows.length})
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ p: 0 }}>
                                                        {catExpanded && (
                                                            <CategoryGrid
                                                                rows={catGroup.rows}
                                                                columns={columns}
                                                                onRowUpdate={handleRowUpdate}
                                                            />
                                                        )}
                                                    </AccordionDetails>
                                                </Accordion>
                                            );
                                        })}
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Box>
            )}

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
