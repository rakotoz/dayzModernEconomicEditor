import { createTheme } from '@mui/material';
import { colorSchemes, shadows, shape, typography } from './themePrimitives';

const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'data-mui-color-scheme',
        cssVarPrefix: 'template',
    },
    colorSchemes, // Recently added in v6 for building light & dark mode app, see https://mui.com/material-ui/customization/palette/#color-schemes
    typography,
    shadows,
    shape,
});

export default theme;
