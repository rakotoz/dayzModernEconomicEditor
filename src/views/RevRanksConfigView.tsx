import React, { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { JsonValue } from '../dayzConfig/cfgGameplay';

type Props = { data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void };
type Rank = Record<string, JsonValue>;

// --- переиспользуемые под-компоненты (на уровне модуля, чтобы поля не теряли фокус) ---
const BoolField = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) => (
    <FormControlLabel control={<Checkbox size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} />} label={label} />
);

const StringChips = ({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (v: string[]) => void }) => {
    const [draft, setDraft] = useState('');
    const add = () => {
        const v = draft.trim();
        if (!v) return;
        onChange([...values, v]);
        setDraft('');
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label} <Typography component="span" variant="caption" color="text.disabled">· {values.length}</Typography>
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 1 }}>
                {values.map((v, i) => (
                    <Chip key={`${v}-${i}`} label={v} size="small" onDelete={() => onChange(values.filter((_, j) => j !== i))} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 240 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

const KeyValueMap = ({ label, keyPlaceholder, value, onChange }: { label: string; keyPlaceholder: string; value: Record<string, number>; onChange: (v: Record<string, number>) => void }) => {
    const [k, setK] = useState('');
    const [v, setV] = useState('');
    const entries = Object.entries(value ?? {});
    const add = () => {
        if (!k.trim()) return;
        onChange({ ...value, [k.trim()]: Number(v) || 0 });
        setK('');
        setV('');
    };
    const remove = (key: string) => {
        const next = { ...value };
        delete next[key];
        onChange(next);
    };
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label} <Typography component="span" variant="caption" color="text.disabled">· {entries.length}</Typography>
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5, mb: 1 }}>
                {entries.map(([key, val]) => (
                    <Chip key={key} label={`${key}: ${val}`} size="small" onDelete={() => remove(key)} />
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder={keyPlaceholder} value={k} onChange={(e) => setK(e.target.value)} sx={{ width: 200 }} />
                <TextField size="small" type="number" placeholder="0" value={v} onChange={(e) => setV(e.target.value)} sx={{ width: 90 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add}>
                    +
                </Button>
            </Stack>
        </Box>
    );
};

// --- гейтинг предметов ------------------------------------------------------
// В моде список ExcludeItemsList НЕ накопительный: предмет запрещён, если он
// есть в списке ТЕКУЩЕГО ранга. Чтобы ствол открылся на 10-м, его надо
// перечислить у рангов с 1 по 9 — руками это 30 копий с вычитанием.
// Здесь редактируем в удобном виде «предмет → с какого ранга доступен», а
// разворачивание по рангам делает applyGating.
type GateRow = { cls: string; rank: number; broken: boolean };

const rankLevel = (r: Rank, i: number) => (typeof r.Level === 'number' && r.Level > 0 ? (r.Level as number) : i + 1);
const rankExcl = (r: Rank): string[] => (Array.isArray(r.ExcludeItemsList) ? (r.ExcludeItemsList as string[]) : []);

const deriveGating = (ranks: Rank[]): GateRow[] => {
    const levels = new Map<string, number[]>();
    ranks.forEach((r, i) => {
        const L = rankLevel(r, i);
        rankExcl(r).forEach((cls) => {
            if (!levels.has(cls)) levels.set(cls, []);
            levels.get(cls)!.push(L);
        });
    });
    const rows: GateRow[] = [];
    levels.forEach((ls, cls) => {
        const sorted = [...ls].sort((a, b) => a - b);
        const max = sorted[sorted.length - 1];
        // корректный запрет идёт сплошняком с 1-го ранга до max; дыры означают,
        // что список правили руками — покажем как «сломанный»
        const contiguous = sorted.length === max && sorted.every((v, k) => v === k + 1);
        rows.push({ cls, rank: max + 1, broken: !contiguous });
    });
    return rows.sort((a, b) => a.rank - b.rank || a.cls.localeCompare(b.cls));
};

const applyGating = (ranks: Rank[], rows: GateRow[]): Rank[] =>
    ranks.map((r, i) => {
        const L = rankLevel(r, i);
        // на ранге L запрещено всё, что открывается ПОЗЖЕ него
        const list = rows.filter((x) => x.rank > L).map((x) => x.cls).sort();
        return { ...r, ExcludeItemsList: list as unknown as JsonValue };
    });

const GatingTable = ({ ranks, onChange }: { ranks: Rank[]; onChange: (next: Rank[]) => void }) => {
    const [cls, setCls] = useState('');
    const [rank, setRank] = useState('2');
    const rows = deriveGating(ranks);
    const maxLevel = ranks.length ? Math.max(...ranks.map(rankLevel)) : 0;
    const write = (next: GateRow[]) => onChange(applyGating(ranks, next));

    const add = () => {
        const name = cls.trim();
        const r = Number(rank);
        if (!name || !Number.isInteger(r) || r < 2 || r > maxLevel) return;
        write([...rows.filter((x) => x.cls !== name), { cls: name, rank: r, broken: false }]);
        setCls('');
    };

    const byRank = new Map<number, GateRow[]>();
    rows.forEach((r) => {
        if (!byRank.has(r.rank)) byRank.set(r.rank, []);
        byRank.get(r.rank)!.push(r);
    });
    const dupInfo = rows.filter((r) => r.broken);

    return (
        <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
                Предмет закрыт до указанного ранга. Списки запретов у всех рангов пересобираются автоматически —
                вручную их править больше не нужно. Ранг 1 = доступно всем, такие предметы просто не указывайте.
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField size="small" label="ClassName" placeholder="точное имя класса" value={cls} onChange={(e) => setCls(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} sx={{ width: 280 }} />
                <TextField size="small" type="number" label="доступен с ранга" value={rank} onChange={(e) => setRank(e.target.value)} sx={{ width: 150 }} />
                <Button size="small" startIcon={<AddIcon />} onClick={add} disabled={!cls.trim()}>
                    Добавить
                </Button>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">
                    предметов: {rows.length}
                </Typography>
            </Stack>

            {dupInfo.length > 0 && (
                <Typography variant="caption" color="warning.main">
                    Списки правились вручную и идут с пропусками: {dupInfo.map((d) => d.cls).join(', ')}. Любое изменение здесь приведёт их к порядку.
                </Typography>
            )}

            {[...byRank.keys()].sort((a, b) => a - b).map((lvl) => {
                const rk = ranks.find((r, i) => rankLevel(r, i) === lvl);
                const name = rk && typeof rk.Name === 'string' ? rk.Name : '';
                return (
                    <Box key={lvl}>
                        <Typography variant="caption" color="text.secondary">
                            с ранга {lvl} {name && `· ${name}`} <Typography component="span" variant="caption" color="text.disabled">· {byRank.get(lvl)!.length}</Typography>
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5 }}>
                            {byRank.get(lvl)!.map((r) => (
                                <Chip
                                    key={r.cls}
                                    label={r.cls}
                                    size="small"
                                    color={r.broken ? 'warning' : 'default'}
                                    onDelete={() => write(rows.filter((x) => x.cls !== r.cls))}
                                />
                            ))}
                        </Stack>
                    </Box>
                );
            })}

            {rows.length === 0 && (
                <Typography variant="caption" color="text.disabled">
                    Пусто — сейчас все предметы доступны с первого ранга.
                </Typography>
            )}
        </Stack>
    );
};

const RANK_NUMS: { k: string; label: string }[] = [
    { k: 'RankPoints', label: 'Порог очков' },
    { k: 'AddPointsKillAI', label: 'За killAI' },
    { k: 'AddPointsKillAIExpansion', label: 'За killAI (Exp)' },
    { k: 'AddPointsKillPlayer', label: 'За killPlayer' },
    { k: 'AddPointsDead', label: 'За смерть' },
    { k: 'ModifierActionAddPoints', label: 'Модиф. действий' },
    { k: 'ModifierRecipesAddPoints', label: 'Модиф. рецептов' },
];

const RankAccordion = ({ rank, index, onChange, onDelete }: { rank: Rank; index: number; onChange: (r: Rank) => void; onDelete: () => void }) => {
    const set = (patch: Rank) => onChange({ ...rank, ...patch });
    const num = (k: string) => (typeof rank[k] === 'number' ? (rank[k] as number) : 0);
    const arr = (k: string): string[] => (Array.isArray(rank[k]) ? (rank[k] as string[]) : []);
    const map = (k: string): Record<string, number> => (rank[k] && typeof rank[k] === 'object' && !Array.isArray(rank[k]) ? (rank[k] as Record<string, number>) : {});
    const excl = arr('ExcludeItemsList');

    return (
        <Accordion disableGutters variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <Typography sx={{ fontWeight: 'bold', minWidth: 24 }}>#{num('Level') || index + 1}</Typography>
                    <Typography sx={{ flex: 1 }}>{typeof rank.Name === 'string' ? rank.Name : ''}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {num('RankPoints')} очк · запретов {excl.length}
                    </Typography>
                    <IconButton size="small" component="span" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, rowGap: 2 }}>
                        <TextField label="Level" size="small" type="number" value={num('Level')} onChange={(e) => set({ Level: Number(e.target.value) || 0 })} sx={{ width: 100 }} />
                        <TextField label="Name" size="small" value={typeof rank.Name === 'string' ? rank.Name : ''} onChange={(e) => set({ Name: e.target.value })} sx={{ minWidth: 200 }} />
                        <TextField label="PresetName" size="small" value={typeof rank.PresetName === 'string' ? rank.PresetName : ''} onChange={(e) => set({ PresetName: e.target.value })} sx={{ width: 160 }} />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, rowGap: 2 }}>
                        {RANK_NUMS.map((f) => (
                            <TextField key={f.k} label={f.label} size="small" type="number" value={num(f.k)} onChange={(e) => set({ [f.k]: Number(e.target.value) || 0 })} sx={{ width: 150 }} />
                        ))}
                    </Box>
                    <KeyValueMap label="Подарки за ранг (AddRankGiftList)" keyPlaceholder="ClassName" value={map('AddRankGiftList')} onChange={(v) => set({ AddRankGiftList: v as unknown as JsonValue })} />
                    <StringChips label="Запрещённые предметы (ExcludeItemsList) — обычно правится через «Гейтинг предметов» выше" placeholder="ClassName" values={excl} onChange={(v) => set({ ExcludeItemsList: v as unknown as JsonValue })} />
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        <StringChips label="StopActionList" placeholder="ActionName" values={arr('StopActionList')} onChange={(v) => set({ StopActionList: v as unknown as JsonValue })} />
                        <StringChips label="StopActionBelowRanks" placeholder="ActionName" values={arr('StopActionBelowRanks')} onChange={(v) => set({ StopActionBelowRanks: v as unknown as JsonValue })} />
                    </Box>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};

