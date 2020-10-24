import { CssBaseline, MuiThemeProvider } from '@material-ui/core'
import { Provider } from 'overmind-react'
import React from 'react'
import ReactDOM from 'react-dom'
import { QueryCache, ReactQueryCacheProvider } from 'react-query'
import App from './App'
import { overmind } from './overmind'
import * as serviceWorker from './serviceWorker'
import { theme } from './theme'

const queryCache = new QueryCache()

ReactDOM.render(
  <React.StrictMode>
    <ReactQueryCacheProvider queryCache={queryCache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Provider value={overmind}>
          <App />
        </Provider>
      </MuiThemeProvider>
    </ReactQueryCacheProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
