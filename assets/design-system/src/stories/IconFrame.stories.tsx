import { Div, Flex, H1, P } from 'honorable'

import { IconFrame, type IconFrameProps, TrashCanIcon } from '../index'

export default {
  title: 'Icon Frame',
  component: IconFrame,
}

type Type = 'secondary' | 'tertiary' | 'floating'

const types: Type[] = ['secondary', 'tertiary', 'floating']

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
  return types.map((type) => (
    <Div key={type}>
      <H1
        caption
        marginBottom="xxsmall"
      >
        type="{type}"
      </H1>
      <Flex
        gap="xsmall"
        marginBottom="xlarge"
        alignItems="center"
        flexWrap="wrap"
      >
        {sizes.map((size) => (
          <>
            <P caption>size="{size}"</P>
            <IconFrame
              size={size || 'medium'}
              clickable={clickable === undefined ? true : clickable}
              icon={icon || <TrashCanIcon />}
              textValue={textValue || 'Delete'}
              tooltip={tooltip}
              tooltipProps={tooltipProps}
              type={type}
              {...props}
            />
          </>
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
