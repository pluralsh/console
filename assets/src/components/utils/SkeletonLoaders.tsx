import {
  SemanticSpacingKey,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import styled, {
  CSSObject,
  CSSProperties,
  keyframes,
  useTheme,
} from 'styled-components'
import { CSSPseudos } from 'styled-components/dist/types'

const shimmerKeyframes = keyframes`
  0% {
    stop-color: #2D3037;
  }
  50% {
    stop-color: #393C44;
  }
  100% {
    stop-color: #2D3037;
  }
`
const LinearGradient = styled.linearGradient`
  stop {
    animation: ${shimmerKeyframes} 1.5s linear infinite;
  }
`

// pretty much deprecated in favor of "loading" prop on tables
export function TableSkeleton({
  width = 870,
  height = 312,
  numRows = 8,
  numColumns = 2,
  centered = false,
  styles,
}: {
  width?: number
  height?: number
  numRows?: number
  numColumns?: number
  centered?: boolean
  styles?: CSSProperties | CSSPseudos | CSSObject
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        overflow: 'hidden',
        ...(centered
          ? {
              display: 'flex',
              alignSelf: 'center',
              justifyContent: 'center',
              width: '100%',
            }
          : {}),
        ...styles,
      }}
    >
      <svg
        width={width + theme.spacing.large * numColumns}
        height={height}
        viewBox={`0 0 ${width + theme.spacing.large * (numColumns - 1)} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: numRows * numColumns }, (_, i) => (
          <rect
            key={i}
            x={(i % numColumns) * (width / numColumns + theme.spacing.large)}
            y={Math.floor(i / numColumns) * 60}
            width={width / numColumns}
            height="12"
            rx="4"
            fill={`url(#paint${i}_linear)`}
          />
        ))}
        <defs>
          {Array.from({ length: numRows * numColumns }, (_, i) => (
            <LinearGradient
              key={i}
              id={`paint${i}_linear`}
              x1={(i % numColumns) * (width / numColumns)}
              y1={Math.floor(i / numColumns) * 60 + 6}
              x2={((i % numColumns) + 1) * (width / numColumns)}
              y2={Math.floor(i / numColumns) * 60 + 6}
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                stopColor="#2D3037"
              />
              <stop
                offset="100%"
                stopColor="#393C44"
              />
            </LinearGradient>
          ))}
        </defs>
      </svg>
    </div>
  )
}

export function ChartSkeleton({ scale = 1 }: { scale?: number }) {
  return (
    <svg
      width={`${276 * scale}`}
      height={`${276 * scale}`}
      viewBox="0 0 276 276"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 138C0 61.7847 61.7848 0 138 0C214.215 0 276 61.7847 276 138C276 214.215 214.215 276 138 276C61.7847 276 0 214.215 0 138ZM253.202 138C253.202 74.3755 201.625 22.7976 138 22.7976C74.3755 22.7976 22.7976 74.3755 22.7976 138C22.7976 201.625 74.3755 253.202 138 253.202C201.625 253.202 253.202 201.625 253.202 138Z"
        fill="url(#paint1)"
      />
      <rect
        x="106"
        y="132"
        width="65"
        height="12"
        rx="4"
        fill="url(#paint2)"
      />
      <defs>
        <LinearGradient
          id="paint1"
          x1="276"
          y1="138"
          x2="0"
          y2="138"
        >
          <stop
            offset="0%"
            stopColor="#2D3037"
          />
          <stop
            offset="100%"
            stopColor="#393C44"
          />
        </LinearGradient>
        <LinearGradient
          id="paint2"
          x1="106"
          y1="138"
          x2="171"
          y2="138"
        >
          <stop
            offset="0%"
            stopColor="#2D3037"
          />
          <stop
            offset="100%"
            stopColor="#393C44"
          />
        </LinearGradient>
      </defs>
    </svg>
  )
}

export const RectangleSkeleton = styled.div<{
  $height?: SemanticSpacingKey
  $width?: CSSProperties['width']
}>(({ theme, $height = 'small', $width }) => ({
  '@keyframes moving-gradient': {
    '0%': { backgroundPosition: '-250px 0' },
    '100%': { backgroundPosition: '250px 0' },
  },
  width: $width ?? '100%',
  position: 'relative',
  '&::after': {
    content: '""',
    borderRadius: theme.borderRadiuses.medium,
    width: $width ?? '150px',
    display: 'block',
    height: theme.spacing[$height],
    background: `linear-gradient(to right, ${theme.colors.border} 20%, ${theme.colors['border-fill-two']} 50%, ${theme.colors.border} 80%)`,
    backgroundSize: '500px 100px',
    animation: 'moving-gradient 2s infinite linear forwards',
  },
}))

export function SidecarSkeleton({ num = 6 }: { num?: number }) {
  const { spacing } = useTheme()
  return (
    <Sidecar>
      {Array.from({ length: num }).map((_, index) => (
        <SidecarItem
          css={{ '& > *': { lineHeight: '30px' } }}
          key={index}
          heading={
            <RectangleSkeleton
              css={{ marginBottom: spacing.xsmall }}
              $height="xsmall"
              $width="40%"
            />
          }
        >
          <RectangleSkeleton />
        </SidecarItem>
      ))}
    </Sidecar>
  )
}

export function ChatSkeleton({ numMessages = 5 }: { numMessages?: number }) {
  const { spacing } = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.large,
        padding: spacing.medium,
      }}
    >
      {Array.from({ length: numMessages }).map((_, index) => {
        const isUserMessage = index % 5 === 0

        return (
          <div
            key={index}
            css={{
              display: 'flex',
              width: '100%',
              justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
            }}
          >
            <RectangleSkeleton
              $height="large"
              $width="60%"
              css={{
                display: 'flex',
                justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
