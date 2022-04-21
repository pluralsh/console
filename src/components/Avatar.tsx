import { ComponentType } from 'react'
import { Box, BoxExtendedProps, Text } from 'grommet'
import styled from 'styled-components'
import PropTypes from 'prop-types'

type AvatarProps = BoxExtendedProps & {
  name?: string
  imageUrl?: string
  size?: number
}

const propTypes = {
  name: PropTypes.string,
  imageUrl: PropTypes.string,
  size: PropTypes.number,
}

const Wrapper = styled<ComponentType<AvatarProps>>(Box)`
  min-width: ${({ size }) => size}px;
  width: ${({ size }) => size}px;
  min-height: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: 2px;
  overflow: hidden;
  user-select: none;
`

const Img = styled.img`
  width: 100%;
  height: 100%;
`

function extractInitials(name: string) {
  const words = name.split(' ')

  // Pick the first and last initials if any
  return words.map(word => word[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase()
}

function Avatar({ name = '', imageUrl = '', size = 44, ...props }: AvatarProps) {
  function renderName() {
    return (
      <Text weight="bold">
        {extractInitials(name || '?')}
      </Text>
    )
  }

  function renderImage() {
    return (
      <Img
        src={imageUrl}
        alt={name}
      />
    )
  }

  return (
    <Wrapper
      size={size}
      background={imageUrl ? 'transparent' : 'accent-blue'}
      justify="center"
      align="center"
      flex={{ shrink: 0 }}
      {...props}
    >
      {imageUrl ? renderImage() : renderName()}
    </Wrapper>
  )
}

Avatar.propTypes = propTypes

export default Avatar
