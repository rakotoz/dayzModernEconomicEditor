import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import {
    emptyQuest,
    ExpansionQuest,
    findExpansionQuestsDir,
    nextQuestId,
    parseQuestFile,
    QuestItemRef,
    QuestObjectiveRef,
    QuestReward,
    serializeQuestFile,
} from '../dayzConfig/expansionQuests';
import {
    AISpawn,
    CollectionRef,
    createObjectiveFilePath,
    emptyObjective,
    ExpansionObjective,
    loadAllObjectives,
    LootRef,
    nextObjectiveId,
    ObjectiveFileRow,
    OBJECTIVE_TYPES,
    objectiveTypeInfo,
    serializeObjectiveFile,
} from '../dayzConfig/expansionObjectives';
import { basenamePath } from '../dayzConfig/pathUtils';

interface QuestRow {
    rowId: string;
    filePath: string;
    hadBom: boolean;
    quest: ExpansionQuest;
}

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

const boolField = (v: unknown) => v === 1 || v === true;
const toBoolInt = (checked: boolean) => (checked ? 1 : 0);
const objKey = (type: number, id: number) => `${type}:${id}`;

// Компактный список чисел (ID квестов/NPC): чипы с удалением + поле добавления.
const NumberChipList = ({ label, values, onChange }: { label: string; values: number[]; onChange: (v: number[]) => void }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        const n = Number(draft);
        if (draft.trim() === '' || Number.isNaN(n)) return;
        onChange([...values, n]);
        setDraft('');
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 0.5 }}>
                {values.map((v, i) => (
                    <Chip key={i} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" type="number" placeholder="ID" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 100 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

// Список строк (classnames, оружие и т.п.) — та же механика, но без приведения к числу.
const StringChipList = ({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        if (!draft.trim()) return;
        onChange([...values, draft.trim()]);
        setDraft('');
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 0.5 }}>
                {values.map((v, i) => (
                    <Chip key={`${v}-${i}`} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder="classname" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ flex: 1, maxWidth: 260 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

// Пары ключ-число (FactionReputationRequirements/Rewards: имя фракции -> очки).
const KeyValueList = ({ label, value, onChange }: { label: string; value: Record<string, number>; onChange: (v: Record<string, number>) => void }) => {
    const [keyDraft, setKeyDraft] = useState('');
    const [valDraft, setValDraft] = useState('');
    const entries = Object.entries(value);
    const add = () => {
        if (!keyDraft.trim()) return;
        onChange({ ...value, [keyDraft.trim()]: Number(valDraft) || 0 });
        setKeyDraft('');
        setValDraft('');
    };
    const remove = (k: string) => {
        const next = { ...value };
        delete next[k];
        onChange(next);
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 0.5 }}>
                {entries.map(([k, v]) => (
                    <Chip key={k} label={`${k}: ${v}`} size="small" onDelete={() => remove(k)} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder="Faction" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} sx={{ width: 140 }} />
                <TextField size="small" type="number" placeholder="0" value={valDraft} onChange={(e) => setValDraft(e.target.value)} sx={{ width: 80 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

const PositionFields = ({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) => {
    const v = value && value.length === 3 ? value : [0, 0, 0];
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                    <TextField
                        key={axis}
                        label={axis}
                        size="small"
                        type="number"
                        value={v[i]}
                        onChange={(e) => {
                            const next = [...v];
                            next[i] = Number(e.target.value) || 0;
                            onChange(next);
                        }}
                        sx={{ width: 110 }}
                    />
                ))}
            </Stack>
        </Box>
    );
};

const CollectionsEditor = ({ items, onChange }: { items: CollectionRef[]; onChange: (v: CollectionRef[]) => void }) => (
    <Stack spacing={1}>
        {(items ?? []).map((c, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField label="ClassName" size="small" value={c.ClassName} onChange={(e) => {
                    const next = [...items]; next[i] = { ...c, ClassName: e.target.value }; onChange(next);
                }} sx={{ flex: 1 }} />
                <TextField label="Amount" size="small" type="number" value={c.Amount} onChange={(e) => {
                    const next = [...items]; next[i] = { ...c, Amount: Number(e.target.value) || 0 }; onChange(next);
                }} sx={{ width: 100 }} />
                <IconButton size="small" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Stack>
        ))}
        <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onChange([...(items ?? []), { Amount: 1, ClassName: '', QuantityPercent: -1, MinQuantityPercent: -1 }])}
        >
            Добавить предмет
        </Button>
    </Stack>
);

const AISpawnEditor = ({ spawn, onChange }: { spawn: AISpawn; onChange: (v: AISpawn) => void }) => (
    <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5}>
            <TextField label="Name" size="small" value={spawn.Name ?? ''} onChange={(e) => onChange({ ...spawn, Name: e.target.value })} />
            <TextField label="Faction" size="small" value={spawn.Faction ?? ''} onChange={(e) => onChange({ ...spawn, Faction: e.target.value })} />
            <TextField label="Loadout" size="small" value={spawn.Loadout ?? ''} onChange={(e) => onChange({ ...spawn, Loadout: e.target.value })} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
            <TextField label="NumberOfAI" size="small" type="number" value={spawn.NumberOfAI ?? 1} onChange={(e) => onChange({ ...spawn, NumberOfAI: Number(e.target.value) || 0 })} sx={{ width: 140 }} />
            <TextField label="Behaviour" size="small" value={spawn.Behaviour ?? ''} onChange={(e) => onChange({ ...spawn, Behaviour: e.target.value })} sx={{ width: 200 }} />
        </Stack>
        <StringChipList label="Units (classnames)" values={(spawn.Units as string[]) ?? []} onChange={(v) => onChange({ ...spawn, Units: v })} />
    </Stack>
);

// Форма конкретной цели зависит от выбранного типа (см. OBJECTIVE_TYPES); неизвестные
///нередактируемые поля объекта сохраняются as-is через patch поверх текущих данных.
const ObjectiveTypeForm = ({ data, onChange }: { data: ExpansionObjective; onChange: (patch: Partial<ExpansionObjective>) => void }) => {
    const type = data.ObjectiveType;

    if (type === 2) {
        return (
            <Stack spacing={1.5}>
                <PositionFields label="Position" value={(data.Position as number[]) ?? []} onChange={(v) => onChange({ Position: v })} />
                <Stack direction="row" spacing={1.5}>
                    <TextField label="Amount" size="small" type="number" value={data.Amount ?? 1} onChange={(e) => onChange({ Amount: Number(e.target.value) || 0 })} />
                    <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? -1} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) })} />
                    <TextField label="MinDistance" size="small" type="number" value={data.MinDistance ?? -1} onChange={(e) => onChange({ MinDistance: Number(e.target.value) })} />
                </Stack>
                <StringChipList label="ClassNames" values={(data.ClassNames as string[]) ?? []} onChange={(v) => onChange({ ClassNames: v })} />
                <StringChipList label="AllowedWeapons" values={(data.AllowedWeapons as string[]) ?? []} onChange={(v) => onChange({ AllowedWeapons: v })} />
                <FormControlLabel control={<Checkbox checked={boolField(data.CountSelfKill)} onChange={(e) => onChange({ CountSelfKill: toBoolInt(e.target.checked) })} />} label="CountSelfKill" />
                <FormControlLabel control={<Checkbox checked={boolField(data.CountAIPlayers)} onChange={(e) => onChange({ CountAIPlayers: toBoolInt(e.target.checked) })} />} label="CountAIPlayers" />
            </Stack>
        );
    }

    if (type === 3) {
        return (
            <Stack spacing={1.5}>
                <PositionFields label="Position" value={(data.Position as number[]) ?? []} onChange={(v) => onChange({ Position: v })} />
                <Stack direction="row" spacing={1.5}>
                    <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? 5} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) || 0 })} />
                    <TextField label="MarkerName" size="small" value={(data.MarkerName as string) ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={2}>
                    <FormControlLabel control={<Checkbox checked={boolField(data.TriggerOnEnter)} onChange={(e) => onChange({ TriggerOnEnter: toBoolInt(e.target.checked) })} />} label="TriggerOnEnter" />
                    <FormControlLabel control={<Checkbox checked={boolField(data.TriggerOnExit)} onChange={(e) => onChange({ TriggerOnExit: toBoolInt(e.target.checked) })} />} label="TriggerOnExit" />
                </Stack>
            </Stack>
        );
    }

    if (type === 4 || type === 5) {
        return (
            <Stack spacing={1.5}>
                <CollectionsEditor items={(data.Collections as CollectionRef[]) ?? []} onChange={(v) => onChange({ Collections: v })} />
                {type === 5 && (
                    <Stack direction="row" spacing={1.5}>
                        <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? 20} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) || 0 })} />
                        <TextField label="MarkerName" size="small" value={(data.MarkerName as string) ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ flex: 1 }} />
                    </Stack>
                )}
                {type === 4 && (
                    <FormControlLabel control={<Checkbox checked={boolField(data.NeedAnyCollection)} onChange={(e) => onChange({ NeedAnyCollection: toBoolInt(e.target.checked) })} />} label="NeedAnyCollection" />
                )}
                <FormControlLabel control={<Checkbox checked={boolField(data.AddItemsToNearbyMarketZone)} onChange={(e) => onChange({ AddItemsToNearbyMarketZone: toBoolInt(e.target.checked) })} />} label="AddItemsToNearbyMarketZone" />
            </Stack>
        );
    }

    if (type === 6) {
        const loot = (data.Loot as LootRef[]) ?? [];
        const positions = (data.Positions as number[][]) ?? [];
        return (
            <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5}>
                    <TextField label="ContainerName" size="small" value={(data.ContainerName as string) ?? ''} onChange={(e) => onChange({ ContainerName: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="MarkerName" size="small" value={(data.MarkerName as string) ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? 5} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) || 0 })} />
                    <TextField label="LootItemsAmount" size="small" type="number" value={data.LootItemsAmount ?? 1} onChange={(e) => onChange({ LootItemsAmount: Number(e.target.value) || 0 })} />
                </Stack>
                <FormControlLabel control={<Checkbox checked={boolField(data.DigInStash)} onChange={(e) => onChange({ DigInStash: toBoolInt(e.target.checked) })} />} label="DigInStash" />
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        Positions
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                        {positions.map((p, i) => (
                            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <PositionFields label={`#${i + 1}`} value={p} onChange={(v) => {
                                    const next = [...positions]; next[i] = v; onChange({ Positions: next });
                                }} />
                                <IconButton size="small" onClick={() => onChange({ Positions: positions.filter((_, j) => j !== i) })}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ))}
                        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ Positions: [...positions, [0, 0, 0]] })}>
                            Добавить позицию
                        </Button>
                    </Stack>
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        Loot
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                        {loot.map((l, i) => (
                            <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1 }}>
                                    <TextField label="Name" size="small" value={l.Name} onChange={(e) => { const next = [...loot]; next[i] = { ...l, Name: e.target.value }; onChange({ Loot: next }); }} sx={{ gridColumn: 'span 2' }} />
                                    <TextField label="Min" size="small" type="number" value={l.Min} onChange={(e) => { const next = [...loot]; next[i] = { ...l, Min: Number(e.target.value) || 0 }; onChange({ Loot: next }); }} />
                                    <TextField label="Max" size="small" type="number" value={l.Max} onChange={(e) => { const next = [...loot]; next[i] = { ...l, Max: Number(e.target.value) || 0 }; onChange({ Loot: next }); }} />
                                    <TextField label="Chance" size="small" type="number" value={l.Chance} onChange={(e) => { const next = [...loot]; next[i] = { ...l, Chance: Number(e.target.value) }; onChange({ Loot: next }); }} />
                                </Box>
                                <Button size="small" color="error" startIcon={<DeleteIcon />} sx={{ mt: 1 }} onClick={() => onChange({ Loot: loot.filter((_, j) => j !== i) })}>
                                    Удалить
                                </Button>
                            </Paper>
                        ))}
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => onChange({ Loot: [...loot, { Name: '', Chance: 1, Attachments: [], QuantityPercent: -1, Max: 1, Min: 1, Variants: [] }] })}
                        >
                            Добавить лут
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        );
    }

    if (type === 7) {
        const spawn = (data.AISpawn as AISpawn) ?? { Name: '', Faction: '', Loadout: '', Units: [], NumberOfAI: 1, Behaviour: '' };
        return (
            <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5}>
                    <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? -1} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) })} />
                    <TextField label="MinDistance" size="small" type="number" value={data.MinDistance ?? -1} onChange={(e) => onChange({ MinDistance: Number(e.target.value) })} />
                </Stack>
                <StringChipList label="AllowedWeapons" values={(data.AllowedWeapons as string[]) ?? []} onChange={(v) => onChange({ AllowedWeapons: v })} />
                <Divider />
                <Typography variant="caption" color="text.secondary">
                    AISpawn
                </Typography>
                <AISpawnEditor spawn={spawn} onChange={(v) => onChange({ AISpawn: v })} />
            </Stack>
        );
    }

    if (type === 8) {
        const spawns = (data.AISpawns as AISpawn[]) ?? [];
        return (
            <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5}>
                    <TextField label="InfectedDeletionRadius" size="small" type="number" value={data.InfectedDeletionRadius ?? 500} onChange={(e) => onChange({ InfectedDeletionRadius: Number(e.target.value) || 0 })} />
                    <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? -1} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) })} />
                    <TextField label="MinDistance" size="small" type="number" value={data.MinDistance ?? -1} onChange={(e) => onChange({ MinDistance: Number(e.target.value) })} />
                </Stack>
                <StringChipList label="AllowedWeapons" values={(data.AllowedWeapons as string[]) ?? []} onChange={(v) => onChange({ AllowedWeapons: v })} />
                <Typography variant="caption" color="text.secondary">
                    AISpawns
                </Typography>
                <Stack spacing={1}>
                    {spawns.map((s, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                            <AISpawnEditor spawn={s} onChange={(v) => { const next = [...spawns]; next[i] = v; onChange({ AISpawns: next }); }} />
                            <Button size="small" color="error" startIcon={<DeleteIcon />} sx={{ mt: 1 }} onClick={() => onChange({ AISpawns: spawns.filter((_, j) => j !== i) })}>
                                Удалить группу
                            </Button>
                        </Paper>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ AISpawns: [...spawns, { Name: '', Faction: 'West', Loadout: '', Units: [], NumberOfAI: 1, Behaviour: 'HALT_OR_LOOP' }] })}>
                        Добавить группу ИИ
                    </Button>
                </Stack>
            </Stack>
        );
    }

    if (type === 9) {
        return (
            <Stack spacing={1.5}>
                <PositionFields label="Position" value={(data.Position as number[]) ?? []} onChange={(v) => onChange({ Position: v })} />
                <Stack direction="row" spacing={1.5}>
                    <TextField label="MaxDistance" size="small" type="number" value={data.MaxDistance ?? 20} onChange={(e) => onChange({ MaxDistance: Number(e.target.value) || 0 })} />
                    <TextField label="MarkerName" size="small" value={(data.MarkerName as string) ?? ''} onChange={(e) => onChange({ MarkerName: e.target.value })} sx={{ flex: 1 }} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                    <TextField label="NPCName" size="small" value={(data.NPCName as string) ?? ''} onChange={(e) => onChange({ NPCName: e.target.value })} />
                    <TextField label="NPCClassName" size="small" value={(data.NPCClassName as string) ?? ''} onChange={(e) => onChange({ NPCClassName: e.target.value })} />
                    <TextField label="NPCLoadoutFile" size="small" value={(data.NPCLoadoutFile as string) ?? ''} onChange={(e) => onChange({ NPCLoadoutFile: e.target.value })} />
                </Stack>
                <FormControlLabel control={<Checkbox checked={boolField(data.CanLootAI)} onChange={(e) => onChange({ CanLootAI: toBoolInt(e.target.checked) })} />} label="CanLootAI" />
            </Stack>
        );
    }

    if (type === 10) {
        return (
            <Stack spacing={1.5}>
                <StringChipList label="ActionNames" values={(data.ActionNames as string[]) ?? []} onChange={(v) => onChange({ ActionNames: v })} />
                <StringChipList label="AllowedClassNames" values={(data.AllowedClassNames as string[]) ?? []} onChange={(v) => onChange({ AllowedClassNames: v })} />
                <StringChipList label="ExcludedClassNames" values={(data.ExcludedClassNames as string[]) ?? []} onChange={(v) => onChange({ ExcludedClassNames: v })} />
                <TextField label="ExecutionAmount" size="small" type="number" value={data.ExecutionAmount ?? 1} onChange={(e) => onChange({ ExecutionAmount: Number(e.target.value) || 0 })} sx={{ width: 160 }} />
            </Stack>
        );
    }

    if (type === 11) {
        return (
            <Stack spacing={1.5}>
                <StringChipList label="ItemNames" values={(data.ItemNames as string[]) ?? []} onChange={(v) => onChange({ ItemNames: v })} />
                <TextField label="ExecutionAmount" size="small" type="number" value={data.ExecutionAmount ?? 1} onChange={(e) => onChange({ ExecutionAmount: Number(e.target.value) || 0 })} sx={{ width: 160 }} />
            </Stack>
        );
    }

    return (
        <Typography variant="body2" color="text.secondary">
            Неизвестный тип цели {type}.
        </Typography>
    );
};

