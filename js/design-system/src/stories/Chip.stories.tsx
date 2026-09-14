import { type ComponentProps } from 'react'

import { Flex, StatusOkIcon, WrapWithIf } from '..'
import Chip from '../components/Chip'
import Card from '../components/Card'

import { SEVERITIES } from '../types'

import { Link } from './NavigationContextStub'
import type { Meta, StoryObj } from '@storybook/react'
import styled, { useTheme } from 'styled-components'

const Heading = styled.h1(({ theme }) => ({
  margin: 0,
  marginBottom: 12,
  ...theme.partials.text.subtitle2,
}))

const meta = {
  title: 'Chip',
  component: Chip,
  argTypes: {
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
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

const sizes = [
  'small',
  'medium',
  'large',
] as const satisfies readonly NonNullable<ComponentProps<typeof Chip>['size']>[]

const severities = SEVERITIES

const versionsArgs = [
  {},
  { loading: true },
  { icon: <StatusOkIcon /> },
  { inactive: true },
]

function Template({ onFillLevel, asLink, ...args }: any) {
  const theme = useTheme()

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
          <Heading>
            {`${size[0].toUpperCase()}${size.slice(1)}`}
          </Heading>
          <div style={{ marginBottom: 32 }}>
            <WrapWithIf
              condition={onFillLevel > 0}
              wrapper={
                <Card
                  fillLevel={onFillLevel}
                  css={{ padding: theme.spacing.small }}
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
          </div>
        </div>
      ))}

      {/* Wrapping */}
      <Heading>
        Wrapping
      </Heading>
      <Flex gap="medium">
        <Card
          css={{ padding: theme.spacing.medium, width: 160 }}
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap="wrap"
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
              severity="danger"
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
          css={{ width: 400, padding: theme.spacing.medium }}
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap="wrap"
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
          css={{ width: 200, padding: theme.spacing.medium }}
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap="wrap"
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
          css={{ width: 120, padding: theme.spacing.medium }}
          fillLevel={onFillLevel}
        >
          <Flex
            gap="xsmall"
            wrap="wrap"
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

export const Default: Story = {
  render: Template,
  args: {
    closeButton: true,
    clickable: true,
    disabled: false,
    asLink: false,
    onFillLevel: 0,
    tooltip: false,
    condensed: false,
  },
}
