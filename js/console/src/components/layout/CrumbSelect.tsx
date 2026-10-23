import { Select } from '@pluralsh/design-system'
import { ComponentProps, ReactNode, useState } from 'react'
import styled from 'styled-components'

// A breadcrumb that opens a menu of its siblings, e.g. to switch project or
// workbench in place.
export function CrumbSelect({
  label,
  ariaLabel,
  selectedKey,
  onSelectionChange,
  width = 280,
  children,
}: {
  label: ReactNode
  ariaLabel: string
  selectedKey: string
  onSelectionChange: (key: string) => void
  width?: number
  children: ComponentProps<typeof Select>['children']
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Select
      label={ariaLabel}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        if (key !== null && key !== undefined) onSelectionChange(`${key}`)
      }}
      placement="left"
      width={width}
      maxHeight={360}
      triggerButton={<CrumbSelectTrigger label={label} />}
    >
      {children}
    </Select>
  )
}

function CrumbSelectTrigger({
  label,
  isOpen: _isOpen,
  ...props
}: { label: ReactNode; isOpen?: boolean } & ComponentProps<
  typeof CrumbSelectTriggerSC
>) {
  return (
    <CrumbSelectTriggerSC {...props}>
      <span className="label">{label}</span>
      <UpDownChevron />
    </CrumbSelectTriggerSC>
  )
}

function UpDownChevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.5 3.75 5 1.25l2.5 2.5M2.5 6.25 5 8.75l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const CrumbSelectTriggerSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  maxWidth: 220,
  padding: `0.125rem ${theme.spacing.xxsmall}`,
  margin: `-0.125rem -${theme.spacing.xxsmall}`,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-light'],
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  '.label': { overflow: 'hidden', textOverflow: 'ellipsis' },
  svg: { flexShrink: 0, color: theme.colors['icon-xlight'] },
  '&:hover': {
    color: theme.colors.text,
    backgroundColor: theme.colors['fill-zero-hover'],
  },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))
