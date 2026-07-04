import i18n from '../i18n';

export const EVENT_GROUPS_CONFIG_ID = 'event-groups-config';

export interface EventGroupChild {
    type: string;
    x: number;
    y: number;
    z: number;
    a: number;
    deloot: boolean;
    lootmin: number;
    lootmax: number;
}

// Координата спавна из комментария `<!--<pos .../>-->` над группой: сам DayZ её не читает,
// но это полезная подсказка, связывающая группу с точкой в cfgeventspawns — сохраняем.
export interface EventGroupPosHint {
    x: number;
    z: number;
    a: number;
    y: number;
}

export interface EventGroupEntry {
    name: string;
    posHint: EventGroupPosHint | null;
    children: EventGroupChild[];
}

const num = (el: Element, attr: string, fallback = 0) => {
    const raw = el.getAttribute(attr);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
};

const parsePosHint = (comment: string): EventGroupPosHint | null => {
    // Ожидаем внутри комментария <pos x=".." z=".." a=".." y=".." group=".."/>
    const match = /<pos\b([^>]*)\/?>/i.exec(comment);
    if (!match) return null;
    const attrs = match[1];
    const readAttr = (name: string) => {
        const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(attrs);
        return m ? Number(m[1]) || 0 : 0;
    };
    return { x: readAttr('x'), z: readAttr('z'), a: readAttr('a'), y: readAttr('y') };
};

export const parseEventGroupsXml = (raw: string): EventGroupEntry[] => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('eventGroups.parseFileError'));
    }

    const root = doc.documentElement;
    const groups: EventGroupEntry[] = [];
    let pendingHint: EventGroupPosHint | null = null;

    for (const node of Array.from(root.childNodes)) {
        if (node.nodeType === Node.COMMENT_NODE) {
            const hint = parsePosHint(node.textContent ?? '');
            if (hint) pendingHint = hint;
            continue;
        }
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'group') {
            const groupEl = node as Element;
            const children: EventGroupChild[] = Array.from(groupEl.getElementsByTagName('child')).map((c) => ({
                type: c.getAttribute('type') ?? '',
                x: num(c, 'x'),
                y: num(c, 'y'),
                z: num(c, 'z'),
                a: num(c, 'a'),
                deloot: c.getAttribute('deloot') === '1',
                lootmin: num(c, 'lootmin'),
                lootmax: num(c, 'lootmax'),
            }));
            groups.push({ name: groupEl.getAttribute('name') ?? '', posHint: pendingHint, children });
            pendingHint = null;
        }
    }

    return groups;
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serializeEventGroupsXml = (entries: EventGroupEntry[]): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<eventgroupdef>'];

    for (const g of entries) {
        if (g.posHint) {
            const p = g.posHint;
            lines.push(
                `\t<!--<pos x="${p.x}" z="${p.z}" a="${p.a}" y="${p.y}" group="${escapeXmlAttr(g.name)}"/>-->`
            );
        }
        lines.push(`\t<group name="${escapeXmlAttr(g.name)}">`);
        for (const c of g.children) {
            lines.push(
                `\t\t<child type="${escapeXmlAttr(c.type)}" deloot="${c.deloot ? 1 : 0}" lootmax="${c.lootmax}" lootmin="${c.lootmin}" x="${c.x}" z="${c.z}" y="${c.y}" a="${c.a}"/>`
            );
        }
        lines.push('\t</group>');
    }

    lines.push('</eventgroupdef>');
    return lines.join('\r\n') + '\r\n';
};
