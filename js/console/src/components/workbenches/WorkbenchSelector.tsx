import {
  ComboBox,
  Flex,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  SearchIcon,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { AgentRuntimeType, WorkbenchTinyFragment } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { ReactElement, ReactNode, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

export const WORKBENCH_SELECTOR_WIDTH = 536
export const HEADER_WORKBENCH_SELECTOR_WIDTH = 429
const MAX_VISIBLE_TOOLS = 5

export function WorkbenchSelector({
  workbenchId,
  setWorkbenchId,
  workbenches,
  loading,
  width,
  maxHeight,
  placement,
  placeholder = 'Select workbench',
  showSelectedInTrigger = true,
  triggerButton,
}: {
  workbenchId: Nullable<string>
  setWorkbenchId: (id: Nullable<string>) => void
  workbenches: WorkbenchTinyFragment[]
  loading: boolean
  width?: string | number
  maxHeight?: string | number
  placement?: 'left' | 'right'
  placeholder?: ReactNode
  showSelectedInTrigger?: boolean
  triggerButton?: ReactElement
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedWorkbench = workbenches.find(
    (workbench) => workbench.id === workbenchId
  )
  const triggerShowsSelected = showSelectedInTrigger && selectedWorkbench

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      width={width}
      maxHeight={maxHeight}
      placement={placement}
      label="Select workbench"
      isDisabled={!loading && !workbenches.length}
      selectedKey={workbenchId ?? ''}
      onSelectionChange={(key) => setWorkbenchId(key ? `${key}` : null)}
      triggerButton={
        triggerButton ?? (
          <SelectButton
            css={{
              width: '100%',
              '.children': { minWidth: 0, overflow: 'hidden' },
              '.content': { paddingTop: '0.625rem', paddingBottom: '0.625rem' },
            }}
            rightContent={
              triggerShowsSelected ? (
                <WorkbenchToolIcons workbench={selectedWorkbench} />
              ) : undefined
            }
          >
            {loading ? (
              <RectangleSkeleton
                $bright
                $width={120}
              />
            ) : triggerShowsSelected ? (
              <WorkbenchOptionLabel workbench={selectedWorkbench} />
            ) : (
              placeholder
            )}
          </SelectButton>
        )
      }
    >
      {workbenches.map(workbenchListItem)}
    </Select>
  )
}

export function SearchableWorkbenchSelector({
  workbenchId,
  setWorkbenchId,
  workbenches,
  selectedWorkbench,
  loading,
  fetchingMore,
  query,
  onQueryChange,
  hasNextPage,
  onLoadMore,
  disabled,
}: {
  workbenchId: Nullable<string>
  setWorkbenchId: (id: Nullable<string>) => void
  workbenches: WorkbenchTinyFragment[]
  selectedWorkbench: WorkbenchTinyFragment | null
  loading: boolean
  fetchingMore: boolean
  query: string
  onQueryChange: (query: string) => void
  hasNextPage: boolean
  onLoadMore: () => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const showSelection = !isOpen && !!selectedWorkbench

  return (
    <ComboBox
      isDisabled={disabled}
      width="100%"
      inputValue={query}
      onInputChange={onQueryChange}
      inputProps={{
        placeholder: showSelection
          ? undefined
          : isOpen
            ? 'Search workbenches'
            : loading
              ? 'Loading workbench'
              : 'Select workbench',
      }}
      inputContent={
        showSelection && selectedWorkbench ? (
          <WorkbenchOptionLabel workbench={selectedWorkbench} />
        ) : undefined
      }
      startIcon={showSelection ? undefined : <SearchIcon />}
      endIcon={
        showSelection && selectedWorkbench ? (
          <WorkbenchToolIcons workbench={selectedWorkbench} />
        ) : undefined
      }
      loading={isOpen && (loading || fetchingMore)}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) onQueryChange('')
      }}
      selectedKey={workbenchId ?? ''}
      onSelectionChange={(key) => {
        setWorkbenchId(key ? `${key}` : null)
        onQueryChange('')
        setIsOpen(false)
      }}
      defaultFilter={() => true}
      arrowSize="small"
      dropdownFooter={
        loading && isEmpty(workbenches) ? (
          <ListBoxFooter>Loading</ListBoxFooter>
        ) : isEmpty(workbenches) ? (
          <ListBoxFooter>No results</ListBoxFooter>
        ) : hasNextPage ? (
          <ListBoxFooterPlus>Show more</ListBoxFooterPlus>
        ) : undefined
      }
      onFooterClick={() => {
        if (hasNextPage) onLoadMore()
        else setIsOpen(false)
      }}
    >
      {workbenches.map(workbenchListItem)}
    </ComboBox>
  )
}

function workbenchListItem(workbench: WorkbenchTinyFragment) {
  const ProviderIcon =
    runtimeToIcon[workbench.agentRuntime?.type ?? AgentRuntimeType.Custom]

  return (
    <ListBoxItem
      key={workbench.id}
      label={workbench.name}
      description={workbench.description ?? undefined}
      textValue={workbench.name}
      leftContent={
        <ProviderIcon
          fullColor
          size={16}
        />
      }
      rightContent={<WorkbenchToolIcons workbench={workbench} />}
      css={{
        '.center-content': {
          flexGrow: 1,
          minWidth: 0,
          width: 'auto',
          overflow: 'hidden',
        },
        '.label, .description': TRUNCATE,
      }}
    />
  )
}

function WorkbenchOptionLabel({
  workbench,
}: {
  workbench: WorkbenchTinyFragment
}) {
  const ProviderIcon =
    runtimeToIcon[workbench.agentRuntime?.type ?? AgentRuntimeType.Custom]

  return (
    <Flex
      direction="column"
      minWidth={0}
    >
      <Flex
        align="center"
        gap="xsmall"
        minWidth={0}
      >
        <ProviderIcon
          fullColor
          size={16}
        />
        <Body2P css={{ ...TRUNCATE, minWidth: 0 }}>{workbench.name}</Body2P>
      </Flex>
      {workbench.description && (
        <CaptionP
          $color="text-xlight"
          css={{ ...TRUNCATE, minWidth: 0 }}
        >
          {workbench.description}
        </CaptionP>
      )}
    </Flex>
  )
}

function WorkbenchToolIcons({
  workbench,
}: {
  workbench: WorkbenchTinyFragment
}) {
  const tools = workbench.tools?.filter(isNonNullable) ?? []
  if (!tools.length) return null

  return (
    <MetadataIcons
      maxVisibleItems={MAX_VISIBLE_TOOLS}
      items={tools.map((tool) => ({
        id: tool.id,
        label: tool.name,
        icon: (
          <WorkbenchToolIcon
            type={tool.tool}
            provider={tool.cloudConnection?.provider}
            size={12}
          />
        ),
      }))}
    />
  )
}
