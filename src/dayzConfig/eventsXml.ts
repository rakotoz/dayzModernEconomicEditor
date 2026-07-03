import i18n from '../i18n';

export const EVENTS_CONFIG_ID = 'events-config';

export interface EventFlags {
    deletable: boolean;
    init_random: boolean;
    remove_damaged: boolean;
}

export interface EventChild {
    type: string;
    min: number;
    max: number;
    lootmin: number;
    lootmax: number;
}

export interface EventEntry {
    name: string;
    nominal: number;
    min: number;
    max: number;
    lifetime: number;
    restock: number;
    saferadius: number;
    distanceradius: number;
    cleanupradius: number;
    secondary: string;
    flags: EventFlags;
    position: string;
    limit: string;
    active: boolean;
    children: EventChild[];
}

// Значения, реально встречающиеся в vanilla/модовых events.xml — используются как варианты
// в выпадающих списках, но полем можно ввести и произвольное значение.
export const EVENT_POSITION_OPTIONS = ['fixed', 'player', 'uniform'];
export const EVENT_LIMIT_OPTIONS = ['mixed', 'custom', 'child', 'parent'];

const FLAG_ATTRS: (keyof EventFlags)[] = ['deletable', 'init_random', 'remove_damaged'];

export const parseEventsXml = (raw: string): EventEntry[] => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('events.parseFileError'));
    }

    const eventEls = Array.from(doc.documentElement.getElementsByTagName('event'));

    return eventEls.map((el) => {
        const getNum = (tag: string, fallback: number) => {
            const child = el.getElementsByTagName(tag)[0];
            if (!child || child.textContent === null) return fallback;
            const num = Number(child.textContent.trim());
            return Number.isNaN(num) ? fallback : num;
        };
        const getText = (tag: string, fallback: string) => {
            const child = el.getElementsByTagName(tag)[0];
            return child?.textContent?.trim() || fallback;
        };

        const flagsEl = el.getElementsByTagName('flags')[0];
        const flags = FLAG_ATTRS.reduce((acc, attr) => {
            acc[attr] = flagsEl?.getAttribute(attr) === '1';
            return acc;
        }, {} as EventFlags);

        const childrenEl = el.getElementsByTagName('children')[0];
        const children: EventChild[] = childrenEl
            ? Array.from(childrenEl.getElementsByTagName('child')).map((c) => ({
                  type: c.getAttribute('type') ?? '',
                  min: Number(c.getAttribute('min')) || 0,
                  max: Number(c.getAttribute('max')) || 0,
                  lootmin: Number(c.getAttribute('lootmin')) || 0,
                  lootmax: Number(c.getAttribute('lootmax')) || 0,
              }))
            : [];

        return {
            name: el.getAttribute('name') ?? '',
            nominal: getNum('nominal', 0),
            min: getNum('min', 0),
            max: getNum('max', 0),
            lifetime: getNum('lifetime', 0),
            restock: getNum('restock', 0),
            saferadius: getNum('saferadius', 0),
            distanceradius: getNum('distanceradius', 0),
            cleanupradius: getNum('cleanupradius', 0),
            secondary: getText('secondary', ''),
            flags,
            position: getText('position', 'fixed'),
            limit: getText('limit', 'mixed'),
            active: getText('active', '1') === '1',
            children,
        };
    });
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serializeEventsXml = (entries: EventEntry[]): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<events>'];

    for (const e of entries) {
        lines.push(`  <event name="${escapeXmlAttr(e.name)}">`);
        lines.push(`    <nominal>${e.nominal}</nominal>`);
        lines.push(`    <min>${e.min}</min>`);
        lines.push(`    <max>${e.max}</max>`);
        lines.push(`    <lifetime>${e.lifetime}</lifetime>`);
        lines.push(`    <restock>${e.restock}</restock>`);
        lines.push(`    <saferadius>${e.saferadius}</saferadius>`);
        lines.push(`    <distanceradius>${e.distanceradius}</distanceradius>`);
        lines.push(`    <cleanupradius>${e.cleanupradius}</cleanupradius>`);
        if (e.secondary) {
            lines.push(`    <secondary>${escapeXmlAttr(e.secondary)}</secondary>`);
        }
        const f = e.flags;
        lines.push(
            `    <flags deletable="${f.deletable ? 1 : 0}" init_random="${f.init_random ? 1 : 0}" remove_damaged="${f.remove_damaged ? 1 : 0}"/>`
        );
        lines.push(`    <position>${escapeXmlAttr(e.position)}</position>`);
        lines.push(`    <limit>${escapeXmlAttr(e.limit)}</limit>`);
        lines.push(`    <active>${e.active ? 1 : 0}</active>`);
        lines.push('    <children>');
        for (const c of e.children) {
            lines.push(
                `      <child lootmax="${c.lootmax}" lootmin="${c.lootmin}" max="${c.max}" min="${c.min}" type="${escapeXmlAttr(c.type)}"/>`
            );
        }
        lines.push('    </children>');
        lines.push('  </event>');
    }

    lines.push('</events>');
    return lines.join('\r\n') + '\r\n';
};
