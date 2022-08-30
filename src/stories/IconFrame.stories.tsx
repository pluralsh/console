import {
  Div, Flex, H1, Text,
} from 'honorable'

import {
  Card, IconFrame, IconFrameProps, TrashCanIcon,
} from '../index'

export default {
  title: 'Icon Frame',
  component: IconFrame,
}

const hues: IconFrameProps['hue'][] = ['none', 'default', 'lighter', 'lightest']
const sizes: IconFrameProps['size'][] = [
  'xsmall',
  'small',
  'medium',
  'large',
  'xlarge',
]

function Template({
  clickable,
  icon,
  textValue,
  tooltip,
  tooltipProps,
  ...props
}: Partial<IconFrameProps>) {
  return hues.map(hue => (
    <Div key={hue}>
      <H1
        caption
        marginBottom="xxsmall"
      >
        hue="{hue}"
      </H1>
      <Flex
        gap="xsmall"
        marginBottom="xlarge"
        alignItems="center"
        flexWrap="wrap"
      >
        {sizes.map(size => (
          <Card
            key={size}
            display="flex"
            width="max-content"
            paddingVertical="xsmall"
            paddingHorizontal="medium"
            flexDirection="row"
            alignItems="center"
            gap="medium"
            hue={hue}
          >
            <Text caption>{size}</Text>
            <IconFrame
              size={size || 'medium'}
              hue={hue}
              clickable={clickable === undefined ? true : clickable}
              icon={icon || <TrashCanIcon />}
              textValue={textValue || 'Delete'}
              tooltip={tooltip}
              tooltipProps={tooltipProps}
              {...props}
            />
          </Card>
        ))}
      </Flex>
    </Div>
  ))
}

export const Default = Template.bind({})
Default.args = {
  clickable: true,
  tooltip: true,
  tooltipProps: {
    displayOn: 'hover',
    placement: 'top',
  },
  textValue: 'Delete',
}
