import React, { useState } from 'react';
import { Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { JsonValue } from '../dayzConfig/cfgGameplay';

interface RecursiveJsonFormProps {
    data: Record<string, JsonValue>;
    onChange: (path: string[], value: JsonValue) => void;
    /** Ключи верхнего уровня, которые рендерятся как отдельные Paper-секции (для красивой
     * full-width сетки); остальные примитивы верхнего уровня показываются перед секциями. */
    sectionKeys?: string[];
    sectionLabels?: Record<string, string>;
}

const humanizeKey = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const StringChipList = ({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        if (!draft.trim()) return;
        onChange([...values, draft.trim()]);
        setDraft('');
    };
    return (
        <Box>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mb: 0.5 }}>
                {values.map((v, i) => (
                    <Chip key={`${v}-${i}`} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ flex: 1, maxWidth: 260 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

const NumberArrayList = ({ values, onChange }: { values: number[]; onChange: (v: number[]) => void }) => (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        {values.map((v, i) => (
            <TextField
                key={i}
                size="small"
                type="number"
                value={v}
                onChange={(e) => {
                    const next = [...values];
                    next[i] = Number(e.target.value) || 0;
                    onChange(next);
                }}
                sx={{ width: 90 }}
            />
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...values, 0])}>
            +
        </Button>
    </Stack>
);

// Одно поле любого типа (примитив/массив) с подписью — рекурсия в объект делегируется наверх.
const FieldRow = ({ label, value, onChange }: { label: string; value: JsonValue; onChange: (v: JsonValue) => void }) => {
    if (typeof value === 'boolean') {
        return <FormControlLabel control={<Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} />} label={label} />;
    }
    if (typeof value === 'number') {
        return <TextField label={label} size="small" type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} sx={{ width: 180 }} />;
    }
    if (typeof value === 'string') {
        return <TextField label={label} size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value)} />;
    }
    if (Array.isArray(value)) {
        const isNumeric = value.length > 0 && value.every((v) => typeof v === 'number');
        const isString = value.length > 0 && value.every((v) => typeof v === 'string');
        return (
            <Box>
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                    {isNumeric ? (
                        <NumberArrayList values={value as number[]} onChange={(v) => onChange(v as JsonValue)} />
                    ) : (
                        <StringChipList values={isString ? (value as string[]) : []} onChange={(v) => onChange(v as JsonValue)} />
                    )}
                </Box>
            </Box>
        );
    }
    return null;
};

// Пара «месяц -> min/max температура» рендерится таблицей, как в референсном туле — читается
// сильно приятнее 24 отдельных полей россыпью.
const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const MonthlyTempsTable = ({
    minValues,
    maxValues,
    onChangeMin,
    onChangeMax,
}: {
    minValues: number[];
    maxValues: number[];
    onChangeMin: (v: number[]) => void;
    onChangeMax: (v: number[]) => void;
}) => (
    <Box>
        <Stack direction="row" spacing={1} sx={{ mb: 0.5, pl: '3.5em' }}>
            <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                Min
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                Max
            </Typography>
        </Stack>
        <Stack spacing={0.5}>
            {MONTHS_RU.map((m, i) => (
                <Stack key={m} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ width: 40 }}>
                        {m}
                    </Typography>
                    <TextField
                        size="small"
                        type="number"
                        value={minValues[i] ?? 0}
                        onChange={(e) => {
                            const next = [...minValues];
                            next[i] = Number(e.target.value) || 0;
                            onChangeMin(next);
                        }}
                        sx={{ width: 80 }}
                    />
                    <TextField
                        size="small"
                        type="number"
                        value={maxValues[i] ?? 0}
                        onChange={(e) => {
                            const next = [...maxValues];
                            next[i] = Number(e.target.value) || 0;
                            onChangeMax(next);
                        }}
                        sx={{ width: 80 }}
                    />
                </Stack>
            ))}
        </Stack>
    </Box>
);

// Секция — объект внутри JSON-дерева: примитивы/массивы рендерятся полями, вложенные объекты —
// вложенными Paper-блоками (рекурсия). Пара environmentMinTemps/environmentMaxTemps
// (по 12 значений) — частный случай, рисуется таблицей месяцев вместо двух списков чисел.
const ObjectSection = ({ path, value, onChange }: { path: string[]; value: Record<string, JsonValue>; onChange: (path: string[], v: JsonValue) => void }) => {
    const keys = Object.keys(value);
    const hasMonthlyTemps = Array.isArray(value.environmentMinTemps) && Array.isArray(value.environmentMaxTemps);

    return (
        <Stack spacing={1.5}>
            {hasMonthlyTemps && (
                <MonthlyTempsTable
                    minValues={value.environmentMinTemps as number[]}
                    maxValues={value.environmentMaxTemps as number[]}
                    onChangeMin={(v) => onChange([...path, 'environmentMinTemps'], v as JsonValue)}
                    onChangeMax={(v) => onChange([...path, 'environmentMaxTemps'], v as JsonValue)}
                />
            )}
            {keys.map((key) => {
                if (hasMonthlyTemps && (key === 'environmentMinTemps' || key === 'environmentMaxTemps')) return null;
                const v = value[key];
                if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                    return (
                        <Paper key={key} variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                                {humanizeKey(key)}
                            </Typography>
                            <ObjectSection path={[...path, key]} value={v as Record<string, JsonValue>} onChange={onChange} />
                        </Paper>
                    );
                }
                return <FieldRow key={key} label={humanizeKey(key)} value={v} onChange={(nv) => onChange([...path, key], nv)} />;
            })}
        </Stack>
    );
};

export const RecursiveJsonForm = ({ data, onChange, sectionKeys, sectionLabels }: RecursiveJsonFormProps) => {
    const allKeys = Object.keys(data);
    const objectKeys = sectionKeys ?? allKeys.filter((k) => data[k] !== null && typeof data[k] === 'object' && !Array.isArray(data[k]));
    const primitiveKeys = allKeys.filter((k) => !objectKeys.includes(k));

    return (
        <Stack spacing={2}>
            {primitiveKeys.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                        {primitiveKeys.map((key) => (
                            <FieldRow key={key} label={humanizeKey(key)} value={data[key]} onChange={(v) => onChange([key], v)} />
                        ))}
                    </Stack>
                </Paper>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                {objectKeys.map((key) => (
                    <Paper key={key} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                            {sectionLabels?.[key] ?? humanizeKey(key)}
                        </Typography>
                        <ObjectSection path={[key]} value={data[key] as Record<string, JsonValue>} onChange={onChange} />
                    </Paper>
                ))}
            </Box>
        </Stack>
    );
};
