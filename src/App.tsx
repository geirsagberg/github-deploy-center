import {
  Box,
  Container,
  Icon,
  IconButton,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material"
import ModalContainer from "react-modal-promise"
import {
  EditApplicationDialog,
  NewApplicationDialog,
} from "./components/ApplicationDialog"
import { DeploymentDialog } from "./components/DeploymentDialog"
import { EnvironmentsView } from "./components/EnvironmentsView"
import { ManageApplicationsView } from "./components/ManageApplicationsView"
import { ReleasesTableView } from "./components/ReleasesTableView"
import { SelectApplicationView } from "./components/SelectApplicationView"
import { SettingsDialog } from "./components/SettingsDialog"
import WorkflowInfoView from "./components/WorkflowInfoView"
import { useActions, useAppState } from "./overmind"

const App = () => {
  const { token } = useAppState()
  const { setToken, showSettings } = useActions()
  return (
    <Container>
      <Box p={4} display="grid" gap="1rem" component={Paper}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h1">GitHub Deploy Center!</Typography>
          <IconButton title="Settings" onClick={() => showSettings()}>
            <Icon>settings</Icon>
          </IconButton>
        </Box>
        <TextField
          label="Personal Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
        />
        {token ? (
          <>
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
          <>
            <Typography>
              Go to{" "}
              <Link
                target="_blank"
                href="https://github.com/settings/tokens/new"
              >
                https://github.com/settings/tokens/new
              </Link>{" "}
              to create a new personal access token, and give it the{" "}
              <code>repo</code> scope.
            </Typography>
            <Typography>
              Your token will be stored in your browser&apos;s local storage,
              and never leaves your machine.
            </Typography>
          </>
        )}
      </Box>
      <SettingsDialog />
      <ModalContainer />
    </Container>
  )
}

export default App
