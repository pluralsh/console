import {
  IconFrame,
  IconFrameProps,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { forwardRef } from 'react'
import { useTheme } from 'styled-components'

export const DeleteIconButton = forwardRef<
  HTMLDivElement,
  Partial<IconFrameProps> & { disabled?: boolean }
>(({ size, clickable, textValue, disabled, ...props }, ref) => {
  const theme = useTheme()

  return (
    <IconFrame
      ref={ref}
      size={size || 'medium'}
      clickable={disabled ? false : clickable === undefined ? true : clickable}
      icon={
        <TrashCanIcon
          color={
            disabled
              ? theme.colors['text-disabled']
              : theme.colors['icon-danger']
          }
        />
      }
      textValue={textValue || 'Delete'}
      {...props}
    />
  )
})
