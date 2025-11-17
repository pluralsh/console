import { Flex, type FlexProps } from 'honorable'
import styled from 'styled-components'

import { Divider } from '../index'

const PropWideSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
  marginVertical: theme.spacing.small,

  '.prop-title': {
    ...theme.partials.text.overline,
    color: theme.colors['text-xlight'],
    display: 'flex',
  },
}))

export default function PropWide({
  children,
  title,
  ...props
}: {
  title: string
} & FlexProps) {
  return (
    <PropWideSC>
      <div className="prop-title">{title}</div>
      <Divider
        backgroundColor="border-fill-three"
        flexGrow={1}
      />
      <Flex {...props}>{children}</Flex>
    </PropWideSC>
  )
}
