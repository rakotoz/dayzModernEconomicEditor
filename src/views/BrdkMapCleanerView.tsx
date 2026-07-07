import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { StringChipList } from '../components/StringChipList';

interface BrdkMapCleanerViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

// profiles/BRDK_MODS/MapCleaner.json — три независимых списка, RecursiveJsonForm их уже
// показывал как три чиповых поля, но без подписей секций и вперемешку с остальными BRDK-
// экранами так же оформлен, как остальные вкладки, для единообразия интерфейса.
export const BrdkMapCleanerView = ({ data, onChange }: BrdkMapCleanerViewProps) => {
    const { t } = useTranslation();
    const adminList = (data.AdminList as string[] | undefined) ?? [];
    const itemsOnMap = (data.ItemsToCleanOnMap as string[] | undefined) ?? [];
    const itemsOnPlayer = (data.ItemsToCleanOnPlayer as string[] | undefined) ?? [];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });

    return (
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    {t('brdkMapCleaner.sections.admins')}
                </Typography>
                <StringChipList values={adminList} onChange={(v) => patch({ AdminList: v as unknown as JsonValue })} placeholder="SteamID64" />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    {t('brdkMapCleaner.sections.onMap')}
                </Typography>
                <StringChipList values={itemsOnMap} onChange={(v) => patch({ ItemsToCleanOnMap: v as unknown as JsonValue })} placeholder="ClassName" />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    {t('brdkMapCleaner.sections.onPlayer')}
                </Typography>
                <StringChipList values={itemsOnPlayer} onChange={(v) => patch({ ItemsToCleanOnPlayer: v as unknown as JsonValue })} placeholder="ClassName" />
            </Paper>
        </Box>
    );
};
