import styled from 'styled-components'

export const EmbedAspectRatio = styled.div<{ $aspectRatio: string | number }>(
  ({ $aspectRatio }) => ({
    ...($aspectRatio
      ? {
          position: 'relative',
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
  })
)
