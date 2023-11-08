import {
  AddOnConfigConditionFragment,
  AddOnConfigurationFragment,
} from 'generated/graphql'
import { OperationType } from 'components/repos/constants'

import { parseToBool } from '../../../utils/parseToBool'

export enum ConfigurationType {
  Select = 'select',
  Boolean = 'bool',
  String = 'string',
}

export function conditionIsMet(
  condition: Nullable<AddOnConfigConditionFragment>,
  values: Record<string, string | number | boolean | undefined>
) {
  if (!condition || !condition.field || !condition.operation) {
    return true
  }
  const value = values[condition.field]

  switch (condition.operation.toUpperCase()) {
    case OperationType.NOT:
      return !value
    case OperationType.PREFIX:
      return (
        (typeof value === 'string' &&
          typeof condition?.value === 'string' &&
          value.startsWith(condition.value)) ??
        false
      )
    case OperationType.EQUAL:
      return value === condition.value
  }

  return true
}
export function validateAndFilterConfig(
  config: Nullable<AddOnConfigurationFragment>[],
  configVals: Record<string, string | undefined>
) {
  const filteredValues: { name: string; value: string }[] = []
  const isValid = config.reduce((acc, configItem) => {
    const conditionMet = conditionIsMet(configItem?.condition, configVals)
    const name = configItem?.name

    if (conditionMet && name) {
      let value = configVals[name]

      if (configItem.type === ConfigurationType.Boolean) {
        value = parseToBool(value).toString()
      }

      if (value) {
        filteredValues.push({ name, value })
      }

      return !!value && acc
    }

    return acc
  }, true)

  return { isValid, values: filteredValues }
}
