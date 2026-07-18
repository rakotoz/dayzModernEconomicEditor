import React, { useState } from 'react';
import { Box, Button, Checkbox, Chip, FormControlLabel, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { JsonValue } from '../dayzConfig/cfgGameplay';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Currency = { ItemClassName: string; Value: number };

// компактный список строк (файлы категорий/трейдеров) — чипы + добавление
const StringChips = ({ label, hint, values, placeholder, onChange }: { label: string; hint?: string; values: string[]; placeholder: string; onChange: (v: string[]) => void }) => {
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
                {label} <Typography component="span" variant="caption" color="text.disabled">{hint} · {values.length}</Typography>
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

export const RevTraderConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const flag = (k: string) => data[k] === 1 || data[k] === true;
    const arr = (k: string): string[] => (Array.isArray(data[k]) ? (data[k] as string[]) : []);

    const currencies: Currency[] = Array.isArray(data.Currencies) ? (data.Currencies as Currency[]) : [];
    const setCurrencies = (next: Currency[]) => set({ Currencies: next as unknown as JsonValue });

    const Bool = ({ k, label }: { k: string; label: string }) => (
        <FormControlLabel control={<Checkbox size="small" checked={flag(k)} onChange={(e) => set({ [k]: e.target.checked ? 1 : 0 })} />} label={label} />
    );

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Валюта <Typography component="span" variant="caption" color="text.secondary">(купюра-предмет → номинал)</Typography>
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCurrencies([...currencies, { ItemClassName: '', Value: 0 }])}>
                        Добавить купюру
                    </Button>
                </Stack>
                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                    {currencies.map((c, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                            <Stack spacing={1.5}>
                                <TextField
                                    label="ClassName"
                                    size="small"
                                    fullWidth
                                    value={c.ItemClassName ?? ''}
                                    onChange={(e) => {
                                        const next = [...currencies];
                                        next[i] = { ...c, ItemClassName: e.target.value };
                                        setCurrencies(next);
                                    }}
                                />
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <TextField
                                        label="Номинал"
                                        size="small"
                                        type="number"
                                        value={c.Value ?? 0}
                                        onChange={(e) => {
                                            const next = [...currencies];
                                            next[i] = { ...c, Value: Number(e.target.value) };
                                            setCurrencies(next);
                                        }}
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton size="small" onClick={() => setCurrencies(currencies.filter((_, j) => j !== i))}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))}
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Настройки
                </Typography>
                <Bool k="AllowSellRuined" label="Принимать «уничтоженные» предметы при продаже" />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Логи
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Webhook URL (Discord)" size="small" fullWidth value={str('m_WebhookURL')} onChange={(e) => set({ m_WebhookURL: e.target.value })} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Bool k="m_LogBuyToDiscord" label="Покупка → Discord" />
                        <Bool k="m_LogSellToDiscord" label="Продажа → Discord" />
                        <Bool k="m_LogToFile" label="Лог в файл" />
                    </Box>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Файлы конфигов <Typography component="span" variant="caption" color="text.secondary">(имена файлов в папках Categories/ и Traders/)</Typography>
                </Typography>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
                    <StringChips label="Категории (CategoryFiles)" hint="Categories/*.json" placeholder="ammo.json" values={arr('CategoryFiles')} onChange={(v) => set({ CategoryFiles: v as unknown as JsonValue })} />
                    <StringChips label="Трейдеры (TraderFiles)" hint="Traders/*.json" placeholder="Weapons.json" values={arr('TraderFiles')} onChange={(v) => set({ TraderFiles: v as unknown as JsonValue })} />
                </Box>
            </Paper>
        </Box>
    );
};
