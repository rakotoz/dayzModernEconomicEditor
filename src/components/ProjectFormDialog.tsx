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
import { Project, SetupType, TraderMod } from '../types';
import { DAYZ_MAPS, findDayzMapByLabel, getDayzMapPath } from '../data/dayzMaps';

const MAP_LABELS = DAYZ_MAPS.map((m) => m.label);

const SETUP_TYPE_OPTIONS: { value: SetupType; label: string }[] = [
    { value: 'blank', label: 'Новый / вручную скопированные файлы (Blank)' },
    { value: 'existing', label: 'Существующий проект (Existing)' },
];

const TRADER_OPTIONS: { value: TraderMod; label: string }[] = [
    { value: 'none', label: 'Нет' },
    { value: 'expansion', label: 'Expansion Market' },
    { value: 'drJones', label: 'Dr Jones Trader' },
    { value: 'traderPlus', label: 'Trader Plus' },
];

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
    const [values, setValues] = useState<ProjectFormValues>(emptyValues);

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
            <DialogTitle>{mode === 'create' ? 'Новый проект' : 'Редактирование проекта'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                    <TextField
                        select
                        label="Тип настройки"
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
                        label="Название проекта"
                        value={values.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label="Папка проекта"
                        value={values.path}
                        onChange={(e) => handleChange('path', e.target.value)}
                        fullWidth
                        required
                        placeholder="E:\dayz\server\MyProject"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleBrowseFolder} edge="end" aria-label="Выбрать папку">
                                            <FolderOpenIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Папка профиля"
                            value={values.profileFolderName}
                            onChange={(e) => handleChange('profileFolderName', e.target.value)}
                            helperText="Обычно profiles"
                            fullWidth
                        />
                        <TextField
                            label="Папка миссии"
                            value={values.missionFolder}
                            onChange={(e) => handleChange('missionFolder', e.target.value)}
                            helperText="Напр. dayzOffline.chernarusplus"
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
                                <TextField {...params} label="Карта" helperText="Выберите из списка — размер подставится сам" />
                            )}
                        />
                        <TextField
                            label="Размер карты"
                            type="number"
                            value={values.mapSize}
                            onChange={(e) => handleChange('mapSize', Number(e.target.value) || 0)}
                            sx={{ minWidth: 140 }}
                        />
                    </Stack>

                    <TextField
                        label="Путь к карте"
                        value={values.mapPath}
                        onChange={(e) => handleChange('mapPath', e.target.value)}
                        helperText="Напр. \Maps\chernarusplus_Map.png — подставляется автоматически при выборе карты"
                        fullWidth
                    />

                    <FormControl>
                        <FormLabel>Трейдеры</FormLabel>
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
                        label="Создавать резервные копии при сохранении"
                    />

                    {mode === 'create' && (
                        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Папка проекта — корень миссии/сервера. Папка профиля — куда мод пишет логи и конфиги.
                                Папка миссии — имя подпапки в mpmissions, с которой вы работаете.
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button variant="contained" disabled={!isValid} onClick={() => onSubmit(values)}>
                    {mode === 'create' ? 'Создать проект' : 'Сохранить изменения'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
