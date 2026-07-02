import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    ButtonBase,
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
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import { parseEconomyCoreTypesFiles } from '../dayzConfig/economyCore';
import { parseTypesXml, serializeTypesXml, TypeEntry } from '../dayzConfig/typesXml';
import { dirnamePath, joinPath, basenamePath } from '../dayzConfig/pathUtils';
import { DAYZ_CATEGORIES } from '../data/dayzEconomyReference';

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
    usageText: string;
    valueText: string;
    tagsText: string;
}

const NO_CATEGORY = '(без категории)';

const humanizeFileLabel = (fileKey: string) => {
    const filename = fileKey.split('/').pop() ?? fileKey;
    const withoutExt = filename.replace(/\.xml$/i, '');
    const words = withoutExt.split(/[_\-\s]+/).filter(Boolean);
    if (words.length === 0) return filename;
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const splitList = (text: string) =>
    text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const entriesToRows = (entries: TypeEntry[], fileKey: string, sourcePath: string): EconomyRow[] =>
    entries.map((e, index) => ({
        id: `${fileKey}::${e.name || 'unnamed'}::${index}`,
        __fileKey: fileKey,
        __sourcePath: sourcePath,
        __category: e.category || NO_CATEGORY,
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
        usageText: e.usage.join(', '),
        valueText: e.value.join(', '),
        tagsText: e.tags.join(', '),
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
        usage: splitList(r.usageText),
        value: splitList(r.valueText),
        tags: splitList(r.tagsText),
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
    const height = Math.min(rows.length * 36 + 64, 480);
    return (
        <Box sx={{ height, width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                density="compact"
                disableRowSelectionOnClick
                processRowUpdate={onRowUpdate}
                onProcessRowUpdateError={() => {}}
                hideFooterSelectedRowCount
                sx={{ border: 0, height: '100%' }}
            />
        </Box>
    );
};

export const TypesXmlView = () => {
    const dispatch = useAppDispatch();
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
            setErrorMessage(coreRes.error ?? 'Не удалось прочитать cfgeconomycore.xml');
            setStatus('error');
            return;
        }

        let fileInfos;
        try {
            fileInfos = parseEconomyCoreTypesFiles(coreRes.data);
        } catch (e: any) {
            setErrorMessage(e.message ?? 'Не удалось разобрать cfgeconomycore.xml');
            setStatus('error');
            return;
        }

        // db/types.xml — база economy-движка DayZ, сервер грузит её независимо от того,
        // объявлена ли она в cfgeconomycore.xml. Добавляем неявно, если ещё не объявлена явно.
        const hasExplicitDb = fileInfos.some(
            (info) => info.folder.toLowerCase() === 'db' && info.fileName.toLowerCase() === 'types.xml'
        );
        const allFileInfos = hasExplicitDb
            ? fileInfos.map((info) => ({ ...info, optional: false }))
            : [{ folder: 'db', fileName: 'types.xml', optional: true }, ...fileInfos.map((info) => ({ ...info, optional: false }))];

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
                        warning: optional ? undefined : `${fileKey}: ${res.error ?? 'не удалось прочитать'}`,
                    };
                }
                try {
                    const entries = parseTypesXml(res.data);
                    return { fileKey, sourcePath, rows: entriesToRows(entries, fileKey, sourcePath) };
                } catch (e: any) {
                    return { fileKey, sourcePath, warning: `${fileKey}: ${e.message ?? 'ошибка разбора'}` };
                }
            })
        );

        const allRows: EconomyRow[] = [];
        const warnings: string[] = [];
        for (const r of results) {
            if (r.rows) allRows.push(...r.rows);
            if (r.warning) warnings.push(r.warning);
        }

        if (allRows.length === 0) {
            setErrorMessage('Не найдено ни одного типа предметов — ни в db/types.xml, ни в cfgeconomycore.xml');
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
            setErrorMessage(res.error ?? 'Не удалось просканировать папку проекта');
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
            { field: 'name', headerName: 'Название', width: 240, editable: true },
            {
                field: 'category',
                headerName: 'Категория',
                width: 140,
                editable: true,
                type: 'singleSelect',
                valueOptions: categoryOptions,
            },
            { field: 'nominal', headerName: 'Nominal', type: 'number', width: 100, editable: true },
            { field: 'min', headerName: 'Min', type: 'number', width: 90, editable: true },
            { field: 'quantmin', headerName: 'QuantMin', type: 'number', width: 100, editable: true },
            { field: 'quantmax', headerName: 'QuantMax', type: 'number', width: 100, editable: true },
            { field: 'usageText', headerName: 'Usage', width: 220, editable: true },
            { field: 'valueText', headerName: 'Value (tiers)', width: 160, editable: true },
            { field: 'tagsText', headerName: 'Tags', width: 160, editable: true },
            { field: 'lifetime', headerName: 'Lifetime, сек', type: 'number', width: 120, editable: true },
            { field: 'restock', headerName: 'Restock, сек', type: 'number', width: 110, editable: true },
            { field: 'cost', headerName: 'Cost', type: 'number', width: 90, editable: true },
            { field: 'count_in_cargo', headerName: 'В машинах', type: 'boolean', width: 110, editable: true },
            { field: 'count_in_hoarder', headerName: 'В тайниках', type: 'boolean', width: 110, editable: true },
            { field: 'count_in_map', headerName: 'На карте', type: 'boolean', width: 100, editable: true },
            { field: 'count_in_player', headerName: 'У игроков', type: 'boolean', width: 100, editable: true },
            { field: 'crafted', headerName: 'Крафт', type: 'boolean', width: 90, editable: true },
            { field: 'deloot', headerName: 'Deloot', type: 'boolean', width: 90, editable: true },
        ],
        [categoryOptions]
    );

    const searchColumns: GridColDef<EconomyRow>[] = useMemo(
        () => [
            {
                field: '__fileKey',
                headerName: 'Файл',
                width: 200,
                valueGetter: (value: string) => humanizeFileLabel(value),
            },
            ...columns,
        ],
        [columns]
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
            if (!res.success) failures.push(`${basenamePath(sourcePath)}: ${res.error ?? 'ошибка записи'}`);
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
                    {status === 'detecting' ? 'Ищем cfgeconomycore.xml в папке проекта…' : 'Загружаем файлы экономики…'}
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
                    Повторить поиск
                </Button>
            </Box>
        );
    }

    if (status === 'picker') {
        return (
            <Box sx={{ p: 3, maxWidth: 560 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Не удалось однозначно найти cfgeconomycore.xml
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    В папке проекта {candidates.length === 0 ? 'не найдено файлов' : `найдено ${candidates.length} файлов`}.
                    Выберите нужный или укажите файл вручную.
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
                    Выбрать файл вручную
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
                        Экономика
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={economyCorePath ?? ''}>
                        {rows.length} записей в {new Set(rows.map((r) => r.__fileKey)).size} файлах
                    </Typography>
                </Box>
                <TextField
                    size="small"
                    placeholder="Поиск по названию…"
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
                    Сменить файл
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={!isDirty || saving} onClick={handleSave}>
                    Сохранить {isDirty && `(${dirtySourcePaths.size})`}
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
                            <AlertTitle>Не удалось загрузить {loadWarnings.length} файлов</AlertTitle>
                            {loadWarnings.slice(0, 10).join('; ')}
                            {loadWarnings.length > 10 && ` и ещё ${loadWarnings.length - 10}…`}
                        </Alert>
                    )}
                </Box>
            )}

            {isSearching ? (
                <Box sx={{ flex: 1, minHeight: 0, p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Найдено {filteredRows.length} записей
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
                            Ничего не найдено
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
                                                        setExpandedCategories((prev) => ({ ...prev, [catKey]: expanded }))
                                                    }
                                                    disableGutters
                                                    sx={{ ml: 1, boxShadow: 'none', bgcolor: 'action.hover' }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Typography variant="body2">{catGroup.category}</Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                                            ({catGroup.rows.length})
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ p: 0 }}>
                                                        {catExpanded && (
                                                            <CategoryGrid rows={catGroup.rows} columns={columns} onRowUpdate={handleRowUpdate} />
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
                message="Сохранено"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            />
        </Box>
    );
};
