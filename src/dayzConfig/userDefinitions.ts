import i18n from '../i18n';

export const USER_DEFINITIONS_CONFIG_ID = 'user-definitions-config';

export interface UserDef {
    name: string;
    members: string[];
}

export interface UserDefinitions {
    usageUsers: UserDef[];
    valueUsers: UserDef[];
}

const parseUsers = (parent: Element | null, childTag: 'usage' | 'value'): UserDef[] => {
    if (!parent) return [];
    return Array.from(parent.getElementsByTagName('user')).map((userEl) => ({
        name: userEl.getAttribute('name') ?? '',
        members: Array.from(userEl.getElementsByTagName(childTag))
            .map((c) => c.getAttribute('name') ?? '')
            .filter(Boolean),
    }));
};

export const parseUserDefinitions = (raw: string): UserDefinitions => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('userDefs.parseFileError'));
    }
    const root = doc.documentElement;
    return {
        usageUsers: parseUsers(root.getElementsByTagName('usageflags')[0] ?? null, 'usage'),
        valueUsers: parseUsers(root.getElementsByTagName('valueflags')[0] ?? null, 'value'),
    };
};

// Базовые usage/value берём из cfglimitsdefinition.xml (правые панели «доступные» в старой программе).
export const parseBaseFlags = (raw: string): { usages: string[]; values: string[] } => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('userDefs.parseBaseError'));
    }
    const usageflags = doc.documentElement.getElementsByTagName('usageflags')[0] ?? null;
    const valueflags = doc.documentElement.getElementsByTagName('valueflags')[0] ?? null;
    const collect = (parent: Element | null, tag: string) =>
        parent
            ? Array.from(parent.getElementsByTagName(tag))
                  .map((el) => el.getAttribute('name') ?? '')
                  .filter(Boolean)
            : [];
    return { usages: collect(usageflags, 'usage'), values: collect(valueflags, 'value') };
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const serializeSection = (lines: string[], sectionTag: string, childTag: string, users: UserDef[]) => {
    lines.push(`    <${sectionTag}>`);
    for (const u of users) {
        lines.push(`        <user name="${escapeXmlAttr(u.name)}">`);
        for (const m of u.members) {
            lines.push(`            <${childTag} name="${escapeXmlAttr(m)}" />`);
        }
        lines.push('        </user>');
    }
    lines.push(`    </${sectionTag}>`);
};

export const serializeUserDefinitions = (defs: UserDefinitions): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<user_lists>'];
    serializeSection(lines, 'usageflags', 'usage', defs.usageUsers);
    lines.push('');
    serializeSection(lines, 'valueflags', 'value', defs.valueUsers);
    lines.push('</user_lists>');
    return lines.join('\r\n') + '\r\n';
};
