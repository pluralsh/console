import {
  ConfigurationType,
  Operation,
  PrConfiguration,
  PrConfigurationCondition,
} from 'generated/graphql'
import { parseToBool } from 'utils/parseToBool'

export function conditionIsMet(
  condition: Nullable<PrConfigurationCondition>,
  values: Record<string, string | number | boolean | undefined>
) {
  if (!condition || !condition.field || !condition.operation) {
    return true
  }
  const value = values[condition.field]

  switch (condition.operation) {
    case Operation.Not:
      return !value
    case Operation.Prefix:
      return (
        (typeof value === 'string' &&
          typeof condition?.value === 'string' &&
          value.startsWith(condition.value)) ??
        false
      )
    case Operation.Suffix:
      return (
        (typeof value === 'string' &&
          typeof condition?.value === 'string' &&
          value.endsWith(condition.value)) ??
        false
      )
    case Operation.Eq:
      return value === condition.value
  }

  return true
}
export function validateAndFilterConfig(
  config: Nullable<PrConfiguration>[],
  configVals: Record<string, string | undefined>
) {
  const filteredValues: { name: string; value: string }[] = []
  const isValid = config.reduce((acc, configItem) => {
    const conditionMet = conditionIsMet(configItem?.condition, configVals)
    const name = configItem?.name

    if (conditionMet && name) {
      let value = configVals[name]

      if (configItem.type === ConfigurationType.Bool) {
        value = parseToBool(value).toString()
      }

      if (value) {
        filteredValues.push({ name, value })
      }

      return (!!configItem.optional || !!value) && acc
    }

    return acc
  }, true)

  return { isValid, values: filteredValues }
}
