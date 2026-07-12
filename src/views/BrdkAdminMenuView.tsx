import React from 'react';
import { Box, Paper, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { JsonValue } from '../dayzConfig/cfgGameplay';
import { StringChipList } from '../components/StringChipList';

interface BrdkAdminMenuViewProps {
    data: Record<string, JsonValue>;
    onChange: (next: Record<string, JsonValue>) => void;
}

const FIELD_GRID_SX = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 } as const;

// profiles/BRDK_MODS/BRDK_AdminMenu/BRDK_AdminMenuConfig.json — небольшой плоский конфиг,
// список админов отдельно от флагов логирования, для единообразия с остальными BRDK-экранами.
export const BrdkAdminMenuView = ({ data, onChange }: BrdkAdminMenuViewProps) => {
    const { t } = useTranslation();
    const adminSteamIDs = (data.AdminSteamIDs as string[] | undefined) ?? [];

    const patch = (p: Partial<Record<string, JsonValue>>) => onChange({ ...data, ...p });

    return (
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 2, alignItems: 'start' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    {t('brdkAdminMenu.sections.admins')}
                </Typography>
                <StringChipList values={adminSteamIDs} onChange={(v) => patch({ AdminSteamIDs: v as unknown as JsonValue })} placeholder="SteamID64" />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    {t('brdkAdminMenu.sections.logging')}
                </Typography>
                <Box sx={FIELD_GRID_SX}>
                    <TextField label="EnableLogs" size="small" type="number" value={data.EnableLogs ?? 0} onChange={(e) => patch({ EnableLogs: Number(e.target.value) || 0 })} />
                    <TextField label="LogOpens" size="small" type="number" value={data.LogOpens ?? 0} onChange={(e) => patch({ LogOpens: Number(e.target.value) || 0 })} />
                    <TextField label="LogActions" size="small" type="number" value={data.LogActions ?? 0} onChange={(e) => patch({ LogActions: Number(e.target.value) || 0 })} />
                    <TextField label="LogDenied" size="small" type="number" value={data.LogDenied ?? 0} onChange={(e) => patch({ LogDenied: Number(e.target.value) || 0 })} />
                </Box>
            </Paper>
        </Box>
    );
};
