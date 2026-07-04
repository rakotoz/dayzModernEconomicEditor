import i18n from '../i18n';

export const GLOBALS_CONFIG_ID = 'globals-config';

export interface GlobalVar {
    name: string;
    type: string;
    value: string;
}

export const parseGlobalsXml = (raw: string): GlobalVar[] => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error(i18n.t('globals.parseFileError'));
    }
    return Array.from(doc.documentElement.getElementsByTagName('var')).map((el) => ({
        name: el.getAttribute('name') ?? '',
        type: el.getAttribute('type') ?? '0',
        // value храним строкой, чтобы не терять точность/формат чисел
        value: el.getAttribute('value') ?? '',
    }));
};

const escapeXmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serializeGlobalsXml = (vars: GlobalVar[]): string => {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<variables>'];
    for (const v of vars) {
        lines.push(`  <var name="${escapeXmlAttr(v.name)}" type="${escapeXmlAttr(v.type)}" value="${escapeXmlAttr(v.value)}" />`);
    }
    lines.push('</variables>');
    return lines.join('\r\n') + '\r\n';
};
