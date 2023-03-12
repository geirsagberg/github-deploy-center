import { unstable_createMuiStrictModeTheme as createMuiTheme } from '@mui/material'
import { green, grey, purple } from '@mui/material/colors'

export const theme = createMuiTheme({
  palette: {
    mode: 'dark',
    background: {
      default: grey[800],
      paper: grey[900],
    },
    primary: green,
    secondary: purple,
  },
  components: {
    MuiDialogContent: {
      styleOverrides: {
        root: {
          paddingTop: '1rem !important',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        placement: 'top',
      },
      styleOverrides: {
        tooltip: {
          fontSize: '1rem',
        },
      },
    },
  },
})
