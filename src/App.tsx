import {
  Box,
  Container,
  Icon,
  IconButton,
  Paper,
  SvgIcon,
  Typography,
} from '@mui/material'
import type { SvgIconProps } from '@mui/material'
import ModalContainer from 'react-modal-promise'
import { useFetchRepos } from './api/fetchHooks'
import { AccountSetupView } from './components/AccountSetupView'
import { AccountSwitcherView } from './components/AccountSwitcherView'
import {
  EditApplicationDialog,
  NewApplicationDialog,
} from './components/ApplicationDialog'
import { DeploymentDialog } from './components/DeploymentDialog'
import { EnvironmentsView } from './components/EnvironmentsView'
import { ManageApplicationsView } from './components/ManageApplicationsView'
import { ReleasesTableView } from './components/ReleasesTableView'
import { SelectApplicationView } from './components/SelectApplicationView'
import { SettingsDialog } from './components/SettingsDialog'
import WorkflowInfoView from './components/WorkflowInfoView'
import { useActions, useAppState } from './store'

const RepoPreloader = () => {
  useFetchRepos({ autoFetchAll: true })
  return null
}

const GitHubIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.93.85.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.32 9.32 0 0 1 12 6.98c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.14 10.14 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
  </SvgIcon>
)

const App = () => {
  const { accountsById, activeAccountId, token } = useAppState()
  const { addAccount, editAccount, removeAccount, selectAccount, showSettings } =
    useActions()
  const hasAccounts = Object.keys(accountsById).length > 0
  const hasActiveAccountToken = hasAccounts && !!token

  return (
    <Container>
      <Paper sx={{ p: 4, display: 'grid', gap: '1rem' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h1">GitHub Deploy Center</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              component="a"
              href="https://github.com/geirsagberg/github-deploy-center"
              target="_blank"
              rel="noreferrer"
              title="GitHub repository"
              aria-label="GitHub repository"
            >
              <GitHubIcon />
            </IconButton>
            <IconButton title="Settings" onClick={() => showSettings()}>
              <Icon>settings</Icon>
            </IconButton>
          </Box>
        </Box>
        {hasAccounts ? (
          <>
            <AccountSwitcherView
              accountsById={accountsById}
              activeAccountId={activeAccountId}
              addAccount={addAccount}
              editAccount={editAccount}
              removeAccount={removeAccount}
              selectAccount={selectAccount}
            />
            {hasActiveAccountToken ? (
              <>
                <RepoPreloader />
                <ManageApplicationsView />
                <SelectApplicationView />
                <EnvironmentsView />
                <WorkflowInfoView />
                <ReleasesTableView />
                <NewApplicationDialog />
                <EditApplicationDialog />
                <DeploymentDialog />
              </>
            ) : (
              <Typography color="text.secondary">
                Add a valid personal access token to this account before GitHub
                data can load.
              </Typography>
            )}
          </>
        ) : (
          <AccountSetupView addAccount={addAccount} />
        )}
      </Paper>
      <SettingsDialog />
      <ModalContainer />
    </Container>
  )
}

export default App
