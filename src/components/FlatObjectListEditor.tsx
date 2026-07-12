import React, { useState } from 'react';
import { Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export interface FlatFieldSpec {
    key: string;
    label: string;
    type?: 'text' | 'number';
}

interface FlatObjectListEditorProps<T extends Record<string, any>> {
    items: T[];
    onChange: (items: T[]) => void;
    fields: FlatFieldSpec[];
    titleField: string;
    emptyItem: () => T;
    addLabel: string;
    selectHint: string;
}

// Список+деталь для массивов "плоских" объектов с примитивными полями (без вложенных
// массивов/объектов) — VeineDataDataList, SandDataList, OreDataList, KitDataList и т.п.
// в конфигах BRDK. Список полей задаётся декларативно снаружи, сам компонент общий для всех.
export function FlatObjectListEditor<T extends Record<string, any>>({
    items,
    onChange,
    fields,
    titleField,
    emptyItem,
    addLabel,
    selectHint,
}: FlatObjectListEditorProps<T>) {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const selected = items[selectedIdx];

    const patchItem = (patch: Partial<T>) => {
        const next = items.map((it, i) => (i === selectedIdx ? { ...it, ...patch } : it));
        onChange(next);
    };
    const addItem = () => {
        onChange([...items, emptyItem()]);
        setSelectedIdx(items.length);
    };
    const removeItem = (idx: number) => {
        onChange(items.filter((_, i) => i !== idx));
        setSelectedIdx(0);
    };

    return (
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>
            <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                    {items.map((item, i) => (
                        <ListItemButton key={i} selected={i === selectedIdx} onClick={() => setSelectedIdx(i)}>
                            <ListItemText primary={String(item[titleField] ?? '') || `#${i + 1}`} />
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeItem(i);
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </ListItemButton>
                    ))}
                </List>
                <Divider />
                <Box sx={{ p: 1 }}>
                    <Button size="small" fullWidth startIcon={<AddIcon />} onClick={addItem}>
                        {addLabel}
                    </Button>
                </Box>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {!selected ? (
                    <Typography color="text.secondary">{selectHint}</Typography>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, maxWidth: 760 }}>
                        {fields.map((f) => (
                            <TextField
                                key={f.key}
                                label={f.label}
                                size="small"
                                type={f.type === 'number' ? 'number' : 'text'}
                                value={selected[f.key] ?? (f.type === 'number' ? 0 : '')}
                                onChange={(e) =>
                                    patchItem({ [f.key]: f.type === 'number' ? Number(e.target.value) || 0 : e.target.value } as Partial<T>)
                                }
                            />
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
