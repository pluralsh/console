import {
  ConfigurationType,
  Operation,
  PrAutomationFragment,
  PrConfiguration,
  PrConfigurationCondition,
  PullRequestFragment,
  useCreatePullRequestMutation,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { parseToBool } from 'utils/parseToBool'
import { ReviewPrFormState } from './wizard/CreatePrSteps'

export type FilteredPrConfig = {
  name: string
  value: string | boolean
}

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
  const filteredValues: FilteredPrConfig[] = []
  const isValid = config.reduce((acc, configItem) => {
    const conditionMet = conditionIsMet(configItem?.condition, configVals)
    const name = configItem?.name

    if (conditionMet && name) {
      let value: string | boolean | undefined = configVals[name]
      const isBool = configItem.type === ConfigurationType.Bool

      if (isBool) {
        value = parseToBool(value)
      }

      if (value !== undefined || isBool) {
        filteredValues.push({ name, value: value as string | boolean })
      }

      return (!!configItem.optional || !!value || isBool) && acc
    }

    return acc
  }, true)

  return { isValid, values: filteredValues }
}

export function usePrAutomationForm({
  prAutomation,
  onSuccess,
}: {
  prAutomation: Nullable<PrAutomationFragment>
  onSuccess?: () => void
}) {
  const defaults = useMemo(() => getStateDefaults(prAutomation), [prAutomation])
  const [curConfigVals, setCurConfigVals] = useState(defaults.curConfigVals)
  const [reviewFormState, setReviewFormState] = useState<ReviewPrFormState>(
    defaults.reviewFormState
  )
  // reapply default states if the prAutomation changes
  useEffect(() => {
    setCurConfigVals(defaults.curConfigVals)
    setReviewFormState(defaults.reviewFormState)
  }, [defaults.curConfigVals, defaults.reviewFormState, prAutomation])

  const { isValid: configIsValid, values: filteredConfig } =
    validateAndFilterConfig(prAutomation?.configuration ?? [], curConfigVals)

  const allChecked = Object.values(reviewFormState.checkedItems).every((v) => v)
  const allowSubmit = !!reviewFormState.branch && configIsValid && allChecked

  const [successPr, setSuccessPr] = useState<PullRequestFragment>()

  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    variables: {
      id: prAutomation?.id ?? '',
      branch: reviewFormState.branch,
      identifier: reviewFormState.identifier,
      context: JSON.stringify(
        Object.fromEntries(filteredConfig.map((cfg) => [cfg.name, cfg.value]))
      ),
    },
    onCompleted: (data) => {
      if (data.createPullRequest) {
        setSuccessPr(data.createPullRequest)
        onSuccess?.()
      }
    },
  })

  return {
    curConfigVals,
    setCurConfigVals,
    configIsValid,
    filteredConfig,
    reviewFormState,
    setReviewFormState,
    allowSubmit,
    successPr,
    createPr: () => {
      if (allowSubmit) mutation()
    },
    createPrLoading: loading,
    createPrError: error,
  }
}

const getStateDefaults = (prAutomation: Nullable<PrAutomationFragment>) => {
  const { configuration, confirmation } = prAutomation ?? {}
  return {
    curConfigVals: Object.fromEntries(
      configuration?.map((cfg) => [cfg?.name, cfg?.default || '']) ?? []
    ),
    reviewFormState: {
      branch: '',
      identifier: prAutomation?.identifier ?? '',
      checkedItems: Object.fromEntries(
        confirmation?.checklist
          ?.filter(isNonNullable)
          .map((item) => [item.label, false]) ?? []
      ),
    },
  }
}
