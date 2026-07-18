import React from 'react';
import { Box, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { JsonValue } from '../dayzConfig/cfgGameplay';

// Специальный экран под Rev_Quests/QuestConfig.json — вместо generic-простыни аккуратная
// сетка с группами. Незнакомые поля (если появятся) сохраняются as-is через spread в set().
type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };

const WEEKDAYS = [
    { v: 1, label: 'Пн' },
    { v: 2, label: 'Вт' },
    { v: 3, label: 'Ср' },
    { v: 4, label: 'Чт' },
    { v: 5, label: 'Пт' },
    { v: 6, label: 'Сб' },
    { v: 7, label: 'Вс' },
];

// пары «заголовок + текст» уведомлений
const TEXT_GROUPS: { title: string; keyTitle: string; keyText: string }[] = [
    { title: 'Квест взят', keyTitle: 'QuestAcceptedTitle', keyText: 'QuestAcceptedText' },
    { title: 'Квест выполнен', keyTitle: 'QuestCompletedTitle', keyText: 'QuestCompletedText' },
    { title: 'Квест сдан', keyTitle: 'QuestTurnInTitle', keyText: 'QuestTurnInText' },
    { title: 'Квест провален', keyTitle: 'QuestFailedTitle', keyText: 'QuestFailedText' },
];

// на уровне модуля, чтобы поля не пересоздавались каждый рендер и не теряли фокус при вводе
const BoolField = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) => (
    <FormControlLabel control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />} label={label} />
);
const NumField = ({ label, value, onChange, width = 150 }: { label: string; value: number; onChange: (v: number) => void; width?: number }) => (
    <TextField label={label} size="small" type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} sx={{ width }} />
);

export const RevQuestConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const num = (k: string, d: number) => (typeof data[k] === 'number' ? (data[k] as number) : d);
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const flag = (k: string) => data[k] === 1 || data[k] === true;

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Общее
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, rowGap: 2, alignItems: 'center' }}>
                    <BoolField checked={flag('EnableQuests')} label="Квесты включены" onChange={(v) => set({ EnableQuests: v ? 1 : 0 })} />
                    <NumField label="Час сброса" value={num('DailyResetHour', 8)} onChange={(v) => set({ DailyResetHour: v })} width={120} />
                    <NumField label="Минута сброса" value={num('DailyResetMinute', 0)} onChange={(v) => set({ DailyResetMinute: v })} width={130} />
                    <TextField
                        select
                        label="День недельного сброса"
                        size="small"
                        value={num('WeeklyResetDay', 1)}
                        onChange={(e) => set({ WeeklyResetDay: Number(e.target.value) })}
                        sx={{ width: 200 }}
                    >
                        {WEEKDAYS.map((d) => (
                            <MenuItem key={d.v} value={d.v}>
                                {d.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <NumField label="Макс. активных (-1 = ∞)" value={num('MaxActiveQuests', -1)} onChange={(v) => set({ MaxActiveQuests: v })} width={200} />
                    <BoolField checked={flag('GroupRewardEveryone')} label="Групповая награда всем" onChange={(v) => set({ GroupRewardEveryone: v ? 1 : 0 })} />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Тексты уведомлений <Typography component="span" variant="caption" color="text.secondary">(%1 — название квеста)</Typography>
                </Typography>
                <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
                    {TEXT_GROUPS.map((g) => (
                        <Paper key={g.keyTitle} variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                            <Typography variant="caption" color="text.secondary">
                                {g.title}
                            </Typography>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                <TextField label="Заголовок" size="small" fullWidth value={str(g.keyTitle)} onChange={(e) => set({ [g.keyTitle]: e.target.value })} />
                                <TextField label="Текст" size="small" fullWidth value={str(g.keyText)} onChange={(e) => set({ [g.keyText]: e.target.value })} />
                            </Stack>
                        </Paper>
                    ))}
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Логи
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Webhook URL (Discord)" size="small" fullWidth value={str('WebhookURL')} onChange={(e) => set({ WebhookURL: e.target.value })} />
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        <BoolField checked={flag('LogToDiscord')} label="Лог в Discord" onChange={(v) => set({ LogToDiscord: v ? 1 : 0 })} />
                        <BoolField checked={flag('LogToFile')} label="Лог в файл" onChange={(v) => set({ LogToFile: v ? 1 : 0 })} />
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
};
