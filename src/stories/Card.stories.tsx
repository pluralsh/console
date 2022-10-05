import { Flex } from 'honorable'

import { Card, CardProps } from '../index'

export default {
  title: 'Card',
  component: null,
}

function Template({
  clickable,
  selected,
  width,
  height,
}: { width: number; height: number } & CardProps) {
  return (
    <Flex
      flexWrap="wrap"
      gap="xxlarge"
    >
      <Flex
        flexWrap="wrap"
        gap="xxlarge"
      >
        <Card
          clickable={clickable}
          selected={selected}
          width={width}
        >
          <Flex
            caption
            alignItems="center"
            height={height}
            justifyContent="center"
          >
            cornerSize="large"
            <br />
            hue="default"
          </Flex>
        </Card>
        <Card
          hue="lighter"
          clickable={clickable}
          selected={selected}
          width={width}
        >
          <Flex
            caption
            alignItems="center"
            height={height}
            justifyContent="center"
          >
            cornerSize="large"
            <br />
            hue="lighter"
          </Flex>
        </Card>
        <Card
          hue="lightest"
          clickable={clickable}
          selected={selected}
          width={width}
        >
          <Flex
            caption
            alignItems="center"
            height={height}
            justifyContent="center"
          >
            cornerSize="large"
            <br />
            hue="lightest"
          </Flex>
        </Card>
      </Flex>{' '}
      <Flex
        flexWrap="wrap"
        gap="xxlarge"
      >
        <Card
          cornerSize="medium"
          clickable={clickable}
          selected={selected}
          width={width}
        >
          <Flex
            caption
            alignItems="center"
            height={height}
            justifyContent="center"
          >
            cornerSize="medium"
            <br />
            hue="default"
          </Flex>
        </Card>
        <Card
          hue="lighter"
          cornerSize="medium"
          clickable={clickable}
          selected={selected}
          width={width}
        >
          <Flex
            caption
            alignItems="center"
            height={height}
            justifyContent="center"
          >
            cornerSize="medium"
            <br />
            hue="lighter"
          </Flex>
        </Card>
        <Card
          hue="lightest"
          cornerSize="medium"
          clickable={clickable}
          selected={selected}
          width={width}
        >
          <Flex
            caption
            alignItems="center"
            height={height}
            justifyContent="center"
          >
            cornerSize="medium"
            <br />
            hue="lightest"
          </Flex>
        </Card>
      </Flex>
    </Flex>
  )
}

const hues = [undefined, 'default', 'lighter', 'lightest']

function FillLevelTemplate({
  clickable,
  selected,
  width,
}: { width: number } & CardProps) {
  return (
    <Flex
      flexWrap="wrap"
      gap="xxlarge"
    >
      {hues.map(hue => (
        <Card
          clickable={clickable}
          selected={selected}
          width={width}
          padding="medium"
          hue={hue}
        >
          hue="{hue}"
          <br />
          <br />
          <Card
            clickable={clickable}
            selected={selected}
            padding="medium"
          >
            <Card padding="medium">
              <br />
              Each Card background should be one level lighter than its parent, but
              not exceed fill-three
              <br />
              <br />
            </Card>
          </Card>
        </Card>
      ))}
    </Flex>
  )
}

export const Default = Template.bind({})
Default.args = {
  selected: false,
  clickable: false,
  width: 150,
  height: 150,
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
