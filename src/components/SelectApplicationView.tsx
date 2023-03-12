import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { map, orderBy, size } from 'lodash-es'
import { useActions, useAppState } from '../overmind'

export const SelectApplicationView = () => {
  const { applicationsById, selectedApplicationId } = useAppState()
  const { selectApplication, editApplication, editDeployment } = useActions()
  const sortedApplications = orderBy(applicationsById, (x) =>
    x.name.toLowerCase()
  )

  return size(sortedApplications) ? (
    <Box display="flex" alignItems="center" style={{ gap: '1rem' }}>
      <FormControl variant="outlined" style={{ flex: 1 }}>
        <InputLabel id="application-select-label">Application</InputLabel>
        <Select
          labelId="application-select-label"
          label="Application"
          onChange={(event) => {
            selectApplication(event.target.value as string)
          }}
          value={selectedApplicationId}
        >
          {map(sortedApplications, (app) => (
            <MenuItem value={app.id} key={app.id}>
              {app.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button color="secondary" variant="contained" onClick={editApplication}>
        Edit App
      </Button>
      <Button color="secondary" variant="contained" onClick={editDeployment}>
        Edit Deploy
      </Button>
    </Box>
  ) : null
}
