import { Project } from '../types';
import { JsonValue, parseJsonConfigFile, serializeJsonConfigFile } from './cfgGameplay';
import { joinPath } from './pathUtils';

// Вкладка Revan видна, только если в проекте реально стоят наши моды: где-то в дереве проекта
// есть папка Rev_mods (обычно profiles/Rev_mods), куда Rev_* моды пишут свои JSON-конфиги.
export const detectRevanMod = async (project: Project): Promise<boolean> => {
    const res = await window.api.findDirRecursive(project.path, 'Rev_mods');
    return Boolean(res.success && res.data && res.data.length > 0);
};

export const findRevModsDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'Rev_mods');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return res.data[0];
};

export interface RevanConfigFile {
    key: string;   // стабильный id для выбора выделенного экрана (не зависит от подписи)
    label: string;
    filePath: string;
}

// Курируемый список редактируемых конфигов наших модов (без рантайм-данных вроде
// Accounts/Clans/Players — их править руками не нужно). Коллекции (квесты, цели, торговцы)
// получат отдельные экраны позже; здесь пока настроечные *Config-файлы.
const KNOWN_CONFIGS: { key: string; rel: string; label: string }[] = [
    { key: 'questConfig', rel: 'Rev_Quests/QuestConfig.json', label: 'Quests — конфиг' },
    { key: 'bankConfig', rel: 'Rev_Bank/BankConfig.json', label: 'Bank — конфиг' },
    { key: 'bankAtms', rel: 'Rev_Bank/ATMs.json', label: 'Bank — банкоматы (ATMs)' },
    { key: 'traderConfig', rel: 'Rev_Trader/TraderConfig.json', label: 'Trader — конфиг' },
    { key: 'panelRanks', rel: 'Rev_Panel/GlobalConfig.json', label: 'Panel — ранги (GlobalConfig)' },
    { key: 'panelAdmins', rel: 'Rev_Panel/PanelConfig.json', label: 'Panel — админы' },
    { key: 'panelCross', rel: 'Rev_Panel/CrossConfig.json', label: 'Panel — кресты (Cross)' },
    { key: 'panelRoulette', rel: 'Rev_Panel/RouletteConfig.json', label: 'Panel — рулетка' },
    { key: 'vstorageConfig', rel: 'Rev_VStorage/StorageConfig.json', label: 'VStorage — конфиг' },
    { key: 'vstorageTerminals', rel: 'Rev_VStorage/Terminals.json', label: 'VStorage — терминалы' },
];

export const listRevanConfigFiles = async (revModsDir: string): Promise<RevanConfigFile[]> => {
    const files: RevanConfigFile[] = [];
    for (const cfg of KNOWN_CONFIGS) {
        const filePath = joinPath(revModsDir, cfg.rel);
        const existsRes = await window.api.pathExists(filePath);
        if (existsRes.success && existsRes.data) {
            files.push({ key: cfg.key, label: cfg.label, filePath });
        }
    }
    return files;
};

export const parseRevanConfigFile = parseJsonConfigFile;
export const serializeRevanConfigFile = serializeJsonConfigFile;
export type RevanJsonValue = JsonValue;
