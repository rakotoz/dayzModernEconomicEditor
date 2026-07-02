export interface DayzMapInfo {
    key: string;
    label: string;
    size: number;
}

// Ключи и размеры карт взяты из справочника Maps/MapSizes.txt стороннего DayZ-редактора.
export const DAYZ_MAPS: DayzMapInfo[] = [
    { key: 'chernarusplus', label: 'Chernarus+', size: 15360 },
    { key: 'chernarusplusgloom', label: 'Chernarus+ (Gloom)', size: 15360 },
    { key: 'banov', label: 'Banov', size: 15360 },
    { key: 'namalsk', label: 'Namalsk', size: 12800 },
    { key: 'enoch', label: 'Livonia (Enoch)', size: 12800 },
    { key: 'enochgloom', label: 'Livonia (Gloom)', size: 12800 },
    { key: 'takistanplus', label: 'Takistan+', size: 12800 },
    { key: 'esseker', label: 'Esseker', size: 12800 },
    { key: 'deerisle', label: 'Deer Isle', size: 16384 },
    { key: 'rostow', label: 'Rostow', size: 14336 },
    { key: 'iztek', label: 'Iztek', size: 8192 },
    { key: 'valning', label: 'Valning', size: 10240 },
    { key: 'pripyat', label: 'Pripyat', size: 20480 },
    { key: 'yiprit', label: 'Yiprit', size: 20480 },
    { key: 'barrington', label: 'Barrington', size: 10240 },
    { key: 'vela', label: 'Vela', size: 10240 },
    { key: 'chiemsee', label: 'Chiemsee', size: 10240 },
    { key: 'melkart', label: 'Melkart', size: 20480 },
    { key: 'thezone', label: 'The Zone', size: 20480 },
    { key: 'capare', label: 'Capare', size: 20480 },
    { key: 'nhchernobyl', label: 'Chernobyl (NH)', size: 20480 },
    { key: 'NukeZZonE', label: 'Nuke Zzone', size: 15360 },
    { key: 'lux', label: 'Lux', size: 15360 },
    { key: 'vis_island', label: 'Vis Island', size: 20480 },
    { key: 'bearisland', label: 'Bear Island', size: 10240 },
    { key: 'fogfall', label: 'Fogfall', size: 20480 },
    { key: 'swansisland', label: "Swan's Island", size: 2048 },
    { key: 'anastara', label: 'Anastara', size: 10240 },
    { key: 'alteria', label: 'Alteria', size: 8192 },
    { key: 'bitterroot', label: 'Bitterroot', size: 12288 },
    { key: 'sakhal', label: 'Sakhal', size: 15360 },
    { key: 'arsteinen', label: 'Arsteinen', size: 15360 },
    { key: 'raman', label: 'Raman', size: 32768 },
    { key: 'NorthTakistan', label: 'North Takistan', size: 12288 },
    { key: 'GreenCounty', label: 'Green County', size: 10240 },
    { key: 'hashima', label: 'Hashima', size: 5120 },
    { key: 'Deadfall', label: 'Deadfall', size: 10240 },
    { key: 'pnw', label: 'Pacific Northwest (PNW)', size: 10240 },
];

export const getDayzMapPath = (key: string) => `\\Maps\\${key}_Map.png`;

export const findDayzMapByLabel = (label: string): DayzMapInfo | undefined =>
    DAYZ_MAPS.find((m) => m.label === label);
