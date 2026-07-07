import React, { useState } from 'react';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Общий редактор строкового массива в виде чипов с полем добавления — вынесен в отдельный
// компонент, т.к. одна и та же форма нужна в нескольких экранах BRDK (AdminList, MineTools,
// ItemList и т.п.), раньше копипастилась по месту в каждом view.
export const StringChipList = ({
    values,
    onChange,
    placeholder,
}: {
    values: string[];
    onChange: (v: string[]) => void;
    placeholder?: string;
}) => {
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
                {values.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                        —
                    </Typography>
                )}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ flex: 1, maxWidth: 260 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};
