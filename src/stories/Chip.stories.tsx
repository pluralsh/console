import { Div, Flex, H1 } from 'honorable'
import { type ComponentProps } from 'react'

import { StatusOkIcon, WrapWithIf } from '..'
import Chip from '../components/Chip'
import Card from '../components/Card'

import { Link } from './NavigationContextStub'

export default {
  title: 'Chip',
  component: Chip,
  argTypes: {
    hue: {
      options: [undefined, 'default', 'lighter', 'lightest'],
      control: {
        type: 'select',
      },
    },
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: '2',
          3: "3 - Shouldn't be used",
        },
      },
    },
  },
}

const sizes: ComponentProps<typeof Chip>['size'][] = [
  'small',
  'medium',
  'large',
]

const severities: ComponentProps<typeof Chip>['severity'][] = [
  'neutral',
  'info',
  'success',
  'warning',
  'error',
  'critical',
]

const versionsArgs = [{}, { loading: true }, { icon: <StatusOkIcon /> }]

function Template({ onFillLevel, asLink, ...args }: any) {
  if (asLink) {
    args = { ...args, as: Link, href: '#' }
  }

  return (
    <>
      {/* Sizes */}
      {/* - Regular */}
      {/* - With loading spinenr */}
      {/* - With icon */}
      {sizes.map((size) => (
        <div>
          <H1
            subtitle2
            marginBottom="small"
          >
            {`${size[0].toUpperCase()}${size.slice(1)}`}
          </H1>
          <Div marginBottom="xlarge">
            <WrapWithIf
              condition={onFillLevel > 0}
              wrapper={
                <Card
                  fillLevel={onFillLevel}
                  padding="small"
                />
              }
            >
              <Flex
                direction="column"
                gap="xlarge"
              >
                {versionsArgs.map((version) => (
                  <Flex
                    align="center"
                    gap="medium"
                  >
                    {severities.map((severity) => (
                      <Chip
                        severity={severity}
                        size={size}
                        {...version}
                        {...args}
                      >
                        {`${severity[0].toUpperCase()}${severity.slice(1)}`}
                      </Chip>
                    ))}
                  </Flex>
                ))}
              </Flex>
            </WrapWithIf>
          </Div>
        </div>
      ))}

      {/* Wrapping */}
      <H1
        subtitle2
        marginBottom="small"
      >
        Wrapping
      </H1>
      <Flex gap="medium">
        <Card
          padding="medium"
          width="160px"
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap
          >
            <Chip
              severity="neutral"
              size="small"
              {...args}
            >
              Physical
            </Chip>
            <Chip
              severity="warning"
              size="small"
              {...args}
            >
              Local
            </Chip>
            <Chip
              severity="error"
              size="small"
              {...args}
            >
              Adjacent Network
            </Chip>
            <Chip
              severity="critical"
              size="small"
              {...args}
            >
              Network
            </Chip>
          </Flex>
        </Card>
        <Card
          width="400px"
          padding="medium"
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap
          >
            <Chip
              size="small"
              {...args}
            >
              dag
            </Chip>
            <Chip
              size="small"
              {...args}
            >
              data-pipelines
            </Chip>
            <Chip
              size="small"
              {...args}
            >
              data
            </Chip>
            <Chip
              size="small"
              {...args}
            >
              11-11-2022
            </Chip>
          </Flex>
        </Card>
        <Card
          width="200px"
          padding="medium"
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap
          >
            <Chip
              size="small"
              {...args}
            >
              data pipelines
            </Chip>
            <Chip
              size="small"
              {...args}
            >
              data
            </Chip>
          </Flex>
        </Card>
        <Card
          width="120px"
          padding="medium"
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap
          >
            <Chip
              size="small"
              {...args}
            >
              data pipelines
            </Chip>
            <Chip
              size="small"
              {...args}
            >
              data
            </Chip>
          </Flex>
        </Card>
      </Flex>
    </>
  )
}

export const Default = Template.bind({})
Default.args = {
  closeButton: false,
  clickable: false,
  asLink: false,
  onFillLevel: 0,
}
