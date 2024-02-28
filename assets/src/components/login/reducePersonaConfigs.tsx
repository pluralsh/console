import {
  PersonaConfigurationFragment,
  PersonaFragment,
} from 'generated/graphql'
import { isObject, mergeWith } from 'lodash'

const IS_TESTING = true
const TEST_CONFIGS: PersonaConfigurationFragment[] = [
  {
    all: false,
    deployments: {
      addOns: true,
      clusters: false,
      deployments: false,
      pipelines: true,
      providers: false,
      services: false,
    },
    sidebar: {
      audits: false,
      kubernetes: true,
      pullRequests: false,
      settings: false,
    },
  },
  // {
  //   all: true,
  //   deployments: {
  //     addOns: false,
  //     clusters: true,
  //     deployments: false,
  //     pipelines: false,
  //     providers: false,
  //     services: false,
  //   },
  //   sidebar: {
  //     audits: false,
  //     kubernetes: true,
  //     pullRequests: false,
  //     settings: true,
  //   },
  // },
  // {
  //   deployments: {
  //     addOns: false,
  //     clusters: false,
  //     deployments: true,
  //     pipelines: false,
  //     providers: false,
  //     services: true,
  //   },
  // },
  // {
  //   sidebar: {
  //     audits: false,
  //     kubernetes: false,
  //     pullRequests: true,
  //     settings: true,
  //   },
  // },
]

export const reducePersonaConfigs = (
  personas: Nullable<Nullable<PersonaFragment>[]>
): PersonaConfigurationFragment => {
  if (!IS_TESTING && !personas?.length) return { all: true }

  const configs: PersonaConfigurationFragment[] = IS_TESTING
    ? TEST_CONFIGS
    : personas?.map((persona) => persona?.configuration)

  return configs.reduce(
    (previous, current) =>
      mergeWith(previous, current, (objValue, srcValue) => {
        if (isObject(objValue) || isObject(srcValue)) {
          return undefined
        }

        return objValue || srcValue
      }),
    {} as PersonaConfigurationFragment
  )
}
