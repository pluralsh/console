import { ListBoxItem, Select } from '@pluralsh/design-system'
import { ChatOptionPill } from 'components/ai/chatbot/input/ChatInput'
import { ComponentProps, ReactNode, useState } from 'react'
import styled from 'styled-components'
import { AutonomyChoice } from './devboxAutonomy'

export function PillSelect({
  label,
  selectedKey,
  onSelect,
  trigger,
  title,
  showArrow = true,
  disabled = false,
  children,
}: {
  label: string
  selectedKey: Nullable<string>
  onSelect: (key: string) => void
  trigger: ReactNode
  title?: string
  showArrow?: boolean
  disabled?: boolean
  children: ComponentProps<typeof Select>['children']
}) {
  const [open, setOpen] = useState(false)
  return (
    <Select
      transparent
      label={label}
      isOpen={open && !disabled}
      onOpenChange={(next) => setOpen(next && !disabled)}
      width={280}
      placement="left"
      selectedKey={selectedKey ?? null}
      onSelectionChange={(key) => onSelect(`${key}`)}
      triggerButton={
        <ChatOptionPill
          isOpen={open}
          showArrow={showArrow && !disabled}
          disabled={disabled}
          aria-label={label}
          title={title ? `${label}: ${title}` : label}
          css={{ height: 32, maxWidth: 220 }}
        >
          {trigger}
        </ChatOptionPill>
      }
    >
      {children}
    </Select>
  )
}

export function AutonomyPillSelect({
  levels,
  value,
  onSelect,
  disabled,
}: {
  levels: AutonomyChoice[]
  value: Nullable<string>
  onSelect: (value: string) => void
  disabled?: boolean
}) {
  return (
    <PillSelect
      label="Autonomy"
      selectedKey={value}
      onSelect={onSelect}
      disabled={disabled}
      showArrow={false}
      title={levels.find((c) => c.value === value)?.label}
      trigger={
        <>
          <AutonomyBars level={levels.findIndex((c) => c.value === value)} />
          Autonomy
        </>
      }
    >
      {levels.map((c, i) => (
        <ListBoxItem
          key={c.value}
          label={c.label}
          leftContent={
            <AutonomyBars
              level={i}
              width={levels.length}
            />
          }
          disabled={!!c.unavailable}
          description={c.unavailable ?? c.description}
        />
      ))}
    </PillSelect>
  )
}

// one bar per level, so manual shows one, auto two and full three
function AutonomyBars({ level, width }: { level: number; width?: number }) {
  return (
    <BarsSC
      aria-hidden
      $width={width}
    >
      {Array.from({ length: Math.max(level, 0) + 1 }, (_, i) => (
        <BarSC key={i} />
      ))}
    </BarsSC>
  )
}

const BAR_WIDTH = 4
const BAR_GAP = 2

const BarsSC = styled.span<{ $width?: number }>(({ $width }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: BAR_GAP,
  flexShrink: 0,
  ...($width && { width: $width * (BAR_WIDTH + BAR_GAP) - BAR_GAP }),
}))

const BarSC = styled.span(({ theme }) => ({
  width: BAR_WIDTH,
  height: 12,
  borderRadius: 1,
  backgroundColor: theme.colors.orange[400],
}))
