import { JsonValue } from './cfgGameplay';

// profiles/BRDK_MODS/MakeStash/MakeStash.json — структура достаточно сложная и разнородная
// (скалярные настройки, плоский список локаций закодированный строками, иерархия
// тиров/пресетов лута), чтобы обойтись общим RecursiveJsonForm: пользователю нужны отдельные
// экраны для локаций и для пресетов, а не одна большая свалка полей. Типизируем известные
// поля явно, остальное (на случай будущих версий мода) сохраняем как есть через index signature.
export interface MakeStashLocation {
    x: number;
    y: number;
    z: number;
    radius: number;
    name: string;
}

// "9683.56 250.04 1712.64|600|Miezgovce" -> {x,y,z,radius:600,name:"Miezgovce"}
export const parseLocationsName = (raw: string[]): MakeStashLocation[] =>
    raw.map((line) => {
        const [coords, radiusStr, name] = line.split('|');
        const [x, y, z] = (coords ?? '').trim().split(/\s+/).map(Number);
        return { x: x ?? 0, y: y ?? 0, z: z ?? 0, radius: Number(radiusStr) || 0, name: name ?? '' };
    });

export const serializeLocationsName = (locations: MakeStashLocation[]): string[] =>
    locations.map((l) => `${l.x} ${l.y} ${l.z}|${l.radius}|${l.name}`);

export const emptyLocation = (): MakeStashLocation => ({ x: 0, y: 0, z: 0, radius: 100, name: 'NewLocation' });

export interface StashPresetItem {
    ItemName: string[];
    SpawnChance: number;
    ItemQuantity: number;
    ItemHealth: number;
    StashAttachesItemList: string[];
    [key: string]: JsonValue;
}

export interface StashPreset {
    PresetName: string;
    MinLootCount: number;
    MaxLootCount: number;
    StashPresetCfgList: StashPresetItem[];
    [key: string]: JsonValue;
}

export interface SpawnTier {
    SpawnItemStash: string;
    SpawnLootItemStash: string;
    SpawnChest: string;
    DeleteChestTimer: number;
    RespawnLoot: number;
    RespawnLootTimerMix: number;
    RespawnLootTimerMax: number;
    MinSpawnChance: number;
    MaxSpawnChance: number;
    ExplosionChance: number;
    ExpljsionRadius: number;
    ExplosionDamage: number;
    PresetList: string[];
    PresetListGaranted: string[];
    [key: string]: JsonValue;
}

export const emptyStashPresetItem = (): StashPresetItem => ({
    ItemName: [],
    SpawnChance: 100,
    ItemQuantity: -1,
    ItemHealth: -1,
    StashAttachesItemList: [],
});

export const emptyStashPreset = (): StashPreset => ({
    PresetName: 'NewPreset',
    MinLootCount: 1,
    MaxLootCount: 1,
    StashPresetCfgList: [],
});

export const emptyTier = (): SpawnTier => ({
    SpawnItemStash: '',
    SpawnLootItemStash: '',
    SpawnChest: '',
    DeleteChestTimer: 30,
    RespawnLoot: 1,
    RespawnLootTimerMix: 7200,
    RespawnLootTimerMax: 7200,
    MinSpawnChance: 30,
    MaxSpawnChance: 70,
    ExplosionChance: 0,
    ExpljsionRadius: 5,
    ExplosionDamage: 0,
    PresetList: [],
    PresetListGaranted: [],
});
