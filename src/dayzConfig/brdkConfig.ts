import { Project } from '../types';
import { JsonValue, parseJsonConfigFile, serializeJsonConfigFile } from './cfgGameplay';
import { basenamePath, joinPath } from './pathUtils';

export interface BrdkConfigFile {
    // Ключ для показа пользователю и сортировки: "GoldRush", "MakeStash/MakeStash" и т.д.
    label: string;
    filePath: string;
}

// Файлы BRDK_MODS, которые действительно являются редактируемыми конфигами мода, а не
// служебными данными (логи, бэкапы, покоординатный рантайм-кэш заброшенных тайников/домов
// в подпапках вроде MakeStash/Locations или HousesData). Верхний уровень папки сканируем
// целиком, плюс явно заходим в известные подпапки с одиночным конфигом мода.
const KNOWN_SUBCONFIGS = ['MakeStash/MakeStash.json'];

export const findBrdkModsDir = async (project: Project): Promise<string | null> => {
    const res = await window.api.findDirRecursive(project.path, 'BRDK_MODS');
    if (!res.success || !res.data || res.data.length === 0) return null;
    return res.data[0];
};

export const listBrdkConfigFiles = async (brdkModsDir: string): Promise<BrdkConfigFile[]> => {
    const files: BrdkConfigFile[] = [];

    const rootRes = await window.api.findFilesByExtension(brdkModsDir, ['json']);
    if (rootRes.success && rootRes.data) {
        for (const filePath of rootRes.data) {
            files.push({ label: basenamePath(filePath).replace(/\.json$/i, ''), filePath });
        }
    }

    for (const rel of KNOWN_SUBCONFIGS) {
        const filePath = joinPath(brdkModsDir, rel);
        const existsRes = await window.api.pathExists(filePath);
        if (existsRes.success && existsRes.data) {
            files.push({ label: rel.replace(/\.json$/i, ''), filePath });
        }
    }

    return files.sort((a, b) => a.label.localeCompare(b.label));
};

export const parseBrdkConfigFile = parseJsonConfigFile;
export const serializeBrdkConfigFile = serializeJsonConfigFile;
export type BrdkJsonValue = JsonValue;
