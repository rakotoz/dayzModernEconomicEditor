import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import {
    DEFAULT_ZONE,
    EventSpawnEntry,
    EventSpawnPos,
    EventSpawnZone,
    parseEventSpawnsXml,
    serializeEventSpawnsXml,
} from '../dayzConfig/eventSpawnsXml';
import { basenamePath } from '../dayzConfig/pathUtils';
import { getMapKeyForLabel } from '../data/dayzMaps';
import { mapImageUrl } from '../utils/assetUrl';

interface PointRow extends EventSpawnPos {
    pointId: string;
}

interface EventRow {
    id: string;
    name: string;
    zone: EventSpawnZone | null;
    positions: PointRow[];
}

const toRows = (entries: EventSpawnEntry[]): EventRow[] =>
    entries.map((e) => ({
        id: nanoid(),
        name: e.name,
        zone: e.zone,
        positions: e.positions.map((p) => ({ ...p, pointId: nanoid() })),
    }));

const toEntries = (rows: EventRow[]): EventSpawnEntry[] =>
    rows.map(({ id, positions, ...rest }) => ({
        ...rest,
        positions: positions.map(({ pointId, ...p }) => p),
    }));

const emptyEvent = (): EventRow => ({ id: nanoid(), name: 'NewEvent', zone: null, positions: [] });

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

// Внутренняя система координат SVG не завязана на пиксели экрана — реальный размер задаётся
// через viewBox, что и позволяет зумить/двигать карту без пересчёта координат точек.
const WORLD_UNITS = 1000;
const MIN_VIEW = WORLD_UNITS / 20;
const DRAG_THRESHOLD_PX = 4;

interface ViewBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

const FULL_VIEW: ViewBox = { x: 0, y: 0, w: WORLD_UNITS, h: WORLD_UNITS };

const clampViewBox = (vb: ViewBox): ViewBox => {
    const w = Math.min(Math.max(vb.w, MIN_VIEW), WORLD_UNITS);
    const h = Math.min(Math.max(vb.h, MIN_VIEW), WORLD_UNITS);
    const x = Math.min(Math.max(vb.x, 0), WORLD_UNITS - w);
    const y = Math.min(Math.max(vb.y, 0), WORLD_UNITS - h);
    return { x, y, w, h };
};

