export const SERVER_CONFIG_ID = 'server-config';

export type ServerConfigFieldType = 'string' | 'number' | 'boolean';

export interface ServerConfigFieldDef {
    key: string;
    type: ServerConfigFieldType;
    group: string;
}

// Значения группы и подписи полей — стабильные id, не текст: реальные подписи берутся из
// переводов (server.groups.<id> / server.fields.<key>.label) в i18n-ресурсах.
export const SERVER_CONFIG_GROUPS = ['general', 'time', 'gameplay', 'network', 'mission'] as const;

export const SERVER_CONFIG_FIELDS: ServerConfigFieldDef[] = [
    // Общее
    { key: 'hostname', type: 'string', group: 'general' },
    { key: 'password', type: 'string', group: 'general' },
    { key: 'passwordAdmin', type: 'string', group: 'general' },
    { key: 'enableWhitelist', type: 'boolean', group: 'general' },
    { key: 'maxPlayers', type: 'number', group: 'general' },
    { key: 'verifySignatures', type: 'number', group: 'general' },
    { key: 'forceSameBuild', type: 'boolean', group: 'general' },
    { key: 'instanceId', type: 'number', group: 'general' },

    // Время и погода
    { key: 'serverTime', type: 'string', group: 'time' },
    { key: 'serverTimeAcceleration', type: 'number', group: 'time' },
    { key: 'serverNightTimeAcceleration', type: 'number', group: 'time' },
    { key: 'serverTimePersistent', type: 'boolean', group: 'time' },

    // Геймплей
    { key: 'disableVoN', type: 'boolean', group: 'gameplay' },
    { key: 'vonCodecQuality', type: 'number', group: 'gameplay' },
    { key: 'disable3rdPerson', type: 'boolean', group: 'gameplay' },
    { key: 'disableCrosshair', type: 'boolean', group: 'gameplay' },
    { key: 'disableBaseDamage', type: 'boolean', group: 'gameplay' },
    { key: 'disableContainerDamage', type: 'boolean', group: 'gameplay' },

    // Сеть и производительность
    { key: 'guaranteedUpdates', type: 'number', group: 'network' },
    { key: 'loginQueueConcurrentPlayers', type: 'number', group: 'network' },
    { key: 'loginQueueMaxPlayers', type: 'number', group: 'network' },
    { key: 'storageAutoFix', type: 'boolean', group: 'network' },

    // Миссия
    { key: 'template', type: 'string', group: 'mission' },
];

export type ServerConfigValue = string | number | boolean;
export type ServerConfigValues = Record<string, ServerConfigValue | undefined>;

const buildFieldRegex = (key: string) => new RegExp(`(^|[\\r\\n])([ \\t]*${key}\\s*=\\s*)([^;\\r\\n]*)(;)`);

const decodeValue = (raw: string, type: ServerConfigFieldType): ServerConfigValue => {
    const trimmed = raw.trim();
    if (type === 'number') {
        const num = Number(trimmed);
        return Number.isNaN(num) ? 0 : num;
    }
    if (type === 'boolean') {
        return trimmed === '1';
    }
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

const encodeValue = (value: ServerConfigValue, type: ServerConfigFieldType): string => {
    if (type === 'number') return String(value);
    if (type === 'boolean') return value ? '1' : '0';
    return `"${value}"`;
};

export const parseServerConfig = (raw: string): ServerConfigValues => {
    const values: ServerConfigValues = {};
    for (const field of SERVER_CONFIG_FIELDS) {
        const match = buildFieldRegex(field.key).exec(raw);
        if (!match) continue;
        values[field.key] = decodeValue(match[3], field.type);
    }
    return values;
};

export const patchServerConfig = (raw: string, changes: ServerConfigValues): string => {
    let text = raw;
    for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) continue;
        const field = SERVER_CONFIG_FIELDS.find((f) => f.key === key);
        if (!field) continue;
        const regex = buildFieldRegex(key);
        const encoded = encodeValue(value, field.type);
        text = text.replace(regex, (_match, boundary, prefix, _oldValue, terminator) => `${boundary}${prefix}${encoded}${terminator}`);
    }
    return text;
};
