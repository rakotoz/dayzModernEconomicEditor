import React, { useState } from 'react';
import { Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { JsonValue } from '../dayzConfig/cfgGameplay';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };

// на уровне модуля, чтобы поле ввода и его драфт не сбрасывались при каждом рендере
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

const LOG_FLAGS: { k: string; label: string }[] = [
    { k: 'm_LogDeath', label: 'Смерть / крест' },
    { k: 'm_LogTeleport', label: 'Телепорт (маяк/зов)' },
    { k: 'm_LogAdmin', label: 'Действия админа' },
    { k: 'm_LogLoot', label: 'Обыск / опустошение' },
    { k: 'm_LogToFile', label: 'Лог в файл' },
];

export const RevCrossConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const flag = (k: string) => data[k] === 1 || data[k] === true;
    const arr = (k: string): string[] => (Array.isArray(data[k]) ? (data[k] as string[]) : []);

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Маяки <Typography component="span" variant="caption" color="text.secondary">(предметы для телепорта к кресту / призыва креста)</Typography>
                </Typography>
                <Stack spacing={2.5}>
                    <StringChips label="Телепорт к кресту (BeaconTpItems)" placeholder="ClassName" values={arr('BeaconTpItems')} onChange={(v) => set({ BeaconTpItems: v as unknown as JsonValue })} />
                    <StringChips label="Призыв креста (BeaconBringItems)" placeholder="ClassName" values={arr('BeaconBringItems')} onChange={(v) => set({ BeaconBringItems: v as unknown as JsonValue })} />
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Логи
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Webhook URL (Discord)" size="small" fullWidth value={str('m_WebhookURL')} onChange={(e) => set({ m_WebhookURL: e.target.value })} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0.5 }}>
                        {LOG_FLAGS.map((f) => (
                            <FormControlLabel key={f.k} control={<Checkbox size="small" checked={flag(f.k)} onChange={(e) => set({ [f.k]: e.target.checked ? 1 : 0 })} />} label={f.label} />
                        ))}
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
};
