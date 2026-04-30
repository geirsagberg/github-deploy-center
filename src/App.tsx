import {
  Box,
  Container,
  Icon,
  IconButton,
  Paper,
  Typography,
} from '@mui/material'
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
          <IconButton title="Settings" onClick={() => showSettings()}>
            <Icon>settings</Icon>
          </IconButton>
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
