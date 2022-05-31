import { Div, DivProps } from 'honorable'

import { keyframes } from '@emotion/react'

export type Props = DivProps & {
  mode?: 'indeterminate',
  paused?: boolean,
  progress?: number
}

function ProgressFill({ anim, animDur, fillWidth, ease = 'linear', ...props }: {anim:any, animDur:number} & DivProps) {
  return (
    <Div
      animation={`${anim} ${animDur}s ${ease} infinite`}
      position="absolute"
      width="100%"
      height="100%"
      transform={`translateX(${-(50 + (fillWidth * 0.5))}%)`}
      {...{
        '&:after': {
          content: '" "',
          position: 'absolute',
          backgroundColor: 'blue.200',
          left: '0',
          top: '0',
          bottom: '0',
          right: '0',
          transform: `scaleX(${fillWidth}%)`,
        },
      }}
      {...props}
    />
  )

}

export function ProgressBar1(props: Props) {
  const fillWidth = 50
  const animDur = 3
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  ${100 - (fillWidth * 0.5)}%, 100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`

  return (
    <Div
      position="relative"
      width="100%"
      height="6px"
      borderRadius="6px"
      backgroundColor="fill-two-selected"
      overflow="hidden"
      {...props}
    >
      <ProgressFill
        fillWidth={fillWidth}
        anim={anim}
        animDur={animDur}
      />
      <ProgressFill
        fillWidth={fillWidth}
        anim={anim}
        animDur={animDur}
        animationDelay={`${animDur / 2}s`}
      />
    </Div>
  )
}

export function ProgressBar2({ ...props }: Props) {
  const fillWidth = 80
  const animDur = 2
  const ease = 'cubic-bezier(.52,-0.01,.74,.99)'
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`

  return (
    <Div
      position="relative"
      width="100%"
      height="6px"
      borderRadius="6px"
      backgroundColor="fill-two-selected"
      overflow="hidden"
      {...props}
    >
      <ProgressFill
        fillWidth={fillWidth}
        anim={anim}
        animDur={animDur}
        ease={ease}
      />

    </Div>
  )
}

export function ProgressBar3({ ...props }: Props) {
  const fillWidth = 50
  const animDur = 3
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  ${100 - (fillWidth * 0.5)}%, 100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`

  return (
    <Div
      position="relative"
      width="100%"
      height="6px"
      borderRadius="6px"
      backgroundColor="fill-two-selected"
      overflow="hidden"
      {...props}
    >
      <ProgressFill
        fillWidth={fillWidth}
        anim={anim}
        animDur={animDur}
      />

    </Div>
  )
}

