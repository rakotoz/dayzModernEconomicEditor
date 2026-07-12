import { JsonValue } from './cfgGameplay';

// profiles/BRDK_MODS/GammaRay.json — событие "гамма-вспышка": общие таймеры/уведомления,
// вложенные общие Settings (детектор аномалий) и список зон (ZoneList), у каждой зоны свои
// вложенные списки лута/зомби — редактируем список+деталь, как ZmbPreset.
export interface GammaZone {
    ZoneName: string;
    ZoneCord: string;
    GammaAnomaliesAmmo: string;
    EmptyAnomalyDamage: number;
    ZoneRadius: number;
    LootChance: number;
    ZoneLifeTime: number;
    MinLootPoints: number;
    MaxLootPoints: number;
    IncreaseChance: number;
    ZombieChance: number;
    MinRadius: number;
    MaxRadius: number;
    MaxLoot: number;
    MaxLootLater: number;
    ZombieList: string[];
    LootList: string[];
    LootListLater: string[];
    [key: string]: JsonValue;
}

export const emptyGammaZone = (): GammaZone => ({
    ZoneName: 'NewZone',
    ZoneCord: '0 0 0',
    GammaAnomaliesAmmo: 'BRDK_ZoneDamage',
    EmptyAnomalyDamage: 20,
    ZoneRadius: 100,
    LootChance: 30,
    ZoneLifeTime: 1000,
    MinLootPoints: 10,
    MaxLootPoints: 15,
    IncreaseChance: 30,
    ZombieChance: 10,
    MinRadius: 0,
    MaxRadius: 2,
    MaxLoot: 4,
    MaxLootLater: 7,
    ZombieList: [],
    LootList: [],
    LootListLater: [],
});
