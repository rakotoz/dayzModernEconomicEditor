import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { EconomyClassNameGroup, loadEconomyClassNamesByFileCached } from '../dayzConfig/typesXml';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { ClassNamePickerDialog } from '../components/ClassNamePickerDialog';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Prize = { ClassName: string; Quantity: number; Weight: number; Label: string };

// на уровне модуля — иначе поле ввода теряет драфт при каждом рендере
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
                <TextField size="small" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 240 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

export const RevRouletteConfigView = ({ data, onChange }: Props) => {
    const project = useAppSelector(selectCurrentProject);
    const [groups, setGroups] = useState<EconomyClassNameGroup[]>([]);
    const [pickerIndex, setPickerIndex] = useState<number | null>(null);

    useEffect(() => {
        if (project) loadEconomyClassNamesByFileCached(project).then(setGroups);
    }, [project?.id]);

    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const num = (k: string, d: number) => (typeof data[k] === 'number' ? (data[k] as number) : d);
    const arr = (k: string): string[] => (Array.isArray(data[k]) ? (data[k] as string[]) : []);

    const prizes: Prize[] = Array.isArray(data.RoulettePrizes) ? (data.RoulettePrizes as Prize[]) : [];
    const setPrizes = (next: Prize[]) => set({ RoulettePrizes: next as unknown as JsonValue });
    const patchPrize = (i: number, patch: Partial<Prize>) => setPrizes(prizes.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    const totalWeight = prizes.reduce((s, p) => s + (Number(p.Weight) || 0), 0);

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Общее
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, rowGap: 2, alignItems: 'flex-start' }}>
                    <TextField label="Период бесплатной прокрутки, ч" size="small" type="number" value={num('RouletteHours', 4)} onChange={(e) => set({ RouletteHours: Number(e.target.value) || 0 })} sx={{ width: 240 }} />
                    <StringChips label="Предметы-тикеты (SpinTicketItems)" placeholder="ClassName тикета" values={arr('SpinTicketItems')} onChange={(v) => set({ SpinTicketItems: v as unknown as JsonValue })} />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Призы ({prizes.length}) <Typography component="span" variant="caption" color="text.secondary">· сумма весов {totalWeight}</Typography>
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setPrizes([...prizes, { ClassName: '', Quantity: 1, Weight: 10, Label: '' }])}>
                        Добавить приз
                    </Button>
                </Stack>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {prizes.map((p, i) => {
                        const chance = totalWeight > 0 ? Math.round(((Number(p.Weight) || 0) / totalWeight) * 1000) / 10 : 0;
                        return (
                            <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        #{i + 1} · шанс {chance}%
                                    </Typography>
                                    <IconButton size="small" onClick={() => setPrizes(prizes.filter((_, j) => j !== i))}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                        <TextField label="ClassName" size="small" fullWidth value={p.ClassName ?? ''} onChange={(e) => patchPrize(i, { ClassName: e.target.value })} />
                                        <IconButton size="small" title="Выбрать из economy" onClick={() => setPickerIndex(i)}>
                                            <ListAltIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                        <TextField label="Кол-во" size="small" type="number" value={p.Quantity ?? 1} onChange={(e) => patchPrize(i, { Quantity: Number(e.target.value) || 0 })} sx={{ flex: 1 }} />
                                        <TextField label="Вес" size="small" type="number" value={p.Weight ?? 0} onChange={(e) => patchPrize(i, { Weight: Number(e.target.value) || 0 })} sx={{ flex: 1 }} />
                                    </Stack>
                                    <TextField label="Подпись (Label)" size="small" fullWidth value={p.Label ?? ''} onChange={(e) => patchPrize(i, { Label: e.target.value })} />
                                </Stack>
                            </Paper>
                        );
                    })}
                </Box>
            </Paper>

            <ClassNamePickerDialog
                open={pickerIndex !== null}
                groups={groups}
                onClose={() => setPickerIndex(null)}
                onSelect={(name) => {
                    if (pickerIndex !== null) patchPrize(pickerIndex, { ClassName: name });
                    setPickerIndex(null);
                }}
            />
        </Box>
    );
};
