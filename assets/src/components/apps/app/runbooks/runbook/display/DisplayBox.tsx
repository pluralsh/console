import { Flex } from '@pluralsh/design-system'

import { recurse } from './misc'

const border = ({ borderSize, borderSide, border }) =>
  borderSize || borderSide
    ? { [`border${borderSide}`]: `${border} ${borderSize}` }
    : border

export function DisplayBox({ children, attributes }) {
  return (
    <Flex
      flexDirection="column"
      {...(grommetBoxAttrsToFlex(attributes) || {})}
      border={border(attributes)}
    >
      {recurse(children)}
    </Flex>
  )
}

// basically like a polyfill to convert grommet box attrs to regular flex syntax
function grommetBoxAttrsToFlex(attrs: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(attrs).map(([key, value]) => [
      key === 'align'
        ? 'alignItems'
        : key === 'justify'
        ? 'justifyContent'
        : key === 'direction'
        ? 'flexDirection'
        : key,
      value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : value,
    ])
  )
}
