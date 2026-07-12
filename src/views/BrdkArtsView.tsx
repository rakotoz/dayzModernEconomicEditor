import React, { useMemo, useState } from 'react';
import { Box, Button, Divider, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import {
    AgentDescription,
    ArtDefinition,
    emptyAgentDescription,
    emptyArtDefinition,
    parseAgentsDiscription,
    serializeAgentsDiscription,
} from '../dayzConfig/brdkArts';
import { StringChipList } from '../components/StringChipList';

interface BrdkArtsViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

type ArtsTab = 'basic' | 'agents' | 'arts';

const FIELD_GRID_SX = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 } as const;

// profiles/BRDK_MODS/Arts/MainArts.json — общие настройки крафта/распада, легенда агентов
// заражения (таблица id/название) и сам список артефактов — три разные по смыслу вещи,
// раньше сваленные в одну общую форму.
export const BrdkArtsView = ({ data, onChange }: BrdkArtsViewProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<ArtsTab>('basic');
    const [selectedArtIdx, setSelectedArtIdx] = useState(0);

    const artBelt = (data.ArtBelt as string[] | undefined) ?? [];
    const artContainers = (data.ArtContainers as string[] | undefined) ?? [];
    const artContainersOld = (data.ArtContainersOld as string[] | undefined) ?? [];
    const agents = useMemo(() => parseAgentsDiscription((data.AgentsDiscription as string[] | undefined) ?? []), [data.AgentsDiscription]);
    const arts = (data.AllArtsList as unknown as ArtDefinition[] | undefined) ?? [];
    const selectedArt = arts[selectedArtIdx];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });
    const updateAgents = (next: AgentDescription[]) => patch({ AgentsDiscription: serializeAgentsDiscription(next) as unknown as JsonValue });

    // rowId отдельно от agentId — у AgentDescription собственное поле "id" (числовой код
    // агента заражения), которое иначе перезатёрло бы служебный id строки DataGrid.
    const agentRows = useMemo(() => agents.map((a, i) => ({ rowId: i, agentId: a.id, name: a.name })), [agents]);
    const agentColumns: GridColDef[] = [
        { field: 'agentId', headerName: 'ID', width: 100, editable: true },
        { field: 'name', headerName: 'Name', flex: 1, editable: true },
        {
            field: 'actions',
            type: 'actions',
            width: 60,
            getActions: (params) => [
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon fontSize="small" />}
                    label="delete"
                    onClick={() => updateAgents(agents.filter((_, i) => i !== (params.id as number)))}
                />,
            ],
        },
    ];

    const patchArt = (idx: number, aPatch: Partial<ArtDefinition>) => {
        const next = arts.map((a, i) => (i === idx ? { ...a, ...aPatch } : a));
        patch({ AllArtsList: next as unknown as JsonValue });
    };
    const addArt = () => {
        patch({ AllArtsList: [...arts, emptyArtDefinition()] as unknown as JsonValue });
        setSelectedArtIdx(arts.length);
    };
    const removeArt = (idx: number) => {
        patch({ AllArtsList: arts.filter((_, i) => i !== idx) as unknown as JsonValue });
        setSelectedArtIdx(0);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Tab value="basic" label={t('brdkArts.tabs.basic')} />
                <Tab value="agents" label={t('brdkArts.tabs.agents', { count: agents.length })} />
                <Tab value="arts" label={t('brdkArts.tabs.arts', { count: arts.length })} />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: tab === 'basic' ? 'auto' : 'hidden' }}>
                {tab === 'basic' && (
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                {t('brdkArts.sections.general')}
                            </Typography>
                            <Box sx={FIELD_GRID_SX}>
                                <TextField label="DecayUpdatePeriod" size="small" type="number" value={data.DecayUpdatePeriod ?? 0} onChange={(e) => patch({ DecayUpdatePeriod: Number(e.target.value) || 0 })} />
                                <TextField label="EffectUpdatePeriod" size="small" type="number" value={data.EffectUpdatePeriod ?? 0} onChange={(e) => patch({ EffectUpdatePeriod: Number(e.target.value) || 0 })} />
                                <TextField label="ChargeCost" size="small" type="number" value={data.ChargeCost ?? 0} onChange={(e) => patch({ ChargeCost: Number(e.target.value) || 0 })} />
                                <TextField label="ArtExploreCost" size="small" type="number" value={data.ArtExploreCost ?? 0} onChange={(e) => patch({ ArtExploreCost: Number(e.target.value) || 0 })} />
                                <TextField label="AnalizatorDamage" size="small" type="number" value={data.AnalizatorDamage ?? 0} onChange={(e) => patch({ AnalizatorDamage: Number(e.target.value) || 0 })} />
                                <TextField label="ArtCraftCost" size="small" type="number" value={data.ArtCraftCost ?? 0} onChange={(e) => patch({ ArtCraftCost: Number(e.target.value) || 0 })} />
                                <TextField label="CrafterDamage" size="small" type="number" value={data.CrafterDamage ?? 0} onChange={(e) => patch({ CrafterDamage: Number(e.target.value) || 0 })} />
                            </Box>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                ArtBelt
                            </Typography>
                            <StringChipList values={artBelt} onChange={(v) => patch({ ArtBelt: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                ArtContainers
                            </Typography>
                            <StringChipList values={artContainers} onChange={(v) => patch({ ArtContainers: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                ArtContainersOld
                            </Typography>
                            <StringChipList values={artContainersOld} onChange={(v) => patch({ ArtContainersOld: v as unknown as JsonValue })} placeholder="ClassName" />
                        </Paper>
                    </Box>
                )}

                {tab === 'agents' && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1 }}>
                        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => updateAgents([...agents, emptyAgentDescription()])}>
                                {t('brdkArts.addAgent')}
                            </Button>
                        </Stack>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <DataGrid
                                rows={agentRows}
                                columns={agentColumns}
                                getRowId={(row) => row.rowId}
                                density="compact"
                                disableRowSelectionOnClick
                                processRowUpdate={(newRow) => {
                                    const next = agents.map((a, i) => (i === newRow.rowId ? { id: String(newRow.agentId ?? ''), name: String(newRow.name ?? '') } : a));
                                    updateAgents(next);
                                    return newRow;
                                }}
                                sx={{ height: '100%' }}
                            />
                        </Box>
                    </Box>
                )}

                {tab === 'arts' && (
                    <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                        <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                            <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                                {arts.map((a, i) => (
                                    <ListItemButton key={i} selected={i === selectedArtIdx} onClick={() => setSelectedArtIdx(i)}>
                                        <ListItemText primary={a.ArtName || `#${i + 1}`} />
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeArt(i); }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemButton>
                                ))}
                            </List>
                            <Divider />
                            <Box sx={{ p: 1 }}>
                                <Button size="small" fullWidth startIcon={<AddIcon />} onClick={addArt}>
                                    {t('brdkArts.addArt')}
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                            {!selectedArt ? (
                                <Typography color="text.secondary">{t('brdkArts.selectHint')}</Typography>
                            ) : (
                                <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
                                    <TextField label="ArtName" size="small" value={selectedArt.ArtName} onChange={(e) => patchArt(selectedArtIdx, { ArtName: e.target.value })} sx={{ maxWidth: 320 }} />
                                    <Box sx={FIELD_GRID_SX}>
                                        <TextField label="ContainerDecay" size="small" type="number" value={selectedArt.ContainerDecay} onChange={(e) => patchArt(selectedArtIdx, { ContainerDecay: Number(e.target.value) || 0 })} />
                                        <TextField label="BeltDecay" size="small" type="number" value={selectedArt.BeltDecay} onChange={(e) => patchArt(selectedArtIdx, { BeltDecay: Number(e.target.value) || 0 })} />
                                        <TextField label="CargoDecay" size="small" type="number" value={selectedArt.CargoDecay} onChange={(e) => patchArt(selectedArtIdx, { CargoDecay: Number(e.target.value) || 0 })} />
                                        <TextField label="GroundDecay" size="small" type="number" value={selectedArt.GroundDecay} onChange={(e) => patchArt(selectedArtIdx, { GroundDecay: Number(e.target.value) || 0 })} />
                                        <TextField label="DischargeCoef" size="small" type="number" value={selectedArt.DischargeCoef} onChange={(e) => patchArt(selectedArtIdx, { DischargeCoef: Number(e.target.value) || 0 })} />
                                        <TextField label="ReducedEfficiency" size="small" type="number" value={selectedArt.ReducedEfficiency} onChange={(e) => patchArt(selectedArtIdx, { ReducedEfficiency: Number(e.target.value) || 0 })} />
                                        <TextField label="HPAdd" size="small" type="number" value={selectedArt.HPAdd} onChange={(e) => patchArt(selectedArtIdx, { HPAdd: Number(e.target.value) || 0 })} />
                                        <TextField label="HPAddLegs" size="small" type="number" value={selectedArt.HPAddLegs} onChange={(e) => patchArt(selectedArtIdx, { HPAddLegs: Number(e.target.value) || 0 })} />
                                        <TextField label="BloodAdd" size="small" type="number" value={selectedArt.BloodAdd} onChange={(e) => patchArt(selectedArtIdx, { BloodAdd: Number(e.target.value) || 0 })} />
                                        <TextField label="ShockAdd" size="small" type="number" value={selectedArt.ShockAdd} onChange={(e) => patchArt(selectedArtIdx, { ShockAdd: Number(e.target.value) || 0 })} />
                                        <TextField label="StaminaAdd" size="small" type="number" value={selectedArt.StaminaAdd} onChange={(e) => patchArt(selectedArtIdx, { StaminaAdd: Number(e.target.value) || 0 })} />
                                        <TextField label="AddWater" size="small" type="number" value={selectedArt.AddWater} onChange={(e) => patchArt(selectedArtIdx, { AddWater: Number(e.target.value) || 0 })} />
                                        <TextField label="AddFood" size="small" type="number" value={selectedArt.AddFood} onChange={(e) => patchArt(selectedArtIdx, { AddFood: Number(e.target.value) || 0 })} />
                                        <TextField label="TempValue" size="small" type="number" value={selectedArt.TempValue} onChange={(e) => patchArt(selectedArtIdx, { TempValue: Number(e.target.value) || 0 })} />
                                        <TextField label="WeaknessPower" size="small" type="number" value={selectedArt.WeaknessPower} onChange={(e) => patchArt(selectedArtIdx, { WeaknessPower: Number(e.target.value) || 0 })} />
                                        <TextField label="BleedChance" size="small" type="number" value={selectedArt.BleedChance} onChange={(e) => patchArt(selectedArtIdx, { BleedChance: Number(e.target.value) || 0 })} />
                                        <TextField label="WeightCoef" size="small" type="number" value={selectedArt.WeightCoef} onChange={(e) => patchArt(selectedArtIdx, { WeightCoef: Number(e.target.value) || 0 })} />
                                        <TextField label="RecoilCoef" size="small" type="number" value={selectedArt.RecoilCoef} onChange={(e) => patchArt(selectedArtIdx, { RecoilCoef: Number(e.target.value) || 0 })} />
                                        <TextField label="SwayCoef" size="small" type="number" value={selectedArt.SwayCoef} onChange={(e) => patchArt(selectedArtIdx, { SwayCoef: Number(e.target.value) || 0 })} />
                                        <TextField label="CraftTimer" size="small" type="number" value={selectedArt.CraftTimer} onChange={(e) => patchArt(selectedArtIdx, { CraftTimer: Number(e.target.value) })} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">ArtAgents</Typography>
                                        <StringChipList values={selectedArt.ArtAgents} onChange={(v) => patchArt(selectedArtIdx, { ArtAgents: v })} placeholder="id|value" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">ArtIngridients</Typography>
                                        <StringChipList values={selectedArt.ArtIngridients} onChange={(v) => patchArt(selectedArtIdx, { ArtIngridients: v })} placeholder="ClassName" />
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
