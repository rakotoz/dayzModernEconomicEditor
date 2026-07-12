import React, { useState } from 'react';
import { Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { emptyRandomPreset, emptyZmbPreset, ZmbPresetEntry } from '../dayzConfig/brdkZmbPreset';
import { StringChipList } from '../components/StringChipList';

interface BrdkZmbPresetViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

type ZmbPresetTab = 'basic' | 'zombies';

const FIELD_GRID_SX = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 } as const;

// profiles/BRDK_MODS/ZmbPreset.json — общие настройки поиска лута отдельно от списка зомби
// с их наборами (ZmbPresetList): список зомби слева, справа для выбранного — карточки
// весовых корзин лута с диапазоном шанса и списком предметов.
export const BrdkZmbPresetView = ({ data, onChange }: BrdkZmbPresetViewProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<ZmbPresetTab>('basic');
    const [selectedZmbIdx, setSelectedZmbIdx] = useState(0);

    const zombies = (data.ZmbPresetList as unknown as ZmbPresetEntry[] | undefined) ?? [];
    const selectedZmb = zombies[selectedZmbIdx];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });

    const patchZmb = (idx: number, zPatch: Partial<ZmbPresetEntry>) => {
        const next = zombies.map((z, i) => (i === idx ? { ...z, ...zPatch } : z));
        patch({ ZmbPresetList: next as unknown as JsonValue });
    };
    const addZmb = () => {
        patch({ ZmbPresetList: [...zombies, emptyZmbPreset()] as unknown as JsonValue });
        setSelectedZmbIdx(zombies.length);
    };
    const removeZmb = (idx: number) => {
        patch({ ZmbPresetList: zombies.filter((_, i) => i !== idx) as unknown as JsonValue });
        setSelectedZmbIdx(0);
    };

    const patchPreset = (presetIdx: number, pPatch: Partial<ZmbPresetEntry['RandomPresetList'][number]>) => {
        if (!selectedZmb) return;
        const nextPresets = selectedZmb.RandomPresetList.map((p, i) => (i === presetIdx ? { ...p, ...pPatch } : p));
        patchZmb(selectedZmbIdx, { RandomPresetList: nextPresets });
    };
    const addPreset = () => {
        if (!selectedZmb) return;
        patchZmb(selectedZmbIdx, { RandomPresetList: [...selectedZmb.RandomPresetList, emptyRandomPreset()] });
    };
    const removePreset = (presetIdx: number) => {
        if (!selectedZmb) return;
        patchZmb(selectedZmbIdx, { RandomPresetList: selectedZmb.RandomPresetList.filter((_, i) => i !== presetIdx) });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="basic" label={t('brdkZmbPreset.tabs.basic')} />
                <Tab value="zombies" label={t('brdkZmbPreset.tabs.zombies', { count: zombies.length })} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: tab === 'basic' ? 'auto' : 'hidden' }}>
                {tab === 'basic' && (
                    <Box sx={{ p: 2 }}>
                        <Paper variant="outlined" sx={{ p: 2, maxWidth: 640 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkZmbPreset.sections.general')}
                            </Typography>
                            <Box sx={FIELD_GRID_SX}>
                                <TextField label="ZmbSearchTime" size="small" type="number" value={data.ZmbSearchTime ?? 0} onChange={(e) => patch({ ZmbSearchTime: Number(e.target.value) || 0 })} />
                                <TextField label="PlayerSearchTime" size="small" type="number" value={data.PlayerSearchTime ?? 0} onChange={(e) => patch({ PlayerSearchTime: Number(e.target.value) || 0 })} />
                                <TextField label="IsNeedSearch" size="small" type="number" value={data.IsNeedSearch ?? 0} onChange={(e) => patch({ IsNeedSearch: Number(e.target.value) || 0 })} />
                                <TextField label="IsNeedSearchPlayer" size="small" type="number" value={data.IsNeedSearchPlayer ?? 0} onChange={(e) => patch({ IsNeedSearchPlayer: Number(e.target.value) || 0 })} />
                                <TextField label="PersonalZmbOpen" size="small" type="number" value={data.PersonalZmbOpen ?? 0} onChange={(e) => patch({ PersonalZmbOpen: Number(e.target.value) || 0 })} />
                                <TextField label="PersonalPlayerOpen" size="small" type="number" value={data.PersonalPlayerOpen ?? 0} onChange={(e) => patch({ PersonalPlayerOpen: Number(e.target.value) || 0 })} />
                            </Box>
                        </Paper>
                    </Box>
                )}

                {tab === 'zombies' && (
                    <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                        <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                            <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                                {zombies.map((z, i) => (
                                    <ListItemButton key={i} selected={i === selectedZmbIdx} onClick={() => setSelectedZmbIdx(i)}>
                                        <ListItemText primary={z.ZmbClassName || `#${i + 1}`} secondary={t('brdkZmbPreset.presetsCount', { count: z.RandomPresetList.length })} />
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeZmb(i); }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemButton>
                                ))}
                            </List>
                            <Divider />
                            <Box sx={{ p: 1 }}>
                                <Button size="small" fullWidth startIcon={<AddIcon />} onClick={addZmb}>
                                    {t('brdkZmbPreset.addZombie')}
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                            {!selectedZmb ? (
                                <Typography color="text.secondary">{t('brdkZmbPreset.selectHint')}</Typography>
                            ) : (
                                <Stack spacing={2}>
                                    <TextField label="ZmbClassName" size="small" value={selectedZmb.ZmbClassName} onChange={(e) => patchZmb(selectedZmbIdx, { ZmbClassName: e.target.value })} sx={{ maxWidth: 320 }} />
                                    <Stack spacing={1.5}>
                                        {selectedZmb.RandomPresetList.map((preset, i) => (
                                            <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                        #{i + 1}
                                                    </Typography>
                                                    <IconButton size="small" onClick={() => removePreset(i)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                                <Stack spacing={1.5}>
                                                    <Box sx={FIELD_GRID_SX}>
                                                        <TextField label="PresetChanceMin" size="small" type="number" value={preset.PresetChanceMin} onChange={(e) => patchPreset(i, { PresetChanceMin: Number(e.target.value) || 0 })} />
                                                        <TextField label="PresetChanceMax" size="small" type="number" value={preset.PresetChanceMax} onChange={(e) => patchPreset(i, { PresetChanceMax: Number(e.target.value) || 0 })} />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            ItemList
                                                        </Typography>
                                                        <StringChipList values={preset.ItemList} onChange={(v) => patchPreset(i, { ItemList: v })} placeholder="ClassName|weight" />
                                                    </Box>
                                                </Stack>
                                            </Paper>
                                        ))}
                                        <Button size="small" startIcon={<AddIcon />} onClick={addPreset} sx={{ alignSelf: 'flex-start' }}>
                                            {t('brdkZmbPreset.addPreset')}
                                        </Button>
                                    </Stack>
                                </Stack>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
