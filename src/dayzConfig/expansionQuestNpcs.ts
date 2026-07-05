import { Project } from '../types';
import { joinPath } from './pathUtils';

export interface ExpansionQuestNpc {
    ConfigVersion: number;
    ID: number;
    ClassName: string;
    Position: number[];
    Orientation: number[];
    NPCName: string;
    DefaultNPCText: string;
    Waypoints: number[][];
    NPCEmoteID: number;
    NPCEmoteIsStatic: number;
    NPCLoadoutFile: string;
    NPCInteractionEmoteID: number;
    NPCQuestCancelEmoteID: number;
    NPCQuestStartEmoteID: number;
    NPCQuestCompleteEmoteID: number;
    NPCFaction: string;
    NPCType: number;
    Active: number;
    [key: string]: unknown;
}

export const parseNpcFile = (raw: string): { hadBom: boolean; npc: ExpansionQuestNpc } => {
    const hadBom = raw.charCodeAt(0) === 0xfeff;
    const text = hadBom ? raw.slice(1) : raw;
    return { hadBom, npc: JSON.parse(text) as ExpansionQuestNpc };
};

export const serializeNpcFile = (npc: ExpansionQuestNpc, hadBom: boolean): string => {
    const json = JSON.stringify(npc, null, 4) + '\n';
    return hadBom ? '﻿' + json : json;
};

export const findExpansionNpcsDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'ExpansionMod');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Quests', 'NPCs');
};

export const nextNpcId = (npcs: ExpansionQuestNpc[]): number => {
    let max = 0;
    for (const n of npcs) if (n.ID > max) max = n.ID;
    return max + 1;
};

export const emptyNpc = (id: number): ExpansionQuestNpc => ({
    ConfigVersion: 6,
    ID: id,
    ClassName: 'SurvivorM_Bandit1',
    Position: [0, 0, 0],
    Orientation: [0, 0, 0],
    NPCName: 'New NPC',
    DefaultNPCText: '',
    Waypoints: [],
    NPCEmoteID: 0,
    NPCEmoteIsStatic: 0,
    NPCLoadoutFile: '',
    NPCInteractionEmoteID: 0,
    NPCQuestCancelEmoteID: 0,
    NPCQuestStartEmoteID: 0,
    NPCQuestCompleteEmoteID: 0,
    NPCFaction: '',
    NPCType: 0,
    Active: 1,
});
