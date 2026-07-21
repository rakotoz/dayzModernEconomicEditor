import React, { useEffect, useState } from 'react';
import { Box, Button, FormControlLabel, IconButton, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { MapPoint, SpawnMapCanvas } from '../components/SpawnMapCanvas';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { getMapKeyForLabel } from '../data/dayzMaps';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Zone = {
    Name: string;
    X: number;
    Z: number;
    Radius: number;
    BlockDamage: number;
    BlockWeapons: number;
    RemoveAI: number;
    BlockDiseases: number;
    FreezeStats: number;
};

// свойства зоны: что именно она делает
const FLAGS: { key: keyof Zone; label: string; hint: string }[] = [
    { key: 'BlockDamage', label: 'Без урона', hint: 'Урон не проходит совсем' },
    { key: 'BlockWeapons', label: 'Нельзя поднять оружие', hint: 'Блокируется подъём оружия' },
    { key: 'RemoveAI', label: 'Убирать живность', hint: 'Зомби и животные удаляются' },
    { key: 'BlockDiseases', label: 'Не заражаться', hint: 'Новые болезни не цепляются' },
    { key: 'FreezeStats', label: 'ХП и кровь не убывают', hint: 'Удерживаются от просадки' },
];

const newZone = (x: number, z: number): Zone => ({
    Name: 'Новая зона',
    X: Math.round(x * 100) / 100,
    Z: Math.round(z * 100) / 100,
    Radius: 80,
    BlockDamage: 1,
    BlockWeapons: 1,
    RemoveAI: 1,
    BlockDiseases: 1,
    FreezeStats: 1,
});

// Конфиг Rev_SafeZone (SafeZones.json): безопасные зоны кругом по X/Z.
// Точки ставятся прямо на карте — координаты руками вбивать не нужно.
export const RevSafeZoneConfigView = ({ data, onChange }: Props) => {
    const project = useAppSelector(selectCurrentProject);
    const [mapImagePath, setMapImagePath] = useState<string | null>(null);
    const [selected, setSelected] = useState<number | null>(null);

    const mapKey = project ? getMapKeyForLabel(project.map) : null;
    useEffect(() => {
        if (!mapKey) return;
        window.api.getMapImagePath(mapKey).then((res) => setMapImagePath(res.success ? res.data ?? null : null));
    }, [mapKey]);

    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const num = (k: string, d: number) => (typeof data[k] === 'number' ? (data[k] as number) : d);
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');

    const zones: Zone[] = Array.isArray(data.Zones) ? (data.Zones as Zone[]) : [];
    const setZones = (next: Zone[]) => set({ Zones: next as unknown as JsonValue });
    const patchZone = (i: number, patch: Partial<Zone>) => setZones(zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));

    const mapPoints: MapPoint[] = zones.map((z, i) => ({ id: String(i), x: z.X ?? 0, z: z.Z ?? 0 }));

    const handleMapAdd = (x: number, z: number) => {
        setZones([...zones, newZone(x, z)]);
        setSelected(zones.length);
    };
    const handleMapMove = (id: string, x: number, z: number) => {
        const i = Number(id);
        patchZone(i, { X: Math.round(x * 100) / 100, Z: Math.round(z * 100) / 100 });
    };

    const sel = selected !== null && selected >= 0 && selected < zones.length ? zones[selected] : null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Общее
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, rowGap: 2, alignItems: 'center' }}>
                    <FormControlLabel control={<Switch checked={num('EnableSafeZones', 1) === 1} onChange={(e) => set({ EnableSafeZones: e.target.checked ? 1 : 0 })} />} label="Безопасные зоны включены" />
                    <TextField
                        label="Чистка живности раз в, сек"
                        size="small"
                        type="number"
                        value={num('SweepInterval', 3)}
                        onChange={(e) => set({ SweepInterval: Number(e.target.value) || 0 })}
                        sx={{ width: 240 }}
                    />
                </Box>
            </Paper>

            {/* карта слева, список и свойства справа */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', minHeight: 520 }}>
                <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 1, display: 'flex' }}>
                    <SpawnMapCanvas
                        mapSize={project?.mapSize && project.mapSize > 0 ? project.mapSize : 15360}
                        mapImagePath={mapImagePath}
                        points={mapPoints}
                        selectedId={selected !== null ? String(selected) : null}
                        onAddPoint={handleMapAdd}
                        onMovePoint={handleMapMove}
                        onSelectPoint={(id) => setSelected(Number(id))}
                        hint="Клик по карте — новая зона. Точку можно перетаскивать."
                    />
                </Paper>

                <Paper variant="outlined" sx={{ width: 420, flexShrink: 0, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            Зоны ({zones.length})
                        </Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => handleMapAdd(0, 0)}>
                            Добавить
                        </Button>
                    </Stack>

                    <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0, mb: 1 }}>
                        <Stack spacing={0.5}>
                            {zones.map((z, i) => (
                                <Paper
                                    key={i}
                                    variant="outlined"
                                    onClick={() => setSelected(i)}
                                    sx={{
                                        p: 1,
                                        cursor: 'pointer',
                                        bgcolor: i === selected ? 'action.selected' : 'transparent',
                                    }}
                                >
                                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>
                                                {z.Name || '(без названия)'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {Math.round(z.X ?? 0)} · {Math.round(z.Z ?? 0)} · R{Math.round(z.Radius ?? 0)}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            title="Дублировать"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZones([...zones.slice(0, i + 1), { ...z }, ...zones.slice(i + 1)]);
                                            }}
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            title="Удалить"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZones(zones.filter((_, j) => j !== i));
                                                setSelected(null);
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Paper>
                            ))}
                            {zones.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                                    Зон нет. Кликни по карте, чтобы поставить первую.
                                </Typography>
                            )}
                        </Stack>
                    </Box>

                    {sel && selected !== null && (
                        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                            <TextField label="Название" size="small" fullWidth value={sel.Name ?? ''} onChange={(e) => patchZone(selected, { Name: e.target.value })} sx={{ mb: 1.5 }} />
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                <TextField label="X" size="small" type="number" value={sel.X ?? 0} onChange={(e) => patchZone(selected, { X: Number(e.target.value) || 0 })} sx={{ flex: 1 }} />
                                <TextField label="Z" size="small" type="number" value={sel.Z ?? 0} onChange={(e) => patchZone(selected, { Z: Number(e.target.value) || 0 })} sx={{ flex: 1 }} />
                                <TextField label="Радиус" size="small" type="number" value={sel.Radius ?? 0} onChange={(e) => patchZone(selected, { Radius: Number(e.target.value) || 0 })} sx={{ flex: 1 }} />
                            </Stack>
                            <Stack>
                                {FLAGS.map((f) => (
                                    <FormControlLabel
                                        key={String(f.key)}
                                        title={f.hint}
                                        control={
                                            <Switch
                                                size="small"
                                                checked={(sel[f.key] as number) === 1}
                                                onChange={(e) => patchZone(selected, { [f.key]: e.target.checked ? 1 : 0 } as Partial<Zone>)}
                                            />
                                        }
                                        label={<Typography variant="body2">{f.label}</Typography>}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Paper>
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Тексты уведомлений
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <TextField label="Заголовок при входе" size="small" value={str('EnterTitle')} onChange={(e) => set({ EnterTitle: e.target.value })} />
                    <TextField label="Текст при входе" size="small" value={str('EnterText')} onChange={(e) => set({ EnterText: e.target.value })} />
                    <TextField label="Заголовок при выходе" size="small" value={str('ExitTitle')} onChange={(e) => set({ ExitTitle: e.target.value })} />
                    <TextField label="Текст при выходе" size="small" value={str('ExitText')} onChange={(e) => set({ ExitText: e.target.value })} />
                </Box>
            </Paper>
        </Box>
    );
};
