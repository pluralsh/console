import { IconFrame, MoreIcon, Select } from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import { useTheme } from 'styled-components'
import { SelectPropsSingle } from '../../../../../design-system/dist/components/Select'

export function MoreMenuTrigger({
  ref,
  disabled,
  ...props
}: { disabled?: boolean } & Partial<ComponentProps<typeof IconFrame>>) {
  const theme = useTheme()

  return (
    <IconFrame
      ref={ref}
      textValue="Menu"
      clickable={!disabled}
      size="medium"
      icon={
        <MoreIcon
          color={disabled ? theme.colors['icon-disabled'] : undefined}
        />
      }
      {...props}
      // Set type after {...props} to ensure it's not overridden by Select component cloning
      type="tertiary"
    />
  )
}

export function MoreMenu({
  children,
  onSelectionChange,
  disabled = false,
  ...props
}: Omit<SelectPropsSingle, 'onSelectionChange'> & {
  onSelectionChange?: (selectedKey: any) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Select
      isOpen={isOpen}
      label="Pick something"
      placement="right"
      width="max-content"
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      isDisabled={disabled}
      onSelectionChange={(selectedKey) => {
        setIsOpen(false)
        onSelectionChange?.(selectedKey)
      }}
      selectedKey={null}
      triggerButton={<MoreMenuTrigger disabled={disabled} />}
      {...props}
    >
      {children}
    </Select>
  )
}
