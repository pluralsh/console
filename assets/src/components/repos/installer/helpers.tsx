import { ApolloClient, FetchResult } from '@apollo/client'
import {
  AppsIcon,
  InstallIcon,
  WizardInstaller,
  WizardPicker,
  WizardStepConfig,
} from '@pluralsh/design-system'
import React from 'react'

import {
  Recipe,
  RecipeSection,
  RepositoryContext,
} from '../../../generated/graphql'
import { INSTALL_RECIPE, RECIPES_Q, RECIPE_Q } from '../../graphql/plural'

import { Application } from './Application'

const toPickerItems = (applications): Array<WizardStepConfig> =>
  applications?.map((app) => ({
    key: app.id,
    label: app.name,
    imageUrl: app.icon,
    node: <Application key={app.id} />,
  })) || []

const toDefaultSteps = (installableApplications): Array<WizardStepConfig> => [
  {
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
  },
]

const toDependencySteps = (
  applications: { section: RecipeSection; dependencyOf: Set<string> }[]
): Array<WizardStepConfig> => [
  ...applications.map((app) => ({
    key: app.section.repository!.id,
    label: app.section.repository!.name,
    imageUrl: app.section.repository!.icon!,
    node: <Application key={app.section.repository!.id} />,
    isDependency: true,
    dependencyOf: app.dependencyOf,
  })),
]

const buildSteps = async (
  client: ApolloClient<unknown>,
  selectedApplications: Array<WizardStepConfig>,
  installedApplications: Set<string>
) => {
  const dependencyMap = new Map<
    string,
    { section: RecipeSection; dependencyOf: Set<string> }
  >()

  for (const app of selectedApplications) {
    const { data: { recipes: { edges } = { edges: undefined } } = {} } =
      await client.query({
        query: RECIPES_Q,
        variables: { id: app.key },
      })

    // There should only be a single bundle available on the list
    const recipeBase = edges?.at(0)?.node

    if (!recipeBase) continue

    const { data: recipe } = await client.query<{
      recipe: Recipe
      context: Array<RepositoryContext>
    }>({
      query: RECIPE_Q,
      variables: { id: recipeBase?.id },
    })

    const sections = recipe.recipe
      .recipeSections!.filter(
        (section) => section!.repository!.name !== app.label
      )
      .filter(
        (section) => !installedApplications.has(section!.repository!.name)
      )

    sections.forEach((section) => {
      if (
        selectedApplications.find((app) => app.key === section!.repository!.id)
      )
        return

      if (!dependencyMap.has(section!.repository!.name)) {
        dependencyMap.set(section!.repository!.name, {
          section: section!,
          dependencyOf: new Set([app.label!]),
        })

        return
      }

      const dep = dependencyMap.get(section!.repository!.name)!
      const dependencyOf: Array<string> = [
        ...Array.from(dep.dependencyOf.values()),
        app.label!,
      ]

      dependencyMap.set(section!.repository!.name, {
        section: section!,
        dependencyOf: new Set<string>(dependencyOf),
      })
    })
  }

  return toDependencySteps(Array.from(dependencyMap.values()))
}

const install = async (
  client: ApolloClient<unknown>,
  apps: Array<WizardStepConfig<any>>
) => {
  const installableApps = apps.filter((app) => !app.isDependency)
  const promises: Array<Promise<FetchResult<any>>> = []

  for (const installableApp of installableApps) {
    const dependencies = apps.filter(
      (app) => app.dependencyOf?.has(installableApp.label!)
    )
    const context = [...dependencies, installableApp].reduce(
      (acc, app) => ({ ...acc, [app.label!]: app.data.context || {} }),
      {}
    )
    const toAPIAppContext = (context) => ({
      ...Object.keys(context || {}).reduce(
        (acc, key) => ({ ...acc, [key]: context[key].value }),
        {}
      ),
    })
    const toAPIContext = (context) => ({
      ...Object.entries(context || {}).reduce(
        (acc, [key, appContext]) => ({
          ...acc,
          [key]: toAPIAppContext(appContext),
        }),
        {}
      ),
    })

    const promise = client.mutate({
      mutation: INSTALL_RECIPE,
      variables: {
        id: installableApp.data.id,
        oidc: installableApp.data.oidc,
        context: JSON.stringify(toAPIContext(context)),
      },
    })

    promises.push(promise)
  }

  return Promise.all(promises)
}

export { toDefaultSteps, install, buildSteps }
