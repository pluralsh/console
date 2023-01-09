import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AppsIcon,
  InstallIcon,
  LoopingLogo,
  Wizard,
  WizardInstaller,
  WizardNavigation,
  WizardPicker,
  WizardStepConfig,
  WizardStepper,
} from '@pluralsh/design-system'
import { useQuery } from 'react-apollo'
import { Box } from 'grommet'
import { ApolloClient } from 'apollo-client'
import { useApolloClient } from '@apollo/react-hooks'
import { FetchResult } from '@apollo/client'

import { useNavigate } from 'react-router-dom'

import {
  INSTALL_RECIPE,
  RECIPES_Q,
  RECIPE_Q,
  SEARCH_REPOS,
} from '../../graphql/plural'
import { InstallationContext } from '../../Installations'
import { Recipe, RecipeSection, RepositoryContext } from '../../../generated/graphql'
import { BUILDS_Q } from '../../graphql/builds'
import { appendConnection } from '../../../utils/graphql'

import { Application } from './Application'

const toPickerItems = (applications): Array<WizardStepConfig> => applications?.map(app => ({
  key: app.id,
  label: app.name,
  imageUrl: app.icon,
  node: <Application key={app.id} />,
})) || []

const toDefaultSteps = (installableApplications): Array<WizardStepConfig> => [{
  key: 'apps',
  label: 'Apps',
  Icon: AppsIcon,
  node: <WizardPicker items={toPickerItems(installableApplications)} />,
  isDefault: true,
},
{
  key: 'placeholder',
  isPlaceholder: true,
},
{
  key: 'install',
  label: 'Install',
  Icon: InstallIcon,
  node: <WizardInstaller />,
  isDefault: true,
}]

const toDependencySteps = (applications: {section: RecipeSection, dependencyOf: Set<string>}[]): Array<WizardStepConfig> => [...applications.map(app => ({
  key: app.section.repository!.id,
  label: app.section.repository!.name,
  imageUrl: app.section.repository!.icon!,
  node: <Application key={app.section.repository!.id} />,
  isDependency: true,
  dependencyOf: app.dependencyOf,
}))]

const buildSteps = async (client: ApolloClient, selectedApplications: Array<WizardStepConfig>) => {
  const dependencyMap = new Map<string, {section: RecipeSection, dependencyOf: Set<string>}>()

  for (const app of selectedApplications) {
    const { data: { recipes: { edges } = {} } = {} } = await client.query({
      query: RECIPES_Q,
      variables: { id: app.key },
    })

    // There should only be a single bundle available on the list
    const recipeBase = edges?.at(0)?.node

    if (!recipeBase) continue

    const { data: recipe } = await client.query<{recipe: Recipe, context: Array<RepositoryContext>}>({
      query: RECIPE_Q,
      variables: { id: recipeBase?.id },
    })

    const sections = recipe.recipe.recipeSections!.filter(section => section!.repository!.name !== app.label)

    sections.forEach(section => {
      if (selectedApplications.find(app => app.key === section!.repository!.id)) return

      if (!dependencyMap.has(section!.repository!.name)) {
        dependencyMap.set(section!.repository!.name, { section: section!, dependencyOf: new Set([app.label!]) })

        return
      }

      const dep = dependencyMap.get(section!.repository!.name)
      const dependencyOf: Array<string> = [...Array.from(dep.dependencyOf.values()), app.label!]

      dependencyMap.set(section!.repository!.name, { section: section!, dependencyOf: new Set<string>(dependencyOf) })
    })
  }

  return toDependencySteps(Array.from(dependencyMap.values()))
}

const install = async (client: ApolloClient, apps: Array<WizardStepConfig>) => {
  const installableApps = apps.filter(app => !app.isDependency)
  const promises: Array<Promise<FetchResult<unknown>>> = []

  for (const installableApp of installableApps) {
    const dependencies = apps.filter(app => app.dependencyOf?.has(installableApp.label!))
    const context = [...dependencies, installableApp].reduce((acc, app) => ({ ...acc, [app.label]: app.data.context || {} }), {})

    const promise = client.mutate({
      mutation: INSTALL_RECIPE,
      variables: { id: installableApp.data.id, oidc: installableApp.data.oidc, context: JSON.stringify(context) },
    })

    promises.push(promise)
  }

  return Promise.all(promises)
}

export function Installer({ setOpen, setConfirmClose, setVisible }) {
  const client = useApolloClient()
  const navigate = useNavigate()
  const [inProgress, setInProgress] = useState<boolean>(false)
  const [selectedApplications, setSelectedApplications] = useState([])
  const [steps, setSteps] = useState([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const { applications: installedApplications } = useContext(InstallationContext as React.Context<unknown>)
  const { data: { repositories: { edges: applicationNodes } = {} } = {}, loading } = useQuery(SEARCH_REPOS, {
    variables: { query: '' },
  })

  const applications = applicationNodes?.map(({ node }) => node)
  const installableApplications = useMemo(() => applications?.filter(app => !installedApplications?.find(s => s.name === app.name)),
    [applications, installedApplications])

  const onInstall = useCallback((payload: Array<WizardStepConfig>) => {
    setStepsLoading(true)

    install(client, payload)
      .then(responses => {
        responses.forEach(({ data: { installRecipe } }) => {
          const builds = client.cache.readQuery({ query: BUILDS_Q })

          client.cache.writeQuery({
            query: BUILDS_Q,
            data: appendConnection(builds, installRecipe, 'builds'),
          })
        })
      }).catch(err => console.error(err))
      .finally(() => {
        setStepsLoading(false)
        setOpen(false)
        setVisible(true)
        navigate('/builds')
      })
  }, [client, setOpen, setVisible, navigate])

  useEffect(() => {
    const build = async () => {
      const steps = await buildSteps(client, selectedApplications)

      setSteps(steps)
    }

    setStepsLoading(true)
    build().then(() => setStepsLoading(false))
  }, [client, selectedApplications])

  if (loading) {
    return (
      <Box
        overflow="hidden"
        fill="vertical"
        justify="center"
      >
        <LoopingLogo />
      </Box>
    )
  }

  return (
    <Wizard
      onClose={() => (inProgress ? setConfirmClose(true) : setOpen(false))}
      onComplete={completed => setInProgress(completed)}
      onSelect={apps => setSelectedApplications(apps)}
      defaultSteps={toDefaultSteps(installableApplications)}
      dependencySteps={steps}
      limit={5}
      loading={stepsLoading}
    >
      {{
        stepper: <WizardStepper />,
        navigation: <WizardNavigation onInstall={onInstall} />,
      }}
    </Wizard>
  )
}
