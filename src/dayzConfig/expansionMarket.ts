import { Project } from '../types';
import { joinPath } from './pathUtils';

export interface MarketItem {
    ClassName: string;
    MaxPriceThreshold: number;
    MinPriceThreshold: number;
    SellPricePercent: number;
    MaxStockThreshold: number;
    MinStockThreshold: number;
    QuantityPercent: number;
    SpawnAttachments: string[];
    Variants: string[];
    [key: string]: unknown;
}

export interface MarketCategory {
    m_Version: number;
    DisplayName: string;
    Icon: string;
    Color: string;
    InitStockPercent: number;
    IsExchange: number;
    Items: MarketItem[];
    [key: string]: unknown;
}

// Categories — имена файлов из Market/ (без .json), опционально с суффиксом ":N" —
// множитель стока для этого трейдера. Items — прямые товары трейдера в обход категорий,
// classname -> числовой параметр (аналог множителя).
export interface TraderDefinition {
    m_Version: number;
    DisplayName: string;
    MinRequiredReputation: number;
    MaxRequiredReputation: number;
    RequiredFaction: string;
    RequiredCompletedQuestID: number;
    TraderIcon: string;
    Currencies: string[];
    DisplayCurrencyValue: number;
    DisplayCurrencyName: string;
    UseCategoryOrder: number;
    Categories: string[];
    Items: Record<string, number>;
    [key: string]: unknown;
}

const parseJsonFile = <T>(raw: string): { hadBom: boolean; data: T } => {
    const hadBom = raw.charCodeAt(0) === 0xfeff;
    const text = hadBom ? raw.slice(1) : raw;
    return { hadBom, data: JSON.parse(text) as T };
};

const serializeJsonFile = (data: unknown, hadBom: boolean): string => {
    const json = JSON.stringify(data, null, 2).replace(/\n/g, '\r\n');
    return hadBom ? '﻿' + json : json;
};

export const parseMarketCategory = (raw: string) => parseJsonFile<MarketCategory>(raw);
export const serializeMarketCategory = (data: MarketCategory, hadBom: boolean) => serializeJsonFile(data, hadBom);

export const parseTraderDefinition = (raw: string) => parseJsonFile<TraderDefinition>(raw);
export const serializeTraderDefinition = (data: TraderDefinition, hadBom: boolean) => serializeJsonFile(data, hadBom);

export const findExpansionMarketDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'ExpansionMod');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Market');
};

export const findExpansionTradersDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'ExpansionMod');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return joinPath(res.data[0], 'Traders');
};

export const emptyMarketCategory = (): MarketCategory => ({
    m_Version: 12,
    DisplayName: 'New Category',
    Icon: 'Backpack',
    Color: 'FFFFFFFF',
    InitStockPercent: 75,
    IsExchange: 0,
    Items: [],
});

export const emptyMarketItem = (): MarketItem => ({
    ClassName: '',
    MaxPriceThreshold: 100,
    MinPriceThreshold: 100,
    SellPricePercent: 50,
    MaxStockThreshold: 1,
    MinStockThreshold: 1,
    QuantityPercent: -1,
    SpawnAttachments: [],
    Variants: [],
});

export const emptyTraderDefinition = (): TraderDefinition => ({
    m_Version: 13,
    DisplayName: 'New Trader',
    MinRequiredReputation: 0,
    MaxRequiredReputation: 2147483647,
    RequiredFaction: '',
    RequiredCompletedQuestID: -1,
    TraderIcon: 'Trader',
    Currencies: [],
    DisplayCurrencyValue: 1,
    DisplayCurrencyName: '',
    UseCategoryOrder: 0,
    Categories: [],
    Items: {},
});
