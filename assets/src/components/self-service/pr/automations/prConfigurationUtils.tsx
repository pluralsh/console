import {
  ConfigurationType,
  Operation,
  PrAutomationFragment,
  PrCallAttributes,
  PrConfiguration,
  PrConfigurationCondition,
  PullRequestFragment,
  useCreatePullRequestMutation,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { parseToBool } from 'utils/parseToBool'
import { ReviewPrFormState } from './wizard/CreatePrSteps'

export type FilteredPrConfig = {
  name: string
  value: string | boolean
}

export type PrConfigPageData = {
  pages: number[]
  curPage: number
  goToPage: (page: number) => void
  vistedPages: Set<number>
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
  threadId,
  preFilledContext,
  preFilledBranch,
}: {
  prAutomation: Nullable<PrAutomationFragment>
  onSuccess?: () => void
  threadId?: string
  preFilledContext?: PrCallAttributes['context']
  preFilledBranch?: PrCallAttributes['branch']
}) {
  const defaults = useMemo(
    () => getStateDefaults(prAutomation, preFilledContext, preFilledBranch),
    [prAutomation, preFilledContext, preFilledBranch]
  )

  const [curConfigVals, setCurConfigVals] = useState(defaults.curConfigVals)
  const [reviewFormState, setReviewFormState] = useState<ReviewPrFormState>(
    defaults.reviewFormState
  )
  const pages = useMemo(
    () =>
      Array.from(
        new Set(prAutomation?.configuration?.map((cfg) => cfg?.page ?? 0))
      ).sort(),
    [prAutomation?.configuration]
  )
  const firstPage = isEmpty(pages) ? 0 : Math.min(...pages)
  const [vistedPages, setVistedPages] = useState<Set<number>>(
    new Set([firstPage])
  )
  const [curPage, setCurPage] = useState(firstPage)

  // reapply default states if the prAutomation changes
  useEffect(() => {
    setCurConfigVals(defaults.curConfigVals)
    setReviewFormState(defaults.reviewFormState)
    setVistedPages(new Set([firstPage]))
    setCurPage(firstPage)
  }, [defaults, firstPage, prAutomation])

  const { isValid: configIsValid, values: filteredConfig } =
    validateAndFilterConfig(prAutomation?.configuration ?? [], curConfigVals)

  const allChecked = Object.values(reviewFormState.checkedItems).every((v) => v)
  const allowSubmit = !!reviewFormState.branch && configIsValid && allChecked

  const [successPr, setSuccessPr] = useState<PullRequestFragment>()

  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    variables: {
      id: prAutomation?.id ?? '',
      threadId: threadId,
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

  const pageData = useMemo(
    () => ({
      pages,
      curPage,
      goToPage: (page: number) => {
        setVistedPages((prev) => new Set(prev).add(page))
        setCurPage(page)
      },
      vistedPages,
    }),
    [pages, curPage, vistedPages]
  )

  return {
    curConfigVals,
    setCurConfigVals,
    configIsValid,
    filteredConfig,
    reviewFormState,
    setReviewFormState,
    allowSubmit,
    pageData,
    successPr,
    createPr: () => {
      if (allowSubmit) mutation()
    },
    createPrLoading: loading,
    createPrError: error,
  }
}

const getStateDefaults = (
  prAutomation: Nullable<PrAutomationFragment>,
  preFilledContext?: PrCallAttributes['context'],
  preFilledBranch?: PrCallAttributes['branch']
) => {
  const { configuration, confirmation } = prAutomation ?? {}
  return {
    curConfigVals: Object.fromEntries(
      configuration
        ?.filter(isNonNullable)
        .map((cfg) => [
          cfg.name,
          `${preFilledContext?.[cfg.name] || cfg.default || ''}`,
        ]) ?? []
    ),
    reviewFormState: {
      branch: preFilledBranch ?? '',
      identifier: prAutomation?.identifier ?? '',
      checkedItems: Object.fromEntries(
        confirmation?.checklist
          ?.filter(isNonNullable)
          .map((item) => [item.label, false]) ?? []
      ),
    },
  }
}
