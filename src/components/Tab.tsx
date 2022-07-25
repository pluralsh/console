import { ReactNode, Ref, forwardRef } from 'react'
import {
  Div, DivProps, Flex, Icon,
} from 'honorable'
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

function TabRef({
  startIcon, active, children, vertical, ...props
}: TagProps, ref:Ref<any>) {
  return (
    <Div
      ref={ref}
      buttonMedium
      tabIndex={0}
      userSelect="none"
      cursor="pointer"
      borderBottom={vertical ? null : `1px solid ${active ? 'border-primary' : 'border'}`}
      borderRight={vertical ? `1px solid ${active ? 'border-primary' : 'border'}` : null}
      zIndex={0}
      _focusVisible={{ outline: '1px solid border-outline-focused', zIndex: 1 }}
      {...props}

    >
      <Flex
        paddingHorizontal="medium"
        paddingTop={vertical ? 'xsmall' : 'medium'}
        paddingBottom="xsmall"
        align="center"
        borderBottom={vertical ? null : `3px solid ${active ? 'border-primary' : 'transparent'}`}
        borderRight={vertical ? `3px solid ${active ? 'border-primary' : 'transparent'}` : null}
        hoverIndicator="action-input-hover"
        color={active ? 'text' : 'text-xlight'}
        _hover={{ color: 'text' }}
        transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
      >
        {!!startIcon && (
          <Icon marginRight="small">
            {startIcon}
          </Icon>
        )}
        {children}
      </Flex>
    </Div>
  )
}

TabRef.propTypes = propTypes

const Tab = forwardRef(TabRef)

export default Tab
