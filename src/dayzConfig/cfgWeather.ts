import i18n from '../i18n';

export const CFG_WEATHER_CONFIG_ID = 'cfg-weather-config';

export interface WeatherCurrent {
    actual: number;
    time: number;
    duration: number;
}

export interface WeatherRange {
    min: number;
    max: number;
}

export interface WeatherThresholds {
    min: number;
    max: number;
    end: number;
}

export interface WeatherCategory {
    current: WeatherCurrent;
    limits: WeatherRange;
    timelimits: WeatherRange;
    changelimits: WeatherRange;
    // Есть только у rain и snowfall.
    thresholds?: WeatherThresholds;
}

export const WEATHER_CATEGORY_KEYS = ['overcast', 'fog', 'rain', 'windMagnitude', 'windDirection', 'snowfall'] as const;
export type WeatherCategoryKey = (typeof WEATHER_CATEGORY_KEYS)[number];

export interface CfgWeather {
    reset: boolean;
    enable: boolean;
    overcast: WeatherCategory;
    fog: WeatherCategory;
    rain: WeatherCategory;
    windMagnitude: WeatherCategory;
    windDirection: WeatherCategory;
    snowfall: WeatherCategory;
    storm: { density: number; threshold: number; timeout: number };
}

const num = (el: Element | null, attr: string, fallback = 0) => {
    if (!el) return fallback;
    const raw = el.getAttribute(attr);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
};

const parseCategory = (root: Element, tag: string): WeatherCategory => {
    const el = root.getElementsByTagName(tag)[0] ?? null;
    const current = el?.getElementsByTagName('current')[0] ?? null;
    const limits = el?.getElementsByTagName('limits')[0] ?? null;
    const timelimits = el?.getElementsByTagName('timelimits')[0] ?? null;
    const changelimits = el?.getElementsByTagName('changelimits')[0] ?? null;
    const thresholdsEl = el?.getElementsByTagName('thresholds')[0] ?? null;

    return {
        current: { actual: num(current, 'actual'), time: num(current, 'time'), duration: num(current, 'duration') },
        limits: { min: num(limits, 'min'), max: num(limits, 'max') },
        timelimits: { min: num(timelimits, 'min'), max: num(timelimits, 'max') },
        changelimits: { min: num(changelimits, 'min'), max: num(changelimits, 'max') },
        thresholds: thresholdsEl
            ? { min: num(thresholdsEl, 'min'), max: num(thresholdsEl, 'max'), end: num(thresholdsEl, 'end') }
            : undefined,
    };
};

export const parseCfgWeather = (raw: string): CfgWeather => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('cfgWeather.parseFileError'));
    }
    const root = doc.documentElement;
    const storm = root.getElementsByTagName('storm')[0] ?? null;

    return {
        reset: root.getAttribute('reset') === '1',
        enable: root.getAttribute('enable') === '1',
        overcast: parseCategory(root, 'overcast'),
        fog: parseCategory(root, 'fog'),
        rain: parseCategory(root, 'rain'),
        windMagnitude: parseCategory(root, 'windMagnitude'),
        windDirection: parseCategory(root, 'windDirection'),
        snowfall: parseCategory(root, 'snowfall'),
        storm: { density: num(storm, 'density'), threshold: num(storm, 'threshold'), timeout: num(storm, 'timeout') },
    };
};

const serializeCategory = (tag: string, c: WeatherCategory): string[] => {
    const lines = [
        `  <${tag}>`,
        `    <current actual="${c.current.actual}" time="${c.current.time}" duration="${c.current.duration}" />`,
        `    <limits min="${c.limits.min}" max="${c.limits.max}" />`,
        `    <timelimits min="${c.timelimits.min}" max="${c.timelimits.max}" />`,
        `    <changelimits min="${c.changelimits.min}" max="${c.changelimits.max}" />`,
    ];
    if (c.thresholds) {
        lines.push(`    <thresholds min="${c.thresholds.min}" max="${c.thresholds.max}" end="${c.thresholds.end}" />`);
    }
    lines.push(`  </${tag}>`);
    return lines;
};

export const serializeCfgWeather = (w: CfgWeather): string => {
    const lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        `<weather reset="${w.reset ? 1 : 0}" enable="${w.enable ? 1 : 0}">`,
        ...serializeCategory('overcast', w.overcast),
        ...serializeCategory('fog', w.fog),
        ...serializeCategory('rain', w.rain),
        ...serializeCategory('windMagnitude', w.windMagnitude),
        ...serializeCategory('windDirection', w.windDirection),
        ...serializeCategory('snowfall', w.snowfall),
        `  <storm density="${w.storm.density}" threshold="${w.storm.threshold}" timeout="${w.storm.timeout}" />`,
        '</weather>',
    ];
    return lines.join('\r\n');
};
