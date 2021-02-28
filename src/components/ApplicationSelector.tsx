import {
  Box,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@material-ui/core'
import { FC } from 'react'

type ApplicationSelectorProps = {
  appNames: Set<string>
  isMonorepo: boolean
  shouldFilterByApplication: (newValue: boolean) => void
  currentApp?: string
  setCurrentApp: (newValue: string) => void
}

export const ApplicationSelector: FC<ApplicationSelectorProps> = ({
  appNames,
  isMonorepo,
  shouldFilterByApplication,
  currentApp,
  setCurrentApp,
}) => {
  return (
    <Box display="flex">
      <FormControlLabel
        control={
          <Checkbox
            value={isMonorepo}
            onChange={(_, newValue) => {
              shouldFilterByApplication(newValue)
            }}
          />
        }
        label="Filter by application"
      />
      {isMonorepo && (
        <RadioGroup
          row
          aria-label="Select application"
          name="Select application"
          value={currentApp}
          onChange={(_, newValue) => setCurrentApp(newValue)}>
          {[...appNames].map((appName) => (
            <FormControlLabel
              value={appName}
              control={<Radio />}
              label={appName}
            />
          ))}
        </RadioGroup>
      )}
    </Box>
  )
}
