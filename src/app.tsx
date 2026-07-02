import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import router from './router';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme/theme';
import { store } from './store/store';

const root = createRoot(document.body);

root.render(
    <Provider store={store}>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={router} />
        </ThemeProvider>
    </Provider>,
);
