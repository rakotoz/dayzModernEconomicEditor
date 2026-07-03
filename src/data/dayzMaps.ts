export interface DayzMapInfo {
    key: string;
    label: string;
    size: number;
    /** Имя архива в GitHub-релизе Assets; отсутствует у карт, для которых архив не выложен. */
    assetName?: string;
}

// Архивы карт лежат в релизе Assets нашего репозитория (внутри — <name>_Map.png и *.xyz,
// нам нужен только PNG). Имена архивов не выводятся из ключа механически (CharnarusPlus,
// Barington и т.п.), поэтому храним их явно.
export const MAP_ASSETS_BASE_URL = 'https://github.com/rakotoz/dayzModernEconomicEditor/releases/download/Assets/';

// Ключи и размеры карт взяты из справочника Maps/MapSizes.txt стороннего DayZ-редактора.
export const DAYZ_MAPS: DayzMapInfo[] = [
    { key: 'chernarusplus', label: 'Chernarus+', size: 15360, assetName: 'CharnarusPlusMapAddon.rar' },
    { key: 'chernarusplusgloom', label: 'Chernarus+ (Gloom)', size: 15360, assetName: 'CharnarusPlusMapAddon.rar' },
    { key: 'banov', label: 'Banov', size: 15360, assetName: 'BanovMapAddon.rar' },
    { key: 'namalsk', label: 'Namalsk', size: 12800, assetName: 'NamalskMapAddon.rar' },
    { key: 'enoch', label: 'Livonia (Enoch)', size: 12800, assetName: 'EnochMapAddon.rar' },
    { key: 'enochgloom', label: 'Livonia (Gloom)', size: 12800, assetName: 'EnochMapAddon.rar' },
    { key: 'takistanplus', label: 'Takistan+', size: 12800, assetName: 'TakistanPlusMapAddon.rar' },
    { key: 'esseker', label: 'Esseker', size: 12800, assetName: 'EssekerMapAddon.rar' },
    { key: 'deerisle', label: 'Deer Isle', size: 16384, assetName: 'deerisleMapAddon.rar' },
    { key: 'rostow', label: 'Rostow', size: 14336, assetName: 'RostowMapAddon.rar' },
    { key: 'iztek', label: 'Iztek', size: 8192, assetName: 'IztekMapAddon.rar' },
    { key: 'valning', label: 'Valning', size: 10240, assetName: 'ValningMapAddon.rar' },
    { key: 'pripyat', label: 'Pripyat', size: 20480, assetName: 'PripyatMapAddon.rar' },
    { key: 'yiprit', label: 'Yiprit', size: 20480, assetName: 'yipritMapAddon.rar' },
    { key: 'barrington', label: 'Barrington', size: 10240, assetName: 'BaringtonMapAddon.rar' },
    { key: 'vela', label: 'Vela', size: 10240, assetName: 'VelaMapAddon.rar' },
    { key: 'chiemsee', label: 'Chiemsee', size: 10240, assetName: 'ChiemseeMapAddon.rar' },
    { key: 'melkart', label: 'Melkart', size: 20480, assetName: 'MelkartMapAddon.rar' },
    { key: 'thezone', label: 'The Zone', size: 20480, assetName: 'TheZoneMapAddon.rar' },
    { key: 'capare', label: 'Capare', size: 20480 },
    { key: 'nhchernobyl', label: 'Chernobyl (NH)', size: 20480, assetName: 'NHChernobylMapAddon.rar' },
    { key: 'NukeZZonE', label: 'Nuke Zzone', size: 15360 },
    { key: 'lux', label: 'Lux', size: 15360, assetName: 'LuxMapAddon.rar' },
    { key: 'vis_island', label: 'Vis Island', size: 20480, assetName: 'Vis_IslandMapAddon.rar' },
    { key: 'bearisland', label: 'Bear Island', size: 10240, assetName: 'BearIslandMapAddon.rar' },
    { key: 'fogfall', label: 'Fogfall', size: 20480, assetName: 'fogfallMapAddon.rar' },
    { key: 'swansisland', label: "Swan's Island", size: 2048, assetName: 'SwanIslandMapAddon.rar' },
    { key: 'anastara', label: 'Anastara', size: 10240, assetName: 'AnastaraMapAddon.rar' },
    { key: 'alteria', label: 'Alteria', size: 8192, assetName: 'AlteriaMapAddon.rar' },
    { key: 'bitterroot', label: 'Bitterroot', size: 12288, assetName: 'BitterrootMapAddon.rar' },
    { key: 'sakhal', label: 'Sakhal', size: 15360, assetName: 'SakhalMapAddon.rar' },
    { key: 'arsteinen', label: 'Arsteinen', size: 15360, assetName: 'ArsteinenMapAddon.rar' },
    { key: 'raman', label: 'Raman', size: 32768, assetName: 'RamanMapAddon.rar' },
    { key: 'NorthTakistan', label: 'North Takistan', size: 12288, assetName: 'NorthTakistanMapAddon.rar' },
    { key: 'GreenCounty', label: 'Green County', size: 10240, assetName: 'GreenCountyMapAddon.rar' },
    { key: 'hashima', label: 'Hashima', size: 5120, assetName: 'HashimaMapAddon.rar' },
    { key: 'Deadfall', label: 'Deadfall', size: 10240, assetName: 'DeadfallMapAddon.rar' },
    { key: 'pnw', label: 'Pacific Northwest (PNW)', size: 10240, assetName: 'PNWMapAddon.zip' },
];

export const getDayzMapPath = (key: string) => `\\Maps\\${key}_Map.png`;

export const findDayzMapByLabel = (label: string): DayzMapInfo | undefined =>
    DAYZ_MAPS.find((m) => m.label === label);

// Ключ для кэша изображения карты: берём из справочника, а для нестандартных/модовых карт —
// приводим название к безопасному для имени файла виду, чтобы разные проекты с одинаковой
// картой переиспользовали один и тот же закэшированный файл.
export const getMapKeyForLabel = (label: string): string => {
    const known = findDayzMapByLabel(label);
    if (known) return known.key;
    return (
        label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'custom'
    );
};

export const getMapAssetUrlByKey = (key: string): string | null => {
    const map = DAYZ_MAPS.find((m) => m.key === key);
    return map?.assetName ? MAP_ASSETS_BASE_URL + map.assetName : null;
};
