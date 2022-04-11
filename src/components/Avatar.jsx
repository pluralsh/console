import PropTypes from 'prop-types'
import { Box, Text } from 'grommet'
import styled from 'styled-components'

const Wrapper = styled(Box)`
  min-width: 44px;
  width: 44px;
  min-height: 44px;
  height: 44px;
  border-radius: 2px;
  overflow: hidden;
  user-select: none;
`

const Img = styled.img`
  width: 100%;
  height: 100%;
`

function extractInitials(name) {
  const words = name.split(' ')

  // Pick the first and last initials if any
  return words.map(word => word[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase()
}

function Avatar({ name, imageUrl, ...props }) {
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

Avatar.propTypes = {
  name: PropTypes.string,
  imageUrl: PropTypes.string,
}

Avatar.defaultProps = {
  name: '',
  imageUrl: '',
}

export default Avatar
