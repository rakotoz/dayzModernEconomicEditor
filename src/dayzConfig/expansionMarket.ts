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

// Categories — имена файлов из Market/ (без .json), опционально с суффиксом ":N", где N —
// НЕ множитель (как ошибочно считалось раньше), а флаг разрешённого направления торговли
// для этой категории у конкретного трейдера:
//   0 — только покупка у трейдера (игрок не может продать сюда)
//   1 — покупка и продажа (по умолчанию, если суффикс не указан)
//   2 — только продажа трейдеру (игрок не может купить)
//   3 — скрыта из меню трейдера (доступна только для кастомизации/аттачментов)
// см. https://github.com/salutesh/DayZ-Expansion-Scripts/wiki/%5BServer-Hosting%5D-Trader-Settings
// Items — прямые товары трейдера в обход категорий, classname -> числовой параметр.
export type TraderCategoryBehavior = 0 | 1 | 2 | 3;

export interface TraderCategoryEntry {
    name: string;
    behavior: TraderCategoryBehavior;
}

export const parseTraderCategories = (raw: string[]): TraderCategoryEntry[] =>
    raw.map((s) => {
        const idx = s.lastIndexOf(':');
        if (idx === -1) return { name: s, behavior: 1 };
        const behavior = Number(s.slice(idx + 1));
        if (Number.isNaN(behavior) || behavior < 0 || behavior > 3) return { name: s, behavior: 1 };
        return { name: s.slice(0, idx), behavior: behavior as TraderCategoryBehavior };
    });

export const serializeTraderCategories = (entries: TraderCategoryEntry[]): string[] =>
    entries.map((e) => `${e.name}:${e.behavior}`);

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
