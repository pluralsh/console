import { Div, Img, P } from 'honorable'
import PropTypes from 'prop-types'

type AvatarProps = typeof Div & {
  name?: string
  imageUrl?: string
  size?: number
}

const propTypes = {
  name: PropTypes.string,
  imageUrl: PropTypes.string,
  size: PropTypes.number,
}

function extractInitials(name: string) {
  const words = name.split(' ')

  // Pick the first and last initials if any
  return words.map(word => word[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase()
}

function Avatar({ name = '', imageUrl = '', size = 44, ...props }: AvatarProps) {
  function renderName() {
    return (
      <P fontWeight="bold">
        {extractInitials(name || '?')}
      </P>
    )
  }

  function renderImage() {
    return (
      <Img
        width="100%"
        height="100%"
        src={imageUrl}
        alt={name}
      />
    )
  }

  return (
    <Div
      backgroundColor={imageUrl ? 'transparent' : 'accent-blue'}
      xflex="x5"
      flexShrink={0}
      width={size}
      height={size}
      borderRadius={4}
      overflow="hidden"
      userSelect="none"
      {...props}
    >
      {imageUrl ? renderImage() : renderName()}
    </Div>
  )
}

Avatar.propTypes = propTypes

export default Avatar
