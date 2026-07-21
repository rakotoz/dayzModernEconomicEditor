import React, { useState } from 'react';
import { Box, Button, Chip, Divider, FormControlLabel, IconButton, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { JsonValue } from '../dayzConfig/cfgGameplay';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Zone = { Name: string; X: number; Z: number; Radius: number; IdleMinutes: number };
type Currency = { ItemClassName: string; Value: number };

// на уровне модуля — иначе поле ввода теряет фокус при каждом рендере
const StringChips = ({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (v: string[]) => void }) => {
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
                <TextField size="small" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 280 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

// Конфиг Rev_Vehicles (VehiclesConfig.json): регистрация транспорта, штрафстоянка,
// автоэвакуация с зонами и валюта для выкупа.
export const RevVehiclesConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const num = (k: string, d: number) => (typeof data[k] === 'number' ? (data[k] as number) : d);
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const arr = (k: string): string[] => (Array.isArray(data[k]) ? (data[k] as string[]) : []);

    const zones: Zone[] = Array.isArray(data.ImpoundZones) ? (data.ImpoundZones as Zone[]) : [];
    const setZones = (next: Zone[]) => set({ ImpoundZones: next as unknown as JsonValue });
    const patchZone = (i: number, patch: Partial<Zone>) => setZones(zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));

    const currencies: Currency[] = Array.isArray(data.Currencies) ? (data.Currencies as Currency[]) : [];
    const setCurrencies = (next: Currency[]) => set({ Currencies: next as unknown as JsonValue });
    const patchCurrency = (i: number, patch: Partial<Currency>) => setCurrencies(currencies.map((c, j) => (j === i ? { ...c, ...patch } : c)));

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Регистрация транспорта
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, rowGap: 2, alignItems: 'center' }}>
                    <FormControlLabel control={<Switch checked={num('EnableRegistration', 1) === 1} onChange={(e) => set({ EnableRegistration: e.target.checked ? 1 : 0 })} />} label="Регистрация включена" />
                    <TextField label="Дистанция действия, м" size="small" type="number" value={num('ActionDistance', 4)} onChange={(e) => set({ ActionDistance: Number(e.target.value) || 0 })} sx={{ width: 200 }} />
                    <TextField label="Мин. длина пин-кода" size="small" type="number" value={num('MinPasswordLength', 3)} onChange={(e) => set({ MinPasswordLength: Number(e.target.value) || 0 })} sx={{ width: 200 }} />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Штрафстоянка
                </Typography>
                <Stack spacing={2}>
                    <FormControlLabel control={<Switch checked={num('ImpoundEnabled', 1) === 1} onChange={(e) => set({ ImpoundEnabled: e.target.checked ? 1 : 0 })} />} label="Штрафстоянка включена" />
                    <TextField label="Стоимость выкупа" size="small" type="number" value={num('ImpoundCostBase', 5000)} onChange={(e) => set({ ImpoundCostBase: Number(e.target.value) || 0 })} sx={{ width: 220 }} />
                    <Typography variant="caption" color="text.secondary">
                        Оплата только наличными. Точки паркоматов задаются отдельно, в ImpoundLots.json.
                    </Typography>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Транспорт в гараже
                </Typography>
                <Stack spacing={2}>
                    <FormControlLabel control={<Switch checked={num('ShowGarageVehicles', 1) === 1} onChange={(e) => set({ ShowGarageVehicles: e.target.checked ? 1 : 0 })} />} label="Показывать машины из гаража" />
                    <StringChips label="Группы гаражей LBGarage (как папки в Data/LBGarage/Garages)" placeholder="Ground Vehicles" values={arr('GarageNames')} onChange={(v) => set({ GarageNames: v as unknown as JsonValue })} />
                    <Typography variant="caption" color="text.secondary">
                        Нужен мод-мост Rev_Vehicles_LBGarage.
                    </Typography>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Автоэвакуация
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, rowGap: 2, alignItems: 'center' }}>
                    <FormControlLabel control={<Switch checked={num('AutoImpoundEnabled', 1) === 1} onChange={(e) => set({ AutoImpoundEnabled: e.target.checked ? 1 : 0 })} />} label="Автоэвакуация включена" />
                    <TextField label="Простой до эвакуации, мин" size="small" type="number" value={num('IdleMinutes', 180)} onChange={(e) => set({ IdleMinutes: Number(e.target.value) || 0 })} sx={{ width: 220 }} />
                    <TextField label="Проверять раз в, сек" size="small" type="number" value={num('CheckIntervalSeconds', 60)} onChange={(e) => set({ CheckIntervalSeconds: Number(e.target.value) || 0 })} sx={{ width: 200 }} />
                    <TextField label="Не трогать, если игрок ближе, м" size="small" type="number" value={num('MinPlayerDistance', 60)} onChange={(e) => set({ MinPlayerDistance: Number(e.target.value) || 0 })} sx={{ width: 250 }} />
                    <TextField label="Предупредить за, мин" size="small" type="number" value={num('WarnBeforeMinutes', 10)} onChange={(e) => set({ WarnBeforeMinutes: Number(e.target.value) || 0 })} sx={{ width: 200 }} />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Зоны со своим сроком простоя ({zones.length})
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setZones([...zones, { Name: 'Зона', X: 0, Z: 0, Radius: 100, IdleMinutes: 40 }])}>
                        Добавить зону
                    </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Круг по X/Z, высота не учитывается. Внутри зоны действует её срок вместо общего. Если зоны
                    пересекаются, берётся самый короткий срок. X и Z — первое и третье числа из отладочного HUD.
                </Typography>
                <Stack spacing={1}>
                    {zones.map((z, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}>
                                <TextField label="Название" size="small" value={z.Name ?? ''} onChange={(e) => patchZone(i, { Name: e.target.value })} sx={{ width: 200 }} />
                                <TextField label="X" size="small" type="number" value={z.X ?? 0} onChange={(e) => patchZone(i, { X: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="Z" size="small" type="number" value={z.Z ?? 0} onChange={(e) => patchZone(i, { Z: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="Радиус, м" size="small" type="number" value={z.Radius ?? 0} onChange={(e) => patchZone(i, { Radius: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="Простой, мин" size="small" type="number" value={z.IdleMinutes ?? 0} onChange={(e) => patchZone(i, { IdleMinutes: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                                <IconButton size="small" onClick={() => setZones(zones.filter((_, j) => j !== i))}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Paper>
                    ))}
                    {zones.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            Зон нет — везде действует общий срок простоя.
                        </Typography>
                    )}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Валюта выкупа ({currencies.length})
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCurrencies([...currencies, { ItemClassName: '', Value: 0 }])}>
                        Добавить купюру
                    </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Свой список у каждого мода — так они не зависят друг от друга.
                </Typography>
                <Stack spacing={1}>
                    {currencies.map((c, i) => (
                        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <TextField label="Класс предмета" size="small" value={c.ItemClassName ?? ''} onChange={(e) => patchCurrency(i, { ItemClassName: e.target.value })} sx={{ flex: 1 }} />
                            <TextField label="Номинал" size="small" type="number" value={c.Value ?? 0} onChange={(e) => patchCurrency(i, { Value: Number(e.target.value) || 0 })} sx={{ width: 140 }} />
                            <IconButton size="small" onClick={() => setCurrencies(currencies.filter((_, j) => j !== i))}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Тексты
                </Typography>
                <Stack spacing={1.5}>
                    <TextField label="Заголовок уведомлений" size="small" value={str('TitleTag')} onChange={(e) => set({ TitleTag: e.target.value })} fullWidth />
                    <Divider />
                    <TextField label="Транспорт зарегистрирован" size="small" value={str('TextRegistered')} onChange={(e) => set({ TextRegistered: e.target.value })} fullWidth />
                    <TextField label="Сигнализация включена" size="small" value={str('TextArmed')} onChange={(e) => set({ TextArmed: e.target.value })} fullWidth />
                    <TextField label="Сигнализация выключена" size="small" value={str('TextDisarmed')} onChange={(e) => set({ TextDisarmed: e.target.value })} fullWidth />
                    <TextField label="Эвакуирован на штрафстоянку" size="small" value={str('TextImpounded')} onChange={(e) => set({ TextImpounded: e.target.value })} fullWidth />
                    <TextField label="Предупреждение о простое" size="small" value={str('TextImpoundWarn')} onChange={(e) => set({ TextImpoundWarn: e.target.value })} fullWidth />
                    <TextField label="Причина «простой»" size="small" value={str('ReasonIdle')} onChange={(e) => set({ ReasonIdle: e.target.value })} fullWidth />
                    <TextField label="Не хватает наличных" size="small" value={str('TextNoMoney')} onChange={(e) => set({ TextNoMoney: e.target.value })} fullWidth />
                </Stack>
            </Paper>
        </Box>
    );
};
