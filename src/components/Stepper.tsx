import { Div, DivProps, Flex } from 'honorable'

import type { ReactNode } from 'react'

import StatusIpIcon from './icons/StatusIpIcon'

import type createIcon from './icons/createIcon'

type StepProps = DivProps & {
  isActive:boolean,
  isComplete:boolean,
  stepTitle:ReactNode,
  renderIcon: (color:string) => ReactNode,
}

type StepperProps = DivProps & {
    stepIndex: number,
    steps: [{
        stepTitle: ReactNode
        icon: ReturnType<typeof createIcon>,
        iconSize: number,
    }]
}

function Step({ isActive = false, isComplete = false, stepTitle, renderIcon, ...props }:StepProps) {
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
        width="48px"
        height="48px"
        marginLeft="auto"
        marginRight="auto"
        borderRadius="1000px"
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
          {renderIcon(isActive ? 'action-link-active' : 'text-xlight')}
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
        mt="12px"
        textAlign="center"
        fontSize="14px"
        lineHeight="20px"
        color={isActive ? 'text' : 'text-xlight'}
        transition="all 0.2s ease"
        transitionDelay="0.1"
      >{stepTitle}
      </Div>
    </Div>
  )
}
  
function StepConnection({ isActive = false }) {
  return (
    <Div
      width="100%"
      flexGrow="1"
      height="1px"
      marginTop="24px"
      backgroundColor="border"
      position="relative"
      aria-hidden="true"
    >
      <Div
        position="absolute"
        left="0"
        top="0"
        height="100%"
        backgroundColor="text"
        width={isActive ? '100%' : '0'}
        transition="width 0.1s ease-out"
      />
    </Div>
  )
}
  
export default function Stepper({ stepIndex, steps }:StepperProps) {
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
            renderIcon={(color:string) => (
              <step.icon
                size={step.iconSize || 24}
                color={color}
              />
            )}
          />
          {index < steps.length - 1 && <StepConnection isActive={stepIndex > index} />}
        </>
      ))}
    </Flex>
  )
}
  
