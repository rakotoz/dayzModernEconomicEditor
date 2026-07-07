import React, { useMemo, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import {
    emptyLocation,
    emptyStashPreset,
    emptyStashPresetItem,
    emptyTier,
    MakeStashLocation,
    parseLocationsName,
    serializeLocationsName,
    SpawnTier,
    StashPreset,
    StashPresetItem,
} from '../dayzConfig/brdkMakeStash';
import { StringChipList } from '../components/StringChipList';

interface BrdkMakeStashViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

type MakeStashTab = 'basic' | 'locations' | 'presets';
type PresetsSubTab = 'tiers' | 'library';

// Тир спавна тайника (SpawnTierList) — PresetList/PresetListGaranted ссылаются на PresetName
// из библиотеки пресетов, поэтому даём выбор из уже существующих имён (плюс свободный ввод).
const TierNameChipList = ({ values, onChange, options }: { values: string[]; onChange: (v: string[]) => void; options: string[] }) => {
    const [draft, setDraft] = useState('');
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
            <Autocomplete
                freeSolo
                options={options.filter((o) => !values.includes(o))}
                inputValue={draft}
                onInputChange={(_, v) => setDraft(v)}
                onChange={(_, v) => {
                    if (v) {
                        onChange([...values, v]);
                        setDraft('');
                    }
                }}
                renderInput={(params) => <TextField {...params} size="small" placeholder="PresetName" sx={{ maxWidth: 260 }} />}
                sx={{ display: 'inline-block', width: 260 }}
            />
        </Box>
    );
};

