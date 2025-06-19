import { type ComponentProps, type ReactNode } from 'react'

import { useTheme } from 'styled-components'

import { type FillLevel } from '../components/contexts/FillLevelContext'

import type { CardProps } from '../components/Card'
import { Card, Flex, InfoOutlineIcon, Tooltip } from '../index'

export default {
  title: 'Card',
  component: null,
  argTypes: {
    headerSize: {
      options: ['medium', 'large'],
      control: { type: 'select' },
    },
    headerContent: {
      control: { type: 'text' },
    },
  },
}

const fillLevels: (FillLevel | undefined)[] = [undefined, 1, 2, 3]
const cornerSizes: ComponentProps<typeof Card>['cornerSize'][] = [
  'medium',
  'large',
]

function Template({
  clickable,
  selected,
  disabled,
  width,
  height,
  headerSize,
  headerContent,
}: {
  width: number
  height: number
  headerSize: ComponentProps<typeof Card>['header']['size']
  headerContent: ReactNode
} & CardProps) {
  return (
    <Flex
      flexWrap="wrap"
      gap="xxlarge"
    >
      {cornerSizes.map((cornerSize) => (
        <Flex
          flexWrap="wrap"
          gap="xxlarge"
        >
          {fillLevels.map((fillLevel) => (
            <Card
              clickable={clickable}
              selected={selected}
              disabled={disabled}
              width={width}
              cornerSize={cornerSize}
              fillLevel={fillLevel}
              header={{
                size: headerSize,
                content: headerContent,
                outerProps: { style: { width: width } },
              }}
            >
              <Flex
                alignItems="center"
                height={height}
                justifyContent="center"
              >
                cornerSize="{cornerSize}"
                <br />
                fillLevel=
                {fillLevel === undefined ? 'undefined' : `"${fillLevel}"`}
              </Flex>
            </Card>
          ))}
        </Flex>
      ))}
    </Flex>
  )
}

function FillLevelTemplate({
  clickable,
  selected,
  disabled,
  width,
  headerContent,
}: { width: number; headerContent: ReactNode } & CardProps) {
  const theme = useTheme()

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.medium }}>fill-zero</div>
      <Flex
        flexWrap="wrap"
        gap="xxlarge"
      >
        {fillLevels.map((fillLevel, index) => (
          <Card
            key={index}
            clickable={clickable}
            selected={selected}
            disabled={disabled}
            width={width}
            padding="medium"
            fillLevel={fillLevel}
            header={{
              content: headerContent,
            }}
          >
            fillLevel=
            {fillLevel === undefined ? 'undefined' : `"${fillLevel}"`}
            {!fillLevel && ` (1-3 determined by context)`}
            <br />
            <br />
            <Card
              clickable={clickable}
              selected={selected}
              padding="medium"
            >
              <Card padding="medium">
                <br />
                Each Card background should be one level lighter than its
                parent, but not exceed fill-three
                <br />
                <br />
              </Card>
            </Card>
          </Card>
        ))}
      </Flex>
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {
  selected: false,
  clickable: false,
  disabled: false,
  width: 150,
  height: 150,
  headerSize: 'medium',
  headerContent: (
    <Flex
      justifyContent="space-between"
      align="center"
      width="100%"
    >
      <p>Header</p>
      <Tooltip label="Tooltip">
        <InfoOutlineIcon />
      </Tooltip>
    </Flex>
  ),
}

export const Clickable = Template.bind({})
Clickable.args = {
  ...Default.args,
  ...{
    clickable: true,
  },
}

export const WithFillLevelContext = FillLevelTemplate.bind({})
WithFillLevelContext.args = {
  selected: false,
  clickable: false,
  disabled: false,
  width: 400,
  headerSize: 'medium',
  headerContent: (
    <Flex
      justifyContent="space-between"
      align="center"
      width="100%"
    >
      <p>Header</p>
      <Tooltip label="Tooltip">
        <InfoOutlineIcon />
      </Tooltip>
    </Flex>
  ),
}
