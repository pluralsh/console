import styled from 'styled-components'

import { type MouseEvent } from 'react'

import { useNormalizeHref } from '../utils/useNormalizeHref'
import { isExternalUrl } from '../utils/text'
import { Callout, type CalloutProps, useNavigationContext } from '../../index'

import { ListItem } from './List'
import Paragraph from './Paragraph'

function MarkdocCallout({
  ctas,
  ...props
}: Omit<CalloutProps, 'buttonProps'> & { ctas: any[] }) {
  let buttonProps
  const { useNavigate } = useNavigationContext()
  const navigate = useNavigate()

  const href = useNormalizeHref(ctas?.[0]?.href)

  if (ctas[0]) {
    const { title, newTab = true } = ctas[0]

    buttonProps = {
      onClick: (e: MouseEvent) => {
        e.preventDefault()
        if (href) {
          if (isExternalUrl(href)) {
            window?.open(href, newTab ? '_blank' : undefined)
          } else {
            navigate(href)
          }
        }
      },
      children: title,
    }
  }

  return (
    <Callout
      {...props}
      buttonProps={buttonProps}
    />
  )
}

const StyledCallout = styled(MarkdocCallout)`
  ${({ theme }) => ({
    marginTop: theme.spacing.xlarge,
    marginBottom: theme.spacing.xlarge,
    color: theme.colors['text-light'],
  })}

  ${Paragraph}, ${ListItem} {
    ${({ theme }) => ({
      ...theme.partials.text.body2,
      color: theme.colors['text-light'],
    })}
  }
`

export default StyledCallout
