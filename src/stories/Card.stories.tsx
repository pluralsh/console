import { Flex } from 'honorable'
import { type ComponentProps } from 'react'

import { useTheme } from 'styled-components'

import { type FillLevel } from '../components/contexts/FillLevelContext'

import { Card } from '../index'
import type { CardProps } from '../components/Card'

export default {
  title: 'Card',
  component: null,
  argTypes: {
    severity: {
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'critical'],
      control: { type: 'select' },
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
  width,
  height,
  severity,
}: { width: number; height: number } & CardProps) {
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
              width={width}
              cornerSize={cornerSize}
              fillLevel={fillLevel}
              severity={severity}
            >
              <Flex
                caption
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
  width,
  severity,
}: { width: number } & CardProps) {
  const theme = useTheme()

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.medium }}>fill-zero</div>
      <Flex
        flexWrap="wrap"
        gap="xxlarge"
      >
        {fillLevels.map((fillLevel) => (
          <Card
            clickable={clickable}
            selected={selected}
            width={width}
            padding="medium"
            fillLevel={fillLevel}
            severity={severity}
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
              severity={severity}
            >
              <Card
                padding="medium"
                severity={severity}
              >
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
  width: 150,
  height: 150,
  severity: 'neutral',
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
  width: 400,
}