export const ExpansionQuestsView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [questsDir, setQuestsDir] = useState<string | null>(null);

    const [rows, setRows] = useState<QuestRow[]>([]);
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [objectivesIndex, setObjectivesIndex] = useState<Map<string, ObjectiveFileRow>>(new Map());
    const [dirtyObjectiveKeys, setDirtyObjectiveKeys] = useState<Set<string>>(new Set());

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const dir = await findExpansionQuestsDir(project);
        if (!dir) {
            setErrorMessage(t('expansionQuests.dirNotFound'));
            setStatus('error');
            return;
        }
        setQuestsDir(dir);
        setStatus('loading');

        const [filesRes, objIndex] = await Promise.all([window.api.findFilesByExtension(dir, ['json']), loadAllObjectives(project)]);
        if (!filesRes.success || !filesRes.data) {
            setErrorMessage(filesRes.error ?? t('expansionQuests.scanError'));
            setStatus('error');
            return;
        }

        const loaded = await Promise.all(
            filesRes.data.map(async (filePath) => {
                const res = await window.api.readFile(filePath);
                if (!res.success || res.data === undefined) return null;
                try {
                    const { hadBom, quest } = parseQuestFile(res.data);
                    return { rowId: nanoid(), filePath, hadBom, quest } as QuestRow;
                } catch {
                    return null;
                }
            })
        );

        const validRows = loaded.filter((r): r is QuestRow => r !== null).sort((a, b) => a.quest.ID - b.quest.ID);
        setRows(validRows);
        setDirtyPaths(new Set());
        setObjectivesIndex(objIndex);
        setDirtyObjectiveKeys(new Set());
        setSelectedId(validRows[0]?.rowId ?? null);
        setStatus('ready');
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const selected = rows.find((r) => r.rowId === selectedId) ?? null;

    const patchSelected = (patch: Partial<ExpansionQuest>) => {
        if (!selected) return;
        setRows((prev) => prev.map((r) => (r.rowId === selected.rowId ? { ...r, quest: { ...r.quest, ...patch } } : r)));
        setDirtyPaths((prev) => new Set(prev).add(selected.filePath));
    };

    const patchObjective = (type: number, id: number, patch: Partial<ExpansionObjective>) => {
        const key = objKey(type, id);
        setObjectivesIndex((prev) => {
            const row = prev.get(key);
            if (!row) return prev;
            const next = new Map(prev);
            next.set(key, { ...row, data: { ...row.data, ...patch } });
            return next;
        });
        setDirtyObjectiveKeys((prev) => new Set(prev).add(key));
    };

    const ensureObjective = async (type: number, id: number) => {
        const key = objKey(type, id);
        if (objectivesIndex.has(key) || !project) return;
        const filePath = await createObjectiveFilePath(project, type, id);
        if (!filePath) return;
        const data = emptyObjective(type, id);
        setObjectivesIndex((prev) => new Map(prev).set(key, { filePath, hadBom: false, data }));
        setDirtyObjectiveKeys((prev) => new Set(prev).add(key));
    };

    const handleAddObjectiveRef = () => {
        if (!selected) return;
        const defaultType = OBJECTIVE_TYPES[0].type;
        const id = nextObjectiveId(objectivesIndex, defaultType);
        const ref: QuestObjectiveRef = { ConfigVersion: 28, ID: id, ObjectiveType: defaultType };
        patchSelected({ Objectives: [...(selected.quest.Objectives ?? []), ref] });
        ensureObjective(defaultType, id);
    };

    const handleObjectiveTypeChange = (i: number, newType: number) => {
        if (!selected) return;
        const id = nextObjectiveId(objectivesIndex, newType);
        const next = [...selected.quest.Objectives];
        next[i] = { ...next[i], ObjectiveType: newType, ID: id };
        patchSelected({ Objectives: next });
        ensureObjective(newType, id);
    };

    const handleAddQuest = () => {
        if (!questsDir) return;
        const id = nextQuestId(rows.map((r) => r.quest));
        const filePath = `${questsDir}/Quest_${id}.json`;
        const row: QuestRow = { rowId: nanoid(), filePath, hadBom: false, quest: emptyQuest(id) };
        setRows((prev) => [...prev, row]);
        setDirtyPaths((prev) => new Set(prev).add(filePath));
        setSelectedId(row.rowId);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const path of dirtyPaths) {
            const row = rows.find((r) => r.filePath === path);
            if (!row) continue;
            const content = serializeQuestFile(row.quest, row.hadBom);
            const res = await window.api.writeFile(path, content);
            if (!res.success) failures.push(`${basenamePath(path)}: ${res.error ?? t('expansionQuests.saveError')}`);
        }
        for (const key of dirtyObjectiveKeys) {
            const row = objectivesIndex.get(key);
            if (!row) continue;
            const content = serializeObjectiveFile(row.data, row.hadBom);
            const res = await window.api.writeFile(row.filePath, content);
            if (!res.success) failures.push(`${basenamePath(row.filePath)}: ${res.error ?? t('expansionQuests.saveError')}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('\n'));
            return;
        }
        setDirtyPaths(new Set());
        setDirtyObjectiveKeys(new Set());
        setSavedNotice(true);
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.quest.Title?.toLowerCase().includes(q) || String(r.quest.ID).includes(q));
    }, [rows, search]);

    const totalDirty = dirtyPaths.size + dirtyObjectiveKeys.size;

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('expansionQuests.detecting') : t('expansionQuests.loading')}</Typography>
            </Stack>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                    {errorMessage}
                </Alert>
                <Button startIcon={<RefreshIcon />} onClick={load}>
                    {t('common.retry')}
                </Button>
            </Box>
        );
    }

    const q = selected?.quest;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('expansionQuests.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={questsDir ?? ''}>
                        {questsDir} • {t('expansionQuests.recordsCount', { count: rows.length })}
                    </Typography>
                </Box>
                <Button size="small" onClick={load}>
                    {t('common.changeFile')}
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={totalDirty === 0 || saving} onClick={handleSave}>
                    {t('common.save')} {totalDirty > 0 && `(${totalDirty})`}
                </Button>
            </Stack>

            {saveError && (
                <Alert severity="error" sx={{ mx: 2, mt: 2, whiteSpace: 'pre-line' }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ width: 300, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 1.5 }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={t('expansionQuests.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
                        />
                    </Box>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {filteredRows.map((r) => (
                            <ListItemButton key={r.rowId} selected={r.rowId === selectedId} onClick={() => setSelectedId(r.rowId)}>
                                <ListItemText primary={`#${r.quest.ID} ${r.quest.Title || ''}`} secondary={dirtyPaths.has(r.filePath) ? t('common.unsaved') : basenamePath(r.filePath)} />
                            </ListItemButton>
                        ))}
                        {filteredRows.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {t('expansionQuests.nothingFound')}
                            </Typography>
                        )}
                    </List>
                    <Divider />
                    <Box sx={{ p: 1 }}>
                        <Button size="small" fullWidth startIcon={<AddIcon />} onClick={handleAddQuest}>
                            {t('expansionQuests.addQuest')}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {!q ? (
                        <Typography color="text.secondary">{t('expansionQuests.selectHint')}</Typography>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionQuests.sections.basic')}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="ID" size="small" type="number" value={q.ID} onChange={(e) => patchSelected({ ID: Number(e.target.value) || 0 })} sx={{ width: 100 }} />
                                        <TextField label="Title" size="small" fullWidth value={q.Title ?? ''} onChange={(e) => patchSelected({ Title: e.target.value })} />
                                    </Stack>
                                    <TextField label="ObjectiveText" size="small" fullWidth value={q.ObjectiveText ?? ''} onChange={(e) => patchSelected({ ObjectiveText: e.target.value })} />
                                    {[0, 1, 2].map((i) => (
                                        <TextField
                                            key={i}
                                            label={`Descriptions[${i}]`}
                                            size="small"
                                            fullWidth
                                            multiline
                                            value={q.Descriptions?.[i] ?? ''}
                                            onChange={(e) => {
                                                const next = [...(q.Descriptions ?? ['', '', ''])];
                                                next[i] = e.target.value;
                                                patchSelected({ Descriptions: next });
                                            }}
                                        />
                                    ))}
                                    <TextField label="ObjectSetFileName" size="small" fullWidth value={q.ObjectSetFileName ?? ''} onChange={(e) => patchSelected({ ObjectSetFileName: e.target.value })} helperText={t('expansionQuests.objectSetHelper')} />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionQuests.sections.behavior')}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 0.5 }}>
                                    {(['Repeatable', 'IsDailyQuest', 'IsWeeklyQuest', 'CancelQuestOnPlayerDeath', 'Autocomplete', 'SequentialObjectives', 'IsGroupQuest', 'IsAchievement', 'Active'] as const).map((field) => (
                                        <FormControlLabel key={field} control={<Checkbox checked={boolField(q[field])} onChange={(e) => patchSelected({ [field]: toBoolInt(e.target.checked) } as Partial<ExpansionQuest>)} />} label={field} />
                                    ))}
                                </Box>
                                <TextField label="FollowUpQuest" size="small" type="number" value={q.FollowUpQuest ?? -1} onChange={(e) => patchSelected({ FollowUpQuest: Number(e.target.value) })} sx={{ width: 160, mt: 1 }} />
                                <Box sx={{ mt: 1.5 }}>
                                    <NumberChipList label="PreQuestIDs" values={q.PreQuestIDs ?? []} onChange={(v) => patchSelected({ PreQuestIDs: v })} />
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionQuests.sections.npcs')}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <NumberChipList label="QuestGiverIDs" values={q.QuestGiverIDs ?? []} onChange={(v) => patchSelected({ QuestGiverIDs: v })} />
                                    <NumberChipList label="QuestTurnInIDs" values={q.QuestTurnInIDs ?? []} onChange={(v) => patchSelected({ QuestTurnInIDs: v })} />
                                    <Stack direction="row" spacing={1.5}>
                                        <TextField label="RequiredFaction" size="small" fullWidth value={q.RequiredFaction ?? ''} onChange={(e) => patchSelected({ RequiredFaction: e.target.value })} />
                                        <TextField label="FactionReward" size="small" fullWidth value={q.FactionReward ?? ''} onChange={(e) => patchSelected({ FactionReward: e.target.value })} />
                                    </Stack>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionQuests.sections.rewards')}
                                </Typography>
                                <Stack spacing={1}>
                                    {(q.Rewards ?? []).map((r, i) => (
                                        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1 }}>
                                                <TextField label="ClassName" size="small" value={r.ClassName} onChange={(e) => { const next = [...q.Rewards]; next[i] = { ...r, ClassName: e.target.value }; patchSelected({ Rewards: next }); }} sx={{ gridColumn: 'span 2' }} />
                                                <TextField label="Amount" size="small" type="number" value={r.Amount} onChange={(e) => { const next = [...q.Rewards]; next[i] = { ...r, Amount: Number(e.target.value) || 0 }; patchSelected({ Rewards: next }); }} />
                                                <TextField label="Chance" size="small" type="number" value={r.Chance} onChange={(e) => { const next = [...q.Rewards]; next[i] = { ...r, Chance: Number(e.target.value) }; patchSelected({ Rewards: next }); }} />
                                                <TextField label="DamagePercent" size="small" type="number" value={r.DamagePercent} onChange={(e) => { const next = [...q.Rewards]; next[i] = { ...r, DamagePercent: Number(e.target.value) || 0 }; patchSelected({ Rewards: next }); }} />
                                                <TextField label="QuestID" size="small" type="number" value={r.QuestID} onChange={(e) => { const next = [...q.Rewards]; next[i] = { ...r, QuestID: Number(e.target.value) }; patchSelected({ Rewards: next }); }} />
                                            </Box>
                                            <Button size="small" color="error" startIcon={<DeleteIcon />} sx={{ mt: 1 }} onClick={() => patchSelected({ Rewards: q.Rewards.filter((_, j) => j !== i) })}>
                                                {t('common.delete')}
                                            </Button>
                                        </Paper>
                                    ))}
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => {
                                            const reward: QuestReward = { ClassName: '', Amount: 1, Attachments: [], DamagePercent: 0, QuestID: -1, Chance: 1 };
                                            patchSelected({ Rewards: [...(q.Rewards ?? []), reward] });
                                        }}
                                    >
                                        {t('expansionQuests.addReward')}
                                    </Button>
                                </Stack>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 0.5 }}>
                                    {(['NeedToSelectReward', 'RandomReward', 'RewardsForGroupOwnerOnly'] as const).map((field) => (
                                        <FormControlLabel key={field} control={<Checkbox checked={boolField(q[field])} onChange={(e) => patchSelected({ [field]: toBoolInt(e.target.checked) } as Partial<ExpansionQuest>)} />} label={field} />
                                    ))}
                                </Box>
                                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                                    <TextField label="RandomRewardAmount" size="small" type="number" value={q.RandomRewardAmount ?? -1} onChange={(e) => patchSelected({ RandomRewardAmount: Number(e.target.value) })} />
                                    <TextField label="RewardBehavior" size="small" type="number" value={q.RewardBehavior ?? 0} onChange={(e) => patchSelected({ RewardBehavior: Number(e.target.value) || 0 })} />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionQuests.sections.questItems')}
                                </Typography>
                                <Stack spacing={1}>
                                    {(q.QuestItems ?? []).map((it: QuestItemRef, i) => (
                                        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                            <TextField label="ClassName" size="small" fullWidth value={it.ClassName} onChange={(e) => { const next = [...q.QuestItems]; next[i] = { ...it, ClassName: e.target.value }; patchSelected({ QuestItems: next }); }} />
                                            <TextField label="Amount" size="small" type="number" value={it.Amount} onChange={(e) => { const next = [...q.QuestItems]; next[i] = { ...it, Amount: Number(e.target.value) || 0 }; patchSelected({ QuestItems: next }); }} sx={{ width: 100 }} />
                                            <IconButton size="small" onClick={() => patchSelected({ QuestItems: q.QuestItems.filter((_, j) => j !== i) })}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => patchSelected({ QuestItems: [...(q.QuestItems ?? []), { ClassName: '', Amount: 1 }] })}>
                                        {t('expansionQuests.addQuestItem')}
                                    </Button>
                                </Stack>
                                <Box sx={{ mt: 1.5, display: 'flex', gap: 2 }}>
                                    <FormControlLabel control={<Checkbox checked={boolField(q.PlayerNeedQuestItems)} onChange={(e) => patchSelected({ PlayerNeedQuestItems: toBoolInt(e.target.checked) })} />} label="PlayerNeedQuestItems" />
                                    <FormControlLabel control={<Checkbox checked={boolField(q.DeleteQuestItems)} onChange={(e) => patchSelected({ DeleteQuestItems: toBoolInt(e.target.checked) })} />} label="DeleteQuestItems" />
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {t('expansionQuests.sections.objectives')}
                                    </Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddObjectiveRef}>
                                        {t('expansionQuests.addObjectiveRef')}
                                    </Button>
                                </Stack>
                                <Stack spacing={1.5}>
                                    {(q.Objectives ?? []).map((o: QuestObjectiveRef, i) => {
                                        const key = objKey(o.ObjectiveType, o.ID);
                                        const objRow = objectivesIndex.get(key);
                                        return (
                                            <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                                                    <TextField
                                                        select
                                                        label="Тип"
                                                        size="small"
                                                        value={o.ObjectiveType}
                                                        onChange={(e) => handleObjectiveTypeChange(i, Number(e.target.value))}
                                                        sx={{ flex: 1 }}
                                                    >
                                                        {OBJECTIVE_TYPES.map((info) => (
                                                            <MenuItem key={info.type} value={info.type}>
                                                                {info.label}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                    <TextField
                                                        label="ID"
                                                        size="small"
                                                        type="number"
                                                        value={o.ID}
                                                        onChange={(e) => {
                                                            const newId = Number(e.target.value) || 0;
                                                            const next = [...q.Objectives];
                                                            next[i] = { ...o, ID: newId };
                                                            patchSelected({ Objectives: next });
                                                            ensureObjective(o.ObjectiveType, newId);
                                                        }}
                                                        sx={{ width: 90 }}
                                                    />
                                                    <IconButton size="small" onClick={() => patchSelected({ Objectives: q.Objectives.filter((_, j) => j !== i) })}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                                {objRow ? (
                                                    <>
                                                        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                                                            <TextField
                                                                label="ObjectiveText"
                                                                size="small"
                                                                fullWidth
                                                                value={(objRow.data.ObjectiveText as string) ?? ''}
                                                                onChange={(e) => patchObjective(o.ObjectiveType, o.ID, { ObjectiveText: e.target.value })}
                                                            />
                                                            <TextField
                                                                label="TimeLimit"
                                                                size="small"
                                                                type="number"
                                                                value={objRow.data.TimeLimit ?? -1}
                                                                onChange={(e) => patchObjective(o.ObjectiveType, o.ID, { TimeLimit: Number(e.target.value) })}
                                                                sx={{ width: 120 }}
                                                            />
                                                        </Stack>
                                                        <ObjectiveTypeForm data={objRow.data} onChange={(patch) => patchObjective(o.ObjectiveType, o.ID, patch)} />
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }} noWrap title={objRow.filePath}>
                                                            {basenamePath(objRow.filePath)}
                                                            {dirtyObjectiveKeys.has(key) ? ` • ${t('common.unsaved')}` : ''}
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {t('expansionQuests.objectiveNotFound')}
                                                    </Typography>
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                                    {t('expansionQuests.sections.reputation')}
                                </Typography>
                                <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                                    <TextField label="ReputationReward" size="small" type="number" value={q.ReputationReward ?? 0} onChange={(e) => patchSelected({ ReputationReward: Number(e.target.value) || 0 })} />
                                    <TextField label="ReputationRequirement" size="small" type="number" value={q.ReputationRequirement ?? -1} onChange={(e) => patchSelected({ ReputationRequirement: Number(e.target.value) })} />
                                    <TextField label="QuestColor" size="small" type="number" value={q.QuestColor ?? 0} onChange={(e) => patchSelected({ QuestColor: Number(e.target.value) || 0 })} />
                                </Stack>
                                <Stack spacing={1.5}>
                                    <KeyValueList label="FactionReputationRequirements" value={q.FactionReputationRequirements ?? {}} onChange={(v) => patchSelected({ FactionReputationRequirements: v })} />
                                    <KeyValueList label="FactionReputationRewards" value={q.FactionReputationRewards ?? {}} onChange={(v) => patchSelected({ FactionReputationRewards: v })} />
                                </Stack>
                                <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={boolField(q.SuppressQuestLogOnCompetion)} onChange={(e) => patchSelected({ SuppressQuestLogOnCompetion: toBoolInt(e.target.checked) })} />} label="SuppressQuestLogOnCompetion" />
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
