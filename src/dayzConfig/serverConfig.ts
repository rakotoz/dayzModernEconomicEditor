export const SERVER_CONFIG_ID = 'server-config';

export type ServerConfigFieldType = 'string' | 'number' | 'boolean';

export interface ServerConfigFieldDef {
    key: string;
    label: string;
    type: ServerConfigFieldType;
    group: string;
    helperText?: string;
}

export const SERVER_CONFIG_GROUPS = ['Общее', 'Время и погода', 'Геймплей', 'Сеть и производительность', 'Миссия'] as const;

export const SERVER_CONFIG_FIELDS: ServerConfigFieldDef[] = [
    // Общее
    { key: 'hostname', label: 'Название сервера', type: 'string', group: 'Общее' },
    { key: 'password', label: 'Пароль на сервер', type: 'string', group: 'Общее' },
    { key: 'passwordAdmin', label: 'Пароль администратора', type: 'string', group: 'Общее' },
    { key: 'enableWhitelist', label: 'Вайтлист', type: 'boolean', group: 'Общее' },
    { key: 'maxPlayers', label: 'Макс. игроков', type: 'number', group: 'Общее' },
    { key: 'verifySignatures', label: 'Проверка подписей модов', type: 'number', group: 'Общее', helperText: 'Обычно 2' },
    { key: 'forceSameBuild', label: 'Требовать ту же версию клиента', type: 'boolean', group: 'Общее' },
    { key: 'instanceId', label: 'ID инстанса', type: 'number', group: 'Общее' },

    // Время и погода
    {
        key: 'serverTime',
        label: 'Время сервера',
        type: 'string',
        group: 'Время и погода',
        helperText: 'SystemTime или ГГГГ/ММ/ДД/ЧЧ/ММ',
    },
    { key: 'serverTimeAcceleration', label: 'Ускорение дневного времени', type: 'number', group: 'Время и погода' },
    { key: 'serverNightTimeAcceleration', label: 'Ускорение ночного времени', type: 'number', group: 'Время и погода' },
    {
        key: 'serverTimePersistent',
        label: 'Сохранять время между рестартами',
        type: 'boolean',
        group: 'Время и погода',
    },

    // Геймплей
    { key: 'disableVoN', label: 'Отключить голосовой чат', type: 'boolean', group: 'Геймплей' },
    { key: 'vonCodecQuality', label: 'Качество голосового кодека', type: 'number', group: 'Геймплей', helperText: '0-30' },
    { key: 'disable3rdPerson', label: 'Отключить вид от третьего лица', type: 'boolean', group: 'Геймплей' },
    { key: 'disableCrosshair', label: 'Отключить прицел', type: 'boolean', group: 'Геймплей' },
    { key: 'disableBaseDamage', label: 'Отключить урон по базам', type: 'boolean', group: 'Геймплей' },
    { key: 'disableContainerDamage', label: 'Отключить урон по контейнерам', type: 'boolean', group: 'Геймплей' },

    // Сеть и производительность
    {
        key: 'guaranteedUpdates',
        label: 'Guaranteed Updates',
        type: 'number',
        group: 'Сеть и производительность',
        helperText: 'Обычно 1',
    },
    {
        key: 'loginQueueConcurrentPlayers',
        label: 'Одновременных входов в очереди',
        type: 'number',
        group: 'Сеть и производительность',
    },
    { key: 'loginQueueMaxPlayers', label: 'Макс. игроков в очереди', type: 'number', group: 'Сеть и производительность' },
    { key: 'storageAutoFix', label: 'Автовосстановление хранилища', type: 'boolean', group: 'Сеть и производительность' },

    // Миссия
    { key: 'template', label: 'Шаблон миссии', type: 'string', group: 'Миссия', helperText: 'class Missions > DayZ > template' },
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
