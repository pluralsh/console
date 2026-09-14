import {
  type ComponentPropsWithRef,
  useLayoutEffect,
  useState,
} from 'react'
import styled from 'styled-components'

import { toInitials } from './AppIcon'
import PersonIcon from './icons/PersonIcon'

type AvatarProps = {
  size?: number
  src?: string
  name?: string
} & Omit<ComponentPropsWithRef<'div'>, 'color'>

function useImageLoad(src?: string) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useLayoutEffect(() => {
    setLoaded(false)
    setError(false)

    if (!src) return

    const img = document.createElement('img')

    img.onload = () => {
      setLoaded(true)
    }
    img.onerror = () => {
      setLoaded(true)
      setError(true)
    }
    img.src = src
  }, [src])

  return [loaded, error] as const
}

function Avatar({
  ref,
  size = 40,
  src,
  name,
  ...props
}: AvatarProps) {
  const [loaded, error] = useImageLoad(src)
  const showImage = !!(src && loaded && !error)

  return (
    <AvatarSC
      ref={ref}
      $size={size}
      {...props}
    >
      {showImage ? (
        <ImageSC
          src={src}
          alt={name || 'Avatar'}
        />
      ) : name ? (
        toInitials(name)
      ) : (
        <PersonIcon
          size={(size * 3) / 5}
          color="icon-always-white"
        />
      )}
    </AvatarSC>
  )
}

const AvatarSC = styled.div<{ $size: number }>(({ theme, $size }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
  userSelect: 'none',
  width: $size,
  height: $size,
  fontWeight: 400,
  lineHeight: 1,
  color: theme.colors['text-always-white'],
  backgroundColor: theme.colors['action-primary'],
  borderRadius: theme.borderRadiuses.medium,
}))

const ImageSC = styled.img({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
})

export default Avatar
export type { AvatarProps }
