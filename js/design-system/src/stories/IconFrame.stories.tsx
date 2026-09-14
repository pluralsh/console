import { IconFrame, type IconFrameProps, TrashCanIcon, Flex } from '../index'
import type { Meta, StoryObj } from '@storybook/react'
import styled from 'styled-components'

const Caption = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.caption,
}))

const meta = {
  title: 'Icon Frame',
  component: IconFrame,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

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
  return (
    <>
      {types.map((type) => (
        <div key={type}>
          <Caption style={{ marginBottom: 4 }}>
            type=&quot;{type}&quot;
          </Caption>
          <Flex
            gap="xsmall"
            marginBottom={32}
            alignItems="center"
            flexWrap="wrap"
          >
            {sizes.map((size) => (
              <>
                <Caption>size=&quot;{size}&quot;</Caption>
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
        </div>
      ))}
    </>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    clickable: true,
    tooltip: true,
    tooltipProps: {
      displayOn: 'hover',
      placement: 'top',
    },
    textValue: 'Delete',
  },
}
