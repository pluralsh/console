import { ReactNode, Ref, forwardRef } from 'react'
import {
  Div,
  Flex,
  FlexProps,
  Img,
  P,
} from 'honorable'
import PropTypes from 'prop-types'

import CheckRoundedIcon from './icons/CheckRoundedIcon'

type TagProps = FlexProps & {
  label: string
  imageUrl?: string
  checked?: boolean
  icon?: ReactNode
}

const propTypes = {
  label: PropTypes.string.isRequired,
  imageUrl: PropTypes.string,
  checked: PropTypes.bool,
  icon: PropTypes.node,
}

const iconProps = {
  backgroundColor: 'fill-three',
  padding: 2,
  border: '1px solid border-input',
  borderRadius: 'medium',
  width: 24,
  height: 24,
}

function RepositoryChipRef({
  label,
  imageUrl = '',
  checked = false,
  icon = null,
  ...props
}: TagProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      padding="xsmall"
      align="center"
      cursor="pointer"
      borderRadius="large"
      border={`1px solid ${checked ? 'border-outline-focused' : 'border-fill-two'}`}
      backgroundColor="fill-two"
      _hover={{ backgroundColor: 'fill-two-hover' }}
      transition="background-color 200ms ease"
      {...props}
    >
      {icon ? (
        <Flex
          align="center"
          justify="center"
          {...iconProps}
        >
          {icon}
        </Flex>
      ) : imageUrl ? (
        <Img
          src={imageUrl}
          objectPosition="center"
          {...iconProps}
        />
      ) : null}
      <P
        body2
        marginLeft="medium"
      >
        {label}
      </P>
      <Div flexGrow={1} />
      <CheckRoundedIcon
        color="border-outline-focused"
        visibility={checked ? 'visible' : 'hidden'}
        marginLeft="medium"
      />
    </Flex>
  )
}

const RepositoryChip = forwardRef(RepositoryChipRef)

RepositoryChip.propTypes = propTypes

export default RepositoryChip
