import { JsonValue } from './cfgGameplay';

// profiles/BRDK_MODS/GoldRush.json — руда/песок/жилы описаны тремя параллельными списками
// плоских объектов, редактируем их через FlatObjectListEditor на отдельных вкладках.
export interface VeinData {
    VeinName: string;
    MinCount: number;
    MaxCount: number;
    MinQuant: number;
    MaxQuant: number;
    OreChance: number;
    GoodOre: string;
    BadOre: string;
    ToolDamageOnUse: number;
    MineTime: number;
    [key: string]: JsonValue;
}

export interface SandData {
    SandName: string;
    SandChance: number;
    MinQuant: number;
    MaxQuant: number;
    OreName: string;
    MeltPressTime: number;
    [key: string]: JsonValue;
}

export interface OreData {
    OreName: string;
    IngotName: string;
    MeltPressTime: number;
    [key: string]: JsonValue;
}

export const emptyVein = (): VeinData => ({
    VeinName: 'NewVein',
    MinCount: 1,
    MaxCount: 4,
    MinQuant: 1,
    MaxQuant: 1,
    OreChance: 20,
    GoodOre: '',
    BadOre: 'Stone',
    ToolDamageOnUse: 40,
    MineTime: 15,
});

export const emptySand = (): SandData => ({
    SandName: 'NewSand',
    SandChance: 0,
    MinQuant: 1,
    MaxQuant: 5,
    OreName: '',
    MeltPressTime: 300,
});

export const emptyOre = (): OreData => ({ OreName: 'NewOre', IngotName: '', MeltPressTime: 600 });
