import { Project } from '../types';
import { JsonValue, parseJsonConfigFile, serializeJsonConfigFile } from './cfgGameplay';
import { joinPath } from './pathUtils';

// ---- типы (по схемам мода Rev_Quests) ----
export interface RevReward { ClassName: string; Amount: number; HealthPercent: number; Chance: number }
export interface RevObjectiveRef { ID: number; ObjectiveType: string }

export interface RevQuest {
    ID: number;
    Title: string;
    DescriptionStart: string;
    DescriptionInProgress: string;
    DescriptionInEnd: string;
    ObjectiveText: string;
    QuestColor: number;   // акцент-цвет 0xRRGGBB (0 = дефолт)
    FollowUpQuest: number;
    PreQuestIDs: number[];
    Repeatable: number;
    IsDailyQuest: number;
    IsWeeklyQuest: number;
    IsGroupQuest: number;
    AutoStartOnFirstJoin: number;
    CancelQuestOnPlayerDeath: number;
    Autocomplete: number;
    Rewards: RevReward[];
    RankPointsReward: number;
    RequiredRank: number;
    QuestGiverIDs: number[];
    QuestTurnInIDs: number[];
    Objectives: RevObjectiveRef[];
    SequentialObjectives: number;
    Active: number;
    [key: string]: JsonValue | unknown;
}

export const OBJECTIVE_TYPES = ['Travel', 'Hunt', 'Collect', 'Delivery', 'Treasure', 'Action', 'Craft'] as const;
export type RevObjectiveType = (typeof OBJECTIVE_TYPES)[number];

export interface RevObjective {
    ID: number;
    ObjectiveType: string;
    ObjectiveText: string;
    TimeLimit: number;
    Active: number;
    MarkerName: string;
    Collections: { Amount: number; ClassName: string; QuantityPercent: number }[];
    NeedAnyCollection: number;
    GiveOnAccept: number;   // Delivery: выдать предметы игроку при взятии (курьер)
    TargetClass: string;
    TargetClasses: string[];
    Count: number;
    Position: number[];
    MaxDistance: number;
    ShowDistance: number;
    ShowMarker: number;
    TreasurePositions: { X: number; Y: number; Z: number }[];
    ContainerName: string;
    DigInStash: number;
    LootItemsAmount: number;
    Loot: { ClassName: string; Chance: number; Min: number; Max: number; QuantityPercent: number }[];
    ActionNames: string[];
    AllowedClassNames: string[];
    CraftItems: string[];
    ExecutionAmount: number;
    [key: string]: JsonValue | unknown;
}

export interface RevNpc {
    ID: number;
    ClassName: string;
    Position: number[];
    Orientation: number[];
    NPCName: string;
    DefaultNPCText: string;
    NPCLoadout: string;
    NPCType: number;
    Active: number;
    [key: string]: JsonValue | unknown;
}

// ---- поиск папок ----
const sub = async (project: Project, ...parts: string[]): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'Rev_mods');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Rev_Quests', ...parts);
};
export const findRevQuestsDir = (p: Project) => sub(p, 'Quests');
export const findRevObjectivesDir = (p: Project) => sub(p, 'Objectives');
export const findRevNpcsDir = (p: Project) => sub(p, 'QuestNPCs');

export const parseRevJson = parseJsonConfigFile;
export const serializeRevJson = serializeJsonConfigFile;

// ---- пустышки ----
export const emptyReward = (): RevReward => ({ ClassName: '', Amount: 1, HealthPercent: 100, Chance: 1 });

export const emptyQuest = (id: number): RevQuest => ({
    ID: id, Title: 'Новый квест', DescriptionStart: '', DescriptionInProgress: '', DescriptionInEnd: '',
    ObjectiveText: '', QuestColor: 0, FollowUpQuest: 0, PreQuestIDs: [], Repeatable: 0, IsDailyQuest: 0, IsWeeklyQuest: 0,
    IsGroupQuest: 0, AutoStartOnFirstJoin: 0, CancelQuestOnPlayerDeath: 0, Autocomplete: 0, Rewards: [],
    RankPointsReward: 0, RequiredRank: -1, QuestGiverIDs: [], QuestTurnInIDs: [], Objectives: [],
    SequentialObjectives: 1, Active: 1,
});

export const emptyObjective = (id: number, type: string): RevObjective => ({
    ID: id, ObjectiveType: type, ObjectiveText: '', TimeLimit: -1, Active: 1, MarkerName: '',
    Collections: [], NeedAnyCollection: 0, GiveOnAccept: 0, TargetClass: '', TargetClasses: [], Count: 1, Position: [],
    MaxDistance: 20, ShowDistance: 1, ShowMarker: type === 'Travel' ? 1 : 0, TreasurePositions: [],
    ContainerName: '', DigInStash: 0, LootItemsAmount: 3, Loot: [], ActionNames: [], AllowedClassNames: [],
    CraftItems: [], ExecutionAmount: 1,
});

export const emptyNpc = (id: number): RevNpc => ({
    ID: id, ClassName: 'Rev_QuestNPC_Mirek', Position: [0, 0, 0], Orientation: [0, 0, 0],
    NPCName: 'NPC', DefaultNPCText: '', NPCLoadout: '', NPCType: 0, Active: 1,
});

export const nextNumericId = (used: number[]): number => {
    let id = 1;
    const set = new Set(used);
    while (set.has(id)) id++;
    return id;
};
