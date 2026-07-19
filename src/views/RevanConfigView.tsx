import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, List, ListItemButton, ListItemText, Snackbar, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { selectCurrentProject } from '../store/slices/appSlice';
import { RevanConfigFile, findRevModsDir, listRevanConfigFiles, parseRevanConfigFile, serializeRevanConfigFile } from '../dayzConfig/revanMod';
import { JsonValue, setJsonPath } from '../dayzConfig/cfgGameplay';
import { RecursiveJsonForm } from '../components/RecursiveJsonForm';
import { RevQuestConfigView } from './RevQuestConfigView';
import { RevBankConfigView } from './RevBankConfigView';
import { RevTraderConfigView } from './RevTraderConfigView';
import { RevTraderCategoriesView } from './RevTraderCategoriesView';
import { RevTraderTradersView } from './RevTraderTradersView';
import { RevQuestsView } from './RevQuestsView';
import { RevQuestNpcsView } from './RevQuestNpcsView';
import { RevRanksConfigView } from './RevRanksConfigView';
import { RevCrossConfigView } from './RevCrossConfigView';
import { RevRouletteConfigView } from './RevRouletteConfigView';
import { RevVStorageConfigView } from './RevVStorageConfigView';

// Спец-экраны под конкретные конфиги (по стабильному key). Для остальных — generic RecursiveJsonForm.
const DEDICATED_VIEWS: Record<string, React.ComponentType<{ data: Record<string, JsonValue>; onChange: (next: Record<string, JsonValue>) => void }>> = {
    questConfig: RevQuestConfigView,
    bankConfig: RevBankConfigView,
    traderConfig: RevTraderConfigView,
    panelRanks: RevRanksConfigView,
    panelCross: RevCrossConfigView,
    panelRoulette: RevRouletteConfigView,
    vstorageConfig: RevVStorageConfigView,
};

// Коллекции — папки из многих файлов (товары, квесты…). У каждой свой самодостаточный экран
// с master-detail и собственным сохранением; в отличие от одиночных *Config.json.
const COLLECTIONS: { key: string; label: string; component: React.ComponentType }[] = [
    { key: 'quests', label: 'Quests — квесты и цели', component: RevQuestsView },
    { key: 'questNpcs', label: 'Quests — NPC', component: RevQuestNpcsView },
    { key: 'traderCategories', label: 'Trader — категории и товары', component: RevTraderCategoriesView },
    { key: 'traderTraders', label: 'Trader — трейдеры', component: RevTraderTradersView },
];

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'error';

interface LoadedFile {
    hadBom: boolean;
    data: Record<string, JsonValue>;
}

