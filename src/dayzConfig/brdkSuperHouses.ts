import { JsonValue } from './cfgGameplay';

// profiles/BRDK_MODS/SuperHouses.json — лимиты жильцов закодированы строками "ClassName|N",
// разбираем в понятную таблицу; наборы для постройки дома (KitDataList) — отдельный список.
export interface HouseResidentLimit {
    className: string;
    limit: number;
}

export const parseHousesResidentsLimit = (raw: string[]): HouseResidentLimit[] =>
    raw.map((line) => {
        const [className, limitStr] = line.split('|');
        return { className: className ?? '', limit: Number(limitStr) || 0 };
    });

export const serializeHousesResidentsLimit = (items: HouseResidentLimit[]): string[] =>
    items.map((i) => `${i.className}|${i.limit}`);

export const emptyHouseLimit = (): HouseResidentLimit => ({ className: 'NewHouse', limit: 1 });

export interface HouseKit {
    KitType: string;
    NailsCount: number;
    MetalSheetsCount: number;
    WoodenLogsCount: number;
    WoodenPlanksCount: number;
    StonesCount: number;
    [key: string]: JsonValue;
}

export const emptyKit = (): HouseKit => ({
    KitType: 'NewKit',
    NailsCount: 0,
    MetalSheetsCount: 0,
    WoodenLogsCount: 0,
    WoodenPlanksCount: 0,
    StonesCount: 0,
});
