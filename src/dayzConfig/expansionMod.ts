import { Project } from '../types';

// Вкладка Expansion видна, только если в проекте реально стоит мод: где-то в дереве проекта
// есть папка ExpansionMod (обычно profiles/ExpansionMod) и папка expansion (обычно
// mpmissions/<миссия>/expansion, но раскладки серверов различаются — где именно лежит
// миссия относительно project.path зависит от структуры конкретного сервера). Ищем
// рекурсивно по имени папки вместо того, чтобы строить путь из полей проекта — это не
// зависит от того, как именно пользователь настроил profileFolderName/missionFolder.
export const detectExpansionMod = async (project: Project): Promise<boolean> => {
    const [profilesRes, missionRes] = await Promise.all([
        window.api.findDirRecursive(project.path, 'ExpansionMod'),
        window.api.findDirRecursive(project.path, 'expansion'),
    ]);

    const hasProfiles = Boolean(profilesRes.success && profilesRes.data && profilesRes.data.length > 0);
    const hasMission = Boolean(missionRes.success && missionRes.data && missionRes.data.length > 0);

    return hasProfiles && hasMission;
};
