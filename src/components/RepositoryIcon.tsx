import { DivProps, Flex, Img } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

type RepositoryIconProps = DivProps & {
  size?: 'small' | 'medium' | 'large' | string
  url?: string
  alt?: string
}

const propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  url: PropTypes.string,
  alt: PropTypes.string,
}

const sizeToWidth: { [key in 'small' | 'medium' | 'large']: number } = {
  small: 64,
  medium: 140,
  large: 160,
}

const sizeToIconWidth: { [key in 'small' | 'medium' | 'large']: number } = {
  small: 32,
  medium: 76,
  large: 96,
}

function RepositoryIconRef({
  size = 'medium',
  url,
  alt,
  ...props
}: RepositoryIconProps, ref: Ref<any>) {
  return (
    <Flex
      backgroundColor="fill-two"
      borderRadius="medium"
      border="1px solid border"
      borderColor="border-fill-two"
      width={sizeToWidth[size]}
      height={sizeToWidth[size]}
      minWidth={sizeToWidth[size]}
      minHeight={sizeToWidth[size]}
      align="center"
      justify="center"
    >
      <Img
        ref={ref}
        src={url}
        alt={alt}
        width={sizeToIconWidth[size]}
        height={sizeToIconWidth[size]}
        {...props}
      />
    </Flex>
  )
}

const RepositoryIcon = forwardRef(RepositoryIconRef)

RepositoryIcon.propTypes = propTypes

export default RepositoryIcon
