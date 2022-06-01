import { A, Button, ButtonProps, Div, DivProps, Flex, P, PProps } from 'honorable'
import { Children, useEffect, useState } from 'react'
import { CSSTransition } from 'react-transition-group'

export type Props = {
  mode?: 'indeterminate' | 'determinate',
  paused?: boolean,
  progress?: number, 
  complete?: boolean,
}

function Dot({ active = false, ...props }: { active?: boolean } & DivProps) {
  return (
    <Div
      padding="4px"
      cursor="pointer"
      {...props}
    >
      <Div
        backgroundColor={active ? 'action-link-inline' : 'fill-two'}
        width="8px"
        height="8px"
        borderRadius="4px"
      />
    </Div>
  )
}

export function TextCarousel({ children, ...props }:DivProps) {
  return (
    <Carousel {...props}>
      {Children.map(children, (child: any) => (
        <Div
          pt="16px"
          pb="16px"
          mb="-8px"
          px="16px"
        >
          <P
            body2
            color="text-light"
            fontStyle="italic"
            {...props}
          >{child}
          </P>
        </Div>
      )
      )}
    </Carousel>
  )
}

function FlexItem(props: DivProps) {
  return (
    <Flex
      width="100%"
      flexShrink="0"
      textAlign="center"
      alignItems="stretch"
      {...props}
    />
  )
}

const transitionProps = {
  opacity: '0',
  visibility: 'hidden',
  '&.appear, &.appear-active, &.appear-done': {
    opacity: '1',
    transform: 'translateY(0)',
    visibility: 'visible',
  },
  '&.enter': {
    visibility: 'visible',
    transform: 'scale(1.2, 1.2)',
    filter: 'blur(10px)',
  },
  '&.enter-active': {
    transition: 'all 1.2s ease',
    transitionDelay: '0.3s',
    filter: 'blur(0)',
  },
  '&.enter-active,&.enter-done': {
    visibility: 'visible',
    transform: 'scale(1, 1)',
    opacity: '1',
  },
  '&.exit': {
    transform: 'translateY(0)',
    opacity: 1,
    visibility: 'visible',
  },
  '&.exit-active': {
    transition: 'all 1.2s ease',
  },
  '&.exit-active, &.exit-done': {
    transform: ' scale(0.75, 0.75)',
    opacity: '0',
    filter: 'blur(5px)',
  },
  '&.exit-done': {
    visibility: 'hidden',
  },
}

export default function Carousel({ autoAdvanceTime = 10000, children, ...props }: {autoAdvanceTime?:number} & DivProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    if (autoAdvanceTime > 0) {
      const timer = setTimeout(() => {
        if (activeIndex >= Children.count(children) - 1) {
          setActiveIndex(0)
        }
        else {
          setActiveIndex(activeIndex + 1)
        }
      }, autoAdvanceTime)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [activeIndex, autoAdvanceTime, children])

  return (
    <Div
      {...props}
      backgroundColor="fill-one"
      border="1px solid border"
      borderRadius="normal"
    >
      <Flex
        overflow="hidden"
        alignItems="stretch"
      >
        {Children.map(children, (child: any, i: any) => (
          <FlexItem
            transform={`translateX(${-i * 100}%)`}
            pointerEvents={activeIndex === i ? 'auto' : 'none'}
          >
            <CSSTransition
              in={activeIndex === i}
              appear
              timeout={2000}
            >
              <Flex 
                className="stretched"
                alignItems="center"
                {...transitionProps}
              >
                {child}
              </Flex>
            </CSSTransition>
          </FlexItem>
        )
        )}
      </Flex>
      <Flex
        mt="8px"
        mb="16px"
        justifyContent="center"
      >
        {Children.map(children, (child: any, i: any) => (
          <Dot
            active={activeIndex === i}
            onClick={() => {
              setActiveIndex(i)
            }}
          />
        ))}
      </Flex>
    </Div>
  )
}
