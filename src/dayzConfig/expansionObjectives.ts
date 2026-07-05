import { Project } from '../types';
import { joinPath } from './pathUtils';

// Карта типов целей (Objectives) Expansion: ObjectiveType -> подпапка на диске + служебный
// префикс имени файла новых записей. Собрано по факту из реальных файлов проекта (folder ->
// ObjectiveType), т.к. в официальной wiki перечисление значений не описано текстом.
export interface ObjectiveTypeInfo {
    type: number;
    folder: string;
    prefix: string;
    label: string;
}

export const OBJECTIVE_TYPES: ObjectiveTypeInfo[] = [
    { type: 2, folder: 'Target', prefix: 'TA', label: 'Target — уничтожить цели' },
    { type: 3, folder: 'Travel', prefix: 'T', label: 'Travel — дойти до точки' },
    { type: 4, folder: 'Collection', prefix: 'C', label: 'Collection — собрать предметы' },
    { type: 5, folder: 'Delivery', prefix: 'D', label: 'Delivery — доставить предметы' },
    { type: 6, folder: 'TreasureHunt', prefix: 'TH', label: 'Treasure Hunt — найти тайник' },
    { type: 7, folder: 'AIPatrol', prefix: 'AIP', label: 'AI Patrol — уничтожить патруль ИИ' },
    { type: 8, folder: 'AICamp', prefix: 'AIC', label: 'AI Camp — уничтожить лагерь ИИ' },
    { type: 9, folder: 'AIVIP', prefix: 'AIESCORT', label: 'AI VIP — сопроводить NPC' },
    { type: 10, folder: 'Action', prefix: 'A', label: 'Action — выполнить действие' },
    { type: 11, folder: 'Crafting', prefix: 'CR', label: 'Crafting — скрафтить предмет' },
];

export const objectiveTypeInfo = (type: number): ObjectiveTypeInfo | undefined =>
    OBJECTIVE_TYPES.find((t) => t.type === type);

export interface CollectionRef {
    Amount: number;
    ClassName: string;
    QuantityPercent: number;
    MinQuantityPercent: number;
}

export interface LootRef {
    Name: string;
    Chance: number;
    Attachments: string[];
    QuantityPercent: number;
    Max: number;
    Min: number;
    Variants: string[];
}

// Урезанная, но рабочая форма AISpawn: полный набор параметров ИИ (сотня полей формации,
// точности, поведения) сохраняется как есть через passthrough — редактируем только
// практически значимую часть (кто, сколько, чем вооружён, как ведёт себя).
export interface AISpawn {
    Name: string;
    Faction: string;
    Loadout: string;
    Units: string[];
    NumberOfAI: number;
    Behaviour: string;
    [key: string]: unknown;
}

// Общая для (почти) всех типов часть + специфичные поля через индексную сигнатуру —
// как и с квестами, любое незнакомое поле переживает редактирование нетронутым.
export interface ExpansionObjective {
    ConfigVersion: number;
    ID: number;
    ObjectiveType: number;
    ObjectiveText: string;
    TimeLimit: number;
    Active: number;
    [key: string]: unknown;
}

export const parseObjectiveFile = (raw: string): { hadBom: boolean; objective: ExpansionObjective } => {
    const hadBom = raw.charCodeAt(0) === 0xfeff;
    const text = hadBom ? raw.slice(1) : raw;
    return { hadBom, objective: JSON.parse(text) as ExpansionObjective };
};

export const serializeObjectiveFile = (objective: ExpansionObjective, hadBom: boolean): string => {
    const json = JSON.stringify(objective, null, 4) + '\n';
    return hadBom ? '﻿' + json : json;
};

export interface ObjectiveFileRow {
    filePath: string;
    hadBom: boolean;
    data: ExpansionObjective;
}

