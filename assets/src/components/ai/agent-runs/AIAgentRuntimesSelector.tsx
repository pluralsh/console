import {
  CloseIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { AgentRuntimeType, useAgentRuntimesQuery } from 'generated/graphql'
import { capitalize } from 'lodash'
import { useEffectEvent, useLayoutEffect, useState } from 'react'
import { StyledObject } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { ChatOptionPill } from '../chatbot/input/ChatInput'
import { ChatInputSelectButton } from '../chatbot/input/ChatInputSelectButton'
import { TRUNCATE } from 'components/utils/truncate'

export function AIAgentRuntimesSelector({
  selectedRuntimeId,
  setSelectedRuntimeId,
  placeholder = 'Filter by runtime',
  allowDeselect = false,
  autoSelectDefault = false,
  type = 'standard',
  updateLoading = false,
  outerStyles,
  ...props
}: {
  selectedRuntimeId: Nullable<string>
  setSelectedRuntimeId: (runtimeId: Nullable<string>) => void
  placeholder?: string
  allowDeselect?: boolean
  autoSelectDefault?: boolean
  type?: 'standard' | 'pill' | 'minimal'
  updateLoading?: boolean
  outerStyles?: StyledObject
} & Omit<SelectPropsSingle, 'onSelectionChange' | 'selectedKey' | 'children'>) {
  const [isOpen, setIsOpen] = useState(false)
  const { data, loading } = useAgentRuntimesQuery({
    fetchPolicy: 'cache-and-network',
  })
  const runtimes = mapExistingNodes(data?.agentRuntimes)
  const selectedRuntime = runtimes.find(
    (runtime) => runtime.id === selectedRuntimeId
  )
  const SelectedIcon =
    runtimeToIcon[selectedRuntime?.type ?? AgentRuntimeType.Custom]

  const isLoading = (!data && loading) || updateLoading

  const setRuntimeToDefault = useEffectEvent(() => {
    const { id } = runtimes.find((runtime) => !!runtime.default) ?? {}
    if (autoSelectDefault && id) setSelectedRuntimeId(id)
  })
  useLayoutEffect(() => {
    if (data && !selectedRuntimeId) setRuntimeToDefault()
  }, [data, selectedRuntimeId])
  return (
    <div css={{ width: type === 'standard' ? 240 : undefined, ...outerStyles }}>
      <Select
        transparent
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width={type === 'standard' ? 240 : 160}
        placement="left"
        label={isLoading ? <RectangleSkeleton /> : placeholder}
        leftContent={
          isLoading || !selectedRuntime ? undefined : <SelectedIcon fullColor />
        }
        selectedKey={selectedRuntimeId ?? ''}
        onSelectionChange={(key) => setSelectedRuntimeId(key ? `${key}` : null)}
        dropdownFooterFixed={
          allowDeselect && (
            <ListBoxFooterPlus
              key="deselect"
              leftContent={<CloseIcon />}
              onClick={() => setSelectedRuntimeId(null)}
            >
              Clear selection
            </ListBoxFooterPlus>
          )
        }
        triggerButton={
          type === 'pill' ? (
            <ChatOptionPill isOpen={isOpen}>
              {!isLoading && <SelectedIcon size={12} />}
              {isLoading ? (
                <RectangleSkeleton
                  $bright
                  $width={75}
                />
              ) : (
                <span>{capitalize(selectedRuntime?.name ?? 'Runtime')}</span>
              )}
            </ChatOptionPill>
          ) : type === 'minimal' ? (
            <ChatInputSelectButton>
              {!isLoading && (
                <SelectedIcon
                  fullColor
                  size={12}
                />
              )}
              {isLoading ? (
                <RectangleSkeleton
                  $bright
                  $width={70}
                />
              ) : (
                <span css={{ ...TRUNCATE }}>
                  {selectedRuntime?.name || 'runtime'}
                </span>
              )}
            </ChatInputSelectButton>
          ) : undefined
        }
        {...props}
      >
        {runtimes.map(({ id, name, type }) => {
          const Icon = runtimeToIcon[type]
          return (
            <ListBoxItem
              key={id}
              label={capitalize(name)}
              leftContent={<Icon fullColor />}
            />
          )
        })}
      </Select>
    </div>
  )
}
