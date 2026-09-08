import {
  PersonaConfigurationFragment,
  PersonaFragment,
} from 'generated/graphql'
import { isObject, mergeWith } from 'lodash'
import { isNonNullable } from 'utils/isNonNullable'

export const reducePersonaConfigs = (
  personas: Nullable<Nullable<PersonaFragment>[]>
): PersonaConfigurationFragment => {
  const configs: Nullable<PersonaConfigurationFragment[]> = personas
    ?.map((persona) => persona?.configuration)
    .filter(isNonNullable)

  if (!configs?.length) return { all: true }

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
