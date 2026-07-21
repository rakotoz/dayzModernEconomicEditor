import React, { useEffect, useState } from 'react';
import { Box, Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { MapPoint, SpawnMapCanvas } from '../components/SpawnMapCanvas';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { getMapKeyForLabel } from '../data/dayzMaps';

// Точка спавна объекта в формате экспорта DayZ Editor:
// { name, pos:[x,y,z], ypr:[yaw,pitch,roll], scale, enableCE }
type SpawnObject = {
    name: string;
    pos: number[];
    ypr: number[];
    scale: number;
    enableCE: boolean;
};

type Props = {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
    defaultClass: string;
    hint?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const makeObject = (cls: string, x: number, z: number): SpawnObject => ({
    name: cls,
    pos: [round2(x), 0, round2(z)],   // Y=0 — мод сам посадит объект на грунт
    ypr: [0, 0, 0],
    scale: 1,
    enableCE: false,
});

// Экран точек спавна объектов (паркоматы, терминалы) с картой.
// Универсальная форма для таких файлов не годится: она не умеет добавлять
// объекты в пустой массив, потому что не знает их структуру.
export const RevSpawnPointsView = ({ data, onChange, defaultClass, hint }: Props) => {
    const project = useAppSelector(selectCurrentProject);
    const [mapImagePath, setMapImagePath] = useState<string | null>(null);
    const [selected, setSelected] = useState<number | null>(null);

    const mapKey = project ? getMapKeyForLabel(project.map) : null;
    useEffect(() => {
        if (!mapKey) return;
        window.api.getMapImagePath(mapKey).then((res) => setMapImagePath(res.success ? res.data ?? null : null));
    }, [mapKey]);

    const objects: SpawnObject[] = Array.isArray(data.Objects) ? (data.Objects as SpawnObject[]) : [];
    const setObjects = (next: SpawnObject[]) => onChange({ ...data, Objects: next as unknown as JsonValue });

    const patch = (i: number, p: Partial<SpawnObject>) => setObjects(objects.map((o, j) => (j === i ? { ...o, ...p } : o)));
    const patchPos = (i: number, idx: number, v: number) => {
        const o = objects[i];
        const pos = [...(o.pos ?? [0, 0, 0])];
        while (pos.length < 3) pos.push(0);
        pos[idx] = v;
        patch(i, { pos });
    };
    const patchYaw = (i: number, v: number) => {
        const o = objects[i];
        const ypr = [...(o.ypr ?? [0, 0, 0])];
        while (ypr.length < 3) ypr.push(0);
        ypr[0] = v;
        patch(i, { ypr });
    };

    const mapPoints: MapPoint[] = objects.map((o, i) => ({
        id: String(i),
        x: o.pos?.[0] ?? 0,
        z: o.pos?.[2] ?? 0,
    }));

    const handleAdd = (x: number, z: number) => {
        setObjects([...objects, makeObject(defaultClass, x, z)]);
        setSelected(objects.length);
    };
    const handleMove = (id: string, x: number, z: number) => {
        const i = Number(id);
        const o = objects[i];
        if (!o) return;
        const pos = [...(o.pos ?? [0, 0, 0])];
        while (pos.length < 3) pos.push(0);
        pos[0] = round2(x);
        pos[2] = round2(z);
        patch(i, { pos });
    };

    const sel = selected !== null && selected >= 0 && selected < objects.length ? objects[selected] : null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', minHeight: 560 }}>
            {hint && (
                <Typography variant="caption" color="text.secondary">
                    {hint}
                </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flex: 1, minHeight: 520 }}>
                <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1, display: 'flex' }}>
                    <SpawnMapCanvas
                        mapSize={project?.mapSize && project.mapSize > 0 ? project.mapSize : 15360}
                        mapImagePath={mapImagePath}
                        points={mapPoints}
                        selectedId={selected !== null ? String(selected) : null}
                        onAddPoint={handleAdd}
                        onMovePoint={handleMove}
                        onSelectPoint={(id) => setSelected(Number(id))}
                        hint="Клик по карте — новая точка. Точку можно перетаскивать."
                    />
                </Paper>

                <Paper variant="outlined" sx={{ width: 400, flexShrink: 0, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            Точки ({objects.length})
                        </Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => handleAdd(0, 0)}>
                            Добавить
                        </Button>
                    </Stack>

                    <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0, mb: 1 }}>
                        <Stack spacing={0.5}>
                            {objects.map((o, i) => (
                                <Paper
                                    key={i}
                                    variant="outlined"
                                    onClick={() => setSelected(i)}
                                    sx={{ p: 1, cursor: 'pointer', bgcolor: i === selected ? 'action.selected' : 'transparent' }}
                                >
                                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>
                                                {o.name || defaultClass}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {Math.round(o.pos?.[0] ?? 0)} · {Math.round(o.pos?.[2] ?? 0)}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            title="Дублировать"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setObjects([...objects.slice(0, i + 1), { ...o, pos: [...(o.pos ?? [])], ypr: [...(o.ypr ?? [])] }, ...objects.slice(i + 1)]);
                                            }}
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            title="Удалить"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setObjects(objects.filter((_, j) => j !== i));
                                                setSelected(null);
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Paper>
                            ))}
                            {objects.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                                    Точек нет. Кликни по карте, чтобы поставить первую.
                                </Typography>
                            )}
                        </Stack>
                    </Box>

                    {sel && selected !== null && (
                        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                            <TextField label="Класс объекта" size="small" fullWidth value={sel.name ?? ''} onChange={(e) => patch(selected, { name: e.target.value })} sx={{ mb: 1.5 }} />
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                <TextField label="X" size="small" type="number" value={sel.pos?.[0] ?? 0} onChange={(e) => patchPos(selected, 0, Number(e.target.value) || 0)} sx={{ flex: 1 }} />
                                <TextField label="Z" size="small" type="number" value={sel.pos?.[2] ?? 0} onChange={(e) => patchPos(selected, 2, Number(e.target.value) || 0)} sx={{ flex: 1 }} />
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                <TextField
                                    label="Высота (0 = на грунт)"
                                    size="small"
                                    type="number"
                                    value={sel.pos?.[1] ?? 0}
                                    onChange={(e) => patchPos(selected, 1, Number(e.target.value) || 0)}
                                    sx={{ flex: 1 }}
                                />
                                <TextField label="Поворот, °" size="small" type="number" value={sel.ypr?.[0] ?? 0} onChange={(e) => patchYaw(selected, Number(e.target.value) || 0)} sx={{ flex: 1 }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Высоту можно оставить нулевой — объект встанет на землю сам.
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Box>
    );
};

// Паркоматы штрафстоянки (Rev_Vehicles/ImpoundLots.json)
export const RevImpoundLotsView = (p: { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void }) => (
    <RevSpawnPointsView {...p} defaultClass="Rev_ImpoundLot" hint="Машина подаётся в 6 метрах перед паркоматом по направлению его поворота — оставь там свободное место." />
);

// Терминалы виртуального хранилища (Rev_VStorage/Terminals.json)
export const RevVStorageTerminalsView = (p: { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void }) => (
    <RevSpawnPointsView {...p} defaultClass="Rev_VaultTerminal" hint="Терминал, у которого игрок открывает своё виртуальное хранилище." />
);
