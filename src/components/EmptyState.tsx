import { ReactElement, Ref, forwardRef } from 'react'
import {
  Div, Flex, FlexProps, Text,
} from 'honorable'
import PropTypes from 'prop-types'

type EmptyStateProps = FlexProps & {
  message: string
  description?: string
  icon?: ReactElement
}

const propTypes = {
  message: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.element,
}

function EmptyStateRef({
  message,
  description,
  icon = null,
  children,
  ...props
}: EmptyStateProps,
ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      padding="xxlarge"
      gap="medium"
      direction="column"
      align="center"
      {...props}
    >
      {icon && (<Div marginBottom="large">{icon}</Div>)}
      <Text
        subtitle1
        textAlign="center"
      >
        {message}
      </Text>
      {description && (
        <Text
          body1
          color="text-light"
          textAlign="center"
        >
          {description}
        </Text>
      )}
      {children}
    </Flex>
  )
}

const EmptyState = forwardRef(EmptyStateRef)

EmptyState.propTypes = propTypes

export default EmptyState
