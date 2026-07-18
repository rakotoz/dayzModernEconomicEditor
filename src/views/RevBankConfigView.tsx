import React, { useState } from 'react';
import { Box, Button, Checkbox, Chip, FormControlLabel, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { JsonValue } from '../dayzConfig/cfgGameplay';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Currency = { ItemClassName: string; Value: number };

const LOG_FLAGS: { k: string; label: string }[] = [
    { k: 'm_LogDepositToDiscord', label: 'Депозит' },
    { k: 'm_LogWithdrawToDiscord', label: 'Снятие' },
    { k: 'm_LogPlayerMoneyTransefer', label: 'Перевод игроку' },
    { k: 'm_LogClanDepositToDiscord', label: 'Клан: депозит' },
    { k: 'm_LogClanWithdrawToDiscord', label: 'Клан: снятие' },
    { k: 'm_LogClanCreateToDiscord', label: 'Клан: создание' },
    { k: 'm_LogClanInviteMemberToDiscord', label: 'Клан: приглашение' },
    { k: 'm_LogClanRemoveMemberToDiscord', label: 'Клан: удаление' },
    { k: 'm_LogClanUpdatePermissionToDiscord', label: 'Клан: смена прав' },
    { k: 'm_LogClanKickMemberToDiscord', label: 'Клан: кик' },
];

export const RevBankConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const num = (k: string, d: number) => (typeof data[k] === 'number' ? (data[k] as number) : d);
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const flag = (k: string) => data[k] === 1 || data[k] === true;

    const currencies: Currency[] = Array.isArray(data.Currencies) ? (data.Currencies as Currency[]) : [];
    const setCurrencies = (next: Currency[]) => set({ Currencies: next as unknown as JsonValue });

    const players: string[] = Array.isArray(data.DebugTestPlayers) ? (data.DebugTestPlayers as string[]) : [];
    const [playerDraft, setPlayerDraft] = useState('');

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
                    Счета и кланы
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, rowGap: 2, alignItems: 'center' }}>
                    <TextField label="Макс. личный баланс" size="small" value={str('MaxPersonalBalance')} onChange={(e) => set({ MaxPersonalBalance: e.target.value })} sx={{ width: 200 }} helperText="0 = без лимита" />
                    <TextField label="Макс. клановый баланс" size="small" value={str('MaxClanBalance')} onChange={(e) => set({ MaxClanBalance: e.target.value })} sx={{ width: 200 }} helperText="0 = без лимита" />
                    <TextField label="Цена создания клана" size="small" value={str('ClanCreateCost')} onChange={(e) => set({ ClanCreateCost: e.target.value })} sx={{ width: 180 }} />
                    <TextField label="Комиссия перевода, %" size="small" type="number" value={num('TransferFeePercent', 0)} onChange={(e) => set({ TransferFeePercent: Number(e.target.value) })} sx={{ width: 180 }} />
                    <TextField label="Мин. длина имени клана" size="small" type="number" value={num('MinClanNameLength', 3)} onChange={(e) => set({ MinClanNameLength: Number(e.target.value) })} sx={{ width: 200 }} />
                    <Bool k="AllowClans" label="Кланы разрешены" />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Зарплата
                </Typography>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, rowGap: 2, alignItems: 'center' }}>
                        <Bool k="SalaryEnabled" label="Включена" />
                        <TextField label="Сумма" size="small" value={str('SalaryAmount')} onChange={(e) => set({ SalaryAmount: e.target.value })} sx={{ width: 160 }} />
                        <TextField label="Период, мин" size="small" type="number" value={num('SalaryPeriodMinutes', 60)} onChange={(e) => set({ SalaryPeriodMinutes: Number(e.target.value) })} sx={{ width: 160 }} />
                    </Box>
                    <TextField label="Текст (%Amount% — сумма)" size="small" fullWidth value={str('SalaryText')} onChange={(e) => set({ SalaryText: e.target.value })} />
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Логи
                </Typography>
                <TextField label="Webhook URL (Discord)" size="small" fullWidth value={str('m_WebhookURL')} onChange={(e) => set({ m_WebhookURL: e.target.value })} sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0.5, mb: 2 }}>
                    {LOG_FLAGS.map((f) => (
                        <Bool key={f.k} k={f.k} label={f.label} />
                    ))}
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        Тестовые игроки (DebugTestPlayers)
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 1 }}>
                        {players.map((p, i) => (
                            <Chip key={`${p}-${i}`} label={p} size="small" onDelete={() => set({ DebugTestPlayers: players.filter((_, j) => j !== i) as unknown as JsonValue })} />
                        ))}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            size="small"
                            placeholder="имя / SteamID"
                            value={playerDraft}
                            onChange={(e) => setPlayerDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && playerDraft.trim()) {
                                    set({ DebugTestPlayers: [...players, playerDraft.trim()] as unknown as JsonValue });
                                    setPlayerDraft('');
                                }
                            }}
                            sx={{ width: 240 }}
                        />
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                if (!playerDraft.trim()) return;
                                set({ DebugTestPlayers: [...players, playerDraft.trim()] as unknown as JsonValue });
                                setPlayerDraft('');
                            }}
                        >
                            +
                        </Button>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
};
