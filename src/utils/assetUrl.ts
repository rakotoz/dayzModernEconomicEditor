// Все изображения карт лежат плоско в <хранилище>/maps, поэтому для URL достаточно имени файла.
// Схема dayzasset:// обслуживается main-процессом (см. setupAssetProtocol в main.ts) — file://
// из http-страницы renderer Chromium не пропускает.
export const mapImageUrl = (filePath: string): string => {
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
    return `dayzasset://maps/${encodeURIComponent(fileName)}`;
};
