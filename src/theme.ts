import { unstable_createMuiStrictModeTheme as createMuiTheme } from '@material-ui/core'
import { green, grey, purple } from '@material-ui/core/colors'

export const theme = createMuiTheme({
  palette: {
    type: 'dark',
    background: {
      default: grey[800],
      paper: grey[900],
    },
    primary: green,
    secondary: purple,
  },
})
