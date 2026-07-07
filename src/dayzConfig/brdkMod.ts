import { Project } from '../types';

// Вкладка BRDK видна, только если в проекте реально стоит набор модов BRDK: где-то в дереве
// проекта есть папка BRDK_MODS (обычно profiles/BRDK_MODS), куда эти моды пишут свои JSON-конфиги.
export const detectBrdkMod = async (project: Project): Promise<boolean> => {
    const res = await window.api.findDirRecursive(project.path, 'BRDK_MODS');
    return Boolean(res.success && res.data && res.data.length > 0);
};
