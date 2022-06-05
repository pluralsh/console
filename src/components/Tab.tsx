import { ReactNode } from 'react'
import { Div, DivProps, Flex, Icon } from 'honorable'
import PropTypes from 'prop-types'

type TagProps = DivProps & {
  active?: boolean
  startIcon?: ReactNode
  vertical?: boolean
}

const propTypes = {
  active: PropTypes.bool,
  startIcon: PropTypes.node,
  vertical: PropTypes.bool,
}

function Tab({ startIcon, active, children, vertical, ...props }: TagProps) {
  return (
    <Div
      cursor="pointer"
      borderBottom={vertical ? null : `1px solid ${active ? 'border-primary' : 'border'}`}
      borderRight={vertical ? `1px solid ${active ? 'border-primary' : 'border'}` : null}
      {...props}
    >
      <Flex
        py={0.5}
        px={1}
        align="center"
        borderBottom={vertical ? null : `2px solid ${active ? 'border-primary' : 'transparent'}`}
        borderRight={vertical ? `2px solid ${active ? 'border-primary' : 'transparent'}` : null}
        hoverIndicator="action-input-hover"
        color={active ? 'text' : 'text-xlight'}
        _hover={{ color: 'text' }}
        transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
      >
        {!!startIcon && (
          <Icon mr="12px">
            {startIcon}
          </Icon>
        )}
        {children}
      </Flex>
    </Div>
  )
}

Tab.propTypes = propTypes

export default Tab
