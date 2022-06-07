import { Div, DivProps, Flex } from 'honorable'

import type { ReactNode } from 'react'

import StatusIpIcon from './icons/StatusIpIcon'

import type createIcon from './icons/createIcon'

export type StepBaseProps = {
    stepTitle:ReactNode,
    IconComponent: ReturnType<typeof createIcon>,
    iconSize?: number,
}

type StepProps = DivProps & StepBaseProps & {
  isActive?:boolean,
  isComplete?: boolean,
  circleSize?: number,
}

export type StepperProps = DivProps & {
    stepIndex: number,
    steps: [StepBaseProps]
}

type StepConnectionProps = DivProps & {
  isActive: boolean;
}

function Step({
  isActive = false,
  isComplete = false,
  stepTitle,
  IconComponent,
  circleSize = 48,
  ...props
}: StepProps) {
  const bounceEase = 'cubic-bezier(.37,1.4,.62,1)'
  const shownClassName = 'shown'
  const completeIconStyles = {
    opacity: '0',
    transform: 'scale(0)',
    transition: 'all 0.2s ease',
    [`&.${shownClassName}`]: {
      transform: 'scale(1)',
      opacity: '1',
      transition: `transform 0.3s ${bounceEase}, opacity 0.1s ease`,
      transitionDelay: '0.1s',
    },
  }

  return (
    <Div
      width="100%"
      minWidth="68px"
      maxWidth="100px"
      {...props}
    >
      <Div
        position="relative"
        width={circleSize}
        height={circleSize}
        marginLeft="auto"
        marginRight="auto"
        borderRadius={1000}
        backgroundColor="fill-one"
        border={`1px solid ${isActive ? 'grey.50' : 'grey.800'}`}
        transition="all 0.2s ease"
        transitionDelay="0.1"
      >
        <Flex
          width="100%"
          height="100%"
          position="absolute"
          justifyContent="center"
          alignItems="center"
          className={isComplete ? '' : shownClassName}
          {...completeIconStyles}
        >
          <IconComponent color={isActive ? 'action-link-active' : 'text-xlight'} />
        </Flex>
        <Flex
          width="100%"
          height="100%"
          position="absolute"
          justifyContent="center"
          alignItems="center"
          className={isComplete ? shownClassName : ''}
          {...completeIconStyles}
        >
          <StatusIpIcon
            color="#17E86E"
            size={24}
          />
        </Flex>
      </Div>
      <Div
        body2
        marginTop="small"
        textAlign="center"
        color={isActive ? 'text' : 'text-xlight'}
        transition="all 0.2s ease"
        transitionDelay="0.1"
      >
        {stepTitle}
      </Div>
    </Div>
  )
}

function StepConnection({ isActive = false, ...props }: StepConnectionProps) {
  return (
    <Div
      width="100%"
      flexGrow={1}
      height={1}
      backgroundColor="border"
      position="relative"
      aria-hidden="true"
      {...props}
    >
      <Div
        position="absolute"
        left={0}
        top={0}
        height="100%"
        backgroundColor="text"
        width={isActive ? '100%' : 0}
        transition="width 0.1s ease-out"
      />
    </Div>
  )
}

export default function Stepper({ stepIndex, steps }: StepperProps) {
  const circleSize = 48

  return (
    <Flex
      width="100%"
      justifyContent="space-between"
    >
      {steps.map((step, index) => (
        <>
          <Step
            isActive={stepIndex === index}
            isComplete={stepIndex > index}
            stepTitle={step.stepTitle}
            IconComponent={step.IconComponent}
            iconSize={step.iconSize || 24}
            circleSize={48}
          />
          {index < steps.length - 1 && (
            <StepConnection
              marginTop={circleSize / 2}
              isActive={stepIndex > index}
            />
          )}
        </>
      ))}
    </Flex>
  )
}
