import i18n from '../i18n';
import { Project } from '../types';
import { parseEconomyCoreTypesFiles } from './economyCore';
import { dirnamePath, joinPath } from './pathUtils';

export interface TypeFlags {
    count_in_cargo: boolean;
    count_in_hoarder: boolean;
    count_in_map: boolean;
    count_in_player: boolean;
    crafted: boolean;
    deloot: boolean;
}

export interface TypeEntry {
    name: string;
    nominal: number;
    lifetime: number;
    restock: number;
    min: number;
    quantmin: number;
    quantmax: number;
    cost: number;
    flags: TypeFlags;
    category: string;
    usage: string[];
    value: string[];
    tags: string[];
}

const FLAG_ATTRS: (keyof TypeFlags)[] = [
    'count_in_cargo',
    'count_in_hoarder',
    'count_in_map',
    'count_in_player',
    'crafted',
    'deloot',
];

export const parseTypesXml = (raw: string): TypeEntry[] => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('economy.parseTypesFileError'));
    }

    const typeEls = Array.from(doc.documentElement.getElementsByTagName('type'));

    return typeEls.map((el) => {
        const getNum = (tag: string, fallback: number) => {
            const child = el.getElementsByTagName(tag)[0];
            if (!child || child.textContent === null) return fallback;
            const num = Number(child.textContent.trim());
            return Number.isNaN(num) ? fallback : num;
        };

        const flagsEl = el.getElementsByTagName('flags')[0];
        const flags = FLAG_ATTRS.reduce((acc, attr) => {
            acc[attr] = flagsEl?.getAttribute(attr) === '1';
            return acc;
        }, {} as TypeFlags);

        const categoryEl = el.getElementsByTagName('category')[0];
        const usage = Array.from(el.getElementsByTagName('usage'))
            .map((u) => u.getAttribute('name') ?? '')
            .filter(Boolean);
        const value = Array.from(el.getElementsByTagName('value'))
            .map((v) => v.getAttribute('name') ?? '')
            .filter(Boolean);
        const tags = Array.from(el.getElementsByTagName('tag'))
            .map((t) => t.getAttribute('name') ?? '')
            .filter(Boolean);

        return {
            name: el.getAttribute('name') ?? '',
            nominal: getNum('nominal', 0),
            lifetime: getNum('lifetime', 0),
            restock: getNum('restock', 0),
            min: getNum('min', 0),
            quantmin: getNum('quantmin', -1),
            quantmax: getNum('quantmax', -1),
            cost: getNum('cost', 100),
            flags,
            category: categoryEl?.getAttribute('name') ?? '',
            usage,
            value,
            tags,
        };
    });
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serializeTypesXml = (entries: TypeEntry[]): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<types>'];

    for (const e of entries) {
        lines.push(`    <type name="${escapeXmlAttr(e.name)}">`);
        lines.push(`        <nominal>${e.nominal}</nominal>`);
        lines.push(`        <lifetime>${e.lifetime}</lifetime>`);
        lines.push(`        <restock>${e.restock}</restock>`);
        lines.push(`        <min>${e.min}</min>`);
        lines.push(`        <quantmin>${e.quantmin}</quantmin>`);
        lines.push(`        <quantmax>${e.quantmax}</quantmax>`);
        lines.push(`        <cost>${e.cost}</cost>`);
        const f = e.flags;
        lines.push(
            `        <flags count_in_cargo="${f.count_in_cargo ? 1 : 0}" count_in_hoarder="${f.count_in_hoarder ? 1 : 0}" count_in_map="${f.count_in_map ? 1 : 0}" count_in_player="${f.count_in_player ? 1 : 0}" crafted="${f.crafted ? 1 : 0}" deloot="${f.deloot ? 1 : 0}"/>`
        );
        if (e.category) {
            lines.push(`        <category name="${escapeXmlAttr(e.category)}"/>`);
        }
        for (const u of e.usage) {
            lines.push(`        <usage name="${escapeXmlAttr(u)}"/>`);
        }
        for (const v of e.value) {
            lines.push(`        <value name="${escapeXmlAttr(v)}"/>`);
        }
        for (const t of e.tags) {
            lines.push(`        <tag name="${escapeXmlAttr(t)}"/>`);
        }
        lines.push('    </type>');
    }

    lines.push('</types>');
    return lines.join('\r\n') + '\r\n';
};

// Человекочитаемое имя файла экономики (db/types.xml -> "Types", custom_types/brdk_cards.xml
// -> "Brdk Cards") — общее для TypesXmlView и пикера classname'ов в редакторе магазина.
export const humanizeFileLabel = (fileKey: string) => {
    const filename = fileKey.split('/').pop() ?? fileKey;
    const withoutExt = filename.replace(/\.xml$/i, '');
    const words = withoutExt.split(/[_\-\s]+/).filter(Boolean);
    if (words.length === 0) return filename;
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export interface EconomyClassNameGroup {
    fileKey: string;
    names: string[];
}

// Все classname'ы из экономики проекта, сгруппированные по файлу types.xml (все объявленные
// в cfgeconomycore.xml + неявный db/types.xml) — источник для пикера ClassName в редакторе
// магазина Expansion: показывает, из какого файла берётся предмет, а не просто плоский список.
// Ошибки отдельных файлов не прерывают загрузку остальных.
export const loadEconomyClassNamesByFile = async (project: Project): Promise<EconomyClassNameGroup[]> => {
    const coreRes = await window.api.findFileRecursive(project.path, 'cfgeconomycore.xml');
    if (!coreRes.success || !coreRes.data || coreRes.data.length === 0) return [];
    const corePath = coreRes.data[0];
    const coreContentRes = await window.api.readFile(corePath);
    if (!coreContentRes.success || coreContentRes.data === undefined) return [];

    let fileInfos;
    try {
        fileInfos = parseEconomyCoreTypesFiles(coreContentRes.data);
    } catch {
        return [];
    }

    const hasExplicitDb = fileInfos.some((info) => info.folder.toLowerCase() === 'db' && info.fileName.toLowerCase() === 'types.xml');
    const allFileInfos = hasExplicitDb ? fileInfos : [{ folder: 'db', fileName: 'types.xml' }, ...fileInfos];

    const missionRoot = dirnamePath(corePath);

    const groups = await Promise.all(
        allFileInfos.map(async (info): Promise<EconomyClassNameGroup | null> => {
            const filePath = joinPath(missionRoot, info.folder, info.fileName);
            const res = await window.api.readFile(filePath);
            if (!res.success || res.data === undefined) return null;
            try {
                const names = parseTypesXml(res.data)
                    .map((entry) => entry.name)
                    .sort();
                if (names.length === 0) return null;
                return { fileKey: `${info.folder}/${info.fileName}`, names };
            } catch {
                return null;
                // повреждённый/отсутствующий файл пропускаем, остальные подсказки всё равно полезны
            }
        })
    );

    return groups
        .filter((g): g is EconomyClassNameGroup => g !== null)
        .sort((a, b) => humanizeFileLabel(a.fileKey).localeCompare(humanizeFileLabel(b.fileKey)));
};

export const loadAllEconomyClassNames = async (project: Project): Promise<string[]> => {
    const groups = await loadEconomyClassNamesByFile(project);
    const names = new Set<string>();
    for (const g of groups) for (const n of g.names) names.add(n);
    return [...names].sort();
};
