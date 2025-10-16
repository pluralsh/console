import {
  Accordion,
  AccordionItem,
  CaretRightIcon,
  Chip,
  Flex,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P } from 'components/utils/typography/Text'
import { SentinelFragment } from 'generated/graphql'

export function SentinelChecksAccordion({
  sentinel,
}: {
  sentinel: Nullable<SentinelFragment>
}) {
  return (
    <Accordion
      type="single"
      style={!sentinel ? { pointerEvents: 'none' } : {}}
    >
      <AccordionItem
        caret="none" // doing a custom one per design
        trigger={
          <Flex
            gap="small"
            align="center"
          >
            <CaretRightIcon
              css={{
                transition: 'rotate 0.2s ease-in-out, scale 0.2s ease-in-out',
                '*:hover > * > &': { scale: '1.1' },
                '*[data-state="open"] &': { rotate: '90deg' },
              }}
            />
            {!sentinel ? (
              <RectangleSkeleton />
            ) : (
              <Flex
                gap="large"
                align="center"
              >
                <Body2P>Check definitions</Body2P>
                <Chip size="small">{sentinel.checks?.length || 0} checks</Chip>
              </Flex>
            )}
          </Flex>
        }
      >
        table goes here
      </AccordionItem>
    </Accordion>
  )
}
