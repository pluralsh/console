import styled from 'styled-components'

import { MediaWrap } from './MediaWrap'

const YOUTUBE_ID_RE =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
const LOOM_ID_RE =
  /^(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([\da-f]+)/
const VIMEO_ID_RE =
  /^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d+)/

export function getEmbedUrl(url: string): string {
  const youtubeId = url.match(YOUTUBE_ID_RE)?.[1]

  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}`

  const loomId = url.match(LOOM_ID_RE)?.[1]

  if (loomId) return `https://www.loom.com/embed/${loomId}`

  const vimeoId = url.match(VIMEO_ID_RE)?.[1]

  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`

  return url
}

const AspectRatio = styled.div<{ $aspectRatio: string }>(
  ({ theme, $aspectRatio }) => ({
    position: 'relative',
    width: '100%',
    aspectRatio: $aspectRatio,
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.large,
    overflow: 'hidden',
    iframe: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      border: 'none',
    },
  })
)

export function Embed({
  url,
  title,
  aspectRatio = '16 / 9',
}: {
  url?: string
  title?: string
  aspectRatio?: string
}) {
  if (!url) return null

  return (
    <MediaWrap>
      <AspectRatio $aspectRatio={aspectRatio}>
        <iframe
          src={getEmbedUrl(url)}
          title={title || 'Embedded video'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </AspectRatio>
    </MediaWrap>
  )
}
