import i18n from '../i18n';
import { Project } from '../types';
import { joinPath } from './pathUtils';

export interface QuestReward {
    ClassName: string;
    Amount: number;
    Attachments: string[];
    DamagePercent: number;
    HealthPercent?: number;
    QuestID: number;
    Chance: number;
}

export interface QuestItemRef {
    ClassName: string;
    Amount: number;
}

export interface QuestObjectiveRef {
    ConfigVersion: number;
    ID: number;
    ObjectiveType: number;
}

// Полная схема квеста Expansion (см. wiki DayZ-Expansion-Scripts, [Server Hosting] Quest
// Configuration). Индексная сигнатура сохраняет любые поля, которых нет в нашем списке —
// новые версии мода могут добавлять свои, терять их при сохранении нельзя.
export interface ExpansionQuest {
    ConfigVersion: number;
    ID: number;
    Type: number;
    Title: string;
    Descriptions: string[];
    ObjectiveText: string;
    FollowUpQuest: number;
    Repeatable: number;
    IsDailyQuest: number;
    IsWeeklyQuest: number;
    CancelQuestOnPlayerDeath: number;
    Autocomplete: number;
    IsGroupQuest: number;
    ObjectSetFileName: string;
    QuestItems: QuestItemRef[];
    Rewards: QuestReward[];
    NeedToSelectReward: number;
    RandomReward: number;
    RandomRewardAmount: number;
    RewardsForGroupOwnerOnly: number;
    RewardBehavior: number;
    QuestGiverIDs: number[];
    QuestTurnInIDs: number[];
    IsAchievement: number;
    Objectives: QuestObjectiveRef[];
    QuestColor: number;
    ReputationReward: number;
    ReputationRequirement: number;
    PreQuestIDs: number[];
    RequiredFaction: string;
    FactionReward: string;
    PlayerNeedQuestItems: number;
    DeleteQuestItems: number;
    SequentialObjectives: number;
    FactionReputationRequirements: Record<string, number>;
    FactionReputationRewards: Record<string, number>;
    SuppressQuestLogOnCompetion: number;
    Active: number;
    [key: string]: unknown;
}

// Часть файлов квестов сохранена сторонними редакторами с BOM в начале, часть — без.
// JSON.parse не переваривает BOM, поэтому снимаем его перед парсингом и запоминаем,
// чтобы вернуть на место при сохранении — иначе меняем формат файлов, которые не трогали.
export const parseQuestFile = (raw: string): { hadBom: boolean; quest: ExpansionQuest } => {
    const hadBom = raw.charCodeAt(0) === 0xfeff;
    const text = hadBom ? raw.slice(1) : raw;
    try {
        return { hadBom, quest: JSON.parse(text) as ExpansionQuest };
    } catch (e: any) {
        throw new Error(i18n.t('expansionQuests.parseFileError'));
    }
};

export const serializeQuestFile = (quest: ExpansionQuest, hadBom: boolean): string => {
    const json = JSON.stringify(quest, null, 4) + '\n';
    return hadBom ? '﻿' + json : json;
};

export const nextQuestId = (quests: ExpansionQuest[]): number => {
    let max = 0;
    for (const q of quests) if (q.ID > max) max = q.ID;
    return max + 1;
};

export const emptyQuest = (id: number): ExpansionQuest => ({
    ConfigVersion: 22,
    ID: id,
    Type: 1,
    Title: 'New quest',
    Descriptions: ['', '', ''],
    ObjectiveText: '',
    FollowUpQuest: -1,
    Repeatable: 0,
    IsDailyQuest: 0,
    IsWeeklyQuest: 0,
    CancelQuestOnPlayerDeath: 0,
    Autocomplete: 0,
    IsGroupQuest: 0,
    ObjectSetFileName: '',
    QuestItems: [],
    Rewards: [],
    NeedToSelectReward: 0,
    RandomReward: 0,
    RandomRewardAmount: -1,
    RewardsForGroupOwnerOnly: 1,
    RewardBehavior: 0,
    QuestGiverIDs: [],
    QuestTurnInIDs: [],
    IsAchievement: 0,
    Objectives: [],
    QuestColor: 0,
    ReputationReward: 0,
    ReputationRequirement: -1,
    PreQuestIDs: [],
    RequiredFaction: '',
    FactionReward: '',
    PlayerNeedQuestItems: 0,
    DeleteQuestItems: 0,
    SequentialObjectives: 1,
    FactionReputationRequirements: {},
    FactionReputationRewards: {},
    SuppressQuestLogOnCompetion: 0,
    Active: 1,
});

// Папка ExpansionMod ищется рекурсивно (см. detectExpansionMod) — раскладка серверов
// различается, точный путь от project.path заранее не известен.
export const findExpansionQuestsDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'ExpansionMod');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Quests', 'Quests');
};