// profiles/BRDK_MODS/MakeStash/MakeStash.json — вместо общей RecursiveJsonForm даём три
// отдельных экрана (по просьбе пользователя: "все в кучу и не понятно"): общие настройки,
// таблица локаций тайников (LocationsName — плоские строки "x y z|radius|Name", парсим/
// собираем в понятную таблицу) и пресеты лута (тиры + библиотека наборов предметов).
export const BrdkMakeStashView = ({ data, onChange }: BrdkMakeStashViewProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<MakeStashTab>('basic');
    const [presetsSubTab, setPresetsSubTab] = useState<PresetsSubTab>('tiers');
    const [selectedTierIdx, setSelectedTierIdx] = useState(0);
    const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);

    const adminList = (data.AdminList as string[] | undefined) ?? [];
    const locations = useMemo(() => parseLocationsName((data.LocationsName as string[] | undefined) ?? []), [data.LocationsName]);
    const tiers = (data.SpawnTierList as unknown as SpawnTier[] | undefined) ?? [];
    const presets = (data.StashSpawnPresetList as unknown as StashPreset[] | undefined) ?? [];
    const presetNames = useMemo(() => presets.map((p) => p.PresetName), [presets]);

    const patch = (patch: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...patch });

    const rows = useMemo(() => locations.map((l, i) => ({ id: i, ...l })), [locations]);
    const updateLocations = (next: MakeStashLocation[]) => patch({ LocationsName: serializeLocationsName(next) as unknown as JsonValue });

    const locationColumns: GridColDef[] = [
        { field: 'name', headerName: 'Name', flex: 1, editable: true },
        { field: 'x', headerName: 'X', type: 'number', width: 110, editable: true },
        { field: 'y', headerName: 'Y', type: 'number', width: 110, editable: true },
        { field: 'z', headerName: 'Z', type: 'number', width: 110, editable: true },
        { field: 'radius', headerName: 'Radius', type: 'number', width: 100, editable: true },
        {
            field: 'actions',
            type: 'actions',
            width: 60,
            getActions: (params) => [
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon fontSize="small" />}
                    label="delete"
                    onClick={() => updateLocations(locations.filter((_, i) => i !== (params.id as number)))}
                />,
            ],
        },
    ];

    const patchTier = (idx: number, tPatch: Partial<SpawnTier>) => {
        const next = tiers.map((t, i) => (i === idx ? { ...t, ...tPatch } : t));
        patch({ SpawnTierList: next as unknown as JsonValue });
    };
    const addTier = () => {
        patch({ SpawnTierList: [...tiers, emptyTier()] as unknown as JsonValue });
        setSelectedTierIdx(tiers.length);
    };
    const removeTier = (idx: number) => {
        patch({ SpawnTierList: tiers.filter((_, i) => i !== idx) as unknown as JsonValue });
        setSelectedTierIdx(0);
    };

    const patchPreset = (idx: number, pPatch: Partial<StashPreset>) => {
        const next = presets.map((p, i) => (i === idx ? { ...p, ...pPatch } : p));
        patch({ StashSpawnPresetList: next as unknown as JsonValue });
    };
    const addPreset = () => {
        patch({ StashSpawnPresetList: [...presets, emptyStashPreset()] as unknown as JsonValue });
        setSelectedPresetIdx(presets.length);
    };
    const removePreset = (idx: number) => {
        patch({ StashSpawnPresetList: presets.filter((_, i) => i !== idx) as unknown as JsonValue });
        setSelectedPresetIdx(0);
    };

    const selectedTier = tiers[selectedTierIdx];
    const selectedPreset = presets[selectedPresetIdx];

    const patchPresetItem = (itemIdx: number, iPatch: Partial<StashPresetItem>) => {
        if (!selectedPreset) return;
        const nextItems = selectedPreset.StashPresetCfgList.map((it, i) => (i === itemIdx ? { ...it, ...iPatch } : it));
        patchPreset(selectedPresetIdx, { StashPresetCfgList: nextItems });
    };
    const addPresetItem = () => {
        if (!selectedPreset) return;
        patchPreset(selectedPresetIdx, { StashPresetCfgList: [...selectedPreset.StashPresetCfgList, emptyStashPresetItem()] });
    };
    const removePresetItem = (itemIdx: number) => {
        if (!selectedPreset) return;
        patchPreset(selectedPresetIdx, { StashPresetCfgList: selectedPreset.StashPresetCfgList.filter((_, i) => i !== itemIdx) });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="basic" label={t('brdkMakeStash.tabs.basic')} />
                <Tab value="locations" label={t('brdkMakeStash.tabs.locations', { count: locations.length })} />
                <Tab value="presets" label={t('brdkMakeStash.tabs.presets')} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {tab === 'basic' && (
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkMakeStash.sections.general')}
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                                <TextField label="DebugStash" size="small" type="number" value={data.DebugStash ?? 0} onChange={(e) => patch({ DebugStash: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                                <TextField label="IgnoreChance" size="small" type="number" value={data.IgnoreChance ?? 0} onChange={(e) => patch({ IgnoreChance: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                                <TextField label="BleedChance" size="small" type="number" value={data.BleedChance ?? 0} onChange={(e) => patch({ BleedChance: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                                <TextField label="GlovesDamage" size="small" type="number" value={data.GlovesDamage ?? 0} onChange={(e) => patch({ GlovesDamage: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                            </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkMakeStash.sections.admins')}
                            </Typography>
                            <StringChipList values={adminList} onChange={(v) => patch({ AdminList: v as unknown as JsonValue })} placeholder="SteamID64" />
                        </Paper>
                    </Box>
                )}

                {tab === 'locations' && (
                    <Box sx={{ height: '100%', p: 2 }}>
                        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => updateLocations([...locations, emptyLocation()])}>
                                {t('brdkMakeStash.addLocation')}
                            </Button>
                        </Stack>
                        <DataGrid
                            rows={rows}
                            columns={locationColumns}
                            density="compact"
                            disableRowSelectionOnClick
                            processRowUpdate={(newRow) => {
                                const next = locations.map((l, i) => (i === newRow.id ? { x: Number(newRow.x) || 0, y: Number(newRow.y) || 0, z: Number(newRow.z) || 0, radius: Number(newRow.radius) || 0, name: String(newRow.name ?? '') } : l));
                                updateLocations(next);
                                return newRow;
                            }}
                            sx={{ height: 'calc(100% - 40px)' }}
                        />
                    </Box>
                )}

                {tab === 'presets' && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <Tabs value={presetsSubTab} onChange={(_, v) => setPresetsSubTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                            <Tab value="tiers" label={t('brdkMakeStash.tabs.tiers', { count: tiers.length })} />
                            <Tab value="library" label={t('brdkMakeStash.tabs.library', { count: presets.length })} />
                        </Tabs>

                        {presetsSubTab === 'tiers' && (
                            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                                <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                                        {tiers.map((tier, i) => (
                                            <ListItemButton key={i} selected={i === selectedTierIdx} onClick={() => setSelectedTierIdx(i)}>
                                                <ListItemText primary={tier.SpawnItemStash || `#${i + 1}`} />
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeTier(i); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </ListItemButton>
                                        ))}
                                    </List>
                                    <Divider />
                                    <Box sx={{ p: 1 }}>
                                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={addTier}>
                                            {t('brdkMakeStash.addTier')}
                                        </Button>
                                    </Box>
                                </Box>
                                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                                    {!selectedTier ? (
                                        <Typography color="text.secondary">{t('brdkMakeStash.selectHint')}</Typography>
                                    ) : (
                                        <Stack spacing={1.5} sx={{ maxWidth: 520 }}>
                                            <TextField label="SpawnItemStash" size="small" value={selectedTier.SpawnItemStash} onChange={(e) => patchTier(selectedTierIdx, { SpawnItemStash: e.target.value })} />
                                            <TextField label="SpawnLootItemStash" size="small" value={selectedTier.SpawnLootItemStash} onChange={(e) => patchTier(selectedTierIdx, { SpawnLootItemStash: e.target.value })} />
                                            <TextField label="SpawnChest" size="small" value={selectedTier.SpawnChest} onChange={(e) => patchTier(selectedTierIdx, { SpawnChest: e.target.value })} />
                                            <Stack direction="row" spacing={1.5}>
                                                <TextField label="MinSpawnChance" size="small" type="number" value={selectedTier.MinSpawnChance} onChange={(e) => patchTier(selectedTierIdx, { MinSpawnChance: Number(e.target.value) || 0 })} />
                                                <TextField label="MaxSpawnChance" size="small" type="number" value={selectedTier.MaxSpawnChance} onChange={(e) => patchTier(selectedTierIdx, { MaxSpawnChance: Number(e.target.value) || 0 })} />
                                            </Stack>
                                            <Stack direction="row" spacing={1.5}>
                                                <TextField label="DeleteChestTimer" size="small" type="number" value={selectedTier.DeleteChestTimer} onChange={(e) => patchTier(selectedTierIdx, { DeleteChestTimer: Number(e.target.value) || 0 })} />
                                                <TextField label="RespawnLoot" size="small" type="number" value={selectedTier.RespawnLoot} onChange={(e) => patchTier(selectedTierIdx, { RespawnLoot: Number(e.target.value) || 0 })} />
                                            </Stack>
                                            <Stack direction="row" spacing={1.5}>
                                                <TextField label="RespawnLootTimerMix" size="small" type="number" value={selectedTier.RespawnLootTimerMix} onChange={(e) => patchTier(selectedTierIdx, { RespawnLootTimerMix: Number(e.target.value) || 0 })} />
                                                <TextField label="RespawnLootTimerMax" size="small" type="number" value={selectedTier.RespawnLootTimerMax} onChange={(e) => patchTier(selectedTierIdx, { RespawnLootTimerMax: Number(e.target.value) || 0 })} />
                                            </Stack>
                                            <Stack direction="row" spacing={1.5}>
                                                <TextField label="ExplosionChance" size="small" type="number" value={selectedTier.ExplosionChance} onChange={(e) => patchTier(selectedTierIdx, { ExplosionChance: Number(e.target.value) || 0 })} />
                                                <TextField label="ExpljsionRadius" size="small" type="number" value={selectedTier.ExpljsionRadius} onChange={(e) => patchTier(selectedTierIdx, { ExpljsionRadius: Number(e.target.value) || 0 })} />
                                                <TextField label="ExplosionDamage" size="small" type="number" value={selectedTier.ExplosionDamage} onChange={(e) => patchTier(selectedTierIdx, { ExplosionDamage: Number(e.target.value) || 0 })} />
                                            </Stack>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">PresetList</Typography>
                                                <TierNameChipList values={selectedTier.PresetList} onChange={(v) => patchTier(selectedTierIdx, { PresetList: v })} options={presetNames} />
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">PresetListGaranted</Typography>
                                                <TierNameChipList values={selectedTier.PresetListGaranted} onChange={(v) => patchTier(selectedTierIdx, { PresetListGaranted: v })} options={presetNames} />
                                            </Box>
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {presetsSubTab === 'library' && (
                            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                                <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                                        {presets.map((preset, i) => (
                                            <ListItemButton key={i} selected={i === selectedPresetIdx} onClick={() => setSelectedPresetIdx(i)}>
                                                <ListItemText primary={preset.PresetName || `#${i + 1}`} secondary={t('brdkMakeStash.itemsCount', { count: preset.StashPresetCfgList.length })} />
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removePreset(i); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </ListItemButton>
                                        ))}
                                    </List>
                                    <Divider />
                                    <Box sx={{ p: 1 }}>
                                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={addPreset}>
                                            {t('brdkMakeStash.addPreset')}
                                        </Button>
                                    </Box>
                                </Box>
                                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                                    {!selectedPreset ? (
                                        <Typography color="text.secondary">{t('brdkMakeStash.selectHint')}</Typography>
                                    ) : (
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1.5}>
                                                <TextField label="PresetName" size="small" value={selectedPreset.PresetName} onChange={(e) => patchPreset(selectedPresetIdx, { PresetName: e.target.value })} />
                                                <TextField label="MinLootCount" size="small" type="number" value={selectedPreset.MinLootCount} onChange={(e) => patchPreset(selectedPresetIdx, { MinLootCount: Number(e.target.value) || 0 })} />
                                                <TextField label="MaxLootCount" size="small" type="number" value={selectedPreset.MaxLootCount} onChange={(e) => patchPreset(selectedPresetIdx, { MaxLootCount: Number(e.target.value) || 0 })} />
                                            </Stack>
                                            <Stack spacing={1.5}>
                                                {selectedPreset.StashPresetCfgList.map((item, i) => (
                                                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                                #{i + 1}
                                                            </Typography>
                                                            <IconButton size="small" onClick={() => removePresetItem(i)}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                        <Stack spacing={1}>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">ItemName</Typography>
                                                                <StringChipList values={item.ItemName} onChange={(v) => patchPresetItem(i, { ItemName: v })} placeholder="ClassName" />
                                                            </Box>
                                                            <Stack direction="row" spacing={1.5}>
                                                                <TextField label="SpawnChance" size="small" type="number" value={item.SpawnChance} onChange={(e) => patchPresetItem(i, { SpawnChance: Number(e.target.value) || 0 })} />
                                                                <TextField label="ItemQuantity" size="small" type="number" value={item.ItemQuantity} onChange={(e) => patchPresetItem(i, { ItemQuantity: Number(e.target.value) })} />
                                                                <TextField label="ItemHealth" size="small" type="number" value={item.ItemHealth} onChange={(e) => patchPresetItem(i, { ItemHealth: Number(e.target.value) })} />
                                                            </Stack>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">StashAttachesItemList</Typography>
                                                                <StringChipList values={item.StashAttachesItemList} onChange={(v) => patchPresetItem(i, { StashAttachesItemList: v })} placeholder="ClassName" />
                                                            </Box>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                                <Button size="small" startIcon={<AddIcon />} onClick={addPresetItem} sx={{ alignSelf: 'flex-start' }}>
                                                    {t('brdkMakeStash.addItem')}
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};
