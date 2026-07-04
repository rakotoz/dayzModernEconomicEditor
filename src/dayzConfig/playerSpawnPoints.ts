import i18n from '../i18n';

export const PLAYER_SPAWNS_CONFIG_ID = 'player-spawns-config';

export interface SpawnField {
    tag: string;
    value: string;
}

export interface SpawnGroupPos {
    x: string;
    z: string;
}

export interface SpawnGroup {
    name: string;
    positions: SpawnGroupPos[];
}

export interface SpawnSection {
    spawnParams: SpawnField[];
    generatorParams: SpawnField[];
    groupParams: SpawnField[];
    groups: SpawnGroup[];
}

export type SectionKey = 'fresh' | 'hop' | 'travel';
export const SECTION_KEYS: SectionKey[] = ['fresh', 'hop', 'travel'];

export type PlayerSpawnPoints = Record<SectionKey, SpawnSection>;

const readFields = (parent: Element | null): SpawnField[] => {
    if (!parent) return [];
    return Array.from(parent.children).map((el) => ({ tag: el.tagName, value: el.textContent?.trim() ?? '' }));
};

const readGroups = (parent: Element | null): SpawnGroup[] => {
    if (!parent) return [];
    return Array.from(parent.getElementsByTagName('group')).map((g) => ({
        name: g.getAttribute('name') ?? '',
        positions: Array.from(g.getElementsByTagName('pos')).map((p) => ({
            x: p.getAttribute('x') ?? '0',
            z: p.getAttribute('z') ?? '0',
        })),
    }));
};

const emptySection = (): SpawnSection => ({ spawnParams: [], generatorParams: [], groupParams: [], groups: [] });

export const parsePlayerSpawnPoints = (raw: string): PlayerSpawnPoints => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('playerSpawns.parseFileError'));
    }
    const root = doc.documentElement;
    const result = { fresh: emptySection(), hop: emptySection(), travel: emptySection() } as PlayerSpawnPoints;

    for (const key of SECTION_KEYS) {
        const sectionEl = root.getElementsByTagName(key)[0] ?? null;
        if (!sectionEl) continue;
        result[key] = {
            spawnParams: readFields(sectionEl.getElementsByTagName('spawn_params')[0] ?? null),
            generatorParams: readFields(sectionEl.getElementsByTagName('generator_params')[0] ?? null),
            groupParams: readFields(sectionEl.getElementsByTagName('group_params')[0] ?? null),
            groups: readGroups(sectionEl.getElementsByTagName('generator_posbubbles')[0] ?? null),
        };
    }
    return result;
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const writeFields = (lines: string[], tag: string, fields: SpawnField[]) => {
    lines.push(`    <${tag}>`);
    for (const f of fields) {
        lines.push(`      <${f.tag}>${f.value}</${f.tag}>`);
    }
    lines.push(`    </${tag}>`);
};

export const serializePlayerSpawnPoints = (data: PlayerSpawnPoints): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<playerspawnpoints>'];

    for (const key of SECTION_KEYS) {
        const s = data[key];
        lines.push(`  <${key}>`);
        writeFields(lines, 'spawn_params', s.spawnParams);
        writeFields(lines, 'generator_params', s.generatorParams);
        writeFields(lines, 'group_params', s.groupParams);
        if (s.groups.length === 0) {
            lines.push('    <generator_posbubbles />');
        } else {
            lines.push('    <generator_posbubbles>');
            for (const g of s.groups) {
                lines.push(`      <group name="${escapeXmlAttr(g.name)}">`);
                for (const p of g.positions) {
                    lines.push(`        <pos x="${escapeXmlAttr(p.x)}" z="${escapeXmlAttr(p.z)}" />`);
                }
                lines.push('      </group>');
            }
            lines.push('    </generator_posbubbles>');
        }
        lines.push(`  </${key}>`);
    }

    lines.push('</playerspawnpoints>');
    return lines.join('\r\n') + '\r\n';
};
