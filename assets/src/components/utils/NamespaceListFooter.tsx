import { AppsIcon, ListBoxFooter } from '@pluralsh/design-system'
import { forwardRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { ComponentPropsWithRef } from 'react-spring'

const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

export const NamespaceListFooter = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithRef<typeof ListBoxFooterPlusInner>, 'children'>
>(({ leftContent, ...props }, ref) => {
  const theme = useTheme()
  const label = 'Clear selection'

  return (
    <ListBoxFooterPlusInner
      ref={ref as any}
      leftContent={
        leftContent || (
          <AppsIcon
            size={16}
            color={theme.colors['text-primary-accent'] as string}
          >
            {label}
          </AppsIcon>
        )
      }
      {...props}
    >
      {label}
    </ListBoxFooterPlusInner>
  )
})
