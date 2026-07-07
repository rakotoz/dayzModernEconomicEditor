import { JsonValue } from './cfgGameplay';

// profiles/BRDK_MODS/ZmbPreset.json — на каждого зомби (ZmbClassName) заведён список
// "весовых корзин" лута (RandomPresetList), каждая со своим диапазоном шанса и списком
// предметов — двухуровневая вложенность, редактируем список+деталь+деталь.
export interface ZmbRandomPreset {
    PresetChanceMin: number;
    PresetChanceMax: number;
    ItemList: string[];
    [key: string]: JsonValue;
}

export interface ZmbPresetEntry {
    ZmbClassName: string;
    RandomPresetList: ZmbRandomPreset[];
    [key: string]: JsonValue;
}

export const emptyRandomPreset = (): ZmbRandomPreset => ({ PresetChanceMin: 5, PresetChanceMax: 10, ItemList: [] });

export const emptyZmbPreset = (): ZmbPresetEntry => ({ ZmbClassName: 'NewZombie', RandomPresetList: [] });
