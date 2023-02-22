import { Callout } from '@pluralsh/design-system'
import type { CalloutProps } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import styled from 'styled-components'

import { useHref } from 'markdoc/utils/react-router'

import { isExternalUrl } from 'markdoc/utils/text'

import { ListItem } from './List'
import Paragraph from './Paragraph'

function MarkdocCallout({
  ctas,
  ...props
}: Omit<CalloutProps, 'buttonProps'> & { ctas: any[] }) {
  let buttonProps
  const navigate = useNavigate()
  const href = useHref(ctas?.[0]?.href)

  if (ctas[0]) {
    const { title, newTab = true } = ctas[0]

    buttonProps = {
      onClick: e => {
        e.preventDefault()
        if (href) {
          if (isExternalUrl(href)) {
            window?.open(href, newTab ? '_blank' : undefined)
          }
          else {
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
