import i18n from '../i18n';

export const EVENT_SPAWNS_CONFIG_ID = 'event-spawns-config';

export interface EventSpawnZone {
    smin: number;
    smax: number;
    dmin: number;
    dmax: number;
    r: number;
}

export interface EventSpawnPos {
    x: number;
    z: number;
    a: number;
    y?: number;
    group?: string;
}

export interface EventSpawnEntry {
    name: string;
    zone: EventSpawnZone | null;
    positions: EventSpawnPos[];
}

export const DEFAULT_ZONE: EventSpawnZone = { smin: 0, smax: 0, dmin: 0, dmax: 0, r: 0 };

export const parseEventSpawnsXml = (raw: string): EventSpawnEntry[] => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('eventSpawns.parseFileError'));
    }

    const eventEls = Array.from(doc.documentElement.getElementsByTagName('event'));

    return eventEls.map((el) => {
        const zoneEl = el.getElementsByTagName('zone')[0];
        const zone: EventSpawnZone | null = zoneEl
            ? {
                  smin: Number(zoneEl.getAttribute('smin')) || 0,
                  smax: Number(zoneEl.getAttribute('smax')) || 0,
                  dmin: Number(zoneEl.getAttribute('dmin')) || 0,
                  dmax: Number(zoneEl.getAttribute('dmax')) || 0,
                  r: Number(zoneEl.getAttribute('r')) || 0,
              }
            : null;

        const positions: EventSpawnPos[] = Array.from(el.getElementsByTagName('pos')).map((p) => {
            const pos: EventSpawnPos = {
                x: Number(p.getAttribute('x')) || 0,
                z: Number(p.getAttribute('z')) || 0,
                a: Number(p.getAttribute('a')) || 0,
            };
            if (p.hasAttribute('y')) pos.y = Number(p.getAttribute('y')) || 0;
            if (p.hasAttribute('group')) pos.group = p.getAttribute('group') ?? '';
            return pos;
        });

        return { name: el.getAttribute('name') ?? '', zone, positions };
    });
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serializeEventSpawnsXml = (entries: EventSpawnEntry[]): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<eventposdef>'];

    for (const e of entries) {
        const hasContent = e.zone !== null || e.positions.length > 0;
        if (!hasContent) {
            lines.push(`  <event name="${escapeXmlAttr(e.name)}" />`);
            continue;
        }
        lines.push(`  <event name="${escapeXmlAttr(e.name)}">`);
        if (e.zone) {
            const z = e.zone;
            lines.push(`    <zone smin="${z.smin}" smax="${z.smax}" dmin="${z.dmin}" dmax="${z.dmax}" r="${z.r}"/>`);
        }
        for (const p of e.positions) {
            const yAttr = p.y !== undefined ? ` y="${p.y}"` : '';
            const groupAttr = p.group ? ` group="${escapeXmlAttr(p.group)}"` : '';
            lines.push(`    <pos x="${p.x}"${yAttr} z="${p.z}" a="${p.a}"${groupAttr}/>`);
        }
        lines.push('  </event>');
    }

    lines.push('</eventposdef>');
    return lines.join('\r\n') + '\r\n';
};
