import type { ComponentProps, ReactNode } from 'react'

import styled from 'styled-components'

import { isExternalUrl } from '../utils/text'
import { useNormalizeHref } from '../utils/useNormalizeHref'

import * as icons from '../../icons'

import { Button as PluralButton, useNavigationContext } from '../../index'

function Button({
  href,
  children,
  type = 'floating',
  className,
  icon,
  ...props
}: {
  href: string
  children?: ReactNode
  className?: string
  type?: 'floating'
  icon?: string
  renderLink: (props: ComponentProps<'a'>) => ReactNode
  useCurrentPath: () => string
}) {
  const { Link: LinkComponent } = useNavigationContext()

  href = useNormalizeHref(href)
  const buttonProps: any = props

  if (type === 'floating') {
    buttonProps.floating = true
  }

  let iconName = icon || ''

  if (iconName && !iconName?.match(/Icon$/gi)) {
    iconName = `${iconName}Icon`
  }
  const Icon = (icons as any)[iconName]

  return (
    /* Needs to be <span> to prevent "<div> cannot appear as a descendant of <p>."
       hydration error */
    <span className={className}>
      <PluralButton
        {...buttonProps}
        {...(Icon ? { startIcon: <Icon size={16} /> } : {})}
        href={href}
        {...(isExternalUrl(href)
          ? {
              as: 'a',
              target: '_blank',
              rel: 'nofollow noopener',
            }
          : {
              as: LinkComponent,
            })}
      >
        {children}
      </PluralButton>
    </span>
  )
}

export const ButtonGroup = styled.div(({ theme }) => ({
  margin: `${theme.spacing.large}px 0`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.small,
}))

export default styled(Button)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  margin: `${theme.spacing.large}px 0`,
  [`${ButtonGroup} &`]: {
    margin: 0,
  },
}))
