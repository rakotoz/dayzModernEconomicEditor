export const joinPath = (...parts: string[]) => {
    const normalized = parts
        .filter((p) => p !== undefined && p !== null && p !== '')
        .map((p) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
    return normalized.join('/');
};

export const dirnamePath = (p: string) => {
    const normalized = p.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(0, idx) : '';
};

export const basenamePath = (p: string) => {
    const normalized = p.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] ?? normalized;
};
