import { useFillLevel } from '@pluralsh/design-system'
import { useMarkdocContext } from 'markdoc/DocsContext'

import styled from 'styled-components'

export function bodyText({ theme, fillLevel, variant }) {
  return {
    ...theme.partials.marketingText.body2,
    color:
      fillLevel > 0
        ? theme.colors['text-light']
        : theme.colors['text-long-form'],
    'b, strong': {
      ...(variant === 'docs'
        ? theme.partials.marketingText.bodyBold
        : theme.partials.text.bodyBold),
      color: theme.colors['text-light'],
    },
    'i, em': {
      fontStyle: 'italic',
    },
  }
}

const Paragraph = styled.p(({ theme }) => {
  const fillLevel = useFillLevel()
  const { variant } = useMarkdocContext()

  return {
    ...bodyText({ theme, fillLevel, variant }),
    marginBottom: theme.spacing.small,
  }
})

export default Paragraph
