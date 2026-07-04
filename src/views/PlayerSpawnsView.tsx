import React, { useEffect, useState } from 'react';
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
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import {
    parsePlayerSpawnPoints,
    PlayerSpawnPoints,
    SectionKey,
    SECTION_KEYS,
    serializePlayerSpawnPoints,
    SpawnField,
    SpawnGroup,
} from '../dayzConfig/playerSpawnPoints';
import { basenamePath } from '../dayzConfig/pathUtils';
import { getMapKeyForLabel } from '../data/dayzMaps';
import { MapPoint, SpawnMapCanvas } from '../components/SpawnMapCanvas';

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

const isBool = (v: string) => v === 'true' || v === 'false';

// Блок параметров (spawn_params/generator_params/group_params): рендерим поля по тегам,
// boolean-значения (true/false) как чекбоксы, остальные — как редактируемые поля.
const FieldBlock = ({
    title,
    fields,
    onChange,
}: {
    title: string;
    fields: SpawnField[];
    onChange: (fields: SpawnField[]) => void;
}) => {
    const { t } = useTranslation();
    const patch = (index: number, value: string) => onChange(fields.map((f, i) => (i === index ? { ...f, value } : f)));
    const labelFor = (tag: string) => {
        const key = `playerSpawns.fields.${tag}`;
        const translated = t(key);
        return translated === key ? tag : translated;
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                {title}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5, alignItems: 'center' }}>
                {fields.map((f, i) =>
                    isBool(f.value) ? (
                        <FormControlLabel
                            key={f.tag}
                            control={
                                <Checkbox
                                    checked={f.value === 'true'}
                                    onChange={(e) => patch(i, e.target.checked ? 'true' : 'false')}
                                />
                            }
                            label={labelFor(f.tag)}
                        />
                    ) : (
                        <TextField
                            key={f.tag}
                            label={labelFor(f.tag)}
                            size="small"
                            value={f.value}
                            onChange={(e) => patch(i, e.target.value)}
                        />
                    )
                )}
                {fields.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                        —
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

const GroupBlock = ({ groups, onChange }: { groups: SpawnGroup[]; onChange: (groups: SpawnGroup[]) => void }) => {
    const { t } = useTranslation();
    const patchGroup = (gi: number, patch: Partial<SpawnGroup>) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {t('playerSpawns.groupsTitle')} ({groups.length})
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...groups, { name: 'Main', positions: [] }])}>
                    {t('playerSpawns.addGroup')}
                </Button>
            </Stack>
            <Stack spacing={1.5}>
                {groups.map((g, gi) => (
                    <Paper key={gi} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                            <TextField
                                label={t('playerSpawns.groupName')}
                                size="small"
                                value={g.name}
                                onChange={(e) => patchGroup(gi, { name: e.target.value })}
                                sx={{ flex: 1 }}
                            />
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => patchGroup(gi, { positions: [...g.positions, { x: '0', z: '0' }] })}
                            >
                                {t('playerSpawns.addPos')}
                            </Button>
                            <IconButton size="small" onClick={() => onChange(groups.filter((_, i) => i !== gi))}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                        <Stack spacing={1}>
                            {g.positions.map((p, pi) => (
                                <Stack key={pi} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <TextField
                                        label="X"
                                        size="small"
                                        value={p.x}
                                        onChange={(e) =>
                                            patchGroup(gi, {
                                                positions: g.positions.map((x, i) => (i === pi ? { ...x, x: e.target.value } : x)),
                                            })
                                        }
                                        sx={{ width: 120 }}
                                    />
                                    <TextField
                                        label="Z"
                                        size="small"
                                        value={p.z}
                                        onChange={(e) =>
                                            patchGroup(gi, {
                                                positions: g.positions.map((x, i) => (i === pi ? { ...x, z: e.target.value } : x)),
                                            })
                                        }
                                        sx={{ width: 120 }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => patchGroup(gi, { positions: g.positions.filter((_, i) => i !== pi) })}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                            {g.positions.length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    {t('playerSpawns.noPos')}
                                </Typography>
                            )}
                        </Stack>
                    </Paper>
                ))}
                {groups.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        {t('playerSpawns.noGroups')}
                    </Typography>
                )}
            </Stack>
        </Paper>
    );
};

