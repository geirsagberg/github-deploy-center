import { Button, colors, Table, TableBody, TableCell, TableHead, TableRow, } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { groupBy, keyBy, orderBy, uniq } from 'lodash-es'
import React, { FC, useState } from 'react'
import { useMutation } from 'react-query'
import { DeploymentState } from '../generated/graphql'
import { useActions, useOvermindState } from '../overmind'
import { DeploymentModel, ReleaseModel } from '../overmind/state'
import { ApplicationSelector } from './ApplicationSelector'
import { useFetchDeployments, useFetchReleases } from './fetchHooks'


const getButtonStyle = (state: DeploymentState) => {
  switch (state) {
    case DeploymentState.Active:
      return { backgroundColor: colors.blue[400] }
    case DeploymentState.Failure:
      return { color: colors.red[400] }
    case DeploymentState.Pending:
      return { color: colors.orange[400] }
    case DeploymentState.InProgress:
      return { color: colors.yellow[400] }
    default:
      return { color: colors.grey[50] }
  }
}

const getButtonVariant = (state: DeploymentState): "contained" | "outlined" => {
  return state === DeploymentState.Active ? "contained" : "outlined"
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
  const { triggerDeployment } = useActions()
  const allReleaseResultsForRepo = useFetchReleases()
  const allDeploymentResultsForRepo = useFetchDeployments()

  const [filterByApplication, setFilterByApplication] = useState(false)
  const [currentApplication, setCurrentApplication] = useState<string>()

  const appNames = new Set(
    allReleaseResultsForRepo.data?.map((releaseData) =>
      releaseData.tagName.substring(0, releaseData.tagName.indexOf('-'))
    )
  )

  const releases =
    filterByApplication && currentApplication
      ? allReleaseResultsForRepo.data?.filter(
        (releaseData) => releaseData.tagName.indexOf(currentApplication) > -1
      ) || []
      : allReleaseResultsForRepo.data || []

  const deployments =
    filterByApplication && currentApplication
      ? allDeploymentResultsForRepo.data?.filter(
        (deploymentData) =>
          deploymentData.refName.indexOf(currentApplication) > -1
      ) || []
      : allDeploymentResultsForRepo.data || []

  const [triggerDeploy, { error, isLoading }] = useMutation(
    async ({
      release,
      environment,
    }: {
      release: string
      environment: string
    }) => {
      await triggerDeployment({ release, environment })
    }
  )

  const releasesSorted = orderBy(releases, (r) => r.createdAt, 'desc')

  const releasesByTag = keyBy(releasesSorted, (r) => r.tagName)

  const deploymentsByTag = groupBy(deployments, (d) => d.refName)

  const environmentsOrder = environmentOrderForSelectedRepo || []

  const environments = uniq(
    environmentsOrder.concat(estimateEnvironmentsOrder(deployments))
  )

  const releasesByEnvironment = environments.reduce<
    Record<string, ReleaseModel[]>
  >((record, environment) => {
    record[environment] = deployments
      .filter((d) => d.environment === environment)
      .map((d) => releasesByTag[d.refName])
      .filter((d) => !!d)
    return record
  }, {})

  const isAfterLatestReleaseForEnvironment = (
    release: ReleaseModel,
    environment: string
  ) => {
    const latestRelease = releasesByEnvironment[environment]?.[0]
    return !latestRelease || release.createdAt.isAfter(latestRelease.createdAt)
  }

  const createButton = (deployment: DeploymentModel | undefined, release: ReleaseModel, environment: string) => {
    const isLatest = isAfterLatestReleaseForEnvironment(
      release,
      environment
    )
    const deployButtonVariant = isLatest ? 'contained' : 'outlined'

    return <Button
      disabled={isLoading}
      variant={deployment ? getButtonVariant(deployment.state) : deployButtonVariant}
      color={!deployment && isLatest ? 'primary' : 'default'}
      style={deployment ? getButtonStyle(deployment.state) : {}}
      onClick={() =>
        triggerDeploy({
          release: release.tagName,
          environment,
        })
      }>
      {deployment?.state ?? "Deploy"}
    </Button>
  }

  return (
    <>
      {error instanceof Error && (
        <Alert severity="error">{error.message}</Alert>
      )}
      <ApplicationSelector
        appNames={appNames}
        isMonorepo={filterByApplication}
        shouldFilterByApplication={setFilterByApplication}
        currentApp={currentApplication}
        setCurrentApp={setCurrentApplication}
      />
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
                    {createButton(deployment, release, environment)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}