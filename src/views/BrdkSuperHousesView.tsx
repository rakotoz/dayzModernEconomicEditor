import React, { useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { emptyHouseLimit, emptyKit, HouseKit, parseHousesResidentsLimit, serializeHousesResidentsLimit } from '../dayzConfig/brdkSuperHouses';
import { StringChipList } from '../components/StringChipList';
import { FlatObjectListEditor } from '../components/FlatObjectListEditor';

interface BrdkSuperHousesViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

type SuperHousesTab = 'basic' | 'houses' | 'kits';

// profiles/BRDK_MODS/SuperHouses.json — общие настройки рейдов отдельно от списка домов
// (лимиты жильцов, наличие воды) и отдельно от наборов материалов для постройки (KitDataList).
export const BrdkSuperHousesView = ({ data, onChange }: BrdkSuperHousesViewProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<SuperHousesTab>('basic');

    const adminList = (data.AdminList as string[] | undefined) ?? [];
    const housesWithWater = (data.HousesWithWater as string[] | undefined) ?? [];
    const houseLimits = useMemo(() => parseHousesResidentsLimit((data.HousesResidentsLimit as string[] | undefined) ?? []), [data.HousesResidentsLimit]);
    const kits = (data.KitDataList as unknown as HouseKit[] | undefined) ?? [];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });
    const updateHouseLimits = (next: ReturnType<typeof parseHousesResidentsLimit>) => patch({ HousesResidentsLimit: serializeHousesResidentsLimit(next) as unknown as JsonValue });

    const houseRows = useMemo(() => houseLimits.map((h, i) => ({ id: i, ...h })), [houseLimits]);
    const houseColumns: GridColDef[] = [
        { field: 'className', headerName: 'ClassName', flex: 1, editable: true },
        { field: 'limit', headerName: 'Limit', type: 'number', width: 120, editable: true },
        {
            field: 'actions',
            type: 'actions',
            width: 60,
            getActions: (params) => [
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon fontSize="small" />}
                    label="delete"
                    onClick={() => updateHouseLimits(houseLimits.filter((_, i) => i !== (params.id as number)))}
                />,
            ],
        },
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="basic" label={t('brdkSuperHouses.tabs.basic')} />
                <Tab value="houses" label={t('brdkSuperHouses.tabs.houses', { count: houseLimits.length })} />
                <Tab value="kits" label={t('brdkSuperHouses.tabs.kits', { count: kits.length })} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: tab === 'basic' ? 'auto' : 'hidden' }}>
                {tab === 'basic' && (
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkSuperHouses.sections.raid')}
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                                <TextField label="RaidEnable" size="small" type="number" value={data.RaidEnable ?? 0} onChange={(e) => patch({ RaidEnable: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="RaidTime" size="small" type="number" value={data.RaidTime ?? 0} onChange={(e) => patch({ RaidTime: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="ToolDamade" size="small" type="number" value={data.ToolDamade ?? 0} onChange={(e) => patch({ ToolDamade: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="SearchPlayerRadius" size="small" type="number" value={data.SearchPlayerRadius ?? 0} onChange={(e) => patch({ SearchPlayerRadius: Number(e.target.value) || 0 })} sx={{ width: 170 }} />
                                <TextField label="AutoCloseEnable" size="small" type="number" value={data.AutoCloseEnable ?? 0} onChange={(e) => patch({ AutoCloseEnable: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                            </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkSuperHouses.sections.storage')}
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                                <TextField label="IsJsonSave" size="small" type="number" value={data.IsJsonSave ?? 0} onChange={(e) => patch({ IsJsonSave: Number(e.target.value) || 0 })} sx={{ width: 130 }} />
                                <TextField label="IsJsonStoreSave" size="small" type="number" value={data.IsJsonStoreSave ?? 0} onChange={(e) => patch({ IsJsonStoreSave: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                                <TextField label="IsJsonStoreLoad" size="small" type="number" value={data.IsJsonStoreLoad ?? 0} onChange={(e) => patch({ IsJsonStoreLoad: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                            </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkSuperHouses.sections.admins')}
                            </Typography>
                            <StringChipList values={adminList} onChange={(v) => patch({ AdminList: v as unknown as JsonValue })} placeholder="SteamID64" />
                        </Paper>
                    </Box>
                )}

                {tab === 'houses' && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 2 }}>
                        <Paper variant="outlined" sx={{ p: 2, flexShrink: 0 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                HousesWithWater
                            </Typography>
                            <StringChipList values={housesWithWater} onChange={(v) => patch({ HousesWithWater: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => updateHouseLimits([...houseLimits, emptyHouseLimit()])}>
                                {t('brdkSuperHouses.addHouseLimit')}
                            </Button>
                        </Stack>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <DataGrid rows={houseRows} columns={houseColumns} density="compact" disableRowSelectionOnClick processRowUpdate={(newRow) => {
                                const next = houseLimits.map((h, i) => (i === newRow.id ? { className: String(newRow.className ?? ''), limit: Number(newRow.limit) || 0 } : h));
                                updateHouseLimits(next);
                                return newRow;
                            }} sx={{ height: '100%' }} />
                        </Box>
                    </Box>
                )}

                {tab === 'kits' && (
                    <FlatObjectListEditor
                        items={kits}
                        onChange={(v) => patch({ KitDataList: v as unknown as JsonValue })}
                        titleField="KitType"
                        emptyItem={emptyKit}
                        addLabel={t('brdkSuperHouses.addKit')}
                        selectHint={t('brdkSuperHouses.selectHint')}
                        fields={[
                            { key: 'KitType', label: 'KitType', width: 220 },
                            { key: 'NailsCount', label: 'NailsCount', type: 'number' },
                            { key: 'MetalSheetsCount', label: 'MetalSheetsCount', type: 'number' },
                            { key: 'WoodenLogsCount', label: 'WoodenLogsCount', type: 'number' },
                            { key: 'WoodenPlanksCount', label: 'WoodenPlanksCount', type: 'number' },
                            { key: 'StonesCount', label: 'StonesCount', type: 'number' },
                        ]}
                    />
                )}
            </Box>
        </Box>
    );
};
