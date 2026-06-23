import { Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { ChatOptionPill } from 'components/ai/chatbot/input/ChatInput'
import { aiProviderToIcon } from 'components/settings/ai/AISettingsConfiguredProviders'
import { aiProviderToLabel } from 'components/settings/ai/AISettingsProviders'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  AiProvider,
  useAvailableModelsQuery,
  useDefaultModelsQuery,
  WorkbenchJobModelAttributes,
} from 'generated/graphql'
import groupBy from 'lodash/groupBy'
import { type ReactElement, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { TRUNCATE } from '../../utils/truncate'
import { CaptionP } from '../../utils/typography/Text'

const SELECTED_MODEL_PANEL_MAX_WIDTH = 150
const PANEL_WIDTH = 320
const PANEL_MAX_HEIGHT = 560
const SEARCH_THRESHOLD = 8
const MAX_SINGLE_PROVIDER_ITEMS = 8
const MAX_MULTI_PROVIDER_ITEMS = 4
const DEFAULT_MODEL_KEY = '__default__'

export function WorkbenchModelSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: Nullable<WorkbenchJobModelAttributes>
  onChange: (value: Nullable<WorkbenchJobModelAttributes>) => void
  disabled?: boolean
}) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { data: availableModelsData, loading: availableModelsLoading } =
    useAvailableModelsQuery({
      fetchPolicy: 'cache-first',
    })
  const { data: defaultModelsData, loading: defaultModelsLoading } =
    useDefaultModelsQuery({
      fetchPolicy: 'cache-first',
    })

  const defaultModelEntry = useMemo(
    () => (defaultModelsData?.defaultModels ?? []).find(isNonNullable) ?? null,
    [defaultModelsData?.defaultModels]
  )

  const defaultModel =
    defaultModelEntry?.provider && defaultModelEntry?.model
      ? ({
          provider: defaultModelEntry.provider,
          model: defaultModelEntry.model,
        } satisfies WorkbenchJobModelAttributes)
      : null

  const availableModels = useMemo(
    () =>
      (availableModelsData?.availableModels ?? [])
        .filter(isNonNullable)
        .filter(
          (option) =>
            !isSameModelOption(option, defaultModel) &&
            !!option.model?.trim() &&
            !!option.provider
        )
        .map(
          ({ provider, model }) =>
            ({
              provider,
              model,
            }) satisfies WorkbenchJobModelAttributes
        ),
    [availableModelsData?.availableModels, defaultModel]
  )

  const hasMultipleProviders =
    new Set(availableModels.map(({ provider }) => provider)).size > 1
  const shouldShowSearch = availableModels.length > SEARCH_THRESHOLD
  const normalizedQuery = query.trim().toLowerCase()

  const filteredModels = useMemo(
    () =>
      !normalizedQuery
        ? availableModels
        : availableModels.filter(({ provider, model }) =>
            `${aiProviderToLabel[provider]} ${model}`
              .toLowerCase()
              .includes(normalizedQuery)
          ),
    [availableModels, normalizedQuery]
  )

  const groupedFilteredModels = useMemo(() => {
    const grouped = groupBy(filteredModels, ({ provider }) => provider)
    const order = [...new Set(filteredModels.map(({ provider }) => provider))]

    return order.map((provider) => ({
      provider,
      models: grouped[provider] ?? [],
    }))
  }, [filteredModels])

  const displayedGroupedModels = useMemo(() => {
    if (!shouldShowSearch || normalizedQuery) return groupedFilteredModels

    const limit = hasMultipleProviders
      ? MAX_MULTI_PROVIDER_ITEMS
      : MAX_SINGLE_PROVIDER_ITEMS

    return groupedFilteredModels.map(({ provider, models }) => ({
      provider,
      models: models.slice(0, limit),
    }))
  }, [
    groupedFilteredModels,
    hasMultipleProviders,
    normalizedQuery,
    shouldShowSearch,
  ])

  const loading = availableModelsLoading || defaultModelsLoading
  const hasSelectableModels = !!defaultModel || availableModels.length > 0
  const triggerDisabled = disabled || (!loading && !hasSelectableModels)
  const triggerModel = value ?? defaultModel
  const selectedKey = value
    ? modelOptionKey(value)
    : defaultModel
      ? DEFAULT_MODEL_KEY
      : null
  const shownCount = normalizedQuery
    ? filteredModels.length
    : displayedGroupedModels.reduce(
        (count, { models }) => count + models.length,
        0
      )
  const items = useMemo(() => {
    const nextItems: ReactElement[] = []

    if (defaultModel) {
      nextItems.push(
        <SectionHeader
          key="section:default-model"
          label="Default model"
        />,
        <ListBoxItem
          key={DEFAULT_MODEL_KEY}
          label={<ModelLabel option={defaultModel} />}
          textValue={defaultModel.model}
        />
      )
    }

    displayedGroupedModels.forEach(({ provider, models }) => {
      if (!models.length) return

      nextItems.push(
        <SectionHeader
          key={`section:${provider}`}
          label={aiProviderToLabel[provider]}
        />
      )

      models.forEach((option) => {
        nextItems.push(
          <ListBoxItem
            key={modelOptionKey(option)}
            label={<ModelLabel option={option} />}
            textValue={`${aiProviderToLabel[option.provider]} ${option.model}`}
          />
        )
      })
    })

    if (!defaultModel && !shownCount && !loading) {
      nextItems.push(
        <ListBoxItem
          key="empty"
          label={
            normalizedQuery
              ? 'No models match your search'
              : 'No models available'
          }
          disabled
        />
      )
    }

    return nextItems
  }, [
    defaultModel,
    displayedGroupedModels,
    loading,
    normalizedQuery,
    shownCount,
  ])

  return (
    <Select
      transparent
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen)
        if (!nextOpen) setQuery('')
      }}
      width={PANEL_WIDTH}
      maxHeight={PANEL_MAX_HEIGHT}
      placement="left"
      label="Select model"
      selectedKey={selectedKey}
      isDisabled={triggerDisabled}
      triggerButton={
        <ChatOptionPill
          isOpen={isOpen}
          disabled={triggerDisabled}
          css={{ height: '100%', maxWidth: 220 }}
        >
          {loading && !triggerModel ? (
            <RectangleSkeleton
              $bright
              $width={78}
            />
          ) : (
            <>
              {triggerModel && (
                <ProviderChipIcon provider={triggerModel.provider} />
              )}
              <SelectedModelLabelSC
                title={triggerModel?.model ?? 'Default model'}
              >
                {triggerModel?.model ?? 'Default model'}
              </SelectedModelLabelSC>
            </>
          )}
        </ChatOptionPill>
      }
      dropdownHeaderFixed={
        shouldShowSearch ? (
          <DropdownSearchHeaderSC>
            <Input
              small
              type="text"
              showClearButton
              placeholder="Search for model"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              css={{
                backgroundColor: theme.colors['fill-one'],
              }}
            />
          </DropdownSearchHeaderSC>
        ) : undefined
      }
      dropdownFooterFixed={
        shouldShowSearch ? (
          <DropdownFooterSC>
            <CaptionP $color="text-xlight">
              {shownCount} of {availableModels.length} models
            </CaptionP>
          </DropdownFooterSC>
        ) : undefined
      }
      onSelectionChange={(key) => {
        if (!key) return
        const nextKey = String(key)

        if (nextKey === DEFAULT_MODEL_KEY) {
          onChange(null)
          return
        }

        const nextModel = availableModels.find(
          (option) => modelOptionKey(option) === nextKey
        )

        if (nextModel) onChange(nextModel)
      }}
    >
      {items as any}
    </Select>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <ListBoxItem
      key={`header:${label}`}
      label={label}
      disabled
      textValue=""
      css={{
        paddingTop: 8,
        paddingBottom: 8,
        cursor: 'default',
        pointerEvents: 'none',
        '&:hover': { backgroundColor: 'transparent' },
        '.label': {
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: 10,
          lineHeight: '16px',
        },
      }}
    />
  )
}

