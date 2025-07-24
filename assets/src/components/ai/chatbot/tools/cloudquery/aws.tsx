import {
  Accordion,
  AccordionItem,
  AwsLogoIcon,
  CaretRightIcon,
  Code,
  Flex,
} from '@pluralsh/design-system'
import { ReactElement, useState } from 'react'
import { ARBITRARY_VALUE_NAME } from '../../../../utils/IconExpander.tsx'
import { ProviderObjectType } from '../CloudObjectsCard.tsx'

interface AWS_VPC {
  vpc_id: string
}

function AwsVpcObject({
  vpc,
  json,
}: {
  vpc: AWS_VPC
  json: string
}): ReactElement {
  const [openValue, setOpenValue] = useState('')

  return (
    <div>
      <h3
        css={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <AwsLogoIcon />
        <p>VPC ID: {vpc.vpc_id}</p>
      </h3>
      <Accordion
        type="single"
        value={openValue}
        onValueChange={setOpenValue}
        css={{ border: 'none', background: 'none' }}
      >
        <AccordionItem
          value={ARBITRARY_VALUE_NAME}
          padding="compact"
          caret="none"
          trigger={
            <Flex
              justify="space-between"
              align="center"
              width="100%"
            >
              json
              <Flex
                gap="small"
                align="center"
                wordBreak="break-word"
              >
                <CaretRightIcon
                  color="icon-light"
                  style={{
                    transition: 'transform 0.2s ease-in-out',
                    transform:
                      openValue === ARBITRARY_VALUE_NAME
                        ? 'rotate(90deg)'
                        : 'none',
                  }}
                />
              </Flex>
            </Flex>
          }
        >
          <Code
            language="json"
            showHeader={false}
            css={{ height: '100%', background: 'none' }}
          >
            {json}
          </Code>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function AwsObjects({
  type,
  content,
}: {
  type: ProviderObjectType
  content: string
}): ReactElement | null {
  switch (type) {
    case ProviderObjectType.VPC:
      const objectList: Array<any> = JSON.parse(content)

      return (
        <>
          {objectList.map((vpc) => (
            <AwsVpcObject
              vpc={vpc as AWS_VPC}
              json={JSON.stringify(vpc, null, 1)}
            />
          ))}
        </>
      )
    default:
      return null
  }
}

export { AwsObjects }
