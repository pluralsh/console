import * as RadixAccordion from '@radix-ui/react-accordion'
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  type Ref,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import styled, { css, keyframes } from 'styled-components'

import { DropdownArrowIcon } from '../icons'

import Card from './Card'

export type AccordionProps = ComponentProps<typeof RadixAccordion.Root>
type AccordionContextT = {
  type: AccordionProps['type']
  openItems: AccordionProps['value']
  setOpenItems: (openItems: AccordionProps['value']) => void
}

const AccordionContext = createContext<AccordionContextT>(undefined)
const useAccordionContext = () => {
  const ctx = useContext(AccordionContext)

  if (!ctx) throw Error('AccordionContext must be used inside an <Accordion/>')

  return ctx
}

export function useIsItemOpen(itemValue: string) {
  const { openItems } = useAccordionContext()

  if (!openItems) return false

  return typeof openItems === 'string'
    ? openItems === itemValue
    : (openItems as string[]).includes(itemValue)
}

export function useCloseItem(itemValue: string) {
  const { openItems, setOpenItems } = useAccordionContext()

  return useCallback(() => {
    if (typeof openItems === 'string' && openItems === itemValue) {
      setOpenItems('')
    } else {
      setOpenItems((openItems as string[]).filter((v) => v !== itemValue))
    }
  }, [itemValue, openItems, setOpenItems])
}

function AccordionRef(
  {
    children,
    onValueChange: valueChangePropFunc,
    ...props
  }: {
    children?:
      | ReactElement<typeof AccordionItem>
      | ReactElement<typeof AccordionItem>[]
    collapsible?: boolean
  } & AccordionProps,
  ref: Ref<HTMLDivElement>
) {
  const [openItems, setOpenItems] = useState<AccordionProps['value']>(
    props.value
  )

  // for both keeping track of current open items, and still allowing user-specified function
  const onValueChange = useCallback(
    (val: AccordionProps['value']) => {
      setOpenItems(val)
      valueChangePropFunc?.(val as string & string[])
    },
    [valueChangePropFunc]
  )

  const context = useMemo(
    () => ({
      type: props.type,
      openItems,
      setOpenItems,
    }),
    [openItems, props.type]
  )

  return (
    <AccordionContext.Provider value={context}>
      <RadixAccordion.Root
        ref={ref}
        asChild
        collapsible={props.collapsible ?? true}
        value={openItems as string & string[]}
        onValueChange={onValueChange}
        css={{ overflow: 'hidden' }}
        {...props}
      >
        <Card>{children}</Card>
      </RadixAccordion.Root>
    </AccordionContext.Provider>
  )
}

export const Accordion = forwardRef(AccordionRef)
function AccordionItemRef(
  {
    hideDefaultIcon = false,
    trigger,
    children,
    ...props
  }: {
    hideDefaultIcon?: boolean
    trigger: ReactNode
    children: ReactNode
  } & ComponentProps<typeof RadixAccordion.Item>,
  ref: Ref<HTMLDivElement>
) {
  return (
    <ItemSC
      ref={ref}
      {...props}
    >
      <RadixAccordion.Header asChild>
        <TriggerSC>
          {trigger}
          {!hideDefaultIcon && (
            <DropdownArrowIcon
              className="icon"
              size={14}
            />
          )}
        </TriggerSC>
      </RadixAccordion.Header>
      <ContentSC>{children}</ContentSC>
    </ItemSC>
  )
}
export const AccordionItem = forwardRef(AccordionItemRef)

const ItemSC: typeof RadixAccordion.Item = styled(RadixAccordion.Item)((_) => ({
  display: 'flex',
  height: '100%',
  width: '100%',
  '&[data-orientation="vertical"]': {
    flexDirection: 'column',
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: 'row',
  },
}))
const TriggerSC = styled(RadixAccordion.Trigger)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
  // reset default button styles
  background: 'transparent',
  border: 'none',
  padding: 0,
  '.icon': {
    transform: 'scaleY(100%)',
    transition: 'transform 0.3s ease',
  },
  '&:hover': {
    '.icon': {
      transform: 'scale(115%)',
    },
  },
  '&[data-state="open"] .icon': {
    transform: 'scaleY(-100%)',
  },
}))

const slideAnimation = (
  direction: 'in' | 'out',
  orientation: 'height' | 'width'
) => keyframes`
  from {
    ${orientation}: ${
      direction === 'out'
        ? '0'
        : `var(--radix-accordion-content-${orientation})`
    };
  }
  to {
    ${orientation}: ${
      direction === 'out'
        ? `var(--radix-accordion-content-${orientation})`
        : '0'
    };
  }
`
const ContentSC = styled(RadixAccordion.Content)`
  overflow: hidden;
  &[data-state='open'][data-orientation='vertical'] {
    animation: ${css`
        ${slideAnimation('out', 'height')}`} 300ms ease-out;
  }
  &[data-state='closed'][data-orientation='vertical'] {
    animation: ${css`
        ${slideAnimation('in', 'height')}`} 300ms ease-out;
  }
  &[data-state='open'][data-orientation='horizontal'] {
    animation: ${css`
        ${slideAnimation('out', 'width')}`} 300ms ease-out;
  }
  &[data-state='closed'][data-orientation='horizontal'] {
    animation: ${css`
        ${slideAnimation('in', 'width')}`} 300ms ease-out;
  }
`

export default Accordion
