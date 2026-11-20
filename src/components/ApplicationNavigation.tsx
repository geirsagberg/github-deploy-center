import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'
import type { ApplicationConfig } from '../state/schemas'
import { useActions } from '../store'
import { reorderKeys } from '../utils'
import type { EnvironmentStatusesByApplicationId } from './applicationWorkspaceHelpers'
import { ApplicationNavigationActions } from './ApplicationNavigationActions'
import { ApplicationNavigationItem } from './ApplicationNavigationItem'

const swatches = ['#53d89c', '#ffbf5f', '#73c9f5', '#f07768', '#c3e86d']

export function ApplicationNavigation({
  applications,
  environmentStatusesByApplicationId,
  selectedApplication,
}: {
  applications: ApplicationConfig[]
  environmentStatusesByApplicationId: EnvironmentStatusesByApplicationId
  selectedApplication?: ApplicationConfig
}) {
  const theme = useTheme()
  const { reorderApplication } = useActions()
  const [drag, setDrag] = useState<{ id: string; order: string[] }>()
  const orderedApplications = drag
    ? drag.order.flatMap(
        (id) => applications.find((application) => application.id === id) ?? [],
      )
    : applications

  return (
    <Box
      component="nav"
      aria-label="Applications"
      onDragOver={(event) => {
        if (drag) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (!drag) return
        const targetId = applications[drag.order.indexOf(drag.id)]?.id
        if (targetId) reorderApplication({ draggedId: drag.id, targetId })
        setDrag(undefined)
      }}
      sx={{
        display: 'grid',
        alignContent: 'start',
        gap: 0.75,
        p: 1,
        borderRight: {
          md: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        },
      }}
    >
      <ApplicationNavigationActions />
      {orderedApplications.map((application, index) => (
        <ApplicationNavigationItem
          application={application}
          isDragged={drag?.id === application.id}
          nextApplicationId={orderedApplications[index + 1]?.id}
          previousApplicationId={orderedApplications[index - 1]?.id}
          onDragStart={() =>
            setDrag({
              id: application.id,
              order: applications.map(({ id }) => id),
            })
          }
          onDragOver={(isPointerInLowerHalf) =>
            setDrag((current) => {
              if (!current || current.id === application.id) return current
              const isMovingDown =
                current.order.indexOf(current.id) <
                current.order.indexOf(application.id)
              // Swap only past the middle, so rows of different heights stay put.
              if (isMovingDown !== isPointerInLowerHalf) return current
              return {
                ...current,
                order: reorderKeys(current.order, current.id, application.id),
              }
            })
          }
          onDragEnd={() => setDrag(undefined)}
          color={swatches[index % swatches.length]}
          environmentStatuses={
            environmentStatusesByApplicationId[application.id] ?? {}
          }
          isSelected={application.id === selectedApplication?.id}
          key={application.id}
        />
      ))}
    </Box>
  )
}
