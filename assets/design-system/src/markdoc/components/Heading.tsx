import styled, { useTheme } from 'styled-components'

import { type ReactNode } from 'react'

import LinksIcon from '../../components/icons/LinksIcon'

import { useMarkdocContext } from '../MarkdocContext'
import { useNavigationContext } from '../../components/contexts/NavigationContext'

type HTag = 'h1' | 'h2' | 'h3' | 'h5' | 'h6'

const StyledH = styled.h1.withConfig({ shouldForwardProp: () => true })<{
  $level: number
}>(({ theme, $level }) => {
  let style
  const { variant } = useMarkdocContext()

  switch ($level) {
    case 1:
    case 2:
      style = {
        ...(variant === 'docs'
          ? theme.partials.marketingText.title1
          : theme.partials.text.title2),
      }
      break
    case 3:
      style = {
        ...(variant === 'docs'
          ? theme.partials.marketingText.title2
          : theme.partials.text.subtitle1),
      }
      break
    case 4:
      style = {
        ...(variant === 'docs'
          ? theme.partials.marketingText.subtitle1
          : theme.partials.text.subtitle2),
      }
      break
    case 5:
      style = {
        ...(variant === 'docs'
          ? theme.partials.marketingText.subtitle2
          : theme.partials.text.body1Bold),
      }
      break
    case 6:
      style = {
        ...(variant === 'docs'
          ? theme.partials.marketingText.body1Bold
          : theme.partials.text.body1Bold),
      }
      break
  }

  return {
    marginTop: theme.spacing.xxlarge,
    ...(variant === 'docs'
      ? {}
      : {
          '&:first-child': {
            marginTop: 0,
          },
        }),
    marginBottom: theme.spacing.small,
    ...style,
    '.link': {
      marginLeft: theme.spacing.xsmall,
      opacity: 0.35,
      '&:hover': {
        opacity: 1,
      },
    },
  }
})

export function Heading({
  level = 1,
  children,
  ...props
}: {
  level: number
  children: ReactNode
  id?: string
}) {
  const theme = useTheme()
  const { Link } = useNavigationContext()

  return (
    <StyledH
      as={`h${level}` as HTag}
      $level={level}
      {...props}
    >
      {children}
      {props.id && (
        <Link
          className="link"
          href={`#${props.id}`}
        >
          <LinksIcon
            size="100%"
            width="0.65em"
            position="relative"
            bottom="-0.03em"
            color={theme.colors['icon-xlight']}
          />
        </Link>
      )}
    </StyledH>
  )
}
