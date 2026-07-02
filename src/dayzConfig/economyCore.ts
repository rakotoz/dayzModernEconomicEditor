export const ECONOMY_CONFIG_ID = 'economy-config';

export interface CeTypesFileInfo {
    folder: string;
    fileName: string;
}

// Один <ce folder="..."> может содержать несколько <file type="types">
// (типичный паттерн для серверов, где экономика раздроблена по модам/машинам/т.д.),
// поэтому возвращаем все совпадения, а не только первое.
export const parseEconomyCoreTypesFiles = (raw: string): CeTypesFileInfo[] => {
    const doc = new DOMParser().parseFromString(raw, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Не удалось разобрать cfgeconomycore.xml — файл повреждён или не является корректным XML');
    }
    const result: CeTypesFileInfo[] = [];
    const ceEls = Array.from(doc.getElementsByTagName('ce'));
    for (const ceEl of ceEls) {
        const folder = ceEl.getAttribute('folder') ?? '';
        const fileEls = Array.from(ceEl.getElementsByTagName('file'));
        for (const fileEl of fileEls) {
            if (fileEl.getAttribute('type') === 'types') {
                const fileName = fileEl.getAttribute('name');
                if (fileName) {
                    result.push({ folder, fileName });
                }
            }
        }
    }
    return result;
};
