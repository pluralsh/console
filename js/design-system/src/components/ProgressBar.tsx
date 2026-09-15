import styled, { keyframes, useTheme } from 'styled-components'

export type Props = {
  mode?: 'indeterminate' | 'determinate'
  paused?: boolean
  progress?: number
  complete?: boolean
  height?: number
  progressColor?: string
  completeColor?: string
}

const keyframesOuter = keyframes`
0% {
  transform: translateX(-65%);
}

49% {
  transform: translateX(0);
}

98%, 100% {
  transform: translateX(65%);
}
`

const keyframesInner = keyframes`
0%{
 transform: scaleX(0.0);
}
7% {
  transform: scaleX(0.04)
}
49% {
  transform: scaleX(0.5);
}
91% {
  transform: scaleX(0.04);
}
98%, 100% {
  transform: scaleX(0.0);
}
`

type IndeterminateFillProps = {
  complete: boolean
  paused: boolean
}

function resolveThemeColor(theme: ReturnType<typeof useTheme>, value: string) {
  if (value.includes('.')) {
    const [group, shade] = value.split('.')
    const groupColors = (theme.colors as Record<string, unknown>)[group]

    if (groupColors && typeof groupColors === 'object') {
      return (groupColors as Record<string, string>)[shade] ?? value
    }
  }

  const semantic = (theme.colors as Record<string, unknown>)[value]

  return typeof semantic === 'string' ? semantic : value
}

const FillViewportSC = styled.div<{ $complete: boolean }>(({ $complete }) => ({
  opacity: $complete ? 0 : 1,
  transition: 'opacity .05s ease',
}))

const IndeterminateBarSC = styled.div<{ $paused: boolean }>`
  position: absolute;
  width: 100%;
  height: 100%;
  animation-duration: 3s;
  animation-timing-function: cubic-bezier(0.2, 0.55, 0.8, 0.45);
  animation-iteration-count: infinite;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
  animation-name: ${keyframesOuter};

  &::after {
    position: absolute;
    width: 100%;
    height: 100%;
    content: ' ';
    background-color: ${({ theme }) => theme.colors.blue['200']};
    animation-duration: 3s;
    animation-timing-function: cubic-bezier(0.2, 0.55, 0.8, 0.45);
    animation-iteration-count: infinite;
    animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
    animation-name: ${keyframesInner};
  }
`

const CompleteFillSC = styled.div<{ $complete: boolean }>(
  ({ theme, $complete }) => ({
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: $complete ? 1 : 0,
    transform: $complete ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.15s ease-out',
    backgroundColor: theme.colors['border-success'],
  })
)

const DeterminateFillSC = styled.div<{
  $color: string
  $width: string | number
}>(({ $color, $width }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: $color,
  width: $width,
}))

const TrackSC = styled.div<{ $height: number; $trackColor: string }>(
  ({ $height, $trackColor }) => ({
    position: 'relative',
    width: '100%',
    height: $height,
    borderRadius: $height / 2,
    backgroundColor: $trackColor,
    overflow: 'hidden',
  })
)

function IndeterminateFill({ complete, paused }: IndeterminateFillProps) {
  return (
    <>
      <FillViewportSC $complete={complete}>
        <IndeterminateBarSC $paused={paused} />
      </FillViewportSC>
      <CompleteFillSC $complete={complete} />
    </>
  )
}

export default function ProgressBar({
  mode = 'indeterminate',
  complete = false,
  paused = false,
  progress,
  height = 6,
  progressColor = 'blue.200',
  completeColor = 'border-success',
}: Props) {
  const theme = useTheme()
  const trackColor =
    theme.mode === 'light'
      ? theme.colors['border-fill-two']
      : theme.colors['fill-three']
  const pct = Math.min(Math.max(progress ?? 0, 0), 1)
  let fill

  if (mode !== 'determinate') {
    fill = (
      <IndeterminateFill
        complete={complete}
        paused={paused}
      />
    )
  } else {
    fill = (
      <DeterminateFillSC
        $color={resolveThemeColor(
          theme,
          pct >= 1 || complete ? completeColor : progressColor
        )}
        $width={pct > 0 ? `max(${height}px, ${pct * 100}%)` : 0}
      />
    )
  }

  return (
    <TrackSC
      $height={height}
      $trackColor={trackColor}
    >
      {fill}
    </TrackSC>
  )
}
