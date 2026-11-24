import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#07B9CE' },
    secondary: { main: '#3969E7' },
    background: {
      default: '#080D14',
      paper: '#0D141E',
    },
    text: {
      primary: '#E8EEF5',
      secondary: '#8493A5',
    },
    divider: 'rgba(152, 174, 197, 0.13)',
    success: { main: '#58D6A4' },
    error: { main: '#F07878' },
    warning: { main: '#E8B967' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI Variable", "Segoe UI", sans-serif',
    h1: {
      fontSize: 'clamp(2rem, 3vw, 2.7rem)',
      fontWeight: 560,
      letterSpacing: '-0.045em',
      lineHeight: 1.12,
    },
    h2: {
      fontSize: '1.3rem',
      fontWeight: 550,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: { fontSize: '0.95rem', fontWeight: 550 },
    body1: { fontSize: '0.9rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8rem', lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: {
      fontSize: '0.66rem',
      fontWeight: 700,
      letterSpacing: '0.14em',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        body: { minWidth: 320, minHeight: '100vh' },
        '::selection': { background: 'rgba(7, 185, 206, 0.28)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: 6,
          '&.MuiButton-containedPrimary': {
            color: '#061116',
            boxShadow: '0 0 22px rgba(7, 185, 206, 0.12)',
            '&:hover': { boxShadow: '0 0 26px rgba(7, 185, 206, 0.22)' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})
