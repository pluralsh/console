import {
  IconFrame,
  IconFrameProps,
  MoreIcon,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { isNil } from 'lodash'
import { ComponentPropsWithRef, ReactNode, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

export function MoreMenuTrigger({
  ref,
  disabled,
  iconFrameType = 'tertiary',
  ...props
}: { disabled?: boolean; iconFrameType?: IconFrameProps['type'] } & Partial<
  Omit<IconFrameProps, 'type'>
>) {
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
      type={iconFrameType}
    />
  )
}

export function MoreMenu({
  children,
  onSelectionChange,
  disabled = false,
  triggerProps,
  loading,
  ...props
}: Omit<SelectPropsSingle, 'onSelectionChange' | 'children'> & {
  onSelectionChange?: (selectedKey: any) => void
  disabled?: boolean
  children?: ReactNode
  triggerProps?: Omit<ComponentPropsWithRef<typeof MoreMenuTrigger>, 'disabled'>
  loading?: boolean // when provided, blocks menu from auto-closing on selection so loading states can be shown
}) {
  const [isOpen, setIsOpen] = useState(false)
  const blockClose = useRef(false)

  return (
    <Select
      isOpen={isOpen}
      label="Pick something"
      placement="right"
      width="max-content"
      onOpenChange={(newOpen) => {
        // if blockClose is true and trying to close, unblock but don't close yet (allows manual close on next attempt)
        if (!newOpen && blockClose.current) blockClose.current = false
        else setIsOpen(newOpen)
      }}
      isDisabled={disabled}
      onSelectionChange={(selectedKey) => {
        if (!isNil(loading)) blockClose.current = true
        else setIsOpen(false)
        onSelectionChange?.(selectedKey)
      }}
      selectedKey={null}
      triggerButton={
        <MoreMenuTrigger
          disabled={disabled}
          {...triggerProps}
        />
      }
      {...props}
    >
      {children as any}
    </Select>
  )
}
