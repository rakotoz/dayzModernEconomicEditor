import React, { useState } from 'react';
import { Box, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { emptyOre, emptySand, emptyVein, OreData, SandData, VeinData } from '../dayzConfig/brdkGoldRush';
import { StringChipList } from '../components/StringChipList';
import { FlatObjectListEditor } from '../components/FlatObjectListEditor';

interface BrdkGoldRushViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

type GoldRushTab = 'basic' | 'veins' | 'sand' | 'ore';

// profiles/BRDK_MODS/GoldRush.json — вместо общей RecursiveJsonForm: отдельные вкладки под
// общие настройки, жилы руды, песок и слитки — эти три списка совершенно не связаны визуально
// и в общей форме сваливались друг на друга.
export const BrdkGoldRushView = ({ data, onChange }: BrdkGoldRushViewProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<GoldRushTab>('basic');

    const badRiverBounty = (data.BadRiverBounty as string[] | undefined) ?? [];
    const mineTools = (data.MineTools as string[] | undefined) ?? [];
    const veins = (data.VeineDataDataList as unknown as VeinData[] | undefined) ?? [];
    const sands = (data.SandDataList as unknown as SandData[] | undefined) ?? [];
    const ores = (data.OreDataList as unknown as OreData[] | undefined) ?? [];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="basic" label={t('brdkGoldRush.tabs.basic')} />
                <Tab value="veins" label={t('brdkGoldRush.tabs.veins', { count: veins.length })} />
                <Tab value="sand" label={t('brdkGoldRush.tabs.sand', { count: sands.length })} />
                <Tab value="ore" label={t('brdkGoldRush.tabs.ore', { count: ores.length })} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: tab === 'basic' ? 'auto' : 'hidden' }}>
                {tab === 'basic' && (
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkGoldRush.sections.general')}
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                                <TextField label="GoldInRiverSearchTime" size="small" type="number" value={data.GoldInRiverSearchTime ?? 0} onChange={(e) => patch({ GoldInRiverSearchTime: Number(e.target.value) || 0 })} sx={{ width: 200 }} />
                                <TextField label="MinCountInRiver" size="small" type="number" value={data.MinCountInRiver ?? 0} onChange={(e) => patch({ MinCountInRiver: Number(e.target.value) || 0 })} sx={{ width: 160 }} />
                                <TextField label="MaxCountInRiver" size="small" type="number" value={data.MaxCountInRiver ?? 0} onChange={(e) => patch({ MaxCountInRiver: Number(e.target.value) || 0 })} sx={{ width: 160 }} />
                                <TextField label="MeltUpdatePeriod" size="small" type="number" value={data.MeltUpdatePeriod ?? 0} onChange={(e) => patch({ MeltUpdatePeriod: Number(e.target.value) || 0 })} sx={{ width: 170 }} />
                                <TextField label="MeltTempTreshold" size="small" type="number" value={data.MeltTempTreshold ?? 0} onChange={(e) => patch({ MeltTempTreshold: Number(e.target.value) || 0 })} sx={{ width: 170 }} />
                            </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                BadRiverBounty
                            </Typography>
                            <StringChipList values={badRiverBounty} onChange={(v) => patch({ BadRiverBounty: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                MineTools
                            </Typography>
                            <StringChipList values={mineTools} onChange={(v) => patch({ MineTools: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                    </Box>
                )}

                {tab === 'veins' && (
                    <FlatObjectListEditor
                        items={veins}
                        onChange={(v) => patch({ VeineDataDataList: v as unknown as JsonValue })}
                        titleField="VeinName"
                        emptyItem={emptyVein}
                        addLabel={t('brdkGoldRush.addVein')}
                        selectHint={t('brdkGoldRush.selectHint')}
                        fields={[
                            { key: 'VeinName', label: 'VeinName', width: 220 },
                            { key: 'GoodOre', label: 'GoodOre', width: 180 },
                            { key: 'BadOre', label: 'BadOre', width: 180 },
                            { key: 'MinCount', label: 'MinCount', type: 'number' },
                            { key: 'MaxCount', label: 'MaxCount', type: 'number' },
                            { key: 'MinQuant', label: 'MinQuant', type: 'number' },
                            { key: 'MaxQuant', label: 'MaxQuant', type: 'number' },
                            { key: 'OreChance', label: 'OreChance', type: 'number' },
                            { key: 'ToolDamageOnUse', label: 'ToolDamageOnUse', type: 'number' },
                            { key: 'MineTime', label: 'MineTime', type: 'number' },
                        ]}
                    />
                )}

                {tab === 'sand' && (
                    <FlatObjectListEditor
                        items={sands}
                        onChange={(v) => patch({ SandDataList: v as unknown as JsonValue })}
                        titleField="SandName"
                        emptyItem={emptySand}
                        addLabel={t('brdkGoldRush.addSand')}
                        selectHint={t('brdkGoldRush.selectHint')}
                        fields={[
                            { key: 'SandName', label: 'SandName', width: 220 },
                            { key: 'OreName', label: 'OreName', width: 180 },
                            { key: 'SandChance', label: 'SandChance', type: 'number' },
                            { key: 'MinQuant', label: 'MinQuant', type: 'number' },
                            { key: 'MaxQuant', label: 'MaxQuant', type: 'number' },
                            { key: 'MeltPressTime', label: 'MeltPressTime', type: 'number' },
                        ]}
                    />
                )}

                {tab === 'ore' && (
                    <FlatObjectListEditor
                        items={ores}
                        onChange={(v) => patch({ OreDataList: v as unknown as JsonValue })}
                        titleField="OreName"
                        emptyItem={emptyOre}
                        addLabel={t('brdkGoldRush.addOre')}
                        selectHint={t('brdkGoldRush.selectHint')}
                        fields={[
                            { key: 'OreName', label: 'OreName', width: 220 },
                            { key: 'IngotName', label: 'IngotName', width: 220 },
                            { key: 'MeltPressTime', label: 'MeltPressTime', type: 'number' },
                        ]}
                    />
                )}
            </Box>
        </Box>
    );
};
