import React, { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    InputAdornment,
    List,
    ListItemButton,
    ListItemText,
    TextField,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { EconomyClassNameGroup, humanizeFileLabel } from '../dayzConfig/typesXml';

interface ClassNamePickerDialogProps {
    open: boolean;
    groups: EconomyClassNameGroup[];
    onSelect: (name: string) => void;
    onClose: () => void;
}

// Модалка выбора classname из economy (types.xml): без поиска — список файлов-аккордеонов
// (видно, из какого файла берётся предмет), с поиском — плоский отфильтрованный список с
// подписью файла у каждого результата. Аналог группировки в TypesXmlView, только для выбора
// одного значения (используется в редакторе магазина/торговцев Expansion).
export const ClassNamePickerDialog = ({ open, groups, onSelect, onClose }: ClassNamePickerDialogProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

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

    const handlePick = (name: string) => {
        onSelect(name);
        setSearch('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('classNamePicker.title')}</DialogTitle>
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
                            {filteredFlat.map((item, i) => (
                                <ListItemButton key={`${item.fileKey}-${item.name}-${i}`} onClick={() => handlePick(item.name)}>
                                    <ListItemText primary={item.name} secondary={humanizeFileLabel(item.fileKey)} />
                                </ListItemButton>
                            ))}
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
                                    <List dense sx={{ py: 0 }}>
                                        {g.names.map((name) => (
                                            <ListItemButton key={name} onClick={() => handlePick(name)}>
                                                <ListItemText primary={name} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        ))
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