// Загружает все файлы целей из известных подпапок Objectives/<Folder> (папки под конкретный
// тип могут отсутствовать, если мод/квесты их не используют — это нормально).
export const loadAllObjectives = async (project: Project): Promise<Map<string, ObjectiveFileRow>> => {
    const modRes = await window.api.findDirRecursive(project.path, 'ExpansionMod');
    const index = new Map<string, ObjectiveFileRow>();
    if (!modRes.success || !modRes.data || modRes.data.length === 0) return index;

    const objectivesRoot = joinPath(modRes.data[0], 'Quests', 'Objectives');

    await Promise.all(
        OBJECTIVE_TYPES.map(async (info) => {
            const dir = joinPath(objectivesRoot, info.folder);
            const filesRes = await window.api.findFilesByExtension(dir, ['json']);
            if (!filesRes.success || !filesRes.data) return;
            await Promise.all(
                filesRes.data.map(async (filePath) => {
                    const res = await window.api.readFile(filePath);
                    if (!res.success || res.data === undefined) return;
                    try {
                        const { hadBom, objective } = parseObjectiveFile(res.data);
                        index.set(`${objective.ObjectiveType}:${objective.ID}`, { filePath, hadBom, data: objective });
                    } catch {
                        // повреждённый файл цели пропускаем, не валим загрузку остальных
                    }
                })
            );
        })
    );

    return index;
};

export const nextObjectiveId = (index: Map<string, ObjectiveFileRow>, type: number): number => {
    let max = 0;
    for (const row of index.values()) {
        if (row.data.ObjectiveType === type && row.data.ID > max) max = row.data.ID;
    }
    return max + 1;
};

export const createObjectiveFilePath = async (project: Project, type: number, id: number): Promise<string | null> => {
    const info = objectiveTypeInfo(type);
    if (!info) return null;
    const modRes = await window.api.findDirRecursive(project.path, 'ExpansionMod');
    if (!modRes.success || !modRes.data || modRes.data.length === 0) return null;
    return joinPath(modRes.data[0], 'Quests', 'Objectives', info.folder, `Objective_${info.prefix}_${id}.json`);
};

export const emptyObjective = (type: number, id: number): ExpansionObjective => {
    const base: ExpansionObjective = { ConfigVersion: 28, ID: id, ObjectiveType: type, ObjectiveText: '', TimeLimit: -1, Active: 1 };
    switch (type) {
        case 2: // Target
            return {
                ...base,
                Position: [],
                MaxDistance: -1,
                MinDistance: -1,
                Amount: 1,
                ClassNames: [],
                CountSelfKill: 0,
                AllowedWeapons: [],
                ExcludedClassNames: [],
                CountAIPlayers: 0,
                AllowedTargetFactions: [],
                AllowedDamageZones: [],
            };
        case 3: // Travel
            return { ...base, Position: [0, 0, 0], MaxDistance: 5, MarkerName: '', ShowDistance: 1, TriggerOnEnter: 1, TriggerOnExit: 0 };
        case 4: // Collection
            return { ...base, Collections: [], ShowDistance: 1, AddItemsToNearbyMarketZone: 0, NeedAnyCollection: 0 };
        case 5: // Delivery
            return { ...base, Collections: [], ShowDistance: 1, AddItemsToNearbyMarketZone: 0, MaxDistance: 20, MarkerName: '' };
        case 6: // TreasureHunt
            return {
                ...base,
                ShowDistance: 0,
                ContainerName: 'ExpansionQuestSeaChest',
                DigInStash: 0,
                MarkerName: '',
                MarkerVisibility: 4,
                Positions: [],
                LootItemsAmount: 1,
                MaxDistance: 5,
                Loot: [],
            };
        case 7: // AIPatrol
            return {
                ...base,
                MaxDistance: -1,
                MinDistance: -1,
                AllowedWeapons: [],
                AllowedDamageZones: [],
                AISpawn: { Name: '', Faction: 'West', Loadout: '', Units: [], NumberOfAI: 1, Behaviour: 'HALT_OR_LOOP' },
            };
        case 8: // AICamp
            return {
                ...base,
                InfectedDeletionRadius: 500,
                MaxDistance: -1,
                MinDistance: -1,
                AllowedWeapons: [],
                AllowedDamageZones: [],
                AISpawns: [],
            };
        case 9: // AIVIP
            return {
                ...base,
                Position: [0, 0, 0],
                MaxDistance: 20,
                MarkerName: '',
                ShowDistance: 1,
                CanLootAI: 0,
                NPCLoadoutFile: '',
                NPCClassName: '',
                NPCName: '',
            };
        case 10: // Action
            return { ...base, ActionNames: [], AllowedClassNames: [], ExcludedClassNames: [], ExecutionAmount: 1 };
        case 11: // Crafting
            return { ...base, ItemNames: [], ExecutionAmount: 1 };
        default:
            return base;
    }
};
