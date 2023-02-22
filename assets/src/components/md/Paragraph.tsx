import { useFillLevel } from '@pluralsh/design-system'

import styled from 'styled-components'

export function bodyText({ theme, fillLevel }) {
  const variant

  return {
    ...theme.partials.marketingText.body2,
    color:
      fillLevel > 0
        ? theme.colors['text-light']
        : theme.colors['text-long-form'],
    'b, strong': {
      ...theme.partials.marketingText.bodyBold,
      color: theme.colors['text-light'],
    },
    'i, em': {
      fontStyle: 'italic',
    },
  }
}

const Paragraph = styled.p(({ theme }) => {
  const fillLevel = useFillLevel()
  const docsContext = useDocsContext()

  return {
    ...bodyText({ theme, fillLevel, variant: docsContext.variant }),
    marginBottom: theme.spacing.small,
  }
})

export default Paragraph
