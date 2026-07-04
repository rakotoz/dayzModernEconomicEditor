import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { nanoid } from '@reduxjs/toolkit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentProject, updateProject } from '../store/slices/appSlice';
import {
    parseBaseFlags,
    parseUserDefinitions,
    serializeUserDefinitions,
    UserDef,
} from '../dayzConfig/userDefinitions';
import { basenamePath, dirnamePath, joinPath } from '../dayzConfig/pathUtils';

interface UserRow extends UserDef {
    rowId: string;
}

const toRows = (users: UserDef[]): UserRow[] => users.map((u) => ({ ...u, rowId: nanoid() }));
const toUsers = (rows: UserRow[]): UserDef[] => rows.map(({ rowId, ...u }) => u);

type ViewStatus = 'detecting' | 'loading' | 'ready' | 'picker' | 'error';

// Один раздел (usage или value): список групп слева + редактор членов выбранной группы.
const DefinitionSection = ({
    title,
    rows,
    available,
    onChange,
    newNamePrefix,
}: {
    title: string;
    rows: UserRow[];
    available: string[];
    onChange: (rows: UserRow[]) => void;
    newNamePrefix: string;
}) => {
    const { t } = useTranslation();
    const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.rowId ?? null);

    const selected = rows.find((r) => r.rowId === selectedId) ?? null;

    const patchSelected = (patch: Partial<UserRow>) => {
        if (!selected) return;
        onChange(rows.map((r) => (r.rowId === selected.rowId ? { ...r, ...patch } : r)));
    };

    const addGroup = () => {
        const row: UserRow = { rowId: nanoid(), name: `${newNamePrefix}${rows.length + 1}`, members: [] };
        onChange([...rows, row]);
        setSelectedId(row.rowId);
    };

    const removeGroup = (rowId: string) => {
        onChange(rows.filter((r) => r.rowId !== rowId));
        if (selectedId === rowId) setSelectedId(null);
    };

    const availableToAdd = available.filter((a) => !selected?.members.includes(a));

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                {title}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Box sx={{ width: 220, flexShrink: 0 }}>
                    <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
                        <List dense sx={{ py: 0 }}>
                            {rows.map((r) => (
                                <ListItemButton
                                    key={r.rowId}
                                    selected={r.rowId === selectedId}
                                    onClick={() => setSelectedId(r.rowId)}
                                >
                                    <ListItemText primary={r.name || t('userDefs.noName')} />
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeGroup(r.rowId);
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </ListItemButton>
                            ))}
                        </List>
                    </Paper>
                    <Button size="small" fullWidth startIcon={<AddIcon />} sx={{ mt: 1 }} onClick={addGroup}>
                        {t('userDefs.addGroup')}
                    </Button>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {!selected ? (
                        <Typography color="text.secondary" variant="body2">
                            {t('userDefs.selectGroupHint')}
                        </Typography>
                    ) : (
                        <Stack spacing={2}>
                            <TextField
                                size="small"
                                fullWidth
                                label={t('userDefs.groupName')}
                                value={selected.name}
                                onChange={(e) => patchSelected({ name: e.target.value })}
                            />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {t('userDefs.members')} ({selected.members.length})
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, minHeight: 32 }}>
                                    {selected.members.map((m) => (
                                        <Chip
                                            key={m}
                                            label={m}
                                            size="small"
                                            onDelete={() => patchSelected({ members: selected.members.filter((x) => x !== m) })}
                                        />
                                    ))}
                                    {selected.members.length === 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            {t('userDefs.noMembers')}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {t('userDefs.available')}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {availableToAdd.map((a) => (
                                        <Chip
                                            key={a}
                                            label={a}
                                            size="small"
                                            variant="outlined"
                                            icon={<AddIcon fontSize="small" />}
                                            onClick={() => patchSelected({ members: [...selected.members, a] })}
                                        />
                                    ))}
                                    {availableToAdd.length === 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            {t('userDefs.allAdded')}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
};

export const UserDefinitionsView = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const project = useAppSelector(selectCurrentProject);

    const [status, setStatus] = useState<ViewStatus>('detecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [filePath, setFilePath] = useState<string | null>(null);

    const [usageRows, setUsageRows] = useState<UserRow[]>([]);
    const [valueRows, setValueRows] = useState<UserRow[]>([]);
    const [baseUsages, setBaseUsages] = useState<string[]>([]);
    const [baseValues, setBaseValues] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedNotice, setSavedNotice] = useState(false);

    const loadFile = async (path: string, persist: boolean) => {
        setStatus('loading');
        setErrorMessage(null);
        const res = await window.api.readFile(path);
        if (!res.success || res.data === undefined) {
            setErrorMessage(res.error ?? t('userDefs.readFileError'));
            setStatus('error');
            return;
        }
        try {
            const defs = parseUserDefinitions(res.data);
            setUsageRows(toRows(defs.usageUsers));
            setValueRows(toRows(defs.valueUsers));

            // Базовые флаги — из соседнего cfglimitsdefinition.xml; если его нет, берём уже
            // использованные значения как fallback, чтобы список «доступных» не был пустым.
            const baseRes = await window.api.readFile(joinPath(dirnamePath(path), 'cfglimitsdefinition.xml'));
            if (baseRes.success && baseRes.data !== undefined) {
                const base = parseBaseFlags(baseRes.data);
                setBaseUsages(base.usages);
                setBaseValues(base.values);
            } else {
                const usedUsages = new Set(defs.usageUsers.flatMap((u) => u.members));
                const usedValues = new Set(defs.valueUsers.flatMap((u) => u.members));
                setBaseUsages([...usedUsages].sort());
                setBaseValues([...usedValues].sort());
            }

            setDirty(false);
            setFilePath(path);
            setStatus('ready');
            if (persist && project) {
                dispatch(updateProject({ id: project.id, changes: { userDefinitionsPath: path } }));
            }
        } catch (e: any) {
            setErrorMessage(e.message ?? t('userDefs.parseFileError'));
            setStatus('error');
        }
    };

    const detect = async () => {
        if (!project) return;
        setStatus('detecting');
        setErrorMessage(null);
        const res = await window.api.findFileRecursive(project.path, 'cfglimitsdefinitionuser.xml');
        if (!res.success || !res.data) {
            setErrorMessage(res.error ?? t('userDefs.scanError'));
            setStatus('error');
            return;
        }
        if (res.data.length === 1) {
            await loadFile(res.data[0], true);
            return;
        }
        setCandidates(res.data);
        setStatus('picker');
    };

    useEffect(() => {
        if (!project) return;
        if (project.userDefinitionsPath) {
            loadFile(project.userDefinitionsPath, false);
        } else {
            detect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id]);

    const handleManualBrowse = async () => {
        const path = await window.api.openFileDialog([{ name: 'cfglimitsdefinitionuser.xml', extensions: ['xml'] }]);
        if (path) await loadFile(path, true);
    };

    const handleSave = async () => {
        if (!filePath) return;
        setSaving(true);
        setSaveError(null);
        const xml = serializeUserDefinitions({ usageUsers: toUsers(usageRows), valueUsers: toUsers(valueRows) });
        const res = await window.api.writeFile(filePath, xml);
        setSaving(false);
        if (!res.success) {
            setSaveError(res.error ?? t('userDefs.saveError'));
            return;
        }
        setDirty(false);
        setSavedNotice(true);
    };

    const totalCount = useMemo(() => usageRows.length + valueRows.length, [usageRows, valueRows]);

    if (!project) return null;

    if (status === 'detecting' || status === 'loading') {
        return (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{status === 'detecting' ? t('userDefs.detecting') : t('userDefs.loading')}</Typography>
            </Stack>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMessage}
                </Alert>
                <Button startIcon={<RefreshIcon />} onClick={detect}>
                    {t('common.retry')}
                </Button>
            </Box>
        );
    }

    if (status === 'picker') {
        return (
            <Box sx={{ p: 3, maxWidth: 560 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    {t('userDefs.pickerTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('common.inProjectFolder')}{' '}
                    {candidates.length === 0 ? t('userDefs.pickerNotFound') : t('userDefs.pickerFound', { count: candidates.length })}.{' '}
                    {t('common.chooseOrBrowse')}
                </Typography>
                {candidates.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                        {candidates.map((c, i) => (
                            <React.Fragment key={c}>
                                {i > 0 && <Divider />}
                                <ButtonBase onClick={() => loadFile(c, true)} sx={{ width: '100%', justifyContent: 'flex-start', p: 1.5, gap: 1.5 }}>
                                    <InsertDriveFileIcon fontSize="small" color="action" />
                                    <Stack sx={{ alignItems: 'flex-start' }}>
                                        <Typography variant="body2">{basenamePath(c)}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {c}
                                        </Typography>
                                    </Stack>
                                </ButtonBase>
                            </React.Fragment>
                        ))}
                    </Paper>
                )}
                <Button variant="contained" onClick={handleManualBrowse}>
                    {t('common.browseManually')}
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack
                direction="row"
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    gap: 2,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {t('userDefs.title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={filePath ?? ''}>
                        {filePath} • {t('userDefs.recordsCount', { count: totalCount })}
                    </Typography>
                </Box>
                <Button size="small" onClick={detect}>
                    {t('common.changeFile')}
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} disabled={!dirty || saving} onClick={handleSave}>
                    {t('common.save')}
                </Button>
            </Stack>

            {saveError && (
                <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setSaveError(null)}>
                    {saveError}
                </Alert>
            )}

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <Stack spacing={2}>
                    <DefinitionSection
                        title={t('userDefs.usageSection')}
                        rows={usageRows}
                        available={baseUsages}
                        newNamePrefix="Usage"
                        onChange={(r) => {
                            setUsageRows(r);
                            setDirty(true);
                        }}
                    />
                    <DefinitionSection
                        title={t('userDefs.valueSection')}
                        rows={valueRows}
                        available={baseValues}
                        newNamePrefix="Tier"
                        onChange={(r) => {
                            setValueRows(r);
                            setDirty(true);
                        }}
                    />
                </Stack>
            </Box>

            <Snackbar
                open={savedNotice}
                autoHideDuration={2500}
                onClose={() => setSavedNotice(false)}
                message={t('common.saved')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            />
        </Box>
    );
};
