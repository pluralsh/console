import {
  Accordion,
  AccordionItem,
  SuccessIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { ReactNode, useEffect, useEffectEvent, useRef } from 'react'
import { UpgradeAccordionName } from './ClusterUpgradePlan'

export function ClusterUpgradePlanAccordion({
  defaultValue,
  name,
  checked,
  title,
  subtitle,
  children,
}: {
  defaultValue: string
  name: UpgradeAccordionName
  checked: boolean
  title: string
  subtitle: string
  children: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollOnMount = useEffectEvent((domNode: HTMLDivElement | null) => {
    if (defaultValue === name && domNode)
      domNode.scrollIntoView({ behavior: 'smooth' })
  })
  useEffect(() => scrollOnMount(scrollRef.current), [])

  return (
    <Accordion
      ref={scrollRef}
      defaultValue={defaultValue}
      type="single"
      fillLevel={1}
    >
      <AccordionItem
        value={name}
        paddedCaret
        caret="left"
        paddingArea="trigger-only"
        trigger={
          <StretchedFlex>
            <StackedText
              first={title}
              firstPartialType="body1Bold"
              firstColor="text"
              second={subtitle}
              secondPartialType="body2"
              secondColor="text-light"
            />
            {checked ? (
              <SuccessIcon
                size="18"
                color="icon-success"
              />
            ) : (
              <WarningIcon
                size="18"
                color="icon-warning"
              />
            )}
          </StretchedFlex>
        }
      >
        {children}
      </AccordionItem>
    </Accordion>
  )
}
