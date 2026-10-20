import { Select, type SelectPropsSingle } from '@pluralsh/design-system'
import styled from 'styled-components'

/** Select with the small caret used by dashboard controls. Select ignores `showArrow` and hardcodes a 16px arrow, so it's resized here. */
export function CompactSelect(props: SelectPropsSingle) {
  return (
    <WrapSC>
      <Select {...props} />
    </WrapSC>
  )
}

const WrapSC = styled.div(({ theme }) => ({
  display: 'contents',
  '.triggerButton .arrow': {
    color: theme.colors['icon-xlight'],
    svg: { height: 12, width: 12 },
  },
}))
