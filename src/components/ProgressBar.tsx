import { Div, DivProps } from 'honorable'

import { keyframes } from '@emotion/react'

export type Props = {
  mode?: 'indeterminate' | 'determinate',
  paused?: boolean,
  progress?: number, 
  complete?: boolean,
}

function ProgressFill({ fillWidth, fillColor = 'blue.200', ...props }: { fillWidth:number } & DivProps) {
  return (
    <Div
      position="absolute"
      width="100%"
      height="100%"
      animationIterationCount="infinite"
      transform={props.animationName && `translateX(${-(50 + (fillWidth * 0.5))}%)`}
      transition="all 2s ease"
      _after={{
        content: '" "',
        position: 'absolute',
        backgroundColor: fillColor,
        left: '0',
        top: '0',
        bottom: '0',
        right: '0',
        transform: `scaleX(${fillWidth}%)`,
        transition: 'all 0.25s ease',
      }}
      {...props}
    />
  )

}

export function ProgressBar1({ mode = 'indeterminate', complete = false, paused = false, progress, ...props }: Props) {
  const fillWidth = 50
  const animDur = 3
  const timingFunction = 'linear'
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  ${100 - (fillWidth * 0.5)}%, 100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`
  const animationProps:DivProps = {
    animationName: anim,
    animationDuration: `${animDur}s`,
    animationTimingFunction: timingFunction,
  }
  if (paused) {
    animationProps.animationPlayState = 'paused'
  }

  return (
    <Div
      position="relative"
      width="100%"
      height="6px"
      borderRadius="6px"
      backgroundColor="fill-two-selected"
      overflow="hidden"
      {...props}
    >{mode !== 'determinate' ? (
        <>
        <Div
            opacity={complete ? '0' : 1}
            transition="opacity .05s ease"
          >
            <ProgressFill
            fillWidth={fillWidth}
            {...animationProps}
          />
            <ProgressFill
            fillWidth={fillWidth}
            {...animationProps}
            animationDelay={`${animDur / 2}s`}
          />
          </Div>
        <ProgressFill
            opacity={complete ? '1' : '0'}
            fillWidth={100}
            transform={complete ? 'translateX(0)' : 'translateX(-100%)'}
            transition="transform 0.15s ease-out"
            fillColor="border-success"
          />
      </>
      ) : (
        <Div
          position="absolute"
          left="0"
          top="0"
          bottom="0"
          backgroundColor={progress >= 1 || complete ? 'border-success' : 'blue.200'}
          right={`${(1 - progress) * 100}%`}
        />
      )}
    </Div>
  )
}

export function ProgressBar2({ complete = false, paused = false, ...props }: Props) {
  const fillWidth = 50
  const animDur = 1.75
  const timingFunction = 'cubic-bezier(.52,-0.01,.74,.99)'
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`
  
  const animationProps:DivProps = {
    animationName: anim,
    animationDuration: `${animDur}s`,
    animationTimingFunction: timingFunction,
  }
  if (paused) {
    animationProps.animationPlayState = 'paused'
  }

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
      <Div
        opacity={complete ? '0' : 1}
        transition="opacity .05s ease"
      >
        <ProgressFill
          fillWidth={fillWidth}
          {...animationProps}
        />
      </Div>
      <ProgressFill
        opacity={complete ? '1' : '0'}
        fillWidth={100}
        transform={complete ? 'translateX(0)' : 'translateX(-100%)'}
        transition="transform 0.15s ease-out"
        fillColor="border-success"
      />
    </Div>
  )
}

export function ProgressBar3({ complete = false, paused = false, ...props }: Props) {
  const fillWidth = 50
  const animDur = 5
  const timingFunction = 'ease-in-out'
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  65%, 100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`
  
  const animationProps:DivProps = {
    animationName: anim,
    animationDuration: `${animDur}s`,
    animationTimingFunction: timingFunction,
  }
  if (paused) {
    animationProps.animationPlayState = 'paused'
  }

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
      <Div
        opacity={complete ? '0' : 1}
        transition="opacity .05s ease"
      >
        <ProgressFill
          fillWidth={fillWidth}
          {...animationProps}
        />
        <ProgressFill
          fillWidth={fillWidth}
          {...animationProps}
          animationDelay={`${animDur * 0.333333}s`}
        />
        <ProgressFill
          fillWidth={fillWidth}
          {...animationProps}
          animationDelay={`${animDur * 0.666666}s`}
        />
      </Div>
      <ProgressFill
        opacity={complete ? '1' : '0'}
        fillWidth={100}
        transform={complete ? 'translateX(0)' : 'translateX(-100%)'}
        transition="transform 0.15s ease-out"
        fillColor="border-success"
      />
    </Div>
  )
}

export function ProgressBar4({ complete = false, paused = false, ...props }: Props) {
  const fillWidth = 100
  const animDur = 1.75
  const timingFunction = 'cubic-bezier(.52,-0.01,.74,.99)'
  const anim = keyframes`
  0% {
    transform: translateX(${-(50 + (fillWidth * 0.5))}%);
  }

  100% {
    transform: translateX(${(50 + (fillWidth * 0.5))}%);
  }
`
  
  const animationProps:DivProps = {
    animationName: anim,
    animationDuration: `${animDur}s`,
    animationTimingFunction: timingFunction,
  }
  if (paused) {
    animationProps.animationPlayState = 'paused'
  }

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
      <Div
        opacity={complete ? '0' : 1}
        transition="opacity .05s ease"
      >
        <ProgressFill
          fillWidth={fillWidth}
          {...animationProps}
        />
      </Div>
      <ProgressFill
        opacity={complete ? '1' : '0'}
        fillWidth={100}
        transform={complete ? 'translateX(0)' : 'translateX(-100%)'}
        transition="transform 0.15s ease-out"
        fillColor="border-success"
      />
    </Div>
  )
}
