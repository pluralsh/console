import {
  Accordion,
  AccordionItem,
  CaretRightIcon,
  Code,
  Flex,
} from '@pluralsh/design-system'
import { ReactElement, useState } from 'react'
import { useTheme } from 'styled-components'
import { ClusterDistro } from '../../../../../generated/graphql.ts'
import { DistroProviderIconFrame } from '../../../../utils/ClusterDistro.tsx'
import CopyButton from '../../../../utils/CopyButton.tsx'
import { ARBITRARY_VALUE_NAME } from '../../../../utils/IconExpander.tsx'
import { TRUNCATE } from '../../../../utils/truncate.ts'

interface CloudObjectProps {
  type: string
  id: string
  json?: string
  icon?: ReactElement
}

export default function CloudObject({
  type,
  id,
  icon = (
    <DistroProviderIconFrame
      distro={ClusterDistro.Eks}
      css={{ width: 24, height: 24 }}
    />
  ),
  json,
}: CloudObjectProps): ReactElement {
  const [openValue, setOpenValue] = useState('')
  const theme = useTheme()

  return (
    <Accordion
      type="single"
      value={openValue}
      onValueChange={setOpenValue}
      css={{ border: 'none', background: 'none' }}
    >
      <AccordionItem
        value={ARBITRARY_VALUE_NAME}
        padding="none"
        caret="none"
        css={{
          gap: theme.spacing.medium,
        }}
        trigger={
          <Flex
            justify="space-between"
            align="center"
            width="100%"
          >
            <div
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xsmall,
                minWidth: 0,
              }}
            >
              {icon}
              <span
                css={{
                  ...theme.partials.text['body2'],
                  ...TRUNCATE,
                }}
              >
                {type} [{id}]
              </span>
              <CopyButton
                text={json}
                tooltip={`Copy ${type} JSON`}
                type="tertiary"
              />
            </div>
            <CaretRightIcon
              color="icon-light"
              style={{
                transition: 'transform 0.2s ease-in-out',
                transform:
                  openValue === ARBITRARY_VALUE_NAME ? 'rotate(90deg)' : 'none',
              }}
            />
          </Flex>
        }
      >
        <Code
          language="json"
          showHeader={false}
          css={{ height: '100%', background: theme.colors['fill-two'] }}
        >
          {json}
        </Code>
      </AccordionItem>
    </Accordion>
  )
}
