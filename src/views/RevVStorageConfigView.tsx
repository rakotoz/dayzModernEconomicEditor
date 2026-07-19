import React, { useState } from 'react';
import { Box, Button, Chip, FormControlLabel, IconButton, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { JsonValue } from '../dayzConfig/cfgGameplay';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Tier = { ContainerClass: string; Label: string };

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

// Конфиг Rev_VStorage (StorageConfig.json): тиры вместимости, предметы расширения,
// запрещённые классы, логирование. Размер/слоты контейнера задаются в config.cpp мода —
// здесь настраивается, КАКОЙ класс на каком тире и чем расширяется.
export const RevVStorageConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const num = (k: string, d: number) => (typeof data[k] === 'number' ? (data[k] as number) : d);
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const arr = (k: string): string[] => (Array.isArray(data[k]) ? (data[k] as string[]) : []);

    const tiers: Tier[] = Array.isArray(data.Tiers) ? (data.Tiers as Tier[]) : [];
    const setTiers = (next: Tier[]) => set({ Tiers: next as unknown as JsonValue });
    const patchTier = (i: number, patch: Partial<Tier>) => setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
    const moveTier = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= tiers.length) return;
        const next = [...tiers];
        [next[i], next[j]] = [next[j], next[i]];
        setTiers(next);
    };

    // ExpansionItems: { класс предмета -> индекс тира, на который поднимает }
    const expansion: Record<string, number> = data.ExpansionItems && typeof data.ExpansionItems === 'object' && !Array.isArray(data.ExpansionItems) ? (data.ExpansionItems as Record<string, number>) : {};
    const expEntries = Object.entries(expansion);
    const setExpansion = (entries: [string, number][]) => set({ ExpansionItems: Object.fromEntries(entries) as unknown as JsonValue });

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Общее
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, rowGap: 2, alignItems: 'center' }}>
                    <FormControlLabel control={<Switch checked={num('EnableStorage', 1) === 1} onChange={(e) => set({ EnableStorage: e.target.checked ? 1 : 0 })} />} label="Хранилище включено" />
                    <FormControlLabel control={<Switch checked={num('LogToFile', 1) === 1} onChange={(e) => set({ LogToFile: e.target.checked ? 1 : 0 })} />} label="Лог в файл" />
                    <FormControlLabel control={<Switch checked={num('LogToDiscord', 1) === 1} onChange={(e) => set({ LogToDiscord: e.target.checked ? 1 : 0 })} />} label="Лог в Discord" />
                    <TextField label="Discord Webhook URL" size="small" value={str('WebhookURL')} onChange={(e) => set({ WebhookURL: e.target.value })} sx={{ flex: 1, minWidth: 360 }} />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Тиры вместимости ({tiers.length})
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setTiers([...tiers, { ContainerClass: '', Label: `Тир ${tiers.length + 1}` }])}>
                        Добавить тир
                    </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Порядок = прогрессия (первый — стартовый). Размер сетки и слоты класса задаются в config.cpp мода.
                </Typography>
                <Stack spacing={1}>
                    {tiers.map((t, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1, bgcolor: 'action.hover' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ width: 24, textAlign: 'center' }}>
                                    {i}
                                </Typography>
                                <TextField label="Класс контейнера" size="small" value={t.ContainerClass ?? ''} onChange={(e) => patchTier(i, { ContainerClass: e.target.value })} sx={{ flex: 1 }} />
                                <TextField label="Название" size="small" value={t.Label ?? ''} onChange={(e) => patchTier(i, { Label: e.target.value })} sx={{ width: 140 }} />
                                <IconButton size="small" disabled={i === 0} onClick={() => moveTier(i, -1)}>
                                    <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" disabled={i === tiers.length - 1} onClick={() => moveTier(i, 1)}>
                                    <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Предметы расширения ({expEntries.length})
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setExpansion([...expEntries, [`Rev_StorageExpansion_${expEntries.length + 1}`, expEntries.length + 1]])}>
                        Добавить предмет
                    </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Класс предмета → индекс тира, на который он поднимает (использовать по порядку).
                </Typography>
                <Stack spacing={1}>
                    {expEntries.map(([cls, tier], i) => (
                        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <TextField
                                label="Класс предмета"
                                size="small"
                                value={cls}
                                onChange={(e) => setExpansion(expEntries.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="→ тир"
                                size="small"
                                type="number"
                                value={tier}
                                onChange={(e) => setExpansion(expEntries.map((p, j) => (j === i ? [p[0], Number(e.target.value) || 0] : p)))}
                                sx={{ width: 100 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ width: 130 }} noWrap>
                                {tiers[tier]?.Label ?? '(нет тира)'}
                            </Typography>
                            <IconButton size="small" onClick={() => setExpansion(expEntries.filter((_, j) => j !== i))}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    Запрещённые предметы
                </Typography>
                <StringChips label="Эти классы нельзя класть в хранилище (ForbiddenClasses)" placeholder="ClassName предмета" values={arr('ForbiddenClasses')} onChange={(v) => set({ ForbiddenClasses: v as unknown as JsonValue })} />
            </Paper>
        </Box>
    );
};
