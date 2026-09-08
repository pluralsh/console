import { AppsIcon, ListBoxFooter } from '@pluralsh/design-system'
import { ComponentPropsWithRef } from 'react'
import styled, { useTheme } from 'styled-components'

const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

export const NamespaceListFooter = ({
  leftContent,
  ...props
}: Omit<ComponentPropsWithRef<typeof ListBoxFooterPlusInner>, 'children'>) => {
  const theme = useTheme()
  const label = 'Clear selection'

  return (
    <ListBoxFooterPlusInner
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
}