// Настроечные JSON-конфиги наших Rev_* модов (profiles/Rev_mods/**/*Config.json). Структура у
// каждого своя, поэтому пока редактируем универсальным RecursiveJsonForm (как BRDK). Отдельные
// экраны под коллекции (квесты, торговцы) добавим следующим шагом.
export const RevanConfigView = () => {
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [revModsDir, setRevModsDir] = useState<string | null>(null);

    const [files, setFiles] = useState<RevanConfigFile[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<Record<string, LoadedFile>>({});
    const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const load = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const dir = await findRevModsDir(project);
        if (!dir) {
            setErrorMessage(t('revanConfig.dirNotFound'));
            setStatus('error');
            return;
        }
        setRevModsDir(dir);
        setStatus('loading');

        const list = await listRevanConfigFiles(dir);
        setFiles(list);
        setLoaded({});
        setDirtyPaths(new Set());
        setSelectedPath(list[0]?.filePath ?? null);
        setStatus('ready');
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    useEffect(() => {
        if (!selectedPath || loaded[selectedPath]) return;
        let cancelled = false;
        window.api.readFile(selectedPath).then((res) => {
            if (cancelled || !res.success || res.data === undefined) return;
            try {
                const parsed = parseRevanConfigFile(res.data);
                setLoaded((prev) => ({ ...prev, [selectedPath]: parsed }));
            } catch (e: any) {
                setErrorMessage(e.message ?? t('revanConfig.parseFileError'));
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPath]);

    const selectedFile = selectedPath ? loaded[selectedPath] : undefined;

    const handleChange = (path: string[], value: JsonValue) => {
        if (!selectedPath || !selectedFile) return;
        setLoaded((prev) => ({ ...prev, [selectedPath]: { ...selectedFile, data: setJsonPath(selectedFile.data, path, value) } }));
        setDirtyPaths((prev) => new Set(prev).add(selectedPath));
    };

    const handleFullChange = (next: Record<string, JsonValue>) => {
        if (!selectedPath || !selectedFile) return;
        setLoaded((prev) => ({ ...prev, [selectedPath]: { ...selectedFile, data: next } }));
        setDirtyPaths((prev) => new Set(prev).add(selectedPath));
    };

    const selectedEntry = files.find((f) => f.filePath === selectedPath);
    const DedicatedView = selectedEntry ? DEDICATED_VIEWS[selectedEntry.key] : undefined;

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        const failures: string[] = [];
        for (const path of dirtyPaths) {
            const file = loaded[path];
            if (!file) continue;
            const res = await window.api.writeFile(path, serializeRevanConfigFile(file.data, file.hadBom));
            if (!res.success) failures.push(`${path}: ${res.error ?? t('revanConfig.saveError')}`);
        }
        setSaving(false);
        if (failures.length > 0) {
            setSaveError(failures.join('\n'));
            return;
        }
        setDirtyPaths(new Set());
        setSavedNotice(true);
    };

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('revanConfig.detecting') : t('revanConfig.loading')}</Typography>
            </Stack>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                    {errorMessage}
                </Alert>
                <Button startIcon={<RefreshIcon />} onClick={load}>
                    {t('common.retry')}
                </Button>
            </Box>
        );
    }

    const CollectionComp = selectedCollection ? COLLECTIONS.find((c) => c.key === selectedCollection)?.component : undefined;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {!selectedCollection && (
                <Stack
                    direction="row"
                    sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {t('revanConfig.title')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap title={revModsDir ?? ''}>
                            {revModsDir} • {t('revanConfig.filesCount', { count: files.length })}
                        </Typography>
                    </Box>
                    <Button size="small" onClick={load}>
                        {t('common.changeFile')}
                    </Button>
                    <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={dirtyPaths.size === 0 || saving} onClick={handleSave}>
                        {t('common.save')} {dirtyPaths.size > 0 && `(${dirtyPaths.size})`}
                    </Button>
                </Stack>
            )}

            {saveError && !selectedCollection && (
                <Alert severity="error" sx={{ mx: 2, mt: 2, whiteSpace: 'pre-line' }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                        {files.map((f) => (
                            <ListItemButton
                                key={f.filePath}
                                selected={!selectedCollection && f.filePath === selectedPath}
                                onClick={() => {
                                    setSelectedCollection(null);
                                    setSelectedPath(f.filePath);
                                }}
                            >
                                <ListItemText primary={f.label} secondary={dirtyPaths.has(f.filePath) ? t('common.unsaved') : undefined} />
                            </ListItemButton>
                        ))}
                        {files.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                {t('revanConfig.noFiles')}
                            </Typography>
                        )}
                        {COLLECTIONS.length > 0 && (
                            <>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
                                    Коллекции
                                </Typography>
                                {COLLECTIONS.map((c) => (
                                    <ListItemButton
                                        key={c.key}
                                        selected={selectedCollection === c.key}
                                        onClick={() => {
                                            setSelectedPath(null);
                                            setSelectedCollection(c.key);
                                        }}
                                    >
                                        <ListItemText primary={c.label} />
                                    </ListItemButton>
                                ))}
                            </>
                        )}
                    </List>
                    <Divider />
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: CollectionComp ? 'hidden' : 'auto', p: CollectionComp ? 0 : 2 }}>
                    {CollectionComp ? (
                        <CollectionComp />
                    ) : !selectedPath ? (
                        <Typography color="text.secondary">{t('revanConfig.selectHint')}</Typography>
                    ) : !selectedFile ? (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                            <CircularProgress size={24} />
                        </Stack>
                    ) : DedicatedView ? (
                        <DedicatedView data={selectedFile.data} onChange={handleFullChange} />
                    ) : (
                        <RecursiveJsonForm data={selectedFile.data} onChange={handleChange} />
                    )}
                </Box>
            </Box>

            <Snackbar open={savedNotice} autoHideDuration={2500} onClose={() => setSavedNotice(false)} message={t('common.saved')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        </Box>
    );
};