export const EventSpawnsView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);
    const mapSize = project?.mapSize && project.mapSize > 0 ? project.mapSize : 15360;
    const mapKey = project ? getMapKeyForLabel(project.map) : null;

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [events, setEvents] = useState<EventRow[]>([]);
    const [dirty, setDirty] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const [mapImagePath, setMapImagePath] = useState<string | null>(null);
    const [viewBox, setViewBox] = useState<ViewBox>(FULL_VIEW);

    const svgRef = useRef<SVGSVGElement | null>(null);
    const draggingPointId = useRef<string | null>(null);
    const panState = useRef<{ mode: 'idle' | 'maybe' | 'pan'; startClientX: number; startClientY: number; startViewBox: ViewBox }>({
        mode: 'idle',
        startClientX: 0,
        startClientY: 0,
        startViewBox: FULL_VIEW,
    });

    useEffect(() => {
        if (!mapKey) {
            setMapImagePath(null);
            return;
        }
        window.api.getMapImagePath(mapKey).then((res) => {
            setMapImagePath(res.success ? res.data ?? null : null);
        });
    }, [mapKey]);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('eventSpawns.readFileError'));
            setStatus('error');
            return;
        }
        try {
            const rows = toRows(parseEventSpawnsXml(res.data));
            setEvents(rows);
            setSelectedId(rows[0]?.id ?? null);
            setSelectedPointId(null);
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { eventSpawnsXmlPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('eventSpawns.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfgeventspawns.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('eventSpawns.scanError'));
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
        if (project.eventSpawnsXmlPath) {
            loadFile(project.eventSpawnsXmlPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfgeventspawns.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

    const updateSelected = (patch: Partial<EventRow>) => {
        setEvents((prev) => prev.map((e) => (e.id === selectedId ? { ...e, ...patch } : e)));
        setDirty(true);
    };

    const updatePoint = (pointId: string, patch: Partial<EventSpawnPos>) => {
        if (!selectedEvent) return;
        updateSelected({
            positions: selectedEvent.positions.map((p) => (p.pointId === pointId ? { ...p, ...patch } : p)),
        });
    };

    const addPointAt = (x: number, z: number) => {
        if (!selectedEvent) return;
        const point: PointRow = { pointId: nanoid(), x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, a: 0 };
        updateSelected({ positions: [...selectedEvent.positions, point] });
        setSelectedPointId(point.pointId);
    };

    const removePoint = (pointId: string) => {
        if (!selectedEvent) return;
        updateSelected({ positions: selectedEvent.positions.filter((p) => p.pointId !== pointId) });
        if (selectedPointId === pointId) setSelectedPointId(null);
    };

    const toggleUseZone = (checked: boolean) => {
        updateSelected({ zone: checked ? (selectedEvent?.zone ?? DEFAULT_ZONE) : null });
    };

    const updateZone = (patch: Partial<EventSpawnZone>) => {
        if (!selectedEvent) return;
        updateSelected({ zone: { ...(selectedEvent.zone ?? DEFAULT_ZONE), ...patch } });
    };

    const handleAddEvent = () => {
        const row = emptyEvent();
        setEvents((prev) => [...prev, row]);
        setSelectedId(row.id);
        setSelectedPointId(null);
        setDirty(true);
    };

    const handleRemoveEvent = () => {
        if (!selectedEvent) return;
        setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
        setSelectedId(null);
        setSelectedPointId(null);
        setDirty(true);
    };

    const handleSave = async () => {
        if (!filePath) return;
        setSaving(true);
        setSaveError(null);
        const xml = serializeEventSpawnsXml(toEntries(events));
        const res = await window.api.writeFile(filePath, xml);
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('eventSpawns.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    const filteredEvents = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return events;
        return events.filter((e) => e.name.toLowerCase().includes(q));
    }, [events, search]);

    // Перевод координат мира (0..mapSize, Z растёт "на север") в координаты SVG (0..WORLD_UNITS, Y растёт вниз).
    const worldToSvg = (x: number, z: number) => ({
        sx: (x / mapSize) * WORLD_UNITS,
        sy: WORLD_UNITS - (z / mapSize) * WORLD_UNITS,
    });
    const svgToWorld = (sx: number, sy: number) => ({
        x: (sx / WORLD_UNITS) * mapSize,
        z: ((WORLD_UNITS - sy) / WORLD_UNITS) * mapSize,
    });

    // Клиентские координаты клика -> внутренние координаты SVG с учётом текущего viewBox (зум/пан).
    const getSvgPoint = (clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return { sx: 0, sy: 0 };
        const rect = svg.getBoundingClientRect();
        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        return {
            sx: viewBox.x + relX * viewBox.w,
            sy: viewBox.y + relY * viewBox.h,
        };
    };

    const zoomBy = (scaleFactor: number, centerClientX?: number, centerClientY?: number) => {
        const svg = svgRef.current;
        const rect = svg?.getBoundingClientRect();
        const { sx, sy } =
            centerClientX !== undefined && centerClientY !== undefined && rect
                ? getSvgPoint(centerClientX, centerClientY)
                : { sx: viewBox.x + viewBox.w / 2, sy: viewBox.y + viewBox.h / 2 };
        setViewBox((prev) => {
            const newW = Math.min(Math.max(prev.w * scaleFactor, MIN_VIEW), WORLD_UNITS);
            const newH = Math.min(Math.max(prev.h * scaleFactor, MIN_VIEW), WORLD_UNITS);
            const newX = sx - (sx - prev.x) * (newW / prev.w);
            const newY = sy - (sy - prev.y) * (newH / prev.h);
            return clampViewBox({ x: newX, y: newY, w: newW, h: newH });
        });
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
        zoomBy(scaleFactor, e.clientX, e.clientY);
    };

    const handleMapPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingPointId.current) return;
        panState.current = { mode: 'maybe', startClientX: e.clientX, startClientY: e.clientY, startViewBox: viewBox };
    };

    const handlePointPointerDown = (pointId: string) => (e: React.PointerEvent) => {
        e.stopPropagation();
        draggingPointId.current = pointId;
        setSelectedPointId(pointId);
    };

    const handleMapPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingPointId.current) {
            const { sx, sy } = getSvgPoint(e.clientX, e.clientY);
            const { x, z } = svgToWorld(sx, sy);
            updatePoint(draggingPointId.current, { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 });
            return;
        }

        const ps = panState.current;
        if (ps.mode === 'idle') return;

        const dxPx = e.clientX - ps.startClientX;
        const dyPx = e.clientY - ps.startClientY;

        if (ps.mode === 'maybe') {
            if (Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
            panState.current.mode = 'pan';
        }

        const svg = svgRef.current;
        const rect = svg?.getBoundingClientRect();
        if (!rect) return;
        const scaleX = ps.startViewBox.w / rect.width;
        const scaleY = ps.startViewBox.h / rect.height;
        setViewBox(
            clampViewBox({
                x: ps.startViewBox.x - dxPx * scaleX,
                y: ps.startViewBox.y - dyPx * scaleY,
                w: ps.startViewBox.w,
                h: ps.startViewBox.h,
            })
        );
    };

    const handleMapPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (draggingPointId.current) {
            draggingPointId.current = null;
            return;
        }
        if (panState.current.mode === 'maybe' && selectedEvent) {
            // Мышь не сдвинулась дальше порога — считаем это кликом, а не панорамированием.
            const { sx, sy } = getSvgPoint(e.clientX, e.clientY);
            const { x, z } = svgToWorld(sx, sy);
            addPointAt(x, z);
        }
        panState.current.mode = 'idle';
    };

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('eventSpawns.detecting') : t('eventSpawns.loading')}</Typography>
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
                    {t('eventSpawns.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('eventSpawns.pickerNotFound') : t('eventSpawns.pickerFound', { count: candidates.length })}.{' '}
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

    const gridLines = [0, 0.25, 0.5, 0.75, 1];

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
                        {t('eventSpawns.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath} • {t('eventSpawns.recordsCount', { count: events.length })}
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
                        width: 260,
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
                            placeholder={t('eventSpawns.searchPlaceholder')}
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
                    <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredEvents.map((e) => (
                            <ListItemButton
                                key={e.id}
                                selected={e.id === selectedId}
                                onClick={() => {
                                    setSelectedId(e.id);
                                    setSelectedPointId(null);
                                }}
                            >
                                <ListItemText primary={e.name || t('eventSpawns.noName')} secondary={`${e.positions.length}`} />
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Stack direction="row" spacing={1} sx={{ p: 1 }}>
                        <Button size="small" startIcon={<AddIcon />} onClick={handleAddEvent}>
                            {t('common.add')}
                        </Button>
                        <Button size="small" color="error" startIcon={<DeleteIcon />} disabled={!selectedEvent} onClick={handleRemoveEvent}>
                            {t('common.delete')}
                        </Button>
                    </Stack>
                </Box>

                {!selectedEvent ? (
                    <Box sx={{ flex: 1, p: 2 }}>
                        <Typography color="text.secondary">{t('eventSpawns.selectEventHint')}</Typography>
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, p: 1.5 }}>
                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {t('eventSpawns.mapHint')}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="+">
                                        <IconButton size="small" onClick={() => zoomBy(1 / 1.4)}>
                                            <ZoomInIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="-">
                                        <IconButton size="small" onClick={() => zoomBy(1.4)}>
                                            <ZoomOutIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('eventSpawns.resetView')}>
                                        <IconButton size="small" onClick={() => setViewBox(FULL_VIEW)}>
                                            <CenterFocusStrongIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    aspectRatio: '1 / 1',
                                    maxHeight: '100%',
                                    mx: 'auto',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                }}
                            >
                                <svg
                                    ref={svgRef}
                                    width="100%"
                                    height="100%"
                                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                                    style={{ background: '#20261f', cursor: 'crosshair', touchAction: 'none', display: 'block' }}
                                    onWheel={handleWheel}
                                    onPointerDown={handleMapPointerDown}
                                    onPointerMove={handleMapPointerMove}
                                    onPointerUp={handleMapPointerUp}
                                    onPointerLeave={handleMapPointerUp}
                                >
                                    {mapImagePath ? (
                                        <image
                                            href={mapImageUrl(mapImagePath)}
                                            x={0}
                                            y={0}
                                            width={WORLD_UNITS}
                                            height={WORLD_UNITS}
                                            preserveAspectRatio="none"
                                        />
                                    ) : (
                                        gridLines.map((g) => (
                                            <React.Fragment key={g}>
                                                <line
                                                    x1={g * WORLD_UNITS}
                                                    y1={0}
                                                    x2={g * WORLD_UNITS}
                                                    y2={WORLD_UNITS}
                                                    stroke="currentColor"
                                                    strokeOpacity={0.15}
                                                />
                                                <line
                                                    x1={0}
                                                    y1={g * WORLD_UNITS}
                                                    x2={WORLD_UNITS}
                                                    y2={g * WORLD_UNITS}
                                                    stroke="currentColor"
                                                    strokeOpacity={0.15}
                                                />
                                            </React.Fragment>
                                        ))
                                    )}
                                    <rect
                                        x={0.5}
                                        y={0.5}
                                        width={WORLD_UNITS - 1}
                                        height={WORLD_UNITS - 1}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeOpacity={0.4}
                                    />
                                    {selectedEvent.positions.map((p) => {
                                        const { sx, sy } = worldToSvg(p.x, p.z);
                                        const isSelected = p.pointId === selectedPointId;
                                        const r = Math.max((isSelected ? 6 : 4) * (viewBox.w / WORLD_UNITS), 1.5);
                                        return (
                                            <circle
                                                key={p.pointId}
                                                cx={sx}
                                                cy={sy}
                                                r={r}
                                                fill={isSelected ? '#f44336' : '#2196f3'}
                                                stroke="#fff"
                                                strokeWidth={Math.max(0.5 * (viewBox.w / WORLD_UNITS), 0.3)}
                                                onPointerDown={handlePointPointerDown(p.pointId)}
                                                style={{ cursor: 'move' }}
                                            />
                                        );
                                    })}
                                </svg>
                            </Box>
                        </Box>

                        <Stack spacing={2} sx={{ width: 340, flexShrink: 0, overflow: 'auto', p: 1.5, borderLeft: '1px solid', borderColor: 'divider' }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <TextField
                                    label={t('events.fields.name')}
                                    size="small"
                                    fullWidth
                                    value={selectedEvent.name}
                                    onChange={(e) => updateSelected({ name: e.target.value })}
                                    sx={{ mb: 2 }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selectedEvent.zone !== null}
                                            onChange={(e) => toggleUseZone(e.target.checked)}
                                        />
                                    }
                                    label={t('eventSpawns.useZone')}
                                />
                                {selectedEvent.zone !== null && (
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                                            gap: 1.5,
                                            mt: 1,
                                        }}
                                    >
                                        {(['smin', 'smax', 'dmin', 'dmax', 'r'] as const).map((key) => (
                                            <TextField
                                                key={key}
                                                label={t(`eventSpawns.zoneFields.${key}`)}
                                                size="small"
                                                type="number"
                                                value={selectedEvent.zone![key]}
                                                onChange={(e) => updateZone({ [key]: Number(e.target.value) || 0 })}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2">
                                        {t('eventSpawns.pointsTitle', { count: selectedEvent.positions.length })}
                                    </Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => addPointAt(mapSize / 2, mapSize / 2)}>
                                        {t('eventSpawns.addPoint')}
                                    </Button>
                                </Stack>
                                <Stack spacing={1}>
                                    {selectedEvent.positions.map((p, index) => {
                                        const isSelected = p.pointId === selectedPointId;
                                        return (
                                            <Paper
                                                key={p.pointId}
                                                variant="outlined"
                                                onClick={() => setSelectedPointId(p.pointId)}
                                                sx={{
                                                    p: 1,
                                                    cursor: 'pointer',
                                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                                                }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                                                >
                                                    <Typography variant="caption" color="text.secondary">
                                                        #{index + 1}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removePoint(p.pointId);
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                    <TextField
                                                        label={t('eventSpawns.pointFields.x')}
                                                        size="small"
                                                        type="number"
                                                        value={p.x}
                                                        onChange={(e) =>
                                                            updatePoint(p.pointId, { x: Number(e.target.value) || 0 })
                                                        }
                                                    />
                                                    <TextField
                                                        label={t('eventSpawns.pointFields.z')}
                                                        size="small"
                                                        type="number"
                                                        value={p.z}
                                                        onChange={(e) =>
                                                            updatePoint(p.pointId, { z: Number(e.target.value) || 0 })
                                                        }
                                                    />
                                                    <TextField
                                                        label={t('eventSpawns.pointFields.angle')}
                                                        size="small"
                                                        type="number"
                                                        value={p.a}
                                                        onChange={(e) =>
                                                            updatePoint(p.pointId, { a: Number(e.target.value) || 0 })
                                                        }
                                                    />
                                                    <TextField
                                                        label={t('eventSpawns.pointFields.y')}
                                                        size="small"
                                                        type="number"
                                                        value={p.y ?? ''}
                                                        placeholder="—"
                                                        onChange={(e) =>
                                                            updatePoint(p.pointId, {
                                                                y:
                                                                    e.target.value === ''
                                                                        ? undefined
                                                                        : Number(e.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                    <TextField
                                                        label={t('eventSpawns.pointFields.group')}
                                                        size="small"
                                                        value={p.group ?? ''}
                                                        placeholder="—"
                                                        onChange={(e) =>
                                                            updatePoint(p.pointId, {
                                                                group: e.target.value === '' ? undefined : e.target.value,
                                                            })
                                                        }
                                                        sx={{ gridColumn: '1 / -1' }}
                                                    />
                                                </Box>
                                            </Paper>
                                        );
                                    })}
                                    {selectedEvent.positions.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('eventSpawns.noPoints')}
                                        </Typography>
                                    )}
                                </Stack>
                            </Paper>
                        </Stack>
                    </Box>
                )}
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
