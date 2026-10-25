# Deactivate Previous Deployments

After a deployment succeeds, mark older successful deployments in the same repository and environment as inactive, including production deployments. The current deployment and newer deployments remain unchanged. Failed, pending, and already inactive deployments are skipped.

The action checks every page of deployment history and verifies that the current deployment is successful before making changes. API errors fail the action. If a status update fails, earlier updates remain applied; rerunning the action skips those inactive deployments.

## Usage

Run this after recording a successful deployment status:

```yaml
permissions:
  contents: read
  deployments: write

steps:
  # Create a deployment, deploy the release, and record success first.
  - name: Deactivate previous deployments
    uses: geirsagberg/github-deploy-center/actions/deactivate-previous-deployments@deactivate-previous-deployments-v1.0.0
    with:
      current-deployment-id: ${{ steps.create_deployment.outputs.deployment_id }}
```

Action versions use tags such as `deactivate-previous-deployments-v1.0.0`, separate from GDC release tags. Pin the action to a commit SHA for reproducible workflows. Consumers do not need to check out this repository or install dependencies. The action uses the runner's Node.js 24 runtime and supports GitHub Enterprise API URLs provided by the runner.

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `current-deployment-id` | Yes | | Database ID of the successful deployment to keep active. |
| `token` | No | `${{ github.token }}` | Token with `deployments: write` permission in the workflow's repository. |

Serialize deployments to each environment if multiple workflows can deploy concurrently. The action reads deployment history before updating statuses; it does not lock the environment.

GDC uses the local action in [its deployment workflow](../../.github/workflows/deploy.yml).
