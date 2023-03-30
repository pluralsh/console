import { IconFrame, MoreIcon, Select } from '@pluralsh/design-system'
import { useState } from 'react'

export function MoreMenu({
  children,
  onSelectionChange,
  disabled = false,
  ...props
}: any) {
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
        onSelectionChange(selectedKey)
      }}
      selectedKey={null}
      triggerButton={
        <IconFrame
          textValue="Menu"
          clickable={!disabled}
          size="medium"
          icon={<MoreIcon color={disabled ? 'icon-disabled' : undefined} />}
          background="transparent"
          border="none"
        />
      }
      {...props}
    >
      {children}
    </Select>
  )
}
