import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import router from './router';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme/theme';
import { store } from './store/store';
import { useAppSelector } from './store/hooks';
import i18n from './i18n';
import { UpdateNotification } from './components/UpdateNotification';

const ColorSchemeSync = () => {
    const themeMode = useAppSelector((state) => state.app.themeMode);
    useEffect(() => {
        document.documentElement.setAttribute('data-mui-color-scheme', themeMode);
    }, [themeMode]);
    return null;
};

const LanguageSync = () => {
    const language = useAppSelector((state) => state.app.language);
    useEffect(() => {
        i18n.changeLanguage(language);
    }, [language]);
    return null;
};

const root = createRoot(document.body);

root.render(
    <Provider store={store}>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ColorSchemeSync />
            <LanguageSync />
            <UpdateNotification />
            <RouterProvider router={router} />
        </ThemeProvider>
    </Provider>,
);