export const RevRanksConfigView = ({ data, onChange }: Props) => {
    const set = (patch: Record<string, JsonValue>) => onChange({ ...data, ...patch });
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : '');
    const flag = (k: string) => data[k] === 1 || data[k] === true;
    const arr = (k: string): string[] => (Array.isArray(data[k]) ? (data[k] as string[]) : []);
    const map = (k: string): Record<string, number> => (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]) ? (data[k] as Record<string, number>) : {});

    const ranks: Rank[] = Array.isArray(data.Ranks) ? (data.Ranks as Rank[]) : [];
    const setRanks = (next: Rank[]) => set({ Ranks: next as unknown as JsonValue });

    return (
        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Общее
                </Typography>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, rowGap: 1, alignItems: 'center' }}>
                        <TextField label="ConfigVersion" size="small" value={str('ConfigVersion')} onChange={(e) => set({ ConfigVersion: e.target.value })} sx={{ width: 140 }} />
                        <BoolField checked={flag('Enabled')} label="Включено" onChange={(v) => set({ Enabled: v ? 1 : 0 })} />
                        <BoolField checked={flag('EnabledLog')} label="Лог" onChange={(v) => set({ EnabledLog: v ? 1 : 0 })} />
                    </Box>
                    <TextField label="Уведомление о ранге (TITLE|TEXT)" size="small" fullWidth value={str('LevelRankUpNoti')} onChange={(e) => set({ LevelRankUpNoti: e.target.value })} />
                    <TextField label="Звук повышения (LvlUpSound)" size="small" fullWidth value={str('LvlUpSound')} onChange={(e) => set({ LvlUpSound: e.target.value })} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0.5 }}>
                        <BoolField checked={flag('EnabledRankWeaponList')} label="Гейт оружия" onChange={(v) => set({ EnabledRankWeaponList: v ? 1 : 0 })} />
                        <BoolField checked={flag('EnabledRankClothingList')} label="Гейт одежды" onChange={(v) => set({ EnabledRankClothingList: v ? 1 : 0 })} />
                        <BoolField checked={flag('EnabledActionAddPoints')} label="Очки за действия" onChange={(v) => set({ EnabledActionAddPoints: v ? 1 : 0 })} />
                        <BoolField checked={flag('EnabledRecipesAddPoints')} label="Очки за рецепты" onChange={(v) => set({ EnabledRecipesAddPoints: v ? 1 : 0 })} />
                    </Box>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Админы
                </Typography>
                <StringChips label="AdminSteamIDList" placeholder="SteamID64" values={arr('AdminSteamIDList')} onChange={(v) => set({ AdminSteamIDList: v as unknown as JsonValue })} />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Очки за килл/действия/рецепты <Typography component="span" variant="caption" color="text.secondary">(ClassName → очки)</Typography>
                </Typography>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    <KeyValueMap label="За убийство (GlobalAddPointsKillAI)" keyPlaceholder="классы мобов" value={map('GlobalAddPointsKillAI')} onChange={(v) => set({ GlobalAddPointsKillAI: v as unknown as JsonValue })} />
                    <KeyValueMap label="За действия (ActionAddPoints)" keyPlaceholder="ActionName" value={map('ActionAddPoints')} onChange={(v) => set({ ActionAddPoints: v as unknown as JsonValue })} />
                    <KeyValueMap label="За рецепты (RecipesAddPoints)" keyPlaceholder="RecipeName" value={map('RecipesAddPoints')} onChange={(v) => set({ RecipesAddPoints: v as unknown as JsonValue })} />
                    <KeyValueMap label="Книги опыта (StudyItems)" keyPlaceholder="ClassName книги" value={map('StudyItems')} onChange={(v) => set({ StudyItems: v as unknown as JsonValue })} />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Гейтинг предметов <Typography component="span" variant="caption" color="text.secondary">(предмет → с какого ранга доступен)</Typography>
                </Typography>
                <GatingTable ranks={ranks} onChange={setRanks} />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridColumn: '1 / -1' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Ранги ({ranks.length})
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setRanks([...ranks, { Level: ranks.length + 1, Name: 'New rank', RankPoints: 0, AddPointsKillAI: 0, AddPointsKillAIExpansion: 0, AddPointsKillPlayer: 0, AddPointsDead: 0, ModifierActionAddPoints: 0, ModifierRecipesAddPoints: 0, StopActionList: [], StopActionBelowRanks: [], PresetName: `Preset_${ranks.length + 1}`, AddRankGiftList: {}, ExcludeItemsList: [] }])}
                    >
                        Добавить ранг
                    </Button>
                </Stack>
                <Stack spacing={1}>
                    {ranks.map((r, i) => (
                        <RankAccordion
                            key={i}
                            rank={r}
                            index={i}
                            onChange={(next) => setRanks(ranks.map((x, j) => (j === i ? next : x)))}
                            onDelete={() => setRanks(ranks.filter((_, j) => j !== i))}
                        />
                    ))}
                </Stack>
            </Paper>
        </Box>
    );
};
