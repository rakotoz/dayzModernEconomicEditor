import React, { useState } from 'react';
import { Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { emptyGammaZone, GammaZone } from '../dayzConfig/brdkGammaRay';
import { StringChipList } from '../components/StringChipList';

interface BrdkGammaRayViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

type GammaRayTab = 'basic' | 'settings' | 'zones';

const FIELD_GRID_SX = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 } as const;

// profiles/BRDK_MODS/GammaRay.json — общие таймеры/уведомления, настройки детектора аномалий
// (Settings) и список зон (ZoneList) — три совершенно разных по смыслу группы, каждая на своей
// вкладке вместо общей RecursiveJsonForm.
export const BrdkGammaRayView = ({ data, onChange }: BrdkGammaRayViewProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<GammaRayTab>('basic');
    const [selectedZoneIdx, setSelectedZoneIdx] = useState(0);

    const agentsInsertList = (data.AgentsInsertList as string[] | undefined) ?? [];
    const needTunedFrequency = (data.NeedTunedFrequency as string[] | undefined) ?? [];
    const settings = (data.Settings as unknown as Record<string, JsonValue> | undefined) ?? {};
    const protectionList = (settings.ProtectionList as string[] | undefined) ?? [];
    const fullProtectionList = (settings.FullProtectionList as string[] | undefined) ?? [];
    const zones = (data.ZoneList as unknown as GammaZone[] | undefined) ?? [];
    const selectedZone = zones[selectedZoneIdx];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });
    const patchSettings = (p: Partial<Record<string, JsonValue>>) => patch({ Settings: { ...settings, ...p } as unknown as JsonValue });

    const patchZone = (idx: number, zPatch: Partial<GammaZone>) => {
        const next = zones.map((z, i) => (i === idx ? { ...z, ...zPatch } : z));
        patch({ ZoneList: next as unknown as JsonValue });
    };
    const addZone = () => {
        patch({ ZoneList: [...zones, emptyGammaZone()] as unknown as JsonValue });
        setSelectedZoneIdx(zones.length);
    };
    const removeZone = (idx: number) => {
        patch({ ZoneList: zones.filter((_, i) => i !== idx) as unknown as JsonValue });
        setSelectedZoneIdx(0);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="basic" label={t('brdkGammaRay.tabs.basic')} />
                <Tab value="settings" label={t('brdkGammaRay.tabs.settings')} />
                <Tab value="zones" label={t('brdkGammaRay.tabs.zones', { count: zones.length })} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: tab === 'zones' ? 'hidden' : 'auto' }}>
                {tab === 'basic' && (
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkGammaRay.sections.timing')}
                            </Typography>
                            <Box sx={FIELD_GRID_SX}>
                                <TextField label="MinRestTime" size="small" type="number" value={data.MinRestTime ?? 0} onChange={(e) => patch({ MinRestTime: Number(e.target.value) || 0 })} />
                                <TextField label="MaxRestTime" size="small" type="number" value={data.MaxRestTime ?? 0} onChange={(e) => patch({ MaxRestTime: Number(e.target.value) || 0 })} />
                                <TextField label="MinDuration" size="small" type="number" value={data.MinDuration ?? 0} onChange={(e) => patch({ MinDuration: Number(e.target.value) || 0 })} />
                                <TextField label="MaxDuration" size="small" type="number" value={data.MaxDuration ?? 0} onChange={(e) => patch({ MaxDuration: Number(e.target.value) || 0 })} />
                                <TextField label="NoStartTimer" size="small" type="number" value={data.NoStartTimer ?? 0} onChange={(e) => patch({ NoStartTimer: Number(e.target.value) || 0 })} />
                                <TextField label="PreInformTimer" size="small" type="number" value={data.PreInformTimer ?? 0} onChange={(e) => patch({ PreInformTimer: Number(e.target.value) || 0 })} />
                            </Box>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkGammaRay.sections.damage')}
                            </Typography>
                            <Box sx={FIELD_GRID_SX}>
                                <TextField label="MinLootZone" size="small" type="number" value={data.MinLootZone ?? 0} onChange={(e) => patch({ MinLootZone: Number(e.target.value) || 0 })} />
                                <TextField label="MaxLootZone" size="small" type="number" value={data.MaxLootZone ?? 0} onChange={(e) => patch({ MaxLootZone: Number(e.target.value) || 0 })} />
                                <TextField label="HealthDmg" size="small" type="number" value={data.HealthDmg ?? 0} onChange={(e) => patch({ HealthDmg: Number(e.target.value) || 0 })} />
                                <TextField label="BloodDamage" size="small" type="number" value={data.BloodDamage ?? 0} onChange={(e) => patch({ BloodDamage: Number(e.target.value) || 0 })} />
                                <TextField label="ShockDamage" size="small" type="number" value={data.ShockDamage ?? 0} onChange={(e) => patch({ ShockDamage: Number(e.target.value) || 0 })} />
                                <TextField label="TemperatureReduction" size="small" type="number" value={data.TemperatureReduction ?? 0} onChange={(e) => patch({ TemperatureReduction: Number(e.target.value) || 0 })} />
                            </Box>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                AgentsInsertList
                            </Typography>
                            <StringChipList values={agentsInsertList} onChange={(v) => patch({ AgentsInsertList: v as unknown as JsonValue })} placeholder="id|weight" />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                NeedTunedFrequency
                            </Typography>
                            <StringChipList values={needTunedFrequency} onChange={(v) => patch({ NeedTunedFrequency: v as unknown as JsonValue })} placeholder="102.5" />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkGammaRay.sections.notifications')}
                            </Typography>
                            <Stack spacing={1.5}>
                                <TextField label="PreludeNotify" size="small" fullWidth multiline value={data.PreludeNotify ?? ''} onChange={(e) => patch({ PreludeNotify: e.target.value })} />
                                <TextField label="BeginNotify" size="small" fullWidth multiline value={data.BeginNotify ?? ''} onChange={(e) => patch({ BeginNotify: e.target.value })} />
                                <TextField label="EndNotify" size="small" fullWidth multiline value={data.EndNotify ?? ''} onChange={(e) => patch({ EndNotify: e.target.value })} />
                            </Stack>
                        </Paper>
                    </Box>
                )}

                {tab === 'settings' && (
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkGammaRay.sections.detector')}
                            </Typography>
                            <Box sx={FIELD_GRID_SX}>
                                <TextField label="CheckTimer" size="small" type="number" value={settings.CheckTimer ?? 0} onChange={(e) => patchSettings({ CheckTimer: Number(e.target.value) || 0 })} />
                                <TextField label="HouseCheckLength" size="small" type="number" value={settings.HouseCheckLength ?? 0} onChange={(e) => patchSettings({ HouseCheckLength: Number(e.target.value) || 0 })} />
                                <TextField label="DetectorRadiusDGA" size="small" type="number" value={settings.DetectorRadiusDGA ?? 0} onChange={(e) => patchSettings({ DetectorRadiusDGA: Number(e.target.value) || 0 })} />
                                <TextField label="DetectorRadiusLokatron" size="small" type="number" value={settings.DetectorRadiusLokatron ?? 0} onChange={(e) => patchSettings({ DetectorRadiusLokatron: Number(e.target.value) || 0 })} />
                                <TextField label="EmbientSoundset" size="small" value={settings.EmbientSoundset ?? ''} onChange={(e) => patchSettings({ EmbientSoundset: e.target.value })} />
                                <TextField label="MinSoundTimer" size="small" type="number" value={settings.MinSoundTimer ?? 0} onChange={(e) => patchSettings({ MinSoundTimer: Number(e.target.value) || 0 })} />
                                <TextField label="MaxSoundTimer" size="small" type="number" value={settings.MaxSoundTimer ?? 0} onChange={(e) => patchSettings({ MaxSoundTimer: Number(e.target.value) || 0 })} />
                            </Box>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                ProtectionList
                            </Typography>
                            <StringChipList values={protectionList} onChange={(v) => patchSettings({ ProtectionList: v as unknown as JsonValue })} placeholder="ClassName|ClassName" />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                FullProtectionList
                            </Typography>
                            <StringChipList values={fullProtectionList} onChange={(v) => patchSettings({ FullProtectionList: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                    </Box>
                )}

                {tab === 'zones' && (
                    <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                        <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                            <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                                {zones.map((z, i) => (
                                    <ListItemButton key={i} selected={i === selectedZoneIdx} onClick={() => setSelectedZoneIdx(i)}>
                                        <ListItemText primary={z.ZoneName || `#${i + 1}`} />
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeZone(i); }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemButton>
                                ))}
                            </List>
                            <Divider />
                            <Box sx={{ p: 1 }}>
                                <Button size="small" fullWidth startIcon={<AddIcon />} onClick={addZone}>
                                    {t('brdkGammaRay.addZone')}
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                            {!selectedZone ? (
                                <Typography color="text.secondary">{t('brdkGammaRay.selectHint')}</Typography>
                            ) : (
                                <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
                                    <Box sx={FIELD_GRID_SX}>
                                        <TextField label="ZoneName" size="small" value={selectedZone.ZoneName} onChange={(e) => patchZone(selectedZoneIdx, { ZoneName: e.target.value })} />
                                        <TextField label="ZoneCord" size="small" value={selectedZone.ZoneCord} onChange={(e) => patchZone(selectedZoneIdx, { ZoneCord: e.target.value })} />
                                        <TextField label="GammaAnomaliesAmmo" size="small" value={selectedZone.GammaAnomaliesAmmo} onChange={(e) => patchZone(selectedZoneIdx, { GammaAnomaliesAmmo: e.target.value })} />
                                        <TextField label="ZoneRadius" size="small" type="number" value={selectedZone.ZoneRadius} onChange={(e) => patchZone(selectedZoneIdx, { ZoneRadius: Number(e.target.value) || 0 })} />
                                        <TextField label="EmptyAnomalyDamage" size="small" type="number" value={selectedZone.EmptyAnomalyDamage} onChange={(e) => patchZone(selectedZoneIdx, { EmptyAnomalyDamage: Number(e.target.value) || 0 })} />
                                        <TextField label="ZoneLifeTime" size="small" type="number" value={selectedZone.ZoneLifeTime} onChange={(e) => patchZone(selectedZoneIdx, { ZoneLifeTime: Number(e.target.value) || 0 })} />
                                        <TextField label="LootChance" size="small" type="number" value={selectedZone.LootChance} onChange={(e) => patchZone(selectedZoneIdx, { LootChance: Number(e.target.value) || 0 })} />
                                        <TextField label="IncreaseChance" size="small" type="number" value={selectedZone.IncreaseChance} onChange={(e) => patchZone(selectedZoneIdx, { IncreaseChance: Number(e.target.value) || 0 })} />
                                        <TextField label="ZombieChance" size="small" type="number" value={selectedZone.ZombieChance} onChange={(e) => patchZone(selectedZoneIdx, { ZombieChance: Number(e.target.value) || 0 })} />
                                        <TextField label="MinLootPoints" size="small" type="number" value={selectedZone.MinLootPoints} onChange={(e) => patchZone(selectedZoneIdx, { MinLootPoints: Number(e.target.value) || 0 })} />
                                        <TextField label="MaxLootPoints" size="small" type="number" value={selectedZone.MaxLootPoints} onChange={(e) => patchZone(selectedZoneIdx, { MaxLootPoints: Number(e.target.value) || 0 })} />
                                        <TextField label="MinRadius" size="small" type="number" value={selectedZone.MinRadius} onChange={(e) => patchZone(selectedZoneIdx, { MinRadius: Number(e.target.value) || 0 })} />
                                        <TextField label="MaxRadius" size="small" type="number" value={selectedZone.MaxRadius} onChange={(e) => patchZone(selectedZoneIdx, { MaxRadius: Number(e.target.value) || 0 })} />
                                        <TextField label="MaxLoot" size="small" type="number" value={selectedZone.MaxLoot} onChange={(e) => patchZone(selectedZoneIdx, { MaxLoot: Number(e.target.value) || 0 })} />
                                        <TextField label="MaxLootLater" size="small" type="number" value={selectedZone.MaxLootLater} onChange={(e) => patchZone(selectedZoneIdx, { MaxLootLater: Number(e.target.value) || 0 })} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">ZombieList</Typography>
                                        <StringChipList values={selectedZone.ZombieList} onChange={(v) => patchZone(selectedZoneIdx, { ZombieList: v })} placeholder="ClassName|min|max" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">LootList</Typography>
                                        <StringChipList values={selectedZone.LootList} onChange={(v) => patchZone(selectedZoneIdx, { LootList: v })} placeholder="ClassName|min|max|chance" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">LootListLater</Typography>
                                        <StringChipList values={selectedZone.LootListLater} onChange={(v) => patchZone(selectedZoneIdx, { LootListLater: v })} placeholder="ClassName|min|max|chance" />
                                    </Box>
                                </Stack>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
