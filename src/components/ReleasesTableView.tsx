import {
  Button,
  colors,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core'
import { groupBy, orderBy, uniq } from 'lodash-es'
import React, { FC } from 'react'
import { DeploymentState } from '../generated/graphql'
import { useOvermindState } from '../overmind'
import { DeploymentModel } from '../overmind/state'
import { useFetchDeployments, useFetchReleases } from './fetchHooks'

const getButtonColor = (state: DeploymentState): string => {
  switch (state) {
    case DeploymentState.Active:
      return colors.blue[400]
    case DeploymentState.Failure:
      return colors.red[400]
    case DeploymentState.Pending:
      return colors.orange[400]
    default:
      return colors.grey[50]
  }
}
const estimateEnvironmentsOrder = (
  deployments: DeploymentModel[] | null | undefined
) => {
  return uniq(
    orderBy(deployments || [], (d) => d.createdAt).map((d) => d.environment)
  )
}
export const ReleasesTableView: FC = () => {
  const { environmentOrderForSelectedRepo } = useOvermindState()

  const releaseResults = useFetchReleases()
  const deploymentResults = useFetchDeployments()

  const releasesSorted = orderBy(
    releaseResults.data,
    (r) => r.createdAt,
    'desc'
  )

  const deploymentsByTag = groupBy(deploymentResults.data, (d) => d.refName)

  const environmentsOrder = environmentOrderForSelectedRepo || []

  const environments = uniq(
    environmentsOrder.concat(estimateEnvironmentsOrder(deploymentResults.data))
  )

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Release name</TableCell>
          {environments.map((environment) => (
            <TableCell key={environment}>{environment}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {releasesSorted.map((release) => (
          <TableRow key={release.id}>
            <TableCell style={{ width: '20%' }}>{release.name}</TableCell>
            {environments.map((environment) => {
              const deployment = deploymentsByTag[release.tagName]?.find(
                (d) => d.environment === environment
              )
              return (
                <TableCell key={environment}>
                  {deployment ? (
                    <Button
                      variant="outlined"
                      style={{ color: getButtonColor(deployment.state) }}>
                      {deployment.state}
                    </Button>
                  ) : (
                    <Button variant="contained" color="primary">
                      Deploy
                    </Button>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
