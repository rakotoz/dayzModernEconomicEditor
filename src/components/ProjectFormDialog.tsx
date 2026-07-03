import React, { useEffect, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useTranslation } from 'react-i18next';
import { Project, SetupType, TraderMod } from '../types';
import { DAYZ_MAPS, findDayzMapByLabel, getDayzMapPath } from '../data/dayzMaps';

const MAP_LABELS = DAYZ_MAPS.map((m) => m.label);

export interface ProjectFormValues {
    name: string;
    path: string;
    setupType: SetupType;
    profileFolderName: string;
    missionFolder: string;
    map: string;
    mapPath: string;
    mapSize: number;
    traders: TraderMod;
    createBackups: boolean;
}

const getProjectNameFromPath = (path: string) => {
    const normalized = path.replace(/[\\/]+$/, '');
    const parts = normalized.split(/[\\/]/);
    return parts[parts.length - 1] || normalized;
};

const emptyValues: ProjectFormValues = {
    name: '',
    path: '',
    setupType: 'blank',
    profileFolderName: 'profiles',
    missionFolder: '',
    map: 'Chernarus+',
    mapPath: getDayzMapPath('chernarusplus'),
    mapSize: 15360,
    traders: 'none',
    createBackups: false,
};

const projectToValues = (project: Project): ProjectFormValues => ({
    name: project.name,
    path: project.path,
    setupType: project.setupType,
    profileFolderName: project.profileFolderName,
    missionFolder: project.missionFolder,
    map: project.map,
    mapPath: project.mapPath,
    mapSize: project.mapSize,
    traders: project.traders,
    createBackups: project.createBackups,
});

interface ProjectFormDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    initialProject?: Project | null;
    onClose: () => void;
    onSubmit: (values: ProjectFormValues) => void;
}

export const ProjectFormDialog = ({ open, mode, initialProject, onClose, onSubmit }: ProjectFormDialogProps) => {
    const { t } = useTranslation();
    const [values, setValues] = useState<ProjectFormValues>(emptyValues);

    const SETUP_TYPE_OPTIONS: { value: SetupType; label: string }[] = [
        { value: 'blank', label: t('projectForm.setupTypeBlank') },
        { value: 'existing', label: t('projectForm.setupTypeExisting') },
    ];

    const TRADER_OPTIONS: { value: TraderMod; label: string }[] = [
        { value: 'none', label: t('projectForm.traderNone') },
        { value: 'expansion', label: 'Expansion Market' },
        { value: 'drJones', label: 'Dr Jones Trader' },
        { value: 'traderPlus', label: 'Trader Plus' },
    ];

    useEffect(() => {
        if (!open) return;
        setValues(mode === 'edit' && initialProject ? projectToValues(initialProject) : emptyValues);
    }, [open, mode, initialProject]);

    const handleChange = <K extends keyof ProjectFormValues>(field: K, value: ProjectFormValues[K]) => {
        setValues((prev) => ({ ...prev, [field]: value }));
    };

    const handleBrowseFolder = async () => {
        const path = await window.api.openFolderDialog();
        if (!path) return;
        setValues((prev) => ({
            ...prev,
            path,
            name: prev.name || getProjectNameFromPath(path),
        }));
    };

    const isValid = values.name.trim() !== '' && values.path.trim() !== '';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'create' ? t('projectForm.newProject') : t('projectForm.editProject')}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                    <TextField
                        select
                        label={t('projectForm.setupType')}
                        value={values.setupType}
                        onChange={(e) => handleChange('setupType', e.target.value as SetupType)}
                        fullWidth
                    >
                        {SETUP_TYPE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label={t('projectForm.projectName')}
                        value={values.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label={t('projectForm.projectFolder')}
                        value={values.path}
                        onChange={(e) => handleChange('path', e.target.value)}
                        fullWidth
                        required
                        placeholder="E:\dayz\server\MyProject"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleBrowseFolder} edge="end" aria-label={t('projectForm.browseFolder')}>
                                            <FolderOpenIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Stack direction="row" spacing={2}>
                        <TextField
                            label={t('projectForm.profileFolder')}
                            value={values.profileFolderName}
                            onChange={(e) => handleChange('profileFolderName', e.target.value)}
                            helperText={t('projectForm.profileFolderHelper')}
                            fullWidth
                        />
                        <TextField
                            label={t('projectForm.missionFolder')}
                            value={values.missionFolder}
                            onChange={(e) => handleChange('missionFolder', e.target.value)}
                            helperText={t('projectForm.missionFolderHelper')}
                            fullWidth
                        />
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <Autocomplete
                            freeSolo
                            options={MAP_LABELS}
                            inputValue={values.map}
                            onInputChange={(_, newInputValue) => {
                                const found = findDayzMapByLabel(newInputValue);
                                if (found) {
                                    setValues((prev) => ({
                                        ...prev,
                                        map: found.label,
                                        mapSize: found.size,
                                        mapPath: getDayzMapPath(found.key),
                                    }));
                                } else {
                                    handleChange('map', newInputValue);
                                }
                            }}
                            sx={{ flex: 1 }}
                            renderInput={(params) => (
                                <TextField {...params} label={t('projectForm.map')} helperText={t('projectForm.mapHelper')} />
                            )}
                        />
                        <TextField
                            label={t('projectForm.mapSize')}
                            type="number"
                            value={values.mapSize}
                            onChange={(e) => handleChange('mapSize', Number(e.target.value) || 0)}
                            sx={{ minWidth: 140 }}
                        />
                    </Stack>

                    <TextField
                        label={t('projectForm.mapPath')}
                        value={values.mapPath}
                        onChange={(e) => handleChange('mapPath', e.target.value)}
                        helperText={t('projectForm.mapPathHelper')}
                        fullWidth
                    />

                    <FormControl>
                        <FormLabel>{t('projectForm.traders')}</FormLabel>
                        <RadioGroup
                            row
                            value={values.traders}
                            onChange={(e) => handleChange('traders', e.target.value as TraderMod)}
                            sx={{ flexWrap: 'wrap' }}
                        >
                            {TRADER_OPTIONS.map((opt) => (
                                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
                            ))}
                        </RadioGroup>
                    </FormControl>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={values.createBackups}
                                onChange={(e) => handleChange('createBackups', e.target.checked)}
                            />
                        }
                        label={t('projectForm.createBackups')}
                    />

                    {mode === 'create' && (
                        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {t('projectForm.infoText')}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button variant="contained" disabled={!isValid} onClick={() => onSubmit(values)}>
                    {mode === 'create' ? t('projectForm.create') : t('projectForm.saveChanges')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
