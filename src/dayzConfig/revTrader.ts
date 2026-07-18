import { Project } from '../types';
import { JsonValue, parseJsonConfigFile, serializeJsonConfigFile } from './cfgGameplay';
import { joinPath } from './pathUtils';

export interface RevTraderItem {
    ClassName: string;
    BuyPrice: number;   // -1 = купить нельзя
    SellPrice: number;  // -1 = продать нельзя
    Stock: number;      // -1 = бесконечно
    ReqRating: number;  // требуемая репутация
}

export interface RevTraderCategory {
    DisplayName: string;
    Icon: string;
    CanBuy: number;
    CanSell: number;
    RestockMinutes: number;
    Items: RevTraderItem[];
    [key: string]: JsonValue | unknown;
}

// Категории трейдера: profiles/Rev_mods/Rev_Trader/Categories/*.json
export const findRevTraderCategoriesDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'Rev_mods');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Rev_Trader', 'Categories');
};

export const parseTraderCategory = parseJsonConfigFile;      // -> { hadBom, data }
export const serializeTraderCategory = serializeJsonConfigFile;

export const emptyTraderItem = (): RevTraderItem => ({ ClassName: '', BuyPrice: -1, SellPrice: -1, Stock: -1, ReqRating: 0 });
export const emptyTraderCategory = (): RevTraderCategory => ({ DisplayName: 'New category', Icon: '', CanBuy: 1, CanSell: 1, RestockMinutes: 0, Items: [] });

// ---- трейдеры (Rev_TraderDef): profiles/Rev_mods/Rev_Trader/Traders/*.json ----
export interface RevTraderDef {
    Name: string;
    ReqRating: number;
    ReqQuestId: string;   // id завершённого квеста для доступа ("" = не требуется)
    Icon: string;
    Categories: string[];      // id категорий (имена файлов Categories/*.json без .json)
    ObjectClasses: string[];   // классы объектов-торговцев
    [key: string]: JsonValue | unknown;
}

export const findRevTraderTradersDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'Rev_mods');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Rev_Trader', 'Traders');
};

// id всех существующих категорий (имена файлов Categories/*.json без .json) — для выбора в трейдере
export const listRevTraderCategoryIds = async (project: Project): Promise<string[]> => {
    const dir = await findRevTraderCategoriesDir(project);
    if (!dir) return [];
    const res = await window.api.findFilesByExtension(dir, ['json']);
    if (!res.success || !res.data) return [];
    return res.data
        .map((p) => (p.replace(/\\/g, '/').split('/').pop() ?? '').replace(/\.json$/i, ''))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
};

export const emptyTraderDef = (): RevTraderDef => ({ Name: 'New trader', ReqRating: 0, ReqQuestId: '', Icon: '', Categories: [], ObjectClasses: [] });
