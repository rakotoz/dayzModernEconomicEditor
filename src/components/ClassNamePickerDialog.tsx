import React, { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    TextField,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { EconomyClassNameGroup, humanizeFileLabel } from '../dayzConfig/typesXml';

interface ClassNamePickerDialogSingleProps {
    open: boolean;
    groups: EconomyClassNameGroup[];
    onClose: () => void;
    multiple?: false;
    onSelect: (name: string) => void;
}

interface ClassNamePickerDialogMultipleProps {
    open: boolean;
    groups: EconomyClassNameGroup[];
    onClose: () => void;
    multiple: true;
    onSelectMultiple: (names: string[]) => void;
}

type ClassNamePickerDialogProps = ClassNamePickerDialogSingleProps | ClassNamePickerDialogMultipleProps;

// Модалка выбора classname из economy (types.xml): без поиска — список файлов-аккордеонов
// (видно, из какого файла берётся предмет), с поиском — плоский отфильтрованный список с
// подписью файла у каждого результата. Аналог группировки в TypesXmlView.
// В обычном режиме клик по предмету сразу выбирает его и закрывает модалку. В режиме
// multiple (массовое добавление в магазин) клик только отмечает чекбокс — выбор применяется
// разом кнопкой "Добавить" внизу, чтобы можно было набрать сразу несколько товаров.
export const ClassNamePickerDialog = (props: ClassNamePickerDialogProps) => {
    const { open, groups, onClose, multiple } = props;
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [checked, setChecked] = useState<Set<string>>(new Set());

    const q = search.trim().toLowerCase();
    const filteredFlat = useMemo(() => {
        if (!q) return null;
        const result: { fileKey: string; name: string }[] = [];
        for (const g of groups) {
            for (const name of g.names) {
                if (name.toLowerCase().includes(q)) result.push({ fileKey: g.fileKey, name });
            }
        }
        return result;
    }, [groups, q]);

    const closeAndReset = () => {
        setSearch('');
        setChecked(new Set());
        onClose();
    };

    const handlePick = (name: string) => {
        if (multiple) {
            setChecked((prev) => {
                const next = new Set(prev);
                if (next.has(name)) next.delete(name);
                else next.add(name);
                return next;
            });
            return;
        }
        props.onSelect(name);
        closeAndReset();
    };

    const handleConfirmMultiple = () => {
        if (!multiple || checked.size === 0) return;
        props.onSelectMultiple([...checked]);
        closeAndReset();
    };

    const renderItem = (key: string, name: string, secondary?: string) => (
        <ListItemButton key={key} onClick={() => handlePick(name)}>
            {multiple && (
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" checked={checked.has(name)} tabIndex={-1} disableRipple size="small" />
                </ListItemIcon>
            )}
            <ListItemText primary={name} secondary={secondary} />
        </ListItemButton>
    );

    return (
        <Dialog open={open} onClose={closeAndReset} maxWidth="sm" fullWidth>
            <DialogTitle>{multiple ? t('classNamePicker.titleMultiple') : t('classNamePicker.title')}</DialogTitle>
            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: 500 }}>
                <TextField
                    autoFocus
                    size="small"
                    fullWidth
                    placeholder={t('classNamePicker.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }}
                />
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {groups.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            {t('classNamePicker.noData')}
                        </Typography>
                    )}
                    {filteredFlat ? (
                        <List dense>
                            {filteredFlat.map((item, i) => renderItem(`${item.fileKey}-${item.name}-${i}`, item.name, humanizeFileLabel(item.fileKey)))}
                            {filteredFlat.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                    {t('classNamePicker.nothingFound')}
                                </Typography>
                            )}
                        </List>
                    ) : (
                        groups.map((g) => (
                            <Accordion key={g.fileKey} disableGutters>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {humanizeFileLabel(g.fileKey)} ({g.names.length})
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    <List dense sx={{ py: 0 }}>{g.names.map((name) => renderItem(name, name))}</List>
                                </AccordionDetails>
                            </Accordion>
                        ))
                    )}
                </Box>
            </DialogContent>
            {multiple && (
                <DialogActions>
                    <Button onClick={closeAndReset}>{t('common.cancel')}</Button>
                    <Button variant="contained" disabled={checked.size === 0} onClick={handleConfirmMultiple}>
                        {t('classNamePicker.addSelected', { count: checked.size })}
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
};