export const PlayerSpawnsView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [data, setData] = useState<PlayerSpawnPoints | null>(null);
    const [dirty, setDirty] = useState(false);
    const [tab, setTab] = useState<SectionKey>('fresh');
    const [mapImagePath, setMapImagePath] = useState<string | null>(null);
    const [addTargetGroup, setAddTargetGroup] = useState(0);
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const mapKey = project ? getMapKeyForLabel(project.map) : null;
    useEffect(() => {
        if (!mapKey) return;
        window.api.getMapImagePath(mapKey).then((res) => setMapImagePath(res.success ? res.data ?? null : null));
    }, [mapKey]);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('playerSpawns.readFileError'));
            setStatus('error');
            return;
        }
        try {
            setData(parsePlayerSpawnPoints(res.data));
            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { playerSpawnsXmlPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('playerSpawns.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfgplayerspawnpoints.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('playerSpawns.scanError'));
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
        if (project.playerSpawnsXmlPath) {
            loadFile(project.playerSpawnsXmlPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfgplayerspawnpoints.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const patchSection = (patch: Partial<PlayerSpawnPoints[SectionKey]>) => {
        setData((prev) => (prev ? { ...prev, [tab]: { ...prev[tab], ...patch } } : prev));
        setDirty(true);
    };

    // Точки на карте — все позиции всех групп текущей секции; id кодирует группу и индекс.
    const sectionGroups = data ? data[tab].groups : [];
    const mapPoints: MapPoint[] = sectionGroups.flatMap((g, gi) =>
        g.positions.map((p, pi) => ({ id: `${gi}:${pi}`, x: Number(p.x) || 0, z: Number(p.z) || 0 }))
    );

    const setGroupPos = (gi: number, pi: number, x: number, z: number) =>
        patchSection({
            groups: sectionGroups.map((g, i) =>
                i === gi
                    ? { ...g, positions: g.positions.map((p, j) => (j === pi ? { x: String(x), z: String(z) } : p)) }
                    : g
            ),
        });

    const handleMapAdd = (x: number, z: number) => {
        const groups = [...sectionGroups];
        if (groups.length === 0) {
            groups.push({ name: 'Main', positions: [] });
        }
        const gi = Math.min(addTargetGroup, groups.length - 1);
        groups[gi] = { ...groups[gi], positions: [...groups[gi].positions, { x: String(x), z: String(z) }] };
        patchSection({ groups });
        setSelectedPointId(`${gi}:${groups[gi].positions.length - 1}`);
    };

    const handleMapMove = (id: string, x: number, z: number) => {
        const [gi, pi] = id.split(':').map(Number);
        setGroupPos(gi, pi, x, z);
    };

    const handleSave = async () => {
        if (!filePath || !data) return;
        setSaving(true);
        setSaveError(null);
        const res = await window.api.writeFile(filePath, serializePlayerSpawnPoints(data));
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('playerSpawns.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('playerSpawns.detecting') : t('playerSpawns.loading')}</Typography>
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
                    {t('playerSpawns.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('playerSpawns.pickerNotFound') : t('playerSpawns.pickerFound', { count: candidates.length })}.{' '}
                    {t('common.chooseOrBrowse')}
                </Typography>
                {candidates.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                        {candidates.map((c, i) => (
                            <React.Fragment key={c}>
                                {i > 0 && <Divider />}
                                <ButtonBase onClick={() => loadFile(c, true)} sx={{ width: '100%', justifyContent: 'flex-start', p: 1.5, gap: 1.5 }}>
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

    const section = data![tab];

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
                        {t('playerSpawns.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath}
                    </Typography>
                </Box>
                <Button size="small" onClick={detect}>
                    {t('common.changeFile')}
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={!dirty || saving} onClick={handleSave}>
                    {t('common.save')}
                </Button>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                {SECTION_KEYS.map((k) => (
                    <Tab key={k} value={k} label={t(`playerSpawns.sections.${k}`)} />
                ))}
            </Tabs>

            {saveError && (
                <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Слева — параметры (скролл), справа — карта с позициями групп */}
                <Box sx={{ width: 460, flexShrink: 0, overflow: 'auto', p: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={2}>
                        <FieldBlock
                            title={t('playerSpawns.spawnParams')}
                            fields={section.spawnParams}
                            onChange={(f) => patchSection({ spawnParams: f })}
                        />
                        <FieldBlock
                            title={t('playerSpawns.generatorParams')}
                            fields={section.generatorParams}
                            onChange={(f) => patchSection({ generatorParams: f })}
                        />
                        <FieldBlock
                            title={t('playerSpawns.groupParams')}
                            fields={section.groupParams}
                            onChange={(f) => patchSection({ groupParams: f })}
                        />
                        <GroupBlock groups={section.groups} onChange={(g) => patchSection({ groups: g })} />
                    </Stack>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0, p: 2, gap: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <SpawnMapCanvas
                            mapSize={project.mapSize && project.mapSize > 0 ? project.mapSize : 15360}
                            mapImagePath={mapImagePath}
                            points={mapPoints}
                            selectedId={selectedPointId}
                            onAddPoint={handleMapAdd}
                            onMovePoint={handleMapMove}
                            onSelectPoint={setSelectedPointId}
                        />
                    </Box>
                    <Box sx={{ width: 200, flexShrink: 0 }}>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            label={t('playerSpawns.addTarget')}
                            value={sectionGroups.length ? Math.min(addTargetGroup, sectionGroups.length - 1) : 0}
                            onChange={(e) => setAddTargetGroup(Number(e.target.value))}
                            disabled={sectionGroups.length === 0}
                            sx={{ mb: 2 }}
                        >
                            {sectionGroups.length === 0 ? (
                                <MenuItem value={0}>Main</MenuItem>
                            ) : (
                                sectionGroups.map((g, gi) => (
                                    <MenuItem key={gi} value={gi}>
                                        {g.name || `#${gi + 1}`} ({g.positions.length})
                                    </MenuItem>
                                ))
                            )}
                        </TextField>
                        {selectedPointId &&
                            (() => {
                                const [gi, pi] = selectedPointId.split(':').map(Number);
                                const pos = sectionGroups[gi]?.positions[pi];
                                if (!pos) return null;
                                return (
                                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                            {sectionGroups[gi]?.name} #{pi + 1}
                                        </Typography>
                                        <Stack spacing={1}>
                                            <TextField
                                                label="X"
                                                size="small"
                                                value={pos.x}
                                                onChange={(e) => setGroupPos(gi, pi, Number(e.target.value) || 0, Number(pos.z) || 0)}
                                            />
                                            <TextField
                                                label="Z"
                                                size="small"
                                                value={pos.z}
                                                onChange={(e) => setGroupPos(gi, pi, Number(pos.x) || 0, Number(e.target.value) || 0)}
                                            />
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<DeleteIcon />}
                                                onClick={() => {
                                                    patchSection({
                                                        groups: sectionGroups.map((g, i) =>
                                                            i === gi ? { ...g, positions: g.positions.filter((_, j) => j !== pi) } : g
                                                        ),
                                                    });
                                                    setSelectedPointId(null);
                                                }}
                                            >
                                                {t('common.delete')}
                                            </Button>
                                        </Stack>
                                    </Paper>
                                );
                            })()}
                    </Box>
                </Box>
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