function ModelLabel({ option }: { option: WorkbenchJobModelAttributes }) {
  return (
    <LabelRowSC>
      <ProviderChipIcon provider={option.provider} />
      <ModelNameSC title={option.model}>{option.model}</ModelNameSC>
    </LabelRowSC>
  )
}

function ProviderChipIcon({ provider }: { provider: AiProvider }) {
  const ProviderIcon = aiProviderToIcon[provider]

  return (
    <ProviderIcon
      size={12}
      fullColor
    />
  )
}

function isSameModelOption(
  left: Nullable<WorkbenchJobModelAttributes>,
  right: Nullable<WorkbenchJobModelAttributes>
): boolean {
  return (
    !!left &&
    !!right &&
    left.provider === right.provider &&
    left.model === right.model
  )
}

function modelOptionKey({ provider, model }: WorkbenchJobModelAttributes) {
  return `${provider}:${model}`
}

const DropdownSearchHeaderSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))

const DropdownFooterSC = styled.div(({ theme }) => ({
  padding: theme.spacing.xsmall,
  borderTop: theme.borders['fill-two'],
}))

const SelectedModelLabelSC = styled.span({
  display: 'inline-block',
  maxWidth: SELECTED_MODEL_PANEL_MAX_WIDTH,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const LabelRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minWidth: 0,
  width: '100%',
}))

const ModelNameSC = styled.span({
  display: 'block',
  flex: 1,
  width: 0,
  minWidth: 0,
  ...TRUNCATE,
})
