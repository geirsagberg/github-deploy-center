# GitHub Deploy Center (GDC)

![Build and Publish status](https://github.com/geirsagberg/github-deploy-center/actions/workflows/build-and-publish.yml/badge.svg?branch=master)
![dev deploy status](https://img.shields.io/github/deployments/geirsagberg/github-deploy-center/dev?label=dev)
![test deploy status](https://img.shields.io/github/deployments/geirsagberg/github-deploy-center/test?label=test)
![prod deploy status](https://img.shields.io/github/deployments/geirsagberg/github-deploy-center/prod?label=prod)

GDC is a static website for showing your GitHub releases and deployments, and provides one-click deployment to any environment, powered by -your- GitHub Action workflows.

![GitHub Deploy Center](images/github-deploy-center.png)

- GDC is a fully static website and uses only local storage. No cookies, and nothing is sent to any server!
- Application settings can be exported, shared and imported.
- Monorepos are supported, with a flexible configuration flow for multiple applications in the same repo.

## Getting started

To use GDC, you need a couple of things:

- A GitHub Personal Access Token with the `repo` OAuth scope. You can create one [here](https://github.com/settings/tokens).
- A way to create GitHub releases (preferrably automatically, e.g. through GH Actions). See [the GDC Build and Publish workflow](./.github/workflows/build-and-publish.yml) as an example.
- A GitHub Workflow for **deployment** with the `workflow_dispatch` trigger.
  - The workflow must accept the following inputs (names are customizable):
    - `ref`: Which release version to deploy (e.g. v1.0.3)
    - `environment`: Which environment to deploy to (e.g. dev, test or prod)
  - The workflow must create a deployment for the same commit as the release, and update status on success or failure.
  - See [the GDC Deploy workflow](./.github/workflows/deploy.yml) as an example.

## Hosting

The app is hosted in Azure at https://githubdeploy.z1.web.core.windows.net/, and will be kept updated to the latest version. If you want to host it yourself, you can build it for production with `yarn build`, then host the resulting static assets in `build/` anywhere you like, e.g. Azure Blob Storage, Heroku, Google Cloud Storage.

# Development

The app is built with:

- [Vite](https://vitejs.dev/)
- [Material UI](https://material-ui.com/)
- [Overmind](https://overmindjs.org/)
- [React Query](https://@tanstack/react-query.tanstack.com/)
- [GraphQL](https://graphql.org/)

## Start locally

```
yarn
yarn start
```
