import { ReactNode } from 'react'
import { Div, DivProps, Flex, Icon } from 'honorable'
import PropTypes from 'prop-types'

type TagProps = DivProps & {
  active?: boolean
  startIcon?: ReactNode
}

const propTypes = {
  active: PropTypes.bool,
  startIcon: PropTypes.node,
}

function Tab({ startIcon, active, children, ...props }: TagProps) {
  return (
    <Div
      cursor="pointer"
      borderBottom={`1px solid ${active ? 'border-primary' : 'border'}`}
      {...props}
    >
      <Flex
        py={0.5}
        px={1}
        align="center"
        borderBottom={`2px solid ${active ? 'border-primary' : 'transparent'}`}
        hoverIndicator="action-input-hover"
        transition="background-color 150ms ease, border-color 150ms ease"
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
