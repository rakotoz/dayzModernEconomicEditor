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
        throw new Error('Не удалось разобрать types.xml — файл повреждён или не является корректным XML');
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
