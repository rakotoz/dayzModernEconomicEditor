export const CFG_GAMEPLAY_CONFIG_ID = 'cfg-gameplay-config';

// cfggameplay.json — плоский JSON без строгой схемы на нашей стороне: структура ванильного
// DayZ может расти между версиями, поэтому храним как generic JSON-дерево (Record) и
// редактируем через RecursiveJsonForm, а не через типизированный интерфейс — так новые поля
// от апдейтов игры не теряются и не требуют правок кода редактора.
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const parseJsonConfigFile = (raw: string): { hadBom: boolean; data: Record<string, JsonValue> } => {
    const hadBom = raw.charCodeAt(0) === 0xfeff;
    const text = hadBom ? raw.slice(1) : raw;
    return { hadBom, data: JSON.parse(text) };
};

export const serializeJsonConfigFile = (data: Record<string, JsonValue>, hadBom: boolean): string => {
    const json = JSON.stringify(data, null, 2).replace(/\n/g, '\r\n');
    return hadBom ? '﻿' + json : json;
};

// Иммутабельно проставляет значение по пути ключей внутри вложенного JSON-объекта —
// используется RecursiveJsonForm, т.к. глубина вложенности заранее не известна.
export const setJsonPath = (
    root: Record<string, JsonValue>,
    path: string[],
    value: JsonValue
): Record<string, JsonValue> => {
    if (path.length === 0) return root;
    const [key, ...rest] = path;
    if (rest.length === 0) {
        return { ...root, [key]: value };
    }
    const child = (root[key] as Record<string, JsonValue>) ?? {};
    return { ...root, [key]: setJsonPath(child, rest, value) };
};
