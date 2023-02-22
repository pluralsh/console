import type { ComponentProps, ReactNode } from 'react'

import { Button as PluralButton } from '@pluralsh/design-system'

import * as icons from '@pluralsh/design-system/dist/icons'
import styled from 'styled-components'

import { isExternalUrl } from 'markdoc/utils/text'
import { useHref } from 'react-router-dom'

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
  icon?: 'string'
  renderLink: (props: ComponentProps<'a'>) => ReactNode
  useCurrentPath: () => string
}) {
  href = useHref(href)
  const buttonProps: any = props

  if (type === 'floating') {
    buttonProps.floating = true
  }

  let iconName = icon || ''

  if (iconName && !iconName?.match(/Icon$/gi)) {
    iconName = `${iconName}Icon`
  }
  const Icon = icons[iconName]

  return (
    /* Needs to be <span> to prevent "<div> cannot appear as a descendant of <p>."
       hydration error */
    <span className={className}>
      <PluralButton
        {...buttonProps}
        {...(Icon ? { startIcon: <Icon size={16} /> } : {})}
        {...(isExternalUrl(href)
          ? {
            as: 'a',
            href,
            target: '_blank',
            rel: 'nofollow noopener',
          }
          : {
            to: href,
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
