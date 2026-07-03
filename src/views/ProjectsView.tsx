import React, { useState } from 'react';
import { Box, Button, Card, CardActions, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addProject, removeProject, setCurrentProjectId, updateProject } from '../store/slices/appSlice';
import { Project } from '../types';
import { ProjectFormDialog, ProjectFormValues } from '../components/ProjectFormDialog';

export const ProjectsView = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const projects = useAppSelector((state) => state.app.projects);

    const TRADER_LABELS: Record<Project['traders'], string> = {
        none: t('projects.traderNone'),
        expansion: 'Expansion Market',
        drJones: 'Dr Jones Trader',
        traderPlus: 'Trader Plus',
    };

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const handleOpenCreateDialog = () => {
        setEditingProject(null);
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (project: Project, event: React.MouseEvent) => {
        event.stopPropagation();
        setEditingProject(project);
        setDialogOpen(true);
    };

    const handleDialogClose = () => setDialogOpen(false);

    const handleDialogSubmit = (values: ProjectFormValues) => {
        if (editingProject) {
            dispatch(updateProject({ id: editingProject.id, changes: values }));
        } else {
            const action = dispatch(addProject(values));
            dispatch(setCurrentProjectId(action.payload.id));
            navigate('/editor');
        }
        setDialogOpen(false);
    };

    const handleOpenProject = (id: string) => {
        dispatch(setCurrentProjectId(id));
        navigate('/editor');
    };

    const handleRemoveProject = (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        dispatch(removeProject(id));
    };

    return (
        <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
            <Stack direction="row" sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">{t('projects.title')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
                    {t('projects.addProject')}
                </Button>
            </Stack>

            {projects.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 10, color: 'text.secondary' }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        {t('projects.empty')}
                    </Typography>
                    <Typography variant="body2">{t('projects.emptyHint')}</Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            variant="outlined"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleOpenProject(project.id)}
                        >
                            <CardContent>
                                <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                                    <FolderOpenIcon color="primary" fontSize="small" />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                                        {project.name}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" noWrap title={project.path}>
                                    {project.path}
                                </Typography>
                                {project.missionFolder && (
                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                        {t('projects.mission')}: {project.missionFolder}
                                    </Typography>
                                )}
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                    <Chip label={project.map} size="small" />
                                    {project.traders !== 'none' && (
                                        <Chip label={TRADER_LABELS[project.traders]} size="small" variant="outlined" />
                                    )}
                                </Stack>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'space-between' }}>
                                <Button size="small" onClick={() => handleOpenProject(project.id)}>
                                    {t('projects.open')}
                                </Button>
                                <Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleOpenEditDialog(project, e)}
                                        aria-label={t('projects.editAria')}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleRemoveProject(project.id, e)}
                                        aria-label={t('projects.deleteAria')}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </CardActions>
                        </Card>
                    ))}
                </Box>
            )}

            <ProjectFormDialog
                open={dialogOpen}
                mode={editingProject ? 'edit' : 'create'}
                initialProject={editingProject}
                onClose={handleDialogClose}
                onSubmit={handleDialogSubmit}
            />
        </Box>
    );
};
