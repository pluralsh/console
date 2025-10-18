import {
  Accordion,
  AccordionItem,
  AppIcon,
  Button,
  CaretRightIcon,
  Chip,
  Flex,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { RawYaml } from 'components/component/ComponentRaw'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { SentinelCheckFragment, SentinelFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { deepOmitFalsy } from 'utils/graphql'
import { getSentinelCheckIcon } from '../SentinelsTableCols'

export function SentinelChecksAccordion({
  sentinel,
  loading,
}: {
  sentinel: Nullable<SentinelFragment>
  loading?: boolean
}) {
  const { borders, colors } = useTheme()
  if (!loading && isEmpty(sentinel?.checks)) return null
  return (
    <Accordion
      type="single"
      style={!sentinel ? { pointerEvents: 'none' } : {}}
    >
      <AccordionItem
        caret="none" // doing a custom one per design
        paddingArea="trigger-only"
        css={{
          '&:hover:not(:has(table:hover))': {
            backgroundColor: colors['fill-one-hover'],
          },
        }}
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
            {!sentinel && loading ? (
              <RectangleSkeleton />
            ) : (
              <Flex
                gap="large"
                align="center"
              >
                <Body2P>Check definitions</Body2P>
                <Chip size="small">{sentinel?.checks?.length ?? 0} checks</Chip>
              </Flex>
            )}
          </Flex>
        }
      >
        <Table
          flush
          hideHeader
          fillLevel={2}
          rowBg="base"
          data={sentinel?.checks ?? []}
          columns={checksTableCols}
          maxHeight={300}
          borderTop={borders['fill-two']}
        />
      </AccordionItem>
    </Accordion>
  )
}

const columnHelper = createColumnHelper<SentinelCheckFragment>()

const checksTableCols = [
  columnHelper.accessor((check) => check, {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const { name, type, ruleFile } = getValue()
      return (
        <StackedText
          first={name}
          firstColor="text"
          firstPartialType="body2Bold"
          second={ruleFile && `Rule file: ${ruleFile}`}
          icon={
            <AppIcon
              size="xxsmall"
              icon={getSentinelCheckIcon(type)}
            />
          }
        />
      )
    },
  }),
  columnHelper.accessor((check) => check, {
    id: 'config',
    cell: function Cell({ getValue }) {
      const check = getValue()
      const [showModal, setShowModal] = useState(false)
      return (
        <>
          <Button
            floating
            small
            onClick={() => setShowModal(true)}
          >
            View config
          </Button>
          <Modal
            open={showModal}
            onClose={() => setShowModal(false)}
            actions={<Button onClick={() => setShowModal(false)}>Close</Button>}
          >
            <RawYaml raw={deepOmitFalsy(check)} />
          </Modal>
        </>
      )
    },
  }),
]
