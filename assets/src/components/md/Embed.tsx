import { useEffect, useMemo, useState } from 'react'

import * as loom from '@loomhq/loom-embed'
import ReactEmbed from 'react-embed'
import styled from 'styled-components'

import { MediaWrap } from './MediaWrap'

const AspectRatio = styled.div<{ $aspectRatio: string }>(({ $aspectRatio }) => ({
  ...($aspectRatio
    ? {
      position: 'relative',
      '.lo-emb-vid[style]': {
        position: 'static !important',
        padding: '0 !important',
        height: 'unset !important',
      } as any,
      '&::before': {
        content: '""',
        width: '1px',
        marginLeft: '-1px',
        float: 'left',
        height: 0,
        paddingTop: `calc(100% / (${$aspectRatio}))`,
      },
      '&::after': {
        content: '""',
        display: 'table',
        clear: 'both',
      },
      iframe: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      },
    }
    : {}),
}))

function Embed({
  url,
  aspectRatio = '16 / 9',
  ...props
}: {
  url: string
  aspectRatio: string
}) {
  const [loomEmbed, setLoomEmbed] = useState('')
  const isLoomUrl = useMemo(() => !!url.match(/^https{0,1}:\/\/(www.){0,1}loom\.com/g),
    [url])

  useEffect(() => {
    if (isLoomUrl) {
      let isSubscribed = true

      loom.textReplace(url).then(result => {
        if (isSubscribed) setLoomEmbed(result)
      })

      return () => {
        isSubscribed = false
      }
    }
  }, [isLoomUrl, url])

  let content

  if (isLoomUrl) {
    content = (
      <AspectRatio
        $aspectRatio={aspectRatio}
        {...props}
        dangerouslySetInnerHTML={{ __html: loomEmbed }}
      />
    )
  }
  else {
    content = (
      <AspectRatio
        $aspectRatio={aspectRatio}
        {...props}
      >
        <ReactEmbed
          url={url}
          {...props}
          isDark
        />
      </AspectRatio>
    )
  }

  return <MediaWrap>{content}</MediaWrap>
}

export default Embed
